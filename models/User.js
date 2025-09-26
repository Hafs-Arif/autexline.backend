const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'dealer', 'agent'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'approved', 'rejected', 'suspended'],
    default: 'active'
  },
  phone: {
    type: String,
    required: false
  },
  county: {
    type: String,
    required: false
  },
  city: {
    type: String,
    required: false
  },
  loginId: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  // For dealers
  companyName: {
    type: String,
    required: false
  },
  companyAddress: {
    type: String,
    required: false
  },
  // For agents
  agentId: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  // File upload path (optional - no longer required for dealer/agent registration)
  fileUpload: {
    type: String,
    required: false
  },
  // Admin approval fields
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  approvedAt: {
    type: Date,
    required: false
  },
  rejectionReason: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);