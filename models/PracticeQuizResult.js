const mongoose = require("mongoose");


const practiceQuizResultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true
    },
    totalScore: {
      type: Number,
      default: 0
    },
    correctCount: {
      type: Number,
      default: 0
    },
    incorrectCount: {
      type: Number,
      default: 0
    },
    notAttemptedCount: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    detailedResults: [{
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question"
      },
      questionText: String,
      options: [String],
      selectedOptionIndex: Number,
      correctOptionIndex: Number,
      isCorrect: Boolean,
      isAttempted: Boolean,
      explanation: String,
      score: Number
    }],
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true, versionKey: false }
);

const PracticeQuizResult = mongoose.model("PracticeQuizResult", practiceQuizResultSchema);

module.exports = PracticeQuizResult;