const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  selectedOptionIndex: {
    type: Number,
    default: null, // null means not attempted
  }
}, { _id: false });

const quizResultSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  quizPlayed: {
    type: Number,
    default: 0,
  },
  quizWon: {
    type: Number,
    default: 0,
  },
  correctCount: {
    type: Number,
    default: 0,
  },
  incorrectCount: {
    type: Number,
    default: 0,
  },
  notAttemptedCount: {
    type: Number,
    default: 0,
  },
  streakBonus: {
    type: Number,
    default: 0,
  },
  bonusPoints: {
    type: Number,
    default: 0,
  },
  completionPercentage: {
    type: Number,
    default: 0,
  },
  answers: [answerSchema]
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('QuizResult', quizResultSchema);
