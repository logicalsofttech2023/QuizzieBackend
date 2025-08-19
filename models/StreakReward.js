const mongoose = require("mongoose");

const streakRewardSchema = new mongoose.Schema(
  {
    streakDay: {
      type: Number,
      required: true,
      unique: true,
    },
    rewardAmount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("StreakReward", streakRewardSchema);
