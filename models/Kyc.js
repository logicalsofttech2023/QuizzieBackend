const mongoose = require("mongoose");



const kycSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    aadharNo: {
      type: String,
      required: [true, "Aadhar number is required"],
    },
    aadharFrontImg: {
      type: String,
      required: [true, "Aadhar front image is required"],
    },
    aadharBackImg: {
      type: String,
      required: [true, "Aadhar back image is required"],
    },
    panNo: {
      type: String,
      required: [true, "PAN number is required"],
    },
    panFrontImg: {
      type: String,
      required: [true, "PAN front image is required"],
    },
    panBackImg: {
      type: String,
      required: [true, "PAN back image is required"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Kyc", kycSchema);

