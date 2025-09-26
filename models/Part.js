const mongoose = require('mongoose');

const partSchema = new mongoose.Schema({
  name: { type: String, required: true },
  refNo: { type: String, index: true, unique: true, sparse: true },
  category: { type: String },
  brand: { type: String },
  make: { type: String }, // Select Maker field
  customMaker: { type: String }, // Custom maker value when "Custom" is selected
  model: { type: String }, // Select Model field
  price: { type: Number },
  stock: { type: Number, default: 0 },
  stockQuantity: { type: String }, // Stock quantity as string for flexibility
  images: [String],
  video: String, // Add video field for auto parts
  description: String,
  modelCode: String,
  year: String,
  condition: { 
    type: String,
    enum: ['new', 'old'],
    default: 'old'
  }, // For auto parts (new/old)
  compatibleVehicles: [String],
  comments: String // Comments field for admin/dealer notes
}, {
  timestamps: true
});

module.exports = mongoose.model('Part', partSchema); 