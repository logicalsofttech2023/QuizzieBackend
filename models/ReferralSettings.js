const mongoose = require("mongoose");

const referralSettingsSchema = new mongoose.Schema(
  {
    referralBonus: {
      type: Number,
      default: 10,
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("ReferralSettings", referralSettingsSchema);
