const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true }
}, { _id: false });

const siteContentSchema = new mongoose.Schema({
  heroBanners: { type: [imageSchema], default: [] },
  adGridImages: { type: [imageSchema], default: [] },
  leftSidebarAdImage: { type: imageSchema, default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('SiteContent', siteContentSchema); 