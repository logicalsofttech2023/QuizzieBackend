const User = require("../models/user_model");
const Avatar = require("../models/avatar_model");
const asyncHandler = require("express-async-handler");
const generateToken = require("../config/jwt_token");
const { validateMongoDbId } = require("../utils/validate_mongo_db_id");
const otpGenerator = require("otp-generator");
const lodash = require("lodash");
const Question = require("../models/question_model");
const Quiz = require("../models/quiz_model");
const QuizResult = require("../models/quiz_result_model");
const Transaction = require("../models/TransactionModel");
const crypto = require("crypto");
const addNotification = require("../utils/AddNotification");
const Notification = require("../models/NotificationModel");
const Kyc = require("../models/Kyc");
const {
  ReferralSettings,
  ReferralCode,
} = require("../models/ReferralSettings");
const Review = require("../models/Review");
const QuizStreak = require("../models/QuizStreak");
const BankDetails = require("../models/BankDetails");
const handleStreak = require("../utils/handleStreak");
const Badge = require("../models/StreakBadgeModel");
const Ticket = require("../models/Ticket");
const { profile } = require("console");
const PracticeQuizResult = require("../models/PracticeQuizResult");

const generateTransactionId = () => {
  const randomString = crypto.randomBytes(5).toString("hex").toUpperCase();
  const formattedId = `QV${randomString.match(/.{1,2}/g).join("")}`;
  return formattedId;
};

function parseCustomDate(dateString) {
  const [datePart, timePart, meridian] = dateString.split(/[\s,]+/); // ["14/08/2025", "01:12:00", "AM"]

  const [day, month, year] = datePart.split("/").map(Number);
  let [hours, minutes, seconds] = timePart.split(":").map(Number);

  if (meridian.toLowerCase() === "pm" && hours < 12) hours += 12;
  if (meridian.toLowerCase() === "am" && hours === 12) hours = 0;

  return new Date(year, month - 1, day, hours, minutes, seconds || 0);
}

const generateReferralCode = (name) => {
  return `${name.toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
};

const getPerformanceFeedback = (accuracy) => {
  if (accuracy >= 90) return "Excellent! You've mastered this topic!";
  if (accuracy >= 75) return "Great job! You have a good understanding.";
  if (accuracy >= 60) return "Good effort! Keep practicing to improve.";
  if (accuracy >= 40) return "You're getting there! Review the concepts.";
  return "Keep practicing! You'll improve with more attempts.";
};

const generateOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;

  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return res.json({
      code: 400,
      status: false,
      message: "Invalid mobile number",
    });
  }

  const otp = otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  const user = await User.findOneAndUpdate(
    { mobile },
    { otp, otpCreatedAt: new Date() },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Optionally: sendSMS(`+91${mobile}`, `Your OTP is: ${otp}`);

  res.json({
    code: 200,
    status: true,
    message: "OTP generated and saved",
    otp,
  });
});

const verifyOtp = asyncHandler(async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    const user = await User.findOne({ mobile });

    if (!user) {
      return res.json({
        code: 404,
        status: false,
        message: "User does not exist",
      });
    }

    const isExpired = new Date() - new Date(user.otpCreatedAt) > 5 * 60 * 1000;

    if (isExpired) {
      return res.json({ code: 410, status: false, message: "OTP has expired" });
    }

    if (user.otp !== otp) {
      return res.json({ code: 401, status: false, message: "Invalid OTP" });
    }

    // OTP is correct
    user.isMobileNumberVerified = true;
    user.otp = undefined;
    user.otpCreatedAt = undefined;
    await user.save();

    // If user is already registered (email and password exist)
    if (user.userEmail) {
      const token = generateToken(user._id);

      return res.json({
        code: 200,
        status: true,
        message: "OTP verified and user already registered",
        isRegistered: true,
        token,
        result: {
          firstname: user.firstname,
          lastname: user.lastname,
          userEmail: user.userEmail,
          mobile: user.mobile,
          profile_pic: user.profilePic,
          userId: user._id,
        },
      });
    }

    // If not registered yet, just confirm OTP verified
    return res.json({
      code: 210,
      status: true,
      message: "OTP verified successfully",
      isRegistered: false,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const resendOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;

  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return res.json({
      code: 400,
      status: false,
      message: "Invalid mobile number",
    });
  }

  const otp = otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  const user = await User.findOneAndUpdate(
    { mobile },
    { otp, otpCreatedAt: new Date() },
    { new: true }
  );

  if (!user) {
    return res.json({
      code: 404,
      status: false,
      message: "Mobile number not registered yet",
    });
  }

  // Optionally: sendSMS(`+91${mobile}`, `Your new OTP is: ${otp}`);

  res.json({
    code: 200,
    status: true,
    message: "OTP resent successfully",
    otp,
  });
});

const registerUser = asyncHandler(async (req, res) => {
  const { firstname, lastname, userEmail, mobile, referralCode } = req.body;

  const user = await User.findOne({ mobile });

  if (!user) {
    return res.json({
      code: 404,
      status: false,
      message: "User not found. Please generate OTP first.",
    });
  }

  if (!user.isMobileNumberVerified) {
    return res.json({
      code: 403,
      status: false,
      message: "Mobile number not verified. Please verify OTP.",
    });
  }

  if (user.userEmail) {
    return res.json({
      code: 409,
      status: false,
      message: "User already registered with userEmail",
    });
  }

  let profilePicUrl;
  if (req.file) {
    // If uploaded, use uploaded image path
    profilePicUrl = req.file.filename;
  } else {
    const allAvatars = await Avatar.find();
    profilePicUrl = lodash.sample(allAvatars)?.url || "default-avatar.png";
  }

  user.firstname = firstname;
  user.lastname = lastname;
  user.userEmail = userEmail;
  user.profilePic = profilePicUrl;

  user.referralCode = generateReferralCode(firstname);

  // ✅ Referral Handling
  if (referralCode) {
    const referrer = await User.findOne({
      referralCode: referralCode.toUpperCase(),
    });

    if (referrer) {
      const settings = await ReferralSettings.findOne();
      const bonusAmount = Number(settings.referralBonus);
      user.referredBy = referrer._id;
      user.referralBonus = bonusAmount;
    } else {
      // 2️⃣ If not User referral, then check in Admin ReferralCode collection
      const adminReferral = await ReferralCode.findOne({
        code: referralCode.toUpperCase(),
        isActive: true,
      });

      if (adminReferral) {
        const bonusAmount = Number(adminReferral.bonusAmount);

        user.wallet = Number(user.wallet || 0) + bonusAmount;

        // Transaction for user
        const transactionId = generateTransactionId();
        await Transaction.create({
          userId: user._id,
          amount: bonusAmount,
          type: "adminReferralBonus",
          status: "success",
          transactionId,
          description: `Referral bonus credited for using code ${adminReferral.code}`,
        });

        // Notification
        try {
          await addNotification(
            user._id,
            "Referral Bonus Credited",
            `You received ₹${bonusAmount} for using referral code ${adminReferral.code}.`
          );
        } catch (err) {
          console.error("Referral notification error (admin code):", err);
        }
      }
    }
  }

  await user.save();

  const token = generateToken(user._id);

  res.json({
    code: 200,
    status: true,
    message: "User registered successfully",
    token,
    result: {
      firstname: user.firstname,
      lastname: user.lastname,
      userEmail: user.userEmail,
      mobile: user.mobile,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      walletBalance: user.walletBalance,
      profile_pic: user.profilePic,
      createdAt: user.createdAt,
    },
  });
});

const getUserReferralCode = asyncHandler(async (req, res) => {
  const user_id = req.user.id;
  try {
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      code: 200,
      status: true,
      message: "User referral code fetched successfully",
      data: {
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    console.error("Error fetching user referral code:", error);
    return res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
    });
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const user_id = req.user.id;
  const { firstname, lastname, userEmail } = req.body;

  try {
    // Check if the provided user_id is a valid ObjectId
    if (!validateMongoDbId(user_id)) {
      return res.json({
        code: 404,
        status: false,
        message: "Invalid user_id format",
      });
    }

    const updateFields = {
      firstname: firstname,
      lastname: lastname,
      userEmail: userEmail,
    };

    if (req.file) {
      updateFields.profilePic = `${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(user_id, updateFields, {
      new: true,
    }).select("-password");
    if (updateUser) {
      res.json({
        code: 200,
        status: true,
        message: "Profile details has been updated succefully",
        updatedUser: updatedUser,
      });
    } else {
      res.json({ code: 404, status: false, message: "User not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const logout = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  try {
    const user = await User.findById(_id);
    if (user) {
      res.json({
        code: 200,
        status: true,
        message: "User logged out successfully",
      });
    } else {
      res.json({ code: 404, status: false, message: "User not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const getUserDetail = asyncHandler(async (req, res) => {
  const user_id = req?.user?.id;
  console.log(user_id);

  if (!user_id) {
    return res
      .status(400)
      .json({ status: false, message: "User ID is required" });
  }

  try {
    const user = await User.findById(user_id).select("-password");

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Fetch quiz stats
    const quizResults = await QuizResult.find({ user: user_id });

    const total_quiz_played = quizResults.reduce(
      (sum, r) => sum + (r.quizPlayed || 0),
      0
    );
    const quiz_won = quizResults.reduce((sum, r) => sum + (r.quizWon || 0), 0);
    const points = quizResults.reduce((sum, r) => sum + (r.points || 0), 0);

    const average_points_per_quiz =
      total_quiz_played > 0 ? points / total_quiz_played : 0;
    const success_rate =
      total_quiz_played > 0 ? (quiz_won / total_quiz_played) * 100 : 0;
    const quiz_participation_rate = total_quiz_played * 100; // or implement your logic

    // Rank calculation example (simplified - based on total points)
    const allResults = await QuizResult.aggregate([
      {
        $group: {
          _id: "$user",
          totalPoints: { $sum: "$points" },
        },
      },
      { $sort: { totalPoints: -1 } },
    ]);

    const rank =
      allResults.findIndex((r) => r._id.toString() === user_id.toString()) + 1;

    return res.status(200).json({
      status: true,
      message: "User detail fetched successfully",
      user,
      stats: {
        quiz_won,
        _id: user_id,
        points,
        total_quiz_played,
        rank,
        success_rate,
        average_points_per_quiz,
        quiz_participation_rate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

const getAllQuizResults = asyncHandler(async (req, res) => {
  try {
    const results = await QuizResult.find()
      .populate("user", "name email")
      .populate("quiz", "title prize")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Error fetching quiz results:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

const getQuizResultById = asyncHandler(async (req, res) => {
  const { id } = req.query;

  try {
    const result = await QuizResult.findById(id)
      .populate("user", "name email")
      .populate("quiz", "title prize");

    if (!result) {
      return res.status(404).json({ message: "Quiz result not found" });
    }

    return res.status(200).json({
      status: true,
      result,
    });
  } catch (error) {
    console.error("Error fetching quiz result by ID:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

const getQuizResultsByUserId = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  try {
    const results = await QuizResult.find({ user: userId })
      .populate("quiz", "title prize date") // populate quiz info
      .sort({ createdAt: -1 }); // latest first

    return res.status(200).json({
      status: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Error fetching quiz results by user ID:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

const getQuizByStatus = asyncHandler(async (req, res) => {
  const { quiz_id } = req.query;
  try {
    // Build filter object dynamically
    const filter = {};
    if (quiz_id) filter._id = quiz_id;

    const allQuizzes = await Quiz.find(filter).sort({ createdAt: -1 });

    if (allQuizzes.length === 0) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No quiz found",
      });
    }

    // Map joined user count to each quiz
    const quizzesWithUserCount = allQuizzes.map((quiz) => ({
      ...quiz._doc,
      joinedUsers: quiz.users?.length || 0,
    }));

    res.json({
      code: 200,
      status: true,
      quizzes: quizzesWithUserCount,
    });
  } catch (err) {
    console.error("Error fetching quizzes:", err);
    res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

const getAllQuestionsByQuizId = asyncHandler(async (req, res) => {
  const user_id = req?.user?.id;
  const { quiz_id } = req.query;

  try {
    // Check if the provided quiz_id is a valid ObjectId
    if (!validateMongoDbId(quiz_id)) {
      return res.json({
        code: 400,
        status: false,
        message: "Invalid quiz id format",
      });
    }

    // Find the quiz by ID
    const quiz = await Quiz.findById(quiz_id);

    if (!quiz) {
      return res.json({ code: 404, status: false, message: "Quiz not found" });
    }

    const user = await User.findById(user_id);
    if (!user) {
      return res.json({ code: 404, status: false, message: "User not found" });
    }

    // ✅ Combine quiz.date and quiz.startTime into a DateTime
    const quizDateTimeStr = `${quiz.date} ${quiz.startTime}`; // e.g., "2025-06-07 01:00 PM"
    const quizStartDateTime = new Date(quizDateTimeStr);
    const now = new Date();

    const canJoin = now < quizStartDateTime;

    // Check if user already joined
    if (!quiz.users.includes(user_id)) {
      const joiningAmount = parseFloat(quiz.joiningAmount);
      const walletBalance = parseFloat(user.wallet);

      // Check wallet balance
      if (walletBalance < joiningAmount) {
        return res.json({
          code: 402,
          status: false,
          message: "Insufficient wallet balance",
        });
      }

      // Deduct joiningAmount
      user.wallet = (walletBalance - joiningAmount).toFixed(2);
      await user.save();

      // Add user to quiz's users array
      // quiz.users.push(user_id);
      // await quiz.save();

      // Generate transaction ID
      const transactionId = generateTransactionId(); // You must define this function

      // Save transaction
      const transaction = new Transaction({
        userId: user_id,
        amount: joiningAmount,
        type: "quizParticipation", // or "quizParticipation"
        status: "success",
        transactionId,
        description: `Joined quiz ${quiz.title} for ₹${joiningAmount}`,
      });
      await transaction.save();
    }

    // Find all questions for the given quiz ID and populate the 'quiz' field in each question
    const questions = await Question.find({ quiz: quiz_id }).select("-quiz");
    const randomQuestions = lodash.sampleSize(questions, 10); // Get 10 random questions

    res.json({
      code: 200,
      status: true,
      message: "Quiz questions fetched successfully",
      canJoin,
      quiz: quiz,
      questions: randomQuestions,
    });
  } catch (err) {
    throw new Error(err);
  }
});

const addMoneyToWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    let { amount } = req.body;

    // Convert amount to number
    amount = parseFloat(amount);

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount", status: false });
    }

    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    const gstRate = 0.28;
    const gstAmount = amount * gstRate;
    const netAmount = amount - gstAmount;

    // Ensure wallet is a number
    user.wallet = Number(user.wallet) + amount;
    await user.save();

    // Generate unique transaction ID using crypto
    const transactionId = generateTransactionId();

    // Create a new transaction record
    const transaction = new Transaction({
      userId,
      amount,
      gstAmount: gstAmount,
      netAmount: netAmount,
      type: "addMoney",
      status: "success",
      transactionId,
      description: `Added ₹${amount} to wallet`,
    });

    await transaction.save();

    // 🛎️ Send notification
    const title = "Wallet Amount Added";
    const body = `₹${amount} has been added to your wallet. Your new balance is ₹${user.wallet}.`;

    try {
      // 💾 Add notification to DB
      await addNotification(userId, title, body);

      // 📲 Send push notification if token exists
      // if (user.firebaseToken) {
      //   await sendNotification(user.firebaseToken, title, body);
      // }
    } catch (notificationError) {
      console.error("Notification Error:", notificationError);
    }

    res.status(200).json({
      message: `₹${amount} added to wallet successfully`,
      status: true,
      walletBalance: user.wallet,
      transaction,
    });
  } catch (error) {
    console.error("Error in addMoneyToWallet:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

const getAllQuiz = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const currentDateTime = parseCustomDate(req.query.currentDateTime);

  try {
    const allQuizzes = await Quiz.find({ users: userId }).sort({
      createdAt: -1,
    });

    if (allQuizzes.length === 0) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No quiz found",
      });
    }

    const completed = [];
    const upcoming = [];
    const live = [];

    allQuizzes.forEach((quiz) => {
      completed.push(quiz);

      // If startTime is missing, skip time-based classification
      if (!quiz.startTime) {
        console.warn(`Quiz ${quiz._id} is missing startTime`);
        return;
      }

      const quizDateTime = new Date(quiz.date);

      // Parse startTime in "hh:mm:ss AM/PM" format safely
      const [time, modifier] = quiz.startTime.split(" ");
      let [hours, minutes, seconds] = time?.split(":").map(Number) || [0, 0, 0];

      if (modifier?.toLowerCase() === "pm" && hours < 12) hours += 12;
      if (modifier?.toLowerCase() === "am" && hours === 12) hours = 0;

      quizDateTime.setHours(hours, minutes, seconds || 0, 0);

      // Compare with current time
      if (quizDateTime > currentDateTime) {
        upcoming.push(quiz);
      } else if (
        quizDateTime.getFullYear() === currentDateTime.getFullYear() &&
        quizDateTime.getMonth() === currentDateTime.getMonth() &&
        quizDateTime.getDate() === currentDateTime.getDate() &&
        quizDateTime.getHours() === currentDateTime.getHours() &&
        quizDateTime.getMinutes() === currentDateTime.getMinutes() &&
        quizDateTime.getSeconds() === currentDateTime.getSeconds()
      ) {
        live.push(quiz);
      }
    });

    res.json({
      code: 200,
      status: true,
      completed,
      upcoming,
      live,
    });
  } catch (err) {
    console.error("Error fetching quizzes:", err);
    res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

const getTodayQuiz = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const userId = req.user?.id;
  const currentDateTime = parseCustomDate(req.query.currentDateTime);

  try {
    const startOfDay = new Date(currentDateTime);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(currentDateTime);
    endOfDay.setHours(23, 59, 59, 999);

    const filter = {
      date: { $gte: startOfDay, $lte: endOfDay },
    };

    if (type) {
      filter.type = type;
    }

    const todayQuizzes = await Quiz.find(filter).sort({ startTime: 1 });

    if (!todayQuizzes.length) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No quiz found for today",
      });
    }

    // Filter by startTime relative to currentDateTime
    const validQuizzes = todayQuizzes.filter((quiz) => {
      if (!quiz.startTime) return false;

      const quizDateTime = new Date(quiz.date);
      const [time, modifier] = quiz.startTime.split(" ");
      let [hours, minutes, seconds] = time.split(":").map(Number);

      if (modifier?.toLowerCase() === "pm" && hours < 12) hours += 12;
      if (modifier?.toLowerCase() === "am" && hours === 12) hours = 0;

      quizDateTime.setHours(hours, minutes, seconds || 0, 0);

      return quizDateTime >= currentDateTime; // only future or current quizzes
    });

    if (!validQuizzes.length) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No upcoming quiz found for today",
      });
    }

    const quizzesWithStatus = validQuizzes.map((quiz) => {
      const isJoined = quiz.users?.some(
        (u) => u.toString() === userId.toString()
      );
      return {
        ...quiz.toObject(),
        isJoined, // true / false
      };
    });

    res.status(200).json({
      code: 200,
      status: true,
      data: quizzesWithStatus,
    });
  } catch (err) {
    console.error("Error fetching today's quizzes:", err);
    res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

const getAllPracticeQuiz = asyncHandler(async (req, res) => {
  try {
    const quizzes = await Quiz.find({ type: "Practice_Quiz" }).lean();

    if (!quizzes.length) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No practice quizzes found",
      });
    }

    res.status(200).json({
      code: 200,
      status: true,
      data: quizzes,
    });
  } catch (err) {
    console.error("Error fetching practice quizzes:", err);
    res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

const joinPracticeQuiz = asyncHandler(async (req, res) => {
  const user_id = req.user?.id;
  const { quiz_id } = req.body;

  try {
    if (!validateMongoDbId(quiz_id)) {
      return res.status(400).json({
        code: 400,
        status: false,
        message: "Invalid quiz id format",
      });
    }

    const quiz = await Quiz.findById(quiz_id);
    if (!quiz) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "Quiz not found",
      });
    }

    // Check if it's actually a Practice_Quiz
    if (quiz.type !== "Practice_Quiz") {
      return res.status(400).json({
        code: 400,
        status: false,
        message: "This API is only for Practice Quiz",
      });
    }

    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "User not found",
      });
    }

    // Check if already joined (optional for practice quiz)
    const isAlreadyJoined = quiz.users.includes(user_id);

    // Add user to quiz if not already joined
    if (!isAlreadyJoined) {
      quiz.users.push(user_id);
      await quiz.save();
    }

    // Get all questions for practice quiz
    const questions = await Question.find({ quiz: quiz._id })
      .select("-correctOptionIndex")
      .lean();

    // Add timing info if needed (optional for practice)
    const questionsWithTime = questions.map((q, idx) => ({
      ...q,
      remainingTime: 0, // No time limit for practice
      isPractice: true,
    }));

    return res.status(200).json({
      code: 200,
      status: true,
      message: isAlreadyJoined
        ? "Welcome back to practice quiz"
        : "Practice quiz started successfully",
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        type: quiz.type,
      },
      questions: questionsWithTime,
      totalQuestions: questions.length,
    });
  } catch (err) {
    console.error("Error joining practice quiz:", err);
    return res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

const submitPracticeQuizResult = asyncHandler(async (req, res) => {
  const user_id = req.user.id;
  const { quiz_id, answers } = req.body;

  if (!quiz_id || !user_id || !Array.isArray(answers)) {
    return res.status(400).json({
      code: 400,
      status: false,
      message: "Required fields: quiz_id, user_id, answers[]",
    });
  }

  try {
    const quiz = await Quiz.findById(quiz_id);
    if (!quiz || quiz.type !== "Practice_Quiz") {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "Practice quiz not found",
      });
    }

    const questions = await Question.find({ quiz: quiz_id }).lean();

    let correctCount = 0;
    let incorrectCount = 0;
    let notAttemptedCount = 0;
    let detailedResults = [];

    // Calculate results with detailed feedback
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const answerObj = answers.find(
        (ans) => String(ans.questionId) === String(question._id)
      );

      const selectedOptionIndex = answerObj?.selectedOptionIndex;
      const isAttempted =
        selectedOptionIndex !== null && selectedOptionIndex !== undefined;

      let isCorrect = false;
      let score = 0;

      if (!isAttempted) {
        notAttemptedCount++;
      } else {
        isCorrect = selectedOptionIndex === question.correctOptionIndex;
        if (isCorrect) {
          correctCount++;
          score = 1;
        } else {
          incorrectCount++;
        }
      }

      detailedResults.push({
        questionId: question._id,
        questionText: question.questionText,
        options: question.options,
        selectedOptionIndex: selectedOptionIndex,
        correctOptionIndex: question.correctOptionIndex,
        isCorrect: isCorrect,
        isAttempted: isAttempted,
        explanation: question.explanation || "",
        score: score,
      });
    }

    const totalScore = correctCount;
    const totalQuestions = questions.length;
    const accuracy =
      totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    // Save practice result (optional - you might not want to save practice results)
    const practiceResult = await PracticeQuizResult.create({
      user: user_id,
      quiz: quiz_id,
      totalScore: totalScore,
      correctCount: correctCount,
      incorrectCount: incorrectCount,
      notAttemptedCount: notAttemptedCount,
      accuracy: accuracy,
      totalQuestions: totalQuestions,
      detailedResults: detailedResults,
      submittedAt: new Date(),
    });

    return res.status(200).json({
      code: 200,
      status: true,
      message: "Practice quiz submitted successfully",
      result: {
        _id: practiceResult._id,
        user: practiceResult.user,
        quiz: practiceResult.quiz,
        totalScore: practiceResult.totalScore,
        correctCount: practiceResult.correctCount,
        incorrectCount: practiceResult.incorrectCount,
        notAttemptedCount: practiceResult.notAttemptedCount,
        accuracy: practiceResult.accuracy,
        totalQuestions: practiceResult.totalQuestions,
        detailedResults: practiceResult.detailedResults,
        submittedAt: practiceResult.submittedAt,
        createdAt: practiceResult.createdAt,
        updatedAt: practiceResult.updatedAt,
        performance: getPerformanceFeedback(accuracy),
      },
    });
  } catch (err) {
    console.error("Error submitting practice quiz:", err);
    return res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

const joinQuiz = asyncHandler(async (req, res) => {
  const user_id = req.user?.id;
  const { quiz_id, dateTime } = req.body;
  const currentDateTime = parseCustomDate(dateTime);

  try {
    if (!validateMongoDbId(quiz_id)) {
      return res
        .status(400)
        .json({ code: 400, status: false, message: "Invalid quiz id format" });
    }

    const quiz = await Quiz.findById(quiz_id);
    if (!quiz) {
      return res
        .status(404)
        .json({ code: 404, status: false, message: "Quiz not found" });
    }

    const user = await User.findById(user_id);
    if (!user) {
      return res
        .status(404)
        .json({ code: 404, status: false, message: "User not found" });
    }

    // Start Time
    const quizStart = new Date(quiz.date);
    let [startHours, startMinutes, startSeconds] = quiz.startTime
      .split(" ")[0]
      .split(":")
      .map(Number);
    const startMeridian = quiz.startTime.split(" ")[1];
    if (startMeridian.toLowerCase() === "pm" && startHours < 12)
      startHours += 12;
    if (startMeridian.toLowerCase() === "am" && startHours === 12)
      startHours = 0;
    quizStart.setHours(startHours, startMinutes, startSeconds || 0, 0);

    // End Time
    const quizEnd = new Date(quiz.date);
    let [endHours, endMinutes, endSeconds] = quiz.endTime
      .split(" ")[0]
      .split(":")
      .map(Number);
    const endMeridian = quiz.endTime.split(" ")[1];
    if (endMeridian.toLowerCase() === "pm" && endHours < 12) endHours += 12;
    if (endMeridian.toLowerCase() === "am" && endHours === 12) endHours = 0;
    quizEnd.setHours(endHours, endMinutes, endSeconds || 0, 0);

    // Check if already joined
    const isAlreadyJoined = quiz.users.includes(user_id);

    // Wallet deduction & add user only if first time joining
    if (!isAlreadyJoined) {
      const joiningAmount = parseFloat(quiz.joiningAmount);
      const walletBalance = parseFloat(user.wallet);

      if (walletBalance < joiningAmount) {
        return res.status(402).json({
          code: 402,
          status: false,
          message: "Insufficient wallet balance",
        });
      }

      // Deduct wallet
      user.wallet = (walletBalance - joiningAmount).toFixed(2);
      await user.save();

      // Add user to quiz
      quiz.users.push(user_id);
      await quiz.save();

      // Save transaction
      const transactionId = generateTransactionId();
      await new Transaction({
        userId: user_id,
        amount: joiningAmount,
        type: "quizParticipation",
        status: "success",
        transactionId,
        description: `Joined quiz ${quiz.title} for ₹${joiningAmount}`,
      }).save();
    }

    // ✅ Call Streak Handler
    const { streak, reward } = await handleStreak(user_id, currentDateTime);

    // ✅ Referral bonus trigger for referrer
    if (!user.hasJoinedQuiz) {
      user.hasJoinedQuiz = true;

      if (user.referredBy && !user.referralBonusGiven) {
        const referrer = await User.findById(user.referredBy);

        if (referrer) {
          const settings = (await ReferralSettings.findOne()) || {
            referralBonus: 10,
          };
          const bonusAmount = Number(settings.referralBonus);
          referrer.wallet = Number(referrer.wallet || 0) + bonusAmount;

          referrer.referralEarnings.push({
            referredUserId: user._id,
            amount: bonusAmount,
            earnedAt: new Date(),
          });

          await referrer.save();

          // Transaction
          const transactionId = generateTransactionId();
          await Transaction.create({
            userId: referrer._id,
            amount: bonusAmount,
            type: "referralBonus",
            status: "success",
            transactionId,
            description: `Referral bonus for invitee ${user.firstname} ${user.lastname} joining first quiz`,
          });

          // Notification
          await addNotification(
            referrer._id,
            "Referral Bonus Unlocked",
            `${user.firstname} ${user.lastname} joined a quiz. You earned ₹${bonusAmount}.`
          );

          user.referralBonusGiven = true;
        }
      }
      await user.save();
    }

    // Question skip logic
    const questionTimeSec = 10; // each question 10 sec
    const totalQuestions = await Question.countDocuments({ quiz: quiz._id });

    if (currentDateTime >= quizStart && currentDateTime <= quizEnd) {
      const diffMs = currentDateTime - quizStart;
      const diffSec = Math.floor(diffMs / 1000);

      let skippedQuestions = Math.floor(diffSec / questionTimeSec);
      if (skippedQuestions >= totalQuestions) skippedQuestions = totalQuestions;

      // Time remaining for first question in returned list
      const remainingTimeFirstQuestion =
        questionTimeSec - (diffSec % questionTimeSec);

      // Fetch questions after skipping
      const questions = await Question.find({ quiz: quiz._id })
        .skip(skippedQuestions)
        .limit(totalQuestions - skippedQuestions)
        .lean();

      // Add remainingTime field for each question
      const questionsWithTime = questions.map((q, idx) => ({
        ...q,
        remainingTime: idx === 0 ? remainingTimeFirstQuestion : questionTimeSec,
      }));

      return res.status(200).json({
        code: 200,
        status: true,
        message: isAlreadyJoined
          ? "Welcome back! Quiz is running, here are your remaining questions"
          : "You have successfully joined the quiz and it’s running now",
        skippedQuestions,
        questions: questionsWithTime,
      });
    }

    // If quiz has not started yet
    return res.status(200).json({
      code: 200,
      status: true,
      message: isAlreadyJoined
        ? "You have already joined. Please wait for the quiz to start."
        : "You have successfully joined the quiz. Please wait for it to start.",
      streak,
      reward,
    });
  } catch (err) {
    console.error("Error joining quiz:", err);
    return res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

const submitQuizResult = asyncHandler(async (req, res) => {
  const user_id = req.user.id;
  const { quiz_id, answers } = req.body;

  if (!quiz_id || !user_id || !Array.isArray(answers)) {
    return res.status(400).json({
      message: "Required fields: quiz_id, user_id, answers[]",
    });
  }

  try {
    const questions = await Question.find({ quiz: quiz_id }).lean();

    let baseScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let notAttemptedCount = 0;
    let processedAnswers = [];

    const allAttempted = questions.every((q) =>
      answers.some(
        (ans) =>
          String(ans.questionId) === String(q._id) &&
          ans.selectedOptionIndex !== null &&
          ans.selectedOptionIndex !== undefined
      )
    );

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionNumber = i + 1; // Q1, Q2, Q3 ...Q30
      const answerObj = answers.find(
        (ans) => String(ans.questionId) === String(question._id)
      );

      if (
        !answerObj ||
        answerObj.selectedOptionIndex === null ||
        answerObj.selectedOptionIndex === undefined
      ) {
        // Not attempted
        baseScore -= 1; // same as before (you can change if needed)
        notAttemptedCount++;
        processedAnswers.push({
          questionId: question._id,
          selectedOptionIndex: null,
        });
        continue;
      }

      const isCorrect =
        answerObj.selectedOptionIndex === question.correctOptionIndex;

      processedAnswers.push({
        questionId: question._id,
        selectedOptionIndex: answerObj.selectedOptionIndex,
      });

      if (isCorrect) {
        // ✅ Correct → +5.00X
        const score = Number(`5.${String(questionNumber).padStart(3, "0")}`);
        baseScore += score;
        correctCount++;
      } else {
        // ❌ Incorrect → -2.00X
        const score = Number(`-2.${String(questionNumber).padStart(3, "0")}`);
        baseScore += score;
        incorrectCount++;
      }
    }

    const attemptedCount = questions.length - notAttemptedCount;
    let completionPercentage = 0;
    if (questions.length > 0) {
      completionPercentage = Number(
        ((attemptedCount / questions.length) * 100).toFixed(2)
      );
    }

    let bonusPoints = 0;
    if (allAttempted) bonusPoints += 30;

    const totalScore = baseScore + bonusPoints;

    const quizResult = await QuizResult.create({
      user: user_id,
      quiz: quiz_id,
      points: totalScore,
      quizPlayed: 1,
      quizWon: 0,
      correctCount,
      incorrectCount,
      notAttemptedCount,
      attemptedCount,
      bonusPoints,
      answers: processedAnswers,
      completionPercentage,
    });

    return res.status(200).json({
      status: true,
      message: "Quiz submitted successfully",
      result: quizResult,
    });
  } catch (err) {
    console.error("Error submitting quiz result:", err);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

const getAllTransactionsByUser = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;
    const transactions = await Transaction.find({ userId }).sort({
      createdAt: -1,
    });
    return res.status(200).json({
      code: 200,
      status: true,
      transactions,
    });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    return res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

const getAllNotificationsByUser = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;
    const notifications = await Notification.find({ userId }).sort({
      createdAt: -1,
    });
    return res.status(200).json({
      code: 200,
      status: true,
      notifications,
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

const addKycDetails = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;
    const { aadharNo, panNo } = req.body;

    if (
      !req.files.aadharFrontImg ||
      !req.files.aadharBackImg ||
      !req.files.panFrontImg ||
      !req.files.panBackImg
    ) {
      return res
        .status(400)
        .json({ status: false, message: "All images are required" });
    }

    // Prepare KYC data
    const kycData = {
      userId,
      aadharNo,
      aadharFrontImg: req.files.aadharFrontImg[0].filename,
      aadharBackImg: req.files.aadharBackImg[0].filename,
      panNo,
      panFrontImg: req.files.panFrontImg[0].filename,
      panBackImg: req.files.panBackImg[0].filename,
    };

    // Check if KYC already exists
    let kyc = await Kyc.findOne({ userId });

    if (kyc) {
      // Update existing KYC
      kyc.set(kycData);
      await kyc.save();
      return res.status(200).json({
        status: true,
        message: "KYC updated successfully",
        data: kyc,
      });
    } else {
      // Create new KYC
      kyc = new Kyc(kycData);
      await kyc.save();
      return res.status(201).json({
        status: true,
        message: "KYC added successfully",
        data: kyc,
      });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

const updateKycDetails = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;
    const { aadharNo, panNo } = req.body;

    // Check if KYC exists
    const kyc = await Kyc.findOne({ userId });
    if (!kyc) {
      return res.status(404).json({
        status: false,
        message: "KYC details not found for this user",
      });
    }

    // Update fields only if provided, else keep old
    if (aadharNo) {
      kyc.aadharNo = aadharNo;
    }

    if (panNo) {
      kyc.panNo = panNo;
    }

    // Optional image updates
    if (req.files?.aadharFrontImg?.length) {
      kyc.aadharFrontImg = req.files.aadharFrontImg[0].filename;
    }
    if (req.files?.aadharBackImg?.length) {
      kyc.aadharBackImg = req.files.aadharBackImg[0].filename;
    }
    if (req.files?.panFrontImg?.length) {
      kyc.panFrontImg = req.files.panFrontImg[0].filename;
    }
    if (req.files?.panBackImg?.length) {
      kyc.panBackImg = req.files.panBackImg[0].filename;
    }

    await kyc.save();

    return res.status(200).json({
      status: true,
      message: "KYC updated successfully",
      data: kyc,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

const getMyKyc = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;
    const kyc = await Kyc.findOne({ userId }).populate(
      "userId",
      "firstname lastname userEmail mobile"
    );
    if (!kyc)
      return res.status(404).json({ status: false, message: "KYC not found" });

    res.status(200).json({
      status: true,
      message: "KYC details retrieved successfully",
      data: kyc,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

const addBankDetails = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountHolderName, accountNumber, ifscCode, bankName } = req.body;

    // Validate required fields
    if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
      return res.status(400).json({
        status: false,
        message: "All bank details fields are required",
      });
    }

    // Create new bank details
    const bankDetails = await BankDetails.create({
      userId,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
    });

    res.status(201).json({
      status: true,
      message: "Bank details added successfully",
      data: bankDetails,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

const updateBankDetails = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountHolderName, accountNumber, ifscCode, bankName } = req.body;

    // Check if bank details exist
    let bankDetails = await BankDetails.findOne({ userId });
    if (!bankDetails) {
      return res.status(404).json({
        status: false,
        message: "Bank details not found",
      });
    }

    // Update fields only if provided
    if (accountHolderName) {
      bankDetails.accountHolderName = accountHolderName;
    }
    if (accountNumber) {
      bankDetails.accountNumber = accountNumber;
    }
    if (ifscCode) {
      bankDetails.ifscCode = ifscCode;
    }
    if (bankName) {
      bankDetails.bankName = bankName;
    }

    await bankDetails.save();

    res.status(200).json({
      status: true,
      message: "Bank details updated successfully",
      data: bankDetails,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

const getMyBankDetails = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    const bankDetails = await BankDetails.findOne({ userId });
    if (!bankDetails) {
      return res.status(404).json({
        status: false,
        message: "Bank details not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Bank details retrieved successfully",
      data: bankDetails,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

const getMyNotification = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({ userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      code: 200,
      status: true,
      message: "Notifications fetched successfully",
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Error in getMyNotification:", error);
    res.status(500).json({
      code: 500,
      status: false,
      message: "Server error",
    });
  }
});

const getUserStats = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    // Total quizzes played
    const quizzesPlayed = await QuizResult.countDocuments({ user: userId });

    // Level calculation
    const level = 1 + Math.floor(quizzesPlayed / 10);

    // Find Badge for this level
    const badge = await Badge.findOne({ level });

    // Total wins (all correct answers in a quiz)
    const wins = await QuizResult.countDocuments({
      user: userId,
      $expr: {
        $eq: [
          "$correctCount",
          { $add: ["$correctCount", "$incorrectCount", "$notAttemptedCount"] },
        ],
      },
    });

    const kyc = await Kyc.findOne({ userId });

    // Skill score (out of 1000)
    // Example formula: Average score / maxPossibleScore * 1000
    const results = await QuizResult.find({ user: userId }).select("points");
    const maxScorePossible = 100;
    let skillScore = 0;
    if (results.length > 0) {
      const totalPoints = results.reduce((sum, r) => sum + r.points, 0);
      const avgScore = totalPoints / results.length;
      skillScore = Math.round((avgScore / maxScorePossible) * 1000);
    }

    res.status(200).json({
      code: 200,
      status: true,
      data: {
        level,
        totalWins: wins,
        quizzesPlayed,
        skillScore,
        maxPossibleScore: 1000,
        name: user.firstname + " " + user.lastname,
        mobile: user.mobile,
        profilePic: user.profilePic || "",
        wallet: user.wallet,
        kycStatus: kyc ? kyc?.status : "",
        badge: badge
          ? {
              name: badge.name,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("Error in getUserStats:", err);
    res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

const addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const userId = req.user.id;

  if (!rating) {
    return res.status(400).json({
      status: false,
      message: "Rating is required",
    });
  }

  const userReview = await Review.findOne({ userId });
  if (userReview) {
    return res.status(400).json({
      status: false,
      message: "You have already submitted a review",
    });
  }

  const review = await Review.create({
    userId,
    rating,
    comment,
  });

  res.status(201).json({
    status: true,
    message: "Review submitted successfully",
    data: review,
  });
});

const getUserTransaction = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    const transactions = await Transaction.find({ userId }).sort({
      createdAt: -1,
    });
    if (!transactions || transactions.length === 0) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No transactions found",
      });
    }

    res.status(200).json({
      code: 200,
      status: true,
      message: "Transactions fetched successfully",
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("Error in getUserTransaction:", error);
    res.status(500).json({
      code: 500,
      status: false,
      message: "Server error",
    });
  }
});

const getStreak = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const streak = await QuizStreak.findOne({ userId });

  if (!streak) {
    return res.status(404).json({
      code: 404,
      status: false,
      message: "Streak data not found",
    });
  }

  res.status(200).json({
    code: 200,
    status: true,
    data: streak,
  });
});

const createTicket = asyncHandler(async (req, res) => {
  const { subject, message } = req.body;
  const userId = req.user.id;

  if (!subject || !message) {
    return res
      .status(400)
      .json({ status: false, message: "Subject and Message are required" });
  }

  const ticket = await Ticket.create({ userId, subject, message });

  res.status(201).json({
    status: true,
    message: "Ticket created successfully",
    ticket,
  });
});

const getMyTickets = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  try {
    const tickets = await Ticket.find({ userId }).sort({ createdAt: -1 });
    if (!tickets || tickets.length === 0) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No tickets found",
      });
    }
    res.status(200).json({
      code: 200,
      status: true,
      message: "Tickets fetched successfully",
      tickets,
    });
  } catch (error) {
    console.error("Error in getMyTickets:", error);
    res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

const getMyReferrals = asyncHandler(async (req, res) => {
  const user_id = req.user.id;

  try {
    const referrals = await User.find({ referredBy: user_id });
    if (!referrals || referrals.length === 0) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No referrals found",
      });
    }

    return res.json({
      code: 200,
      status: true,
      message: "My referrals fetched successfully",
      data: referrals.map((r) => ({
        name: `${r.firstname} ${r.lastname}`,
        profilePic: r.profilePic,
        referralApplied: r.referredBy?.toString() === user_id,
        joinedQuiz: r.hasJoinedQuiz,
        bonusGiven: r.referralBonusGiven ? r.referralBonus : 0,
        registeredAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("Error fetching referrals:", err);
    return res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
    });
  }
});

const getMyReferralEarnings = asyncHandler(async (req, res) => {
  const user_id = req.user.id;

  try {
    const user = await User.findById(user_id).populate({
      path: "referralEarnings.referredUserId",
      select: "firstname lastname profilePic",
    });

    if (!user) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "User not found",
      });
    }

    // Calculate total earnings
    const totalEarnings = user.referralEarnings.reduce((total, earning) => {
      return total + earning.amount;
    }, 0);

    // Format the response
    const earningsData = user.referralEarnings.map((earning) => ({
      referredUser: {
        id: earning.referredUserId._id,
        name: `${earning.referredUserId.firstname} ${earning.referredUserId.lastname}`,
        profilePic: earning.referredUserId.profilePic,
      },
      amount: earning.amount,
      earnedAt: earning.earnedAt,
    }));

    return res.json({
      code: 200,
      status: true,
      message: "Referral earnings fetched successfully",
      data: {
        totalEarnings,
        earnings: earningsData,
      },
    });
  } catch (err) {
    console.error("Error fetching referral earnings:", err);
    return res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
    });
  }
});

module.exports = {
  generateOtp,
  verifyOtp,
  resendOtp,
  registerUser,
  logout,
  submitQuizResult,
  getAllQuizResults,
  getQuizResultById,
  getQuizResultsByUserId,
  getQuizByStatus,
  getUserDetail,
  getAllQuestionsByQuizId,
  addMoneyToWallet,
  getAllQuiz,
  getAllTransactionsByUser,
  getAllNotificationsByUser,
  updateUser,
  joinQuiz,
  getTodayQuiz,
  addKycDetails,
  updateKycDetails,
  getMyKyc,
  getUserReferralCode,
  getMyNotification,
  getUserStats,
  addReview,
  getUserTransaction,
  getStreak,
  addBankDetails,
  updateBankDetails,
  getMyBankDetails,
  createTicket,
  getMyTickets,
  getMyReferrals,
  getMyReferralEarnings,
  joinPracticeQuiz,
  submitPracticeQuizResult,
  getAllPracticeQuiz,
};
