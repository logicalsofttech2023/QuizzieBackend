const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: "",
    },
    prize: {
      type: String,
    },
    date: {
      type: Date,
    },
    startTime: {
      type: String,
    },
    endTime: { type: String },

    entries: {
      type: String,
      default: "0",
    },
    joiningAmount: {
      type: String,
    },
    type: {
      type: String,
      enum: ["Mega_Quiz", "Special_Quiz", "Lite_Quiz", "Small_Battle_Quiz", "Practice_Quiz"],
      required: true,
    },
    status: {
      type: String,
      enum: ["upcoming", "completed", "live"],
      default: "upcoming",
    },
    users: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Quiz", quizSchema);
