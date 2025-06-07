const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["addMoney", "quizParticipation"], required: true },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    transactionId: { type: String, unique: true },
    description: { type: String },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
