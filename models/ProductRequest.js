const mongoose = require('mongoose');

const productRequestSchema = new mongoose.Schema({
  // Request details
  requestType: {
    type: String,
    enum: ['vehicle', 'part'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'edited'],
    default: 'pending'
  },
  
  // Requester information
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requesterName: {
    type: String,
    required: true
  },
  requesterRole: {
    type: String,
    enum: ['dealer', 'agent'],
    required: true
  },
  
  // Product information
  productData: {
    // Common fields
    title: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    description: String,
    images: [String],
    image: String, // Single image field
    video: String, // Video URL
    location: String,
    stockNo: String,
    
    // Pricing fields
    vehiclePrice: String,
    negotiation: String,
    commission: String,
    totalPrice: String,
    
    // Vehicle specific fields
    make: String,
    model: String,
    year: String, // Changed to String to match dealer form
    mileage: String, // Changed to String to match dealer form
    fuelType: String,
    fuel: String, // Alternative fuel field name
    transmission: String,
    color: String,
    engine: String,
    engineCode: String,
    modelCode: String,
    drive: String,
    seats: String,
    doors: String,
    features: [String],
    condition: {
      type: String,
      enum: ['new', 'old'],
      default: 'old'
    }, // For stock cars, construction machinery, bikes, auto parts (new/old)
    conditionComments: String, // For salvage vehicles condition comments
    
    // Extended specifications
    chassisNo: String,
    steering: String,
    versionClass: String,
    registrationYearMonth: String,
    manufactureYearMonth: String,
    dimension: String,
    weight: String,
    maxCapacity: String,
    
    // Part specific fields
    category: String,
    brand: String,
    stock: Number,
    compatibleVehicles: [String],
    comments: String, // Comments field for auto parts
    customMaker: String, // Custom maker value when "Custom" is selected
    
    // Machinery specific fields
    capacity: String
  },
  
  // Admin actions
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  rejectionReason: String,
  adminNotes: String,
  
  // If approved, link to the actual product
  approvedProductId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'approvedProductModel'
  },
  approvedProductModel: {
    type: String,
    enum: ['Vehicle', 'Part']
  }
}, {
  timestamps: true
});

// Index for efficient queries
productRequestSchema.index({ status: 1, createdAt: -1 });
productRequestSchema.index({ requesterId: 1, status: 1 });

module.exports = mongoose.model('ProductRequest', productRequestSchema); 