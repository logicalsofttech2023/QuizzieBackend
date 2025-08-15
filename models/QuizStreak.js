const mongoose = require("mongoose");

const quizStreakSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    currentStreak: { type: Number, default: 0 }, // current active streak
    bestStreak: { type: Number, default: 0 }, // highest streak achieved
    lastPlayedDate: { type: Date }, // last quiz played date

    lives: { type: Number, default: 1 }, // monthly lives (1 per month)
    lifeLastGiven: { type: Date, default: Date.now }, // track when last life given

    countdownEndTime: { type: Date }, // 24 hr window end time

    rewardsHistory: [
      {
        streakDay: Number,
        rewardAmount: Number,
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuizStreak", quizStreakSchema);
