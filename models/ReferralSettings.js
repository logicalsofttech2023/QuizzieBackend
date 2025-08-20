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


const referralCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  bonusAmount: { type: Number, required: true, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const ReferralSettings = mongoose.model("ReferralSettings", referralSettingsSchema);
const ReferralCode = mongoose.model("ReferralCode", referralCodeSchema);

module.exports = { ReferralSettings, ReferralCode };
