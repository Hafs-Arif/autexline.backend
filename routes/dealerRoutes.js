const express = require('express');
const router = express.Router();
const dealerController = require('../controllers/dealerController');

router.get('/', dealerController.getAllDealers);
router.get('/:id', dealerController.getDealerById);
router.post('/', dealerController.createDealer);
router.put('/:id', dealerController.updateDealer);

module.exports = router; 