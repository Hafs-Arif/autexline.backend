const express = require('express');
const router = express.Router();
const { getSiteContent, updateSiteContent, deleteHeroBanner, deleteAdGridImage, deleteLeftSidebarImage } = require('../controllers/siteContentController');
const { protect, roles } = require('../middleware/authMiddleware');

router.get('/', getSiteContent);
router.put('/', protect, roles('admin'), updateSiteContent);
router.delete('/hero/:publicId', protect, roles('admin'), deleteHeroBanner);
router.delete('/ad-grid/:publicId', protect, roles('admin'), deleteAdGridImage);
router.delete('/sidebar', protect, roles('admin'), deleteLeftSidebarImage);

module.exports = router; 