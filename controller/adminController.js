const { Policy, FAQ } = require("../models/PolicyModel");
const Transaction = require("../models/TransactionModel");
const Quiz = require("../models/quiz_model");
const Question = require("../models/question_model");
const asyncHandler = require("express-async-handler");
const { validateMongoDbId } = require("../utils/validate_mongo_db_id");
const User = require("../models/user_model");
const Admin = require("../models/AdminModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const lodash = require("lodash");
const Kyc = require("../models/Kyc");
const ReferralSettings = require("../models/ReferralSettings");
const Review = require("../models/Review");
const QuizResult = require("../models/quiz_result_model");
const ContactUs = require("../models/Contact");
const BankDetails = require("../models/BankDetails");
const StreakReward = require("../models/StreakReward");
const Badge = require("../models/StreakBadgeModel");
const Ticket = require("../models/Ticket");

function calculateEndTime(startTime, totalQuestions) {
  if (!startTime || !totalQuestions) return null;
  const time12to24 = (time12h) => {
    const [time, period] = time12h.split(" ");
    let [hours, minutes, seconds] = time.split(":").map(Number);
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return { hours, minutes, seconds };
  };
  const time24to12 = (hours, minutes, seconds) => {
    const period = hours >= 12 ? "PM" : "AM";
    const twelveHour = hours % 12 || 12;
    return `${String(twelveHour).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")} ${period}`;
  };
  const { hours, minutes, seconds } = time12to24(startTime);
  let totalSeconds = hours * 3600 + minutes * 60 + seconds;
  totalSeconds += totalQuestions * 10; // Add 10s per question
  let endHours = Math.floor(totalSeconds / 3600) % 24;
  let endMinutes = Math.floor((totalSeconds % 3600) / 60);
  let endSeconds = totalSeconds % 60;
  return time24to12(endHours, endMinutes, endSeconds);
}

function parseCustomDate(dateString) {
  const [datePart, timePart, meridian] = dateString.split(/[\s,]+/); // ["14/08/2025", "01:12:00", "AM"]

  const [day, month, year] = datePart.split("/").map(Number);
  let [hours, minutes, seconds] = timePart.split(":").map(Number);

  if (meridian.toLowerCase() === "pm" && hours < 12) hours += 12;
  if (meridian.toLowerCase() === "am" && hours === 12) hours = 0;

  return new Date(year, month - 1, day, hours, minutes, seconds || 0);
}

const generateJwtToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const adminSignup = asyncHandler(async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const admin = await Admin.create({ name, email, password: hashedPassword });

    res.status(201).json({
      message: "Admin registered successfully",
      admin: { id: admin._id, name: admin.name, email: admin.email },
      token: generateJwtToken(admin),
    });
  } catch (error) {
    console.error("Admin Signup Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

const loginAdmin = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    res.status(200).json({
      message: "Admin logged in successfully",
      admin: { id: admin._id, name: admin.name, email: admin.email },
      token: generateJwtToken(admin),
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

const getAdminDetail = asyncHandler(async (req, res) => {
  try {
    console.log(req.user);

    const adminId = req?.user?.id;

    // Await the query to resolve
    const admin = await Admin.findById(adminId).select("-otp -otpExpiresAt");

    if (!admin) {
      return res.status(400).json({ message: "User not found", status: false });
    }

    res.status(200).json({
      message: "Admin data fetched successfully",
      status: true,
      data: admin,
    });
  } catch (error) {
    console.error("Error fetching admin details:", error);
    res.status(500).json({ message: "Internal Server Error", status: false });
  }
});

const resetAdminPassword = asyncHandler(async (req, res) => {
  try {
    const adminId = req.user.id;
    const { newPassword, confirmPassword } = req.body;

    if (!adminId || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "Admin ID, new password, and confirm password are required",
        status: false,
      });
    }

    // Find admin by ID
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res
        .status(404)
        .json({ message: "Admin not found", status: false });
    }

    // Check if newPassword and confirmPassword match
    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "Passwords do not match", status: false });
    }

    // Check if new password is same as old password
    const isSamePassword = await bcrypt.compare(newPassword, admin.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password cannot be the same as the old password",
        status: false,
      });
    }

    // Hash the new password
    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res
      .status(200)
      .json({ message: "Password reset successful", status: true });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Internal Server Error", status: false });
  }
});

const updateAdminDetail = asyncHandler(async (req, res) => {
  try {
    const adminId = req.user.id;
    const { name, email } = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({
        message: "name, and email are required",
        status: false,
      });
    }

    // Find and update admin
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { name, email },
      { new: true, select: "-password -otp -otpExpiresAt" }
    );

    if (!updatedAdmin) {
      return res
        .status(400)
        .json({ message: "Admin not found", status: false });
    }

    res.status(200).json({
      message: "Admin details updated successfully",
      status: true,
      data: updatedAdmin,
    });
  } catch (error) {
    console.error("Error updating admin details:", error);
    res.status(500).json({ message: "Internal Server Error", status: false });
  }
});

const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;

    let searchFilter = { role: "user", firstname: { $exists: true, $ne: "" } };
    if (search) {
      searchFilter = {
        $or: [
          { firstname: { $regex: search, $options: "i" } },
          { lastname: { $regex: search, $options: "i" } },
          { userEmail: { $regex: search, $options: "i" } },
        ],
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(searchFilter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),

      User.countDocuments(searchFilter),
    ]);

    if (users.length === 0) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No users found",
      });
    }

    res.json({
      code: 200,
      status: true,
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

const getSpecificUser = asyncHandler(async (req, res) => {
  const { user_id } = req.query;
  try {
    // Check if the provided user_id is a valid ObjectId
    if (!validateMongoDbId(user_id)) {
      return res.json({
        code: 404,
        status: false,
        message: "Invalid user_id format",
      });
    }

    const user = await User.findById(user_id).select("-password");
    if (user) {
      res.json({ code: 200, status: true, user: user });
    } else {
      res.json({ code: 404, status: false, message: "User not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const deleteSpecificUser = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  try {
    // Check if the provided user_id is a valid ObjectId
    if (!validateMongoDbId(user_id)) {
      return res.json({
        code: 404,
        status: false,
        message: "Invalid user_id format",
      });
    }

    const deleteUser = await User.findByIdAndDelete(user_id);
    if (deleteUser) {
      res.json({
        code: 200,
        status: true,
        message: "User deleted successfully",
      });
    } else {
      res.json({ code: 404, status: false, message: "User not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const updateUserBlockStatus = asyncHandler(async (req, res) => {
  const { isBlocked, user_id } = req.body;

  try {
    // Check if the provided user_id is a valid ObjectId
    if (!validateMongoDbId(user_id)) {
      return res.json({
        code: 404,
        status: false,
        message: "Invalid user_id format",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      user_id,
      {
        isBlocked: isBlocked,
      },
      {
        new: true,
      }
    );

    if (updatedUser) {
      const message = isBlocked
        ? "User blocked successfully"
        : "User unblocked successfully";
      res.json({ code: 200, status: true, message });
    } else {
      res.json({ code: 404, status: false, message: "User not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const createQuiz = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    prize,
    date,
    entries,
    joiningAmount,
    type,
    status,
    startTime,
    rankPrizes,
  } = req.body;
  console.log(req.body);

  // Basic validation
  if (!title || !type) {
    return res.status(400).json({
      code: 400,
      status: false,
      message: "Required fields: title and type",
    });
  }

  // Special case for Practice_Quiz
  if (type !== "Practice_Quiz") {
    if (!prize || !date || joiningAmount == null || !startTime) {
      return res.status(400).json({
        code: 400,
        status: false,
        message:
          "Required fields: prize, date, startTime, joiningAmount for non-Practice Quizzes",
      });
    }
  }

  try {
    const existingQuiz = await Quiz.findOne({ title });
    if (existingQuiz) {
      return res.status(409).json({
        code: 409,
        status: false,
        message: "Quiz with this title already exists",
      });
    }

    const newQuizData = {
      title,
      description,
      type,
    };

    // Add other fields only if not Practice_Quiz
    if (type !== "Practice_Quiz") {
      newQuizData.prize = prize;
      newQuizData.date = date;
      newQuizData.entries = entries || 0;
      newQuizData.joiningAmount = joiningAmount;
      newQuizData.status = status;
      newQuizData.startTime = startTime;
    }

    if (rankPrizes && Array.isArray(rankPrizes)) {
      newQuizData.rankPrizes = rankPrizes;
    }

    const newQuiz = await Quiz.create(newQuizData);

    return res.status(201).json({
      code: 201,
      status: true,
      message: "New Quiz has been added successfully",
      newQuiz,
    });
  } catch (err) {
    console.error("Error creating quiz:", err);
    return res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

const getAllQuizInAdmin = asyncHandler(async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;

    let searchFilter = {
      type: { $ne: "Practice_Quiz" },
    };

    if (search) {
      searchFilter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [quizzes, total] = await Promise.all([
      Quiz.find(searchFilter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Quiz.countDocuments(searchFilter),
    ]);

    if (quizzes.length === 0) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No quiz found",
      });
    }

    res.json({
      code: 200,
      status: true,
      quizzes,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
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

const getAllPracticeQuizInAdmin = asyncHandler(async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10, type } = req.query;

    let searchFilter = {};
    if (search) {
      searchFilter = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { type: { $regex: search, $options: "i" } },
        ],
      };
    }

    if (type) {
      searchFilter.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [quizzes, total] = await Promise.all([
      Quiz.find(searchFilter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Quiz.countDocuments(searchFilter),
    ]);

    if (quizzes.length === 0) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No quiz found",
      });
    }

    res.json({
      code: 200,
      status: true,
      quizzes,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
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

const getSpecificQuiz = asyncHandler(async (req, res) => {
  const { quiz_id } = req.query;

  try {
    // Check if the provided quiz_id is a valid ObjectId
    if (!validateMongoDbId(quiz_id)) {
      return res.json({
        code: 400,
        status: false,
        message: "Invalid quiz_id format",
      });
    }

    const quiz = await Quiz.findById(quiz_id);
    if (quiz) {
      res.json({ code: 200, status: true, message: "", quiz: quiz });
    } else {
      res.json({ code: 404, status: false, message: "Quiz not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const deleteSpecificQuiz = asyncHandler(async (req, res) => {
  const { quiz_id } = req.query;

  try {
    // Check if the provided quiz_id is a valid ObjectId
    if (!validateMongoDbId(quiz_id)) {
      return res.json({
        code: 400,
        status: false,
        message: "Invalid quiz_id format",
      });
    }

    const deleteQuiz = await Quiz.findByIdAndDelete(quiz_id);
    if (deleteQuiz) {
      res.json({
        code: 200,
        status: true,
        message: "Quiz deleted successfully",
      });
    } else {
      res.json({ code: 404, status: false, message: "Quiz not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const updateQuiz = asyncHandler(async (req, res) => {
  const {
    quiz_id,
    title,
    description,
    prize,
    date,
    joiningAmount,
    type,
    entries,
    status,
    startTime,
    rankPrizes,
  } = req.body;

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

    if (title && title !== quiz.title) {
      const existingQuiz = await Quiz.findOne({ title });
      if (existingQuiz) {
        return res.status(409).json({
          code: 409,
          status: false,
          message: "Quiz with this title already exists",
        });
      }
    }

    let updateFields = {};

    if (quiz.type === "Practice_Quiz") {
      // Only allow title & description update
      if (title) updateFields.title = title;
      if (description) updateFields.description = description;
    } else {
      // Normal quiz update
      updateFields = {
        ...(title && { title }),
        ...(description && { description }),
        ...(prize && { prize: String(prize) }),
        ...(date && { date }),
        ...(joiningAmount && { joiningAmount: String(joiningAmount) }),
        ...(entries && { entries: String(entries) }),
        ...(type && { type }),
        ...(status && { status }),
        ...(startTime && { startTime }),
      };

      if (rankPrizes && Array.isArray(rankPrizes)) {
        updateFields.rankPrizes = rankPrizes;
      }

      // If startTime is being updated, recalculate endTime
      if (startTime && startTime !== quiz.startTime) {
        const totalQuestions = await Question.countDocuments({ quiz: quiz_id });
        updateFields.endTime = calculateEndTime(startTime, totalQuestions);
      }
    }

    const updatedQuiz = await Quiz.findByIdAndUpdate(quiz_id, updateFields, {
      new: true,
    });

    return res.status(200).json({
      code: 200,
      status: true,
      message: "Quiz details have been updated successfully",
      updatedQuiz,
    });
  } catch (err) {
    console.error("Error updating quiz:", err);
    return res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

const createQuestion = asyncHandler(async (req, res) => {
  const { quiz_id, question, options, correctOptionIndex } = req.body;

  try {
    // Validate quiz ID
    if (!validateMongoDbId(quiz_id)) {
      return res.status(400).json({ message: "Invalid quiz ID format" });
    }

    // Validate required fields
    if (!question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        message: "Question and at least two options are required",
      });
    }

    if (
      correctOptionIndex === undefined ||
      correctOptionIndex < 0 ||
      correctOptionIndex >= options.length
    ) {
      return res.status(400).json({
        message:
          "Correct option index must be valid and match one of the options",
      });
    }

    // Check for duplicate question in the same quiz
    const existingQuestion = await Question.findOne({
      quiz: quiz_id,
      question: question,
    });

    if (existingQuestion) {
      return res.status(400).json({
        message: "This question already exists for the quiz",
      });
    }

    // Create new question
    const newQuestion = await Question.create({
      quiz: quiz_id,
      question,
      options,
      correctOptionIndex,
    });

    const totalQuestions = await Question.countDocuments({ quiz: quiz_id });
    const quizDoc = await Quiz.findById(quiz_id);

    if (quizDoc && quizDoc.startTime) {
      quizDoc.endTime = calculateEndTime(quizDoc.startTime, totalQuestions);
      await quizDoc.save();
    }

    res.status(201).json({
      code: 201,
      status: true,
      message: "New Question has been added successfully",
      data: newQuestion,
    });
  } catch (err) {
    console.error("Error creating question:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getAllQuestionsFromQuizId = asyncHandler(async (req, res) => {
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

    // Find all questions for the given quiz ID and populate the 'quiz' field in each question
    const questions = await Question.find({ quiz: quiz_id }).select("-quiz");
    const randomQuestions = lodash.sampleSize(questions, 10); // Get 10 random questions

    res.json({
      code: 200,
      status: true,
      message: "",
      quiz: quiz,
      questions: randomQuestions,
    });
  } catch (err) {
    throw new Error(err);
  }
});

const getSpecificQuestion = asyncHandler(async (req, res) => {
  const { question_id } = req.query;
  try {
    // Check if the provided question_id is a valid ObjectId
    if (!validateMongoDbId(question_id)) {
      return res.json({
        code: 400,
        status: false,
        message: "Invalid question id format",
      });
    }

    const question = await Question.findById(question_id).populate("quiz");
    if (question) {
      res.json({ code: 200, status: true, message: "", question: question });
    } else {
      res.json({ code: 404, status: false, message: "Question not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const deleteSpecificQuestion = asyncHandler(async (req, res) => {
  const { question_id } = req.query;
  try {
    // Check if the provided question_id is a valid ObjectId
    if (!validateMongoDbId(question_id)) {
      return res.json({
        code: 400,
        status: false,
        message: "Invalid question_id format",
      });
    }

    const deleteQuestion = await Question.findByIdAndDelete(question_id);
    if (deleteQuestion) {
      res.json({
        code: 200,
        status: true,
        message: "Question deleted successfully",
      });
    } else {
      res.json({ code: 404, status: false, message: "Question not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const updateQuestion = asyncHandler(async (req, res) => {
  const { question_id, question, options, correctOptionIndex } = req.body;

  try {
    // Validate question ID
    if (!validateMongoDbId(question_id)) {
      return res.status(400).json({
        code: 400,
        status: false,
        message: "Invalid question_id format",
      });
    }

    // Find the existing question
    const existingQuestion = await Question.findById(question_id);
    if (!existingQuestion) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "Question not found",
      });
    }

    // Validate required fields
    if (!question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        code: 400,
        status: false,
        message: "Question and at least two options are required",
      });
    }

    if (
      correctOptionIndex === undefined ||
      correctOptionIndex < 0 ||
      correctOptionIndex >= options.length
    ) {
      return res.status(400).json({
        code: 400,
        status: false,
        message: "Correct option index must match one of the options",
      });
    }

    // Check for duplicate question within the same quiz
    const duplicate = await Question.findOne({
      _id: { $ne: question_id },
      quiz: existingQuestion.quiz,
      question: question,
    });

    if (duplicate) {
      return res.status(400).json({
        code: 400,
        status: false,
        message:
          "Another question with the same content already exists in this quiz",
      });
    }

    // Update and save question
    existingQuestion.question = question;
    existingQuestion.options = options;
    existingQuestion.correctOptionIndex = correctOptionIndex;

    const updatedQuestion = await existingQuestion.save();

    const totalQuestions = await Question.countDocuments({
      quiz: existingQuestion.quiz,
    });
    const quizDoc = await Quiz.findById(existingQuestion.quiz);

    if (quizDoc && quizDoc.startTime) {
      quizDoc.endTime = calculateEndTime(quizDoc.startTime, totalQuestions);
      await quizDoc.save();
    }

    res.status(200).json({
      code: 200,
      status: true,
      message: "Question has been updated successfully",
      data: updatedQuestion,
    });
  } catch (err) {
    console.error("Error updating question:", err);
    res.status(500).json({
      code: 500,
      status: false,
      message: "Internal Server Error",
    });
  }
});

const policyUpdate = asyncHandler(async (req, res) => {
  try {
    const { type, content } = req.body;
    if (!type || !content) {
      return res
        .status(400)
        .json({ message: "Type and content are required", status: false });
    }

    let policy = await Policy.findOne({ type });
    if (policy) {
      policy.content = content;
      await policy.save();
      return res
        .status(200)
        .json({ message: "Policy updated successfully", status: true, policy });
    } else {
      policy = new Policy({ type, content });
      await policy.save();
      return res
        .status(200)
        .json({ message: "Policy created successfully", status: true, policy });
    }
  } catch (error) {
    console.error("Error updating policy:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
      error: error.message,
    });
  }
});

const getPolicy = asyncHandler(async (req, res) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res
        .status(400)
        .json({ message: "Policy type is required", status: false });
    }

    const policy = await Policy.findOne({ type });
    if (!policy) {
      return res
        .status(404)
        .json({ message: "Policy not found", status: false });
    }

    res
      .status(200)
      .json({ message: "Policy fetched successfully", status: true, policy });
  } catch (error) {
    console.error("Error fetching policy:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
      error: error.message,
    });
  }
});

const addFAQ = asyncHandler(async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res
        .status(400)
        .json({ message: "Question and answer are required." });
    }

    const newFAQ = new FAQ({
      question,
      answer,
    });

    await newFAQ.save();

    res.status(200).json({ message: "FAQ added successfully", faq: newFAQ });
  } catch (error) {
    console.error("Error adding FAQ:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const updateFAQ = asyncHandler(async (req, res) => {
  try {
    const { question, answer, isActive, id } = req.body;

    const updatedFAQ = await FAQ.findByIdAndUpdate(
      id,
      { question, answer, isActive },
      { new: true, runValidators: true }
    );

    if (!updatedFAQ) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    res
      .status(200)
      .json({ message: "FAQ updated successfully", faq: updatedFAQ });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const getAllFAQs = asyncHandler(async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ createdAt: -1 });
    res.status(200).json({ faqs, message: "FAQ fetch successfully" });
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const getFAQById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.query;
    const faq = await FAQ.findById(id);

    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    res.status(200).json({ faq, message: "FAQ fetch successfully" });
  } catch (error) {
    console.error("Error fetching FAQ:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const getAllTransaction = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // First, find matching user IDs if search keyword is provided
    let userFilter = {};

    if (search) {
      const regex = new RegExp(search, "i");
      const matchingUsers = await User.find({
        $or: [{ firstname: regex }, { lastname: regex }],
      }).select("_id");

      const userIds = matchingUsers.map((user) => user._id);
      userFilter.userId = { $in: userIds };
    }

    const totalTransactions = await Transaction.countDocuments(userFilter);

    const transactions = await Transaction.find(userFilter)
      .populate("userId")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    return res.status(200).json({
      message: "Transaction history fetched successfully",
      status: true,
      totalTransactions,
      currentPage: pageNum,
      totalPages: Math.ceil(totalTransactions / limitNum),
      data: transactions,
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return res.status(500).json({
      message: "Server Error",
      status: false,
    });
  }
});

const updateKycStatus = asyncHandler(async (req, res) => {
  try {
    const { userId, status } = req.body;

    // Validate input
    if (!userId || !status) {
      return res.status(400).json({
        status: false,
        message: "userId and status are required",
      });
    }

    const allowedStatuses = ["pending", "approved", "rejected"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        status: false,
        message: `Invalid status value. Allowed values: ${allowedStatuses.join(
          ", "
        )}`,
      });
    }

    // Find and update
    const kyc = await Kyc.findOneAndUpdate(
      { userId },
      { status },
      { new: true, runValidators: true }
    );

    if (!kyc) {
      return res.status(404).json({
        status: false,
        message: "KYC record not found for this user",
      });
    }

    return res.status(200).json({
      status: true,
      message: "KYC status updated successfully",
      data: kyc,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

const getUserDetailsById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.query;

    const user = await User.findById(id).lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const kyc = await Kyc.find({ userId: id });

    // 1. Get quizzes the user has joined
    const joinedQuizzes = await Quiz.find({ users: id })
      .select("_id title date startTime endTime joiningAmount")
      .lean();

    // 2. Get quizzes the user has played (results)
    const playedQuizzes = await QuizResult.find({ user: id })
      .populate("quiz", "title date startTime endTime")
      .lean();

    const bankDetails = await BankDetails.findOne({ userId: id });

    // 3. Attach KYC data
    if (kyc) {
      user.kyc = kyc;
    }

    // 4. Attach Bank Details
    if (bankDetails) {
      user.bankDetails = bankDetails;
    }

    return res.status(200).json({
      success: true,
      message: "User details fetched successfully",
      user,
      joinedQuizzes,
      playedQuizzes,
    });
  } catch (error) {
    console.error("Error in getUserDetailsById:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching user details",
      error: error.message,
    });
  }
});

const updateReferralBonus = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  let settings = await ReferralSettings.findOne();
  if (!settings) {
    settings = new ReferralSettings({ referralBonus: amount });
  } else {
    settings.referralBonus = amount;
  }
  await settings.save();

  res.json({
    code: 200,
    status: true,
    message: "Referral bonus updated successfully",
    referralBonus: settings.referralBonus,
  });
});

const getReferralSettings = asyncHandler(async (req, res) => {
  const settings = await ReferralSettings.findOne();
  if (!settings) {
    return res.status(404).json({
      code: 404,
      status: false,
      message: "Referral settings not found",
    });
  }
  res.json({
    code: 200,
    status: true,
    message: "Referral settings retrieved successfully",
    data: settings,
  });
});

const getAllReviews = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // First, find matching user IDs if search keyword is provided
    let userFilter = {};

    if (search) {
      const regex = new RegExp(search, "i");
      const matchingUsers = await User.find({
        $or: [{ firstname: regex }, { lastname: regex }],
      }).select("_id");

      const userIds = matchingUsers.map((user) => user._id);
      userFilter.userId = { $in: userIds };
    }

    const totalReviews = await Review.countDocuments(userFilter);

    const Reviews = await Review.find(userFilter)
      .populate("userId")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    return res.status(200).json({
      message: "Reviews fetched successfully",
      status: true,
      totalReviews,
      currentPage: pageNum,
      totalPages: Math.ceil(totalReviews / limitNum),
      data: Reviews,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return res.status(500).json({
      message: "Server Error",
      status: false,
    });
  }
});

const addOrUpdateContactUs = asyncHandler(async (req, res) => {
  try {
    const { id, officeLocation, email, phone } = req.body;

    if (!officeLocation || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // If `id` is provided, update the existing document
    if (id) {
      const updatedContact = await ContactUs.findByIdAndUpdate(
        id,
        { officeLocation, email, phone },
        { new: true }
      );

      if (!updatedContact) {
        return res.status(404).json({
          success: false,
          message: "ContactUs not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "ContactUs updated successfully",
        data: updatedContact,
      });
    }

    // Check if a ContactUs document already exists
    const existing = await ContactUs.findOne();
    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          "Only one ContactUs document is allowed. Please update the existing one.",
        data: existing,
      });
    }

    // Create new ContactUs document
    const newContactUs = new ContactUs({ officeLocation, email, phone });
    await newContactUs.save();

    res.status(200).json({
      success: true,
      message: "ContactUs added successfully",
      data: newContactUs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

const getContactUs = asyncHandler(async (req, res) => {
  try {
    const contactUs = await ContactUs.findOne();
    res.status(200).json({ success: true, data: contactUs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const getAllQuizByTypeInAdmin = asyncHandler(async (req, res) => {
  const currentDateTime = parseCustomDate(req.query.currentDateTime);
  const { type, search = "", page = 1, limit = 10 } = req.query;

  try {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // 🔍 Search filter
    let quizFilter = {};
    if (search) {
      const regex = new RegExp(search, "i");
      quizFilter = {
        $or: [{ title: regex }, { description: regex }],
      };
    }

    // पहले सारे quiz निकालो (search applied)
    const allQuizzes = await Quiz.find(quizFilter).sort({ createdAt: -1 });

    if (allQuizzes.length === 0) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No quiz found",
      });
    }

    // ✅ Classification buckets
    const result = {
      completed: [],
      upcoming: [],
      live: [],
      expired: [],
      todayQuiz: [],
    };

    const today = new Date(currentDateTime);
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    allQuizzes.forEach((quiz) => {
      if (!quiz.startTime || !quiz.endTime) return;

      const quizDate = new Date(quiz.date);

      // Start Time Parse
      const [startTime, startModifier] = quiz.startTime.split(" ");
      let [sHours, sMinutes, sSeconds] = startTime?.split(":").map(Number) || [
        0, 0, 0,
      ];
      if (startModifier?.toLowerCase() === "pm" && sHours < 12) sHours += 12;
      if (startModifier?.toLowerCase() === "am" && sHours === 12) sHours = 0;
      const quizStart = new Date(quizDate);
      quizStart.setHours(sHours, sMinutes, sSeconds || 0, 0);

      // End Time Parse
      const [endTime, endModifier] = quiz.endTime.split(" ");
      let [eHours, eMinutes, eSeconds] = endTime?.split(":").map(Number) || [
        0, 0, 0,
      ];
      if (endModifier?.toLowerCase() === "pm" && eHours < 12) eHours += 12;
      if (endModifier?.toLowerCase() === "am" && eHours === 12) eHours = 0;
      const quizEnd = new Date(quizDate);
      quizEnd.setHours(eHours, eMinutes, eSeconds || 0, 0);

      // 📌 Today Quiz
      if (quizDate >= today && quizDate < tomorrow) {
        result.todayQuiz.push(quiz);
      }

      // 📌 Classification
      if (quizStart > currentDateTime) {
        result.upcoming.push(quiz);
      } else if (quizStart <= currentDateTime && quizEnd >= currentDateTime) {
        result.live.push(quiz);
      } else if (quizEnd < currentDateTime && quiz.users?.length > 0) {
        result.completed.push(quiz);
      } else if (
        quizEnd < currentDateTime &&
        (!quiz.users || quiz.users.length === 0)
      ) {
        result.expired.push(quiz);
      }
    });

    // ✅ अगर type दिया है तो सिर्फ उसी को pagination करो
    if (type && result[type]) {
      const total = result[type].length;
      const paginated = result[type].slice(
        (pageNum - 1) * limitNum,
        pageNum * limitNum
      );

      return res.json({
        code: 200,
        status: true,
        type,
        total,
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        data: paginated,
      });
    }

    // ✅ वरना सब categories का paginated result दो
    const paginateCategory = (arr) =>
      arr.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.json({
      code: 200,
      status: true,
      total: allQuizzes.length,
      currentPage: pageNum,
      totalPages: Math.ceil(allQuizzes.length / limitNum),
      completed: paginateCategory(result.completed),
      upcoming: paginateCategory(result.upcoming),
      live: paginateCategory(result.live),
      expired: paginateCategory(result.expired),
      todayQuiz: paginateCategory(result.todayQuiz),
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

const addStreakReward = asyncHandler(async (req, res) => {
  const { streakDay, rewardAmount } = req.body;

  if (!streakDay || !rewardAmount) {
    return res.status(400).json({
      code: 400,
      status: false,
      message: "streakDay and rewardAmount are required",
    });
  }

  const existing = await StreakReward.findOne({ streakDay });
  if (existing) {
    return res.status(409).json({
      code: 409,
      status: false,
      message: "Reward for this streakDay already exists",
    });
  }

  const reward = await StreakReward.create({ streakDay, rewardAmount });
  res.status(201).json({
    code: 201,
    status: true,
    message: "Reward added successfully",
    reward,
  });
});

const updateStreakReward = asyncHandler(async (req, res) => {
  const { streakDay, rewardAmount, id } = req.body;
  const reward = await StreakReward.findByIdAndUpdate(
    id,
    { streakDay, rewardAmount },
    { new: true }
  );

  if (!reward) {
    return res.status(404).json({
      code: 404,
      status: false,
      message: "Reward not found",
    });
  }

  res.json({
    code: 200,
    status: true,
    message: "Reward updated successfully",
    reward,
  });
});

const deleteStreakReward = asyncHandler(async (req, res) => {
  const { id } = req.query;

  const reward = await StreakReward.findByIdAndDelete(id);
  if (!reward) {
    return res.status(404).json({
      code: 404,
      status: false,
      message: "Reward not found",
    });
  }

  res.json({
    code: 200,
    status: true,
    message: "Reward deleted successfully",
  });
});

const getAllStreakRewards = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [rewards, total] = await Promise.all([
      StreakReward.find()
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ streakDay: 1 }),
      StreakReward.countDocuments(),
    ]);

    if (rewards.length === 0) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No rewards found",
      });
    }

    res.json({
      code: 200,
      status: true,
      rewards,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error("Error fetching rewards:", err);
    res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

const addStreakBadge = asyncHandler(async (req, res) => {
  const { level, name } = req.body;
  if (!level || !name) {
    return res.status(400).json({
      code: 400,
      status: false,
      message: "Level and name are required",
    });
  }

  const badge = await Badge.create({ level, name });

  res.status(201).json({
    code: 201,
    status: true,
    message: "Badge added successfully",
    data: badge,
  });
});

const updateStreakBadge = asyncHandler(async (req, res) => {
  const { level, name, id } = req.body;

  if (!level || !name) {
    return res.status(400).json({
      code: 400,
      status: false,
      message: "Level and name are required",
    });
  }

  const badge = await Badge.findByIdAndUpdate(
    id,
    { level, name },
    { new: true }
  );

  if (!badge) {
    return res.status(404).json({
      code: 404,
      status: false,
      message: "Badge not found",
    });
  }

  res.json({
    code: 200,
    status: true,
    message: "Badge updated successfully",
    data: badge,
  });
});

const deleteStreakBadge = asyncHandler(async (req, res) => {
  const { id } = req.query;

  const badge = await Badge.findByIdAndDelete(id);
  if (!badge) {
    return res.status(404).json({
      code: 404,
      status: false,
      message: "Badge not found",
    });
  }

  res.json({
    code: 200,
    status: true,
    message: "Badge deleted successfully",
  });
});

const getAllStreakBadges = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [badges, total] = await Promise.all([
      Badge.find().skip(skip).limit(parseInt(limit)).sort({ streakDay: 1 }),
      Badge.countDocuments(),
    ]);

    if (badges.length === 0) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No badges found",
      });
    }

    res.json({
      code: 200,
      status: true,
      badges,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error("Error fetching badges:", err);
    res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

const getAllTickets = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // First, find matching user IDs if search keyword is provided
    let userFilter = {};

    if (search) {
      const regex = new RegExp(search, "i");
      const matchingUsers = await User.find({
        $or: [{ firstname: regex }, { lastname: regex }],
      }).select("_id");

      const userIds = matchingUsers.map((user) => user._id);
      userFilter.userId = { $in: userIds };
    }

    const totalTickets = await Ticket.countDocuments(userFilter);

    const tickets = await Ticket.find(userFilter)
      .populate("userId")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    return res.status(200).json({
      message: "Ticket history fetched successfully",
      status: true,
      totalTickets,
      currentPage: pageNum,
      totalPages: Math.ceil(totalTickets / limitNum),
      data: tickets,
    });
  } catch (error) {
    console.error("Error fetching ticket history:", error);
    return res.status(500).json({
      message: "Server Error",
      status: false,
    });
  }
});

const updateTicketStatus = asyncHandler(async (req, res) => {
  try {
    const { status, adminResponse, id } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res
        .status(404)
        .json({ status: false, message: "Ticket not found" });
    }
    if (status) ticket.status = status;
    if (adminResponse) ticket.adminResponse = adminResponse;
    await ticket.save();
    res.json({ status: true, message: "Ticket updated successfully", ticket });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    res.status(500).json({ status: false, message: "Server Error" });
  }
});

module.exports = {
  adminSignup,
  loginAdmin,
  getAdminDetail,
  resetAdminPassword,
  updateAdminDetail,
  getAllUsers,
  getSpecificUser,
  deleteSpecificUser,
  updateUserBlockStatus,
  createQuiz,
  getAllQuizInAdmin,
  getSpecificQuiz,
  deleteSpecificQuiz,
  updateQuiz,
  policyUpdate,
  getPolicy,
  addFAQ,
  updateFAQ,
  getAllFAQs,
  getFAQById,
  createQuestion,
  getSpecificQuestion,
  deleteSpecificQuestion,
  updateQuestion,
  getAllQuestionsFromQuizId,
  getAllTransaction,
  getAllPracticeQuizInAdmin,
  updateKycStatus,
  getUserDetailsById,
  updateReferralBonus,
  getReferralSettings,
  getAllReviews,
  addOrUpdateContactUs,
  getContactUs,
  getAllQuizByTypeInAdmin,
  addStreakReward,
  updateStreakReward,
  deleteStreakReward,
  getAllStreakRewards,
  addStreakBadge,
  updateStreakBadge,
  deleteStreakBadge,
  getAllStreakBadges,
  getAllTickets,
  updateTicketStatus
};
