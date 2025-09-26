const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  // Classification for inventory sections
  category: {
    type: String,
    enum: ['stockCars', 'salvageVehicles', 'constructionMachinery', 'bikes'],
    default: 'stockCars'
  },

  // Display fields used by the frontend UI
  title: { type: String },
  refNo: { type: String, index: true, unique: true, sparse: true },
  price: { type: String },            // Display price (e.g., "$10,330")
  totalPrice: { type: String },       // Display total price
  originalPrice: { type: String },    // Optional struck-through price
  image: { type: String },            // Primary image URL
  images: [String],                   // Additional images
  stockNo: { type: String },
  mileage: { type: String },          // e.g., "162,182 km"
  year: { type: String },             // e.g., "2018"
  engine: { type: String },           // e.g., "3,342cc"
  engineCode: { type: String },       // e.g., "1NZ-FE"
  modelCode: { type: String },        // e.g., "DBA-XXX"
  transmission: { type: String },
  location: { type: String },
  color: { type: String },
  fuel: { type: String },             // e.g., "Petrol"
  drive: { type: String },
  seats: { type: String },
  doors: { type: String },
  features: [String],

  // Media
  video: { type: String },

  // Category-specific fields
  condition: { 
    type: String,
    enum: ['new', 'old'],
    default: 'old'
  },        // For stock cars, construction machinery, bikes (new/old)
  conditionComments: { type: String }, // Salvage vehicles condition comments
  capacity: { type: String },         // Machinery

  // Legacy fields for compatibility (optional)
  make: { type: String },
  model: { type: String },
  fuelType: { type: String },         // legacy alias of fuel
  description: { type: String },

  // Listing management
  status: {
    type: String,
    enum: ['available', 'sold', 'reserved'],
    default: 'available'
  },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  postedByRole: { type: String, enum: ['admin', 'dealer', 'agent', 'user'] },
  isApproved: { type: Boolean, default: true }
}, {
  timestamps: true,
  strict: false  // Allow additional fields without validation errors
});

// Ensure latest schema is applied even if model was registered earlier
if (mongoose.models.Vehicle) {
  delete mongoose.models.Vehicle;
}

module.exports = mongoose.model('Vehicle', vehicleSchema); 