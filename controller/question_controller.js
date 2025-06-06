const Question = require("../models/question_model");
const Quiz = require("../models/quiz_model");
const { validateMongoDbId } = require("../utils/validate_mongo_db_id");
const asyncHandler = require("express-async-handler");
const lodash = require("lodash");

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
        message: "Another question with the same content already exists in this quiz",
      });
    }

    // Update and save question
    existingQuestion.question = question;
    existingQuestion.options = options;
    existingQuestion.correctOptionIndex = correctOptionIndex;

    const updatedQuestion = await existingQuestion.save();

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


module.exports = {
  createQuestion,
  getSpecificQuestion,
  deleteSpecificQuestion,
  updateQuestion,
  getAllQuestionsFromQuizId,
};
