const mongoose = require("mongoose");

const badgeSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Badge", badgeSchema);
