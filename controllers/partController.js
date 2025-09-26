const Part = require('../models/Part');
const { uploadImage, uploadVideo } = require('../utils/cloudinary');
const { formatProductData } = require('../utils/textFormatter');
const Counter = require('../models/Counter');

async function nextPartRefNo() {
  try {
    const key = 'part_ref';
    const doc = await Counter.findOneAndUpdate(
      { key },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    const refNo = `APT-${String(doc.seq || 1).padStart(6, '0')}`;
    console.log(`Generated part reference number: ${refNo} (counter: ${key}, sequence: ${doc.seq})`);
    return refNo;
  } catch (error) {
    console.error('Error generating part reference number:', error);
    // Fallback reference number
    const fallback = `APT-${String(Date.now()).slice(-6)}`;
    console.log(`Using fallback reference number: ${fallback}`);
    return fallback;
  }
}

const partController = {
  getAllParts: async (req, res) => {
    try {
      const parts = await Part.find();
      res.json(parts);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  getPartById: async (req, res) => {
    try {
      const part = await Part.findById(req.params.id);
      if (!part) {
        return res.status(404).json({ message: 'Part not found' });
      }
      res.json(part);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  createPart: async (req, res) => {
    try {
      const payload = { ...req.body };
      if (payload.price) payload.price = Number(payload.price);
      if (payload.stock) payload.stock = Number(payload.stock);
      if (typeof payload.compatibleVehicles === 'string') {
        try { payload.compatibleVehicles = JSON.parse(payload.compatibleVehicles); } catch (_) { /* ignore */ }
      }

      const images = [];
      if (req.files && req.files.images && Array.isArray(req.files.images)) {
        const uploads = await Promise.all(
          req.files.images.map(f => uploadImage(f.buffer, { folder: 'autoshop/parts' }))
        );
        uploads.forEach(u => images.push(u.secure_url));
      }
      if (images.length > 0) {
        payload.images = images;
      }

      // Handle video upload for parts
      if (req.files && req.files.video && Array.isArray(req.files.video) && req.files.video[0]) {
        const vres = await uploadVideo(req.files.video[0].buffer, { folder: 'autoshop/parts' });
        payload.video = vres.secure_url;
      }

      // Generate reference number for parts
      payload.refNo = await nextPartRefNo();

      // Apply text formatting to all text fields before saving
      const formattedPayload = formatProductData(payload, 'part');

      const part = await Part.create(formattedPayload);
      res.status(201).json(part);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  updatePart: async (req, res) => {
    try {
      // Apply text formatting to all text fields before updating
      const formattedUpdateData = formatProductData(req.body, 'part');
      
      const part = await Part.findByIdAndUpdate(req.params.id, formattedUpdateData, { new: true });
      if (!part) {
        return res.status(404).json({ message: 'Part not found' });
      }
      res.json(part);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  deletePart: async (req, res) => {
    try {
      const part = await Part.findByIdAndDelete(req.params.id);
      if (!part) {
        return res.status(404).json({ message: 'Part not found' });
      }
      res.json({ message: 'Part deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Search parts by keywords
  searchParts: async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }

      const searchRegex = new RegExp(query.trim(), 'i');
      
      const parts = await Part.find({
        $or: [
          { name: searchRegex },
          { refNo: searchRegex },
          { category: searchRegex },
          { brand: searchRegex },
          { make: searchRegex },
          { model: searchRegex },
          { modelCode: searchRegex },
          { year: searchRegex },
          { condition: searchRegex },
          { description: searchRegex },
          { compatibleVehicles: searchRegex }
        ]
      })
      .select('name refNo price category brand make model year condition description stock stockQuantity compatibleVehicles comments')
      .limit(10)
      .sort({ createdAt: -1 });

      res.json(parts);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = partController;