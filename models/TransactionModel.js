const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["addMoney", "quizParticipation", "referralBonus", "adminReferralBonus"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    amount: { type: Number },
    gstAmount: { type: Number },
    netAmount: { type: Number },
    transactionId: { type: String, unique: true },
    description: { type: String },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
