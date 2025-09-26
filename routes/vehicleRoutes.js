const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/mediaUpload');

// Public reads
router.get('/', vehicleController.getAllVehicles);
router.get('/search', vehicleController.searchVehicles);
router.get('/inventory', vehicleController.getInventoryGrouped);
router.get('/category/:category', vehicleController.getByCategory);
router.get('/:id', vehicleController.getVehicleById);

// Authenticated writes
router.post(
  '/',
  auth.protect,
  auth.roles('admin', 'dealer', 'agent'),
  upload.fields([{ name: 'images', maxCount: 25 }, { name: 'video', maxCount: 1 }]),
  vehicleController.createVehicle
);
router.put('/:id', auth.protect, auth.roles('admin'), vehicleController.updateVehicle);
router.delete('/:id', auth.protect, auth.roles('admin'), vehicleController.deleteVehicle);

module.exports = router; 