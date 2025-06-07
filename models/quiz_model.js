const mongoose = require("mongoose");

// Declare the Schema of the Mongo model
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
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
    },

    entries: {
      type: String,
      default: "0",
    },
    joiningAmount: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["Mega Quiz", "Special Quiz", "Lite Quiz"],
      required: true,
    },
    status: {
      type: String,
      enum: ["upcoming", "completed"],
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

// Export the model
module.exports = mongoose.model("Quiz", quizSchema);
