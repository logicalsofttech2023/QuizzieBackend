const mongoose = require("mongoose");

const bankDetailsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  accountHolderName: {
    type: String,
    required: [true, "Account holder name is required"],
    trim: true,
  },
  accountNumber: {
    type: String,
    required: [true, "Account number is required"],
  },
  ifscCode: {
    type: String,
    required: [true, "IFSC code is required"],
  },
  bankName: {
    type: String,
    required: [true, "Bank name is required"],
    trim: true,
  },
});

module.exports = mongoose.model("BankDetails", bankDetailsSchema);
