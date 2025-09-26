const express = require('express');
const router = express.Router();
const productRequestController = require('../controllers/productRequestController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes (require authentication)
router.use(authMiddleware.protect);

// Upload media for requests (dealers/agents)
router.post('/upload-images', productRequestController.uploadRequestImages);
router.post('/upload-video', productRequestController.uploadRequestVideo);

// User routes (dealers/agents)
router.post('/', productRequestController.createRequest);
router.get('/my-requests', productRequestController.getMyRequests);

// Admin routes (require admin role)
router.get('/admin/all', authMiddleware.requireAdmin, productRequestController.getAllRequests);
router.get('/admin/pending-count', authMiddleware.requireAdmin, productRequestController.getPendingCount);
router.get('/admin/:id', authMiddleware.requireAdmin, productRequestController.getRequestById);
router.post('/admin/:id/approve', authMiddleware.requireAdmin, productRequestController.approveRequest);
router.post('/admin/:id/reject', authMiddleware.requireAdmin, productRequestController.rejectRequest);
router.post('/admin/:id/edit-approve', authMiddleware.requireAdmin, productRequestController.editAndApproveRequest);

module.exports = router; 