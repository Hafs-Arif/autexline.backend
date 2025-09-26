const express = require('express');
const router = express.Router();
const partController = require('../controllers/partController');
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/mediaUpload');

// Public reads
router.get('/', partController.getAllParts);
router.get('/search', partController.searchParts);
router.get('/:id', partController.getPartById);

// Authenticated writes
router.post('/', auth.protect, auth.roles('admin', 'dealer', 'agent'), upload.fields([{ name: 'images', maxCount: 25 }, { name: 'video', maxCount: 1 }]), partController.createPart);
router.put('/:id', auth.protect, auth.roles('admin'), partController.updatePart);
router.delete('/:id', auth.protect, auth.roles('admin'), partController.deletePart);

module.exports = router; 