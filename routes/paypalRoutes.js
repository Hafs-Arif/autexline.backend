const express = require('express');
const router = express.Router();
const paypalController = require('../controllers/paypalController');

console.log('PayPal routes loaded');

// Test PayPal authentication
router.get('/test-auth', paypalController.testPayPalAuth);

// Create and send PayPal invoice
router.post('/create-invoice', paypalController.createAndSendInvoice);

// Get invoice details
router.get('/invoice/:invoiceId', paypalController.getInvoiceDetails);

// Get invoice status
router.get('/invoice/:invoiceId/status', paypalController.getInvoiceDetails);

// Check invoice accessibility
router.get('/invoice/:invoiceId/accessibility', paypalController.checkInvoiceAccessibility);

module.exports = router; 