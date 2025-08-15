const mongoose = require("mongoose");

// Policy Schema
const policySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["about", "terms", "privacy", "trustandsafety"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// FAQ Schema
const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Export both models
const Policy = mongoose.model("Policy", policySchema);
const FAQ = mongoose.model("FAQ", faqSchema);

module.exports = { Policy, FAQ };
