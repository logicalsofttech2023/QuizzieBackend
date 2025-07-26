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
const { addNotification } = require("../utils/AddNotification");
const { default: Notification } = require("../models/NotificationModel");
const generateTransactionId = () => {
  const randomString = crypto.randomBytes(5).toString("hex").toUpperCase();
  const formattedId = `QV${randomString.match(/.{1,2}/g).join("")}`;
  return formattedId;
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
  const { firstname, lastname, userEmail, mobile } = req.body;

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

  const allAvatars = await Avatar.find();
  const profilePicUrl = lodash.sample(allAvatars)?.url || "default-avatar.png";

  user.firstname = firstname;
  user.lastname = lastname;
  user.userEmail = userEmail;
  user.profilePic = profilePicUrl;

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
      profile_pic: user.profilePic,
      createdAt: user.createdAt,
    },
  });
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

    let correctStreak = 0;
    let incorrectStreak = 0;
    let streakBonus = 0;

    const allAttempted = questions.every((q) =>
      answers.some(
        (ans) =>
          String(ans.questionId) === String(q._id) &&
          ans.selectedOptionIndex !== null &&
          ans.selectedOptionIndex !== undefined
      )
    );

    const processedAnswers = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const answerObj = answers.find(
        (ans) => String(ans.questionId) === String(question._id)
      );

      if (
        !answerObj ||
        answerObj.selectedOptionIndex === null ||
        answerObj.selectedOptionIndex === undefined
      ) {
        baseScore -= 1;
        notAttemptedCount++;
        correctStreak = 0;
        incorrectStreak = 0;
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
        baseScore += 5;
        correctCount++;
        correctStreak++;
        incorrectStreak = 0;

        if (correctStreak > 1) {
          streakBonus += 0.5;
        }
      } else {
        baseScore -= 2;
        incorrectCount++;
        incorrectStreak++;
        correctStreak = 0;

        if (incorrectStreak > 1) {
          streakBonus -= 0.5; // -0.5 for each incorrect after the first in the streak
        }
      }
    }

    const attemptedCount = questions.length - notAttemptedCount;
    const completionPercentage = (
      (attemptedCount / questions.length) *
      100
    ).toFixed(2);

    let bonusPoints = 0;

    if (allAttempted) bonusPoints += 30;

    if (correctCount >= 11 && correctCount <= 20) {
      bonusPoints += correctCount * 0.5;
    } else if (correctCount >= 21 && correctCount <= 30) {
      bonusPoints += correctCount * 1.5;
    }

    const totalScore = baseScore + streakBonus + bonusPoints;

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
      streakBonus,
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

    // Ensure wallet is a number
    user.wallet = Number(user.wallet) + amount;
    await user.save();

    // Generate unique transaction ID using crypto
    const transactionId = generateTransactionId();

    // Create a new transaction record
    const transaction = new Transaction({
      userId,
      amount,
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
      // Notification fail hone par bhi success response bhej rahe hain
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

  try {
    const allQuizzes = await Quiz.find().sort({ createdAt: -1 });

    if (allQuizzes.length === 0) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No quiz found",
      });
    }

    // Separate quizzes based on whether the user has participated
    const completed = [];
    const upcoming = [];

    allQuizzes.forEach((quiz) => {
      if (quiz.users.includes(userId)) {
        completed.push(quiz);
      } else {
        upcoming.push(quiz);
      }
    });

    res.json({
      code: 200,
      status: true,
      completed,
      upcoming,
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

const joinQuiz = asyncHandler(async (req, res) => {
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

    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "User not found",
      });
    }

    // Combine quiz.date and quiz.startTime into DateTime
    const quizDateTimeStr = `${quiz.date} ${quiz.startTime}`; // e.g. "2025-06-07 01:00 PM"
    const quizStartDateTime = new Date(quizDateTimeStr);
    const now = new Date();

    if (now >= quizStartDateTime) {
      return res.status(403).json({
        code: 403,
        status: false,
        message: "You cannot join this quiz now. Start time has passed.",
      });
    }

    // Check if already joined
    if (quiz.users.includes(user_id)) {
      return res.status(409).json({
        code: 409,
        status: false,
        message: "You have already joined this quiz",
      });
    }

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
    const transactionId = generateTransactionId(); // You must define this function
    const transaction = new Transaction({
      userId: user_id,
      amount: joiningAmount,
      type: "quizParticipation",
      status: "success",
      transactionId,
      description: `Joined quiz ${quiz.title} for ₹${joiningAmount}`,
    });
    await transaction.save();

    return res.status(200).json({
      code: 200,
      status: true,
      message: "You have successfully joined the quiz",
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
};
