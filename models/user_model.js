const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Declare the Schema of the Mongo model
var userSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
    },
    lastname: {
      type: String,
    },
    userEmail: {
      type: String,
      unique: true,
    },
    mobile: {
      type: String,
      unique: true,
    },
    role: {
      type: String,
      default: "user",
    },
    isMobileNumberVerified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    about: {
      type: String,
    },
    profilePic: {
      type: String,
      default:
        "https://res.cloudinary.com/dt6hyafmc/image/upload/v1692392344/Avatars/avatar_8609.png",
    },
    otp: String,
    otpCreatedAt: Date,
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("User", userSchema);
