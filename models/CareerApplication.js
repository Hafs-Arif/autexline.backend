const mongoose = require('mongoose');

const careerApplicationSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  positionApplyingFor: {
    type: String,
    required: true,
    trim: true
  },
  resumeUrl: {
    type: String,
    required: true
  },
  resumePublicId: {
    type: String,
    required: true
  },
  coverLetter: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
    default: 'pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
careerApplicationSchema.index({ email: 1 });
careerApplicationSchema.index({ status: 1 });
careerApplicationSchema.index({ appliedAt: -1 });

module.exports = mongoose.model('CareerApplication', careerApplicationSchema);
