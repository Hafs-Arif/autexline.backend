const express = require('express');
const multer = require('multer');
const { submitApplication, getAllApplications, getApplicationById, updateApplicationStatus, deleteApplication } = require('../controllers/careerController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only PDF, DOC, and DOCX files
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
    }
  }
});

// Public routes
router.post('/submit', upload.single('resume'), submitApplication);

// Admin routes (protected)
router.get('/applications', authMiddleware.protect, authMiddleware.requireAdmin, getAllApplications);
router.get('/applications/:id', authMiddleware.protect, authMiddleware.requireAdmin, getApplicationById);
router.put('/applications/:id/status', authMiddleware.protect, authMiddleware.requireAdmin, updateApplicationStatus);
router.delete('/applications/:id', authMiddleware.protect, authMiddleware.requireAdmin, deleteApplication);

module.exports = router;
