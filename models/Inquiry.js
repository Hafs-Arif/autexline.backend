const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  actionType: {
    type: String,
    enum: ['price_quote', 'buy_now'],
    default: 'price_quote'
  },
  productId: { type: String },
  productTitle: { type: String },
  productCategory: { type: String },
  productImage: { type: String },
  status: {
    type: String,
    enum: ['new', 'in-progress', 'resolved'],
    default: 'new'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Inquiry', inquirySchema); 