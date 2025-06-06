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
      firstname: req.body.firstname,
      lastname: req.body.lastname,
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
          streakBonus += 0.5; // +0.5 for each correct after the first in the streak
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
    });

    return res.status(200).json({
      status: true,
      message: "Quiz submitted successfully",
      result: {
        score: totalScore,
        correctCount,
        incorrectCount,
        notAttemptedCount,
        streakBonus,
        bonusPoints,
        answers: processedAnswers,
        savedResult: quizResult,
      },
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
  const { status, type } = req.query;

  try {
    // Build filter object dynamically
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const allQuizzes = await Quiz.find(filter).sort({ createdAt: -1 });

    if (allQuizzes.length === 0) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No quiz found",
      });
    }

    res.json({
      code: 200,
      status: true,
      quizzes: allQuizzes,
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
};
