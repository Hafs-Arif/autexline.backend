const Vehicle = require('../models/Vehicle');
const { uploadImage, uploadVideo } = require('../utils/cloudinary');
const { formatProductData } = require('../utils/textFormatter');
const Counter = require('../models/Counter');

const extractDigits = (str) => {
  if (typeof str !== 'string') return undefined;
  const m = str.match(/([0-9][0-9,\.\/]*)/);
  if (!m) return undefined;
  const cleaned = m[1].replace(/[^0-9.]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : undefined;
};

const guessMakeModelFromTitle = (title) => {
  if (!title || typeof title !== 'string') return { make: undefined, model: undefined };
  const parts = title.split(/\s+/);
  if (parts.length >= 3 && /^\d{4}$/.test(parts[0])) {
    return { make: parts[1], model: parts[2] };
  }
  return { make: parts[0], model: parts[1] };
};

async function nextRefNo() {
  const key = 'vehicle_ref';
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  // Format like AUT-000001
  const seq = doc.seq || 1;
  return `AUT-${String(seq).padStart(6, '0')}`;
}

const vehicleController = {
  getAllVehicles: async (req, res) => {
    try {
      const vehicles = await Vehicle.find();
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  // Return vehicles grouped for inventory page
  getInventoryGrouped: async (req, res) => {
    try {
      const [stockCars, salvageVehicles, constructionMachinery, bikes] = await Promise.all([
        Vehicle.find({ category: 'stockCars', status: 'available' }).sort({ createdAt: -1 }),
        Vehicle.find({ category: 'salvageVehicles', status: 'available' }).sort({ createdAt: -1 }),
        Vehicle.find({ category: 'constructionMachinery', status: 'available' }).sort({ createdAt: -1 }),
        Vehicle.find({ category: 'bikes', status: 'available' }).sort({ createdAt: -1 })
      ]);
      res.json({ stockCars, salvageVehicles, constructionMachinery, bikes });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getVehicleById: async (req, res) => {
    try {
      const vehicle = await Vehicle.findById(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  getByCategory: async (req, res) => {
    try {
      const { category } = req.params;
      const vehicles = await Vehicle.find({ category }).sort({ createdAt: -1 });
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  createVehicle: async (req, res) => {
    try {
      const payload = { ...req.body };

      // Parse features if sent as JSON string
      if (typeof payload.features === 'string') {
        try { payload.features = JSON.parse(payload.features); } catch (_) { /* ignore */ }
      }

      // Handle condition field mapping
      if (payload.category === 'salvageVehicles') {
        // For salvage vehicles, use conditionComments if provided
        if (payload.conditionComments) {
          payload.condition = payload.conditionComments;
        }
        // Remove conditionComments as it's not part of the Vehicle model
        delete payload.conditionComments;
      } else {
        // For other categories, ensure condition is set (default to 'old')
        if (!payload.condition || !['new', 'old'].includes(payload.condition)) {
          payload.condition = 'old';
        }
      }

      // Upload images/videos if present
      const images = [];
      if (req.files && req.files.images && Array.isArray(req.files.images)) {
        const uploads = await Promise.all(
          req.files.images.map(f => uploadImage(f.buffer, { folder: `autoshop/vehicles/${payload.category || 'general'}` }))
        );
        uploads.forEach(u => images.push(u.secure_url));
      }
      if (images.length > 0) {
        payload.image = images[0];
        payload.images = images;
      }

      if (req.files && req.files.video && Array.isArray(req.files.video) && req.files.video[0]) {
        const vres = await uploadVideo(req.files.video[0].buffer, { folder: `autoshop/vehicles/${payload.category || 'general'}` });
        payload.video = vres.secure_url;
      }

      // Attach poster
      if (req.user) {
        payload.postedBy = req.user._id || req.user.id;
        payload.postedByRole = req.user.role;
      }

      // Best-effort enrichments (non-mandatory)
      const guess = guessMakeModelFromTitle(payload.title);
      if (!payload.make && guess.make) payload.make = guess.make;
      if (!payload.model && guess.model) payload.model = guess.model;
      if (!payload.fuelType && payload.fuel) payload.fuelType = payload.fuel;

      // Ensure category default
      if (!payload.category) payload.category = 'stockCars';
      if (!payload.status) payload.status = 'available';

      // Generate unique sequential reference number
      payload.refNo = await nextRefNo();

      // Apply text formatting to all text fields before saving
      const formattedPayload = formatProductData(payload, 'vehicle');

      // Bypass Mongoose validators completely using raw collection insert
      const now = new Date();
      formattedPayload.createdAt = now;
      formattedPayload.updatedAt = now;
      const insertRes = await Vehicle.collection.insertOne(formattedPayload);
      const insertedId = insertRes.insertedId;
      const created = await Vehicle.findById(insertedId);
      return res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  updateVehicle: async (req, res) => {
    try {
      // Apply text formatting to all text fields before updating
      const formattedUpdateData = formatProductData(req.body, 'vehicle');
      formattedUpdateData.updatedAt = new Date();
      
      const vehicle = await Vehicle.findByIdAndUpdate(
        req.params.id,
        formattedUpdateData,
        { new: true, runValidators: false }
      );
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  deleteVehicle: async (req, res) => {
    try {
      const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Search vehicles by keywords
  searchVehicles: async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }

      const searchRegex = new RegExp(query.trim(), 'i');
      
      const vehicles = await Vehicle.find({
        $and: [
          { isApproved: true },
          { status: 'available' },
          {
            $or: [
              { title: searchRegex },
              { refNo: searchRegex },
              { make: searchRegex },
              { model: searchRegex },
              { year: searchRegex },
              { engine: searchRegex },
              { transmission: searchRegex },
              { location: searchRegex },
              { color: searchRegex },
              { fuel: searchRegex },
              { drive: searchRegex },
              { features: searchRegex }
            ]
          }
        ]
      })
      .select('title refNo price totalPrice originalPrice category year make model mileage engine transmission location color fuel drive features condition stockNo')
      .limit(10)
      .sort({ createdAt: -1 });

      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = vehicleController; 