const mongoose = require('mongoose');

const contactUsSchema = new mongoose.Schema({
  officeLocation: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: Number,
    required: true,
  },
});

const Contact = mongoose.model("Contact", contactUsSchema);
module.exports = Contact;