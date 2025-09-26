const SiteContent = require('../models/SiteContent');
const upload = require('../middleware/mediaUpload');
const { uploadImage, cloudinary } = require('../utils/cloudinary');

// Simple in-memory cache for GET response
let cachedContent = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// GET current site content
exports.getSiteContent = async (req, res, next) => {
  try {
    const now = Date.now();
    if (cachedContent && now - cacheTime < CACHE_TTL_MS) {
      res.set('Cache-Control', 'public, max-age=60');
      return res.json(cachedContent);
    }
    const doc = await SiteContent.findOne().sort({ updatedAt: -1 }).lean();
    cachedContent = doc || { heroBanners: [], adGridImages: [], leftSidebarAdImage: null };
    cacheTime = now;
    res.set('Cache-Control', 'public, max-age=60');
    res.json(cachedContent);
  } catch (err) {
    next(err);
  }
};

// PUT update site content
// Accepts multipart/form-data with fields:
// - heroBanners[] (files) OR heroBannersUrls[] (string URLs)
// - adGridImages[] (files) OR adGridImagesUrls[] (string URLs)
// - leftSidebarAdImage (file) OR leftSidebarAdImageUrl (string)
exports.updateSiteContent = [
  upload.fields([
    { name: 'heroBanners', maxCount: 10 },
    { name: 'adGridImages', maxCount: 4 },
    { name: 'leftSidebarAdImage', maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      // Helper to normalize to array of { url, publicId }
      const toCloudinaryObj = (uploadResult) => ({ url: uploadResult.secure_url, publicId: uploadResult.public_id });

      // Hero banners
      let heroBanners = [];
      if (req.files?.heroBanners?.length) {
        for (const file of req.files.heroBanners) {
          const result = await uploadImage(file.buffer, { folder: 'autoshop/site/hero', use_filename: false, unique_filename: true, overwrite: false });
          heroBanners.push(toCloudinaryObj(result));
        }
      }
      if (Array.isArray(req.body.heroBannersUrls)) {
        heroBanners = heroBanners.concat(req.body.heroBannersUrls.filter(Boolean).map((url) => ({ url, publicId: url })));
      }

      // Ad grid
      let adGridImages = [];
      if (req.files?.adGridImages?.length) {
        for (const file of req.files.adGridImages) {
          const result = await uploadImage(file.buffer, { folder: 'autoshop/site/ad-grid', use_filename: false, unique_filename: true, overwrite: false });
          adGridImages.push(toCloudinaryObj(result));
        }
      }
      if (Array.isArray(req.body.adGridImagesUrls)) {
        adGridImages = adGridImages.concat(req.body.adGridImagesUrls.filter(Boolean).map((url) => ({ url, publicId: url })));
      }

      // Left sidebar
      let leftSidebarAdImage = null;
      if (req.files?.leftSidebarAdImage?.[0]) {
        const result = await uploadImage(req.files.leftSidebarAdImage[0].buffer, { folder: 'autoshop/site/sidebar', use_filename: false, unique_filename: true, overwrite: false });
        leftSidebarAdImage = toCloudinaryObj(result);
      } else if (req.body.leftSidebarAdImageUrl) {
        leftSidebarAdImage = { url: req.body.leftSidebarAdImageUrl, publicId: req.body.leftSidebarAdImageUrl };
      }

      const payload = {};
      if (heroBanners.length) payload.heroBanners = heroBanners;
      if (adGridImages.length) payload.adGridImages = adGridImages;
      if (leftSidebarAdImage) payload.leftSidebarAdImage = leftSidebarAdImage;
      payload.updatedBy = req.user?._id;

      const updated = await SiteContent.findOneAndUpdate({}, payload, { upsert: true, new: true, setDefaultsOnInsert: true });
      cachedContent = updated;
      cacheTime = Date.now();
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
];

// DELETE a hero banner by publicId
exports.deleteHeroBanner = async (req, res, next) => {
  try {
    const { publicId } = req.params;
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    const updated = await SiteContent.findOneAndUpdate({}, { $pull: { heroBanners: { publicId } } }, { new: true });
    cachedContent = updated;
    cacheTime = Date.now();
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// DELETE an ad grid image by publicId
exports.deleteAdGridImage = async (req, res, next) => {
  try {
    const { publicId } = req.params;
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    const updated = await SiteContent.findOneAndUpdate({}, { $pull: { adGridImages: { publicId } } }, { new: true });
    cachedContent = updated;
    cacheTime = Date.now();
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// DELETE the left sidebar image
exports.deleteLeftSidebarImage = async (req, res, next) => {
  try {
    const doc = await SiteContent.findOne();
    if (doc?.leftSidebarAdImage?.publicId) {
      await cloudinary.uploader.destroy(doc.leftSidebarAdImage.publicId, { resource_type: 'image' });
    }
    doc.leftSidebarAdImage = null;
    await doc.save();
    cachedContent = doc;
    cacheTime = Date.now();
    res.json(doc);
  } catch (err) {
    next(err);
  }
}; 