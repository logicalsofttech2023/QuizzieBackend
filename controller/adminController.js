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

const generateJwtToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const adminSignup = async (req, res) => {
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
};

const loginAdmin = async (req, res) => {
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
};

const getAdminDetail = async (req, res) => {
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
};

const resetAdminPassword = async (req, res) => {
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
};

const updateAdminDetail = async (req, res) => {
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
};

const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;

    let searchFilter = {};
    if (search) {
      searchFilter = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ]
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(searchFilter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),

      User.countDocuments(searchFilter)
    ]);

    if (users.length === 0) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "No users found"
      });
    }

    res.json({
      code: 200,
      status: true,
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({
      code: 500,
      status: false,
      message: "Internal server error",
      error: err.message
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
  } = req.body;

  // Basic validation
  if (!title || !prize || !date || joiningAmount == null || !type || !startTime) {
    return res.status(400).json({
      code: 400,
      status: false,
      message: "Required fields: title, prize, date, startTime, joiningAmount",
    });
  }

  try {
    // Check for existing quiz with the same title
    const existingQuiz = await Quiz.findOne({ title });
    if (existingQuiz) {
      return res.status(409).json({
        code: 409,
        status: false,
        message: "Quiz with this title already exists",
      });
    }

    // Create and save the new quiz
    const newQuiz = await Quiz.create({
      title,
      description,
      prize,
      date,
      entries: entries || 0,
      joiningAmount,
      type,
      status,
      startTime,
    });

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
    const allQuizzes = await Quiz.find().sort({ createdAt: -1 });

    if (allQuizzes.length === 0) {
      return res
        .status(404)
        .json({ code: 404, status: false, message: "No quiz found" });
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
  } = req.body;

  try {
    // Validate ObjectId
    if (!validateMongoDbId(quiz_id)) {
      return res.status(400).json({
        code: 400,
        status: false,
        message: "Invalid quiz id format",
      });
    }

    // Check if quiz exists
    const quiz = await Quiz.findById(quiz_id);
    if (!quiz) {
      return res.status(404).json({
        code: 404,
        status: false,
        message: "Quiz not found",
      });
    }

    // Check for duplicate title
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

    // Prepare update object with sanitized string fields
    const updateFields = {
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

const getAllQuizFromQuizCatId = asyncHandler(async (req, res) => {
  const { quiz_category_id } = req.params;
  try {
    // Check if the provided quiz_category_id is a valid ObjectId
    if (!validateMongoDbId(quiz_category_id)) {
      return res.json({
        code: 400,
        status: false,
        message: "Invalid quiz category id format",
      });
    }
    // Find the quiz by Quiz Category ID
    const allQuizzes = await Quiz.find({ category: quiz_category_id }).populate(
      "category"
    );
    const quizCount = await Quiz.countDocuments({ category: quiz_category_id });
    if (allQuizzes.length > 0) {
      const quizzesWithQuestionCount = await Promise.all(
        allQuizzes.map(async (quiz) => {
          const questionCount = await Question.countDocuments({
            quiz: quiz._id,
          });
          return { ...quiz.toObject(), questionCount };
        })
      );
      res.json({
        code: 200,
        status: true,
        count: quizCount,
        quizzes: quizzesWithQuestionCount,
      });
    } else {
      res.json({ code: 404, status: false, message: "No quiz found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const policyUpdate = async (req, res) => {
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
};

const getPolicy = async (req, res) => {
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
};

const addFAQ = async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ message: "Question and answer are required." });
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
};

const updateFAQ = async (req, res) => {
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

    res.status(200).json({ message: "FAQ updated successfully", faq: updatedFAQ });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ createdAt: -1 });
    res.status(200).json({ faqs, message: "FAQ fetch successfully" });
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getFAQById = async (req, res) => {
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
};

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
  getAllQuizFromQuizCatId,
  policyUpdate,
  getPolicy,
  addFAQ,
  updateFAQ,
  getAllFAQs,
  getFAQById,
};
