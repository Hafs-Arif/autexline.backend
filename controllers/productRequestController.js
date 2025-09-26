const ProductRequest = require('../models/ProductRequest');
const Vehicle = require('../models/Vehicle');
const Part = require('../models/Part');
const User = require('../models/User');
const Counter = require('../models/Counter');
const upload = require('../middleware/mediaUpload');
const { uploadImage, uploadVideo } = require('../utils/cloudinary');
const { cloudinary } = require('../utils/cloudinary');
const { parseNumber, getNextRefNo } = require('../utils/helpers');
const { formatProductData } = require('../utils/textFormatter');

const productRequestController = {
  // Upload request images to Cloudinary (dealers/agents)
  uploadRequestImages: [
    upload.array('images', 25),
    async (req, res) => {
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ message: 'No images provided' });
        }
        const results = [];
        for (const file of req.files) {
          const uploaded = await uploadImage(file.buffer, { folder: 'autoshop/requests', use_filename: false, unique_filename: true, overwrite: false });
          results.push({ url: uploaded.secure_url, publicId: uploaded.public_id });
        }
        res.json({ images: results });
      } catch (e) {
        console.error('Error uploading request images:', e);
        res.status(500).json({ message: 'Error uploading images' });
      }
    }
  ],

  uploadRequestVideo: [
    upload.single('video'),
    async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ message: 'No video provided' });
        const uploaded = await cloudinary.uploader.upload_stream
          ? await new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream({ folder: 'autoshop/requests', resource_type: 'video', use_filename: false, unique_filename: true, overwrite: false }, (err, result) => {
                if (err) return reject(err);
                resolve(result);
              });
              stream.end(req.file.buffer);
            })
          : await cloudinary.uploader.upload(req.file.buffer, { folder: 'autoshop/requests', resource_type: 'video', use_filename: false, unique_filename: true, overwrite: false });
        res.json({ video: { url: uploaded.secure_url, publicId: uploaded.public_id } });
      } catch (e) {
        console.error('Error uploading request video:', e);
        res.status(500).json({ message: 'Error uploading video' });
      }
    }
  ],

  // Create a new product request
  createRequest: async (req, res) => {
    try {
      const { requestType, productData } = req.body;
      const requesterId = req.user.id;

      if (!requestType || !['vehicle', 'part'].includes(requestType)) {
        return res.status(400).json({ message: 'Invalid or missing requestType' });
      }
      if (!productData || (!productData.title && !productData.model)) {
        return res.status(400).json({ message: 'Missing productData.title or productData.model' });
      }

      // Get requester details
      const requester = await User.findById(requesterId);
      if (!requester) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Validate requester role
      if (!['dealer', 'agent'].includes(requester.role)) {
        return res.status(403).json({ message: 'Only dealers and agents can submit product requests' });
      }

      // Validate requester status
      if (requester.status !== 'approved') {
        return res.status(403).json({ message: 'Your account must be approved to submit product requests' });
      }

      // Preserve ALL dealer input exactly as provided - no format restrictions
      const sanitized = { ...productData };
      
      // Handle stock - preserve original value but also try to convert for parts
      if (sanitized.stock !== undefined) {
        const originalStock = sanitized.stock;
        // Try to extract numeric value from stock field
        const stockNum = parseNumber(originalStock);
        // Keep original value and set numeric value
        sanitized.stockOriginal = String(originalStock);
        sanitized.stock = !Number.isNaN(stockNum) ? stockNum : 1; // Default to 1 for database requirement
      }
      
      // Handle price - extract numeric value
      if (sanitized.price !== undefined) {
        const priceNum = parseNumber(sanitized.price);
        sanitized.priceOriginal = String(sanitized.price);
        sanitized.price = !Number.isNaN(priceNum) ? priceNum : 1;
      }
      
      // Handle make field - ensure it's properly set for parts
      if (requestType === 'part' && sanitized.make) {
        sanitized.brand = sanitized.make; // Map make to brand for parts
      }
      
      // Handle model field - ensure it's properly set for parts
      if (requestType === 'part' && sanitized.model) {
        sanitized.name = sanitized.model; // Map model to name for parts
      }
      
      // Handle year field for parts - ensure it's properly formatted
      if (requestType === 'part' && sanitized.year) {
        sanitized.year = String(sanitized.year);
      }
      
      // Handle compatibleVehicles - ensure it's always an array
      if (sanitized.compatibleVehicles) {
        if (Array.isArray(sanitized.compatibleVehicles)) {
          sanitized.compatibleVehicles = sanitized.compatibleVehicles.map(v => String(v));
        } else {
          sanitized.compatibleVehicles = [String(sanitized.compatibleVehicles)];
        }
      } else {
        sanitized.compatibleVehicles = [];
      }
      
      // Convert ALL fields to strings to preserve exactly what dealer entered
      Object.keys(sanitized).forEach(key => {
        if (sanitized[key] !== null && sanitized[key] !== undefined && 
            !Array.isArray(sanitized[key]) && typeof sanitized[key] !== 'object') {
          sanitized[key] = String(sanitized[key]);
        }
      });
      
      // Images: accept only arrays of strings
      const coerceToStringArray = (val) => {
        try {
          if (Array.isArray(val)) return val.filter((v) => typeof v === 'string');
          if (typeof val === 'string') {
            // Try parse JSON array
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string');
            // If plain string, return as single-item array
            return [val];
          }
        } catch {
          // ignore
        }
        return [];
      };
      let images = coerceToStringArray(sanitized.images);
      if (images.length === 0 && typeof sanitized.image === 'string' && sanitized.image) {
        images = [sanitized.image];
      }
      if (images.length > 0) sanitized.images = images; else delete sanitized.images;
      // Ensure single image is string if present
      if (sanitized.image && typeof sanitized.image !== 'string') delete sanitized.image;

      const productRequest = new ProductRequest({
        requestType,
        requesterId,
        requesterName: `${requester.firstName || ''} ${requester.lastName || ''}`.trim(),
        requesterRole: requester.role,
        productData: sanitized
      });

      await productRequest.save();

      res.status(201).json({
        message: 'Product request submitted successfully',
        request: productRequest
      });
    } catch (error) {
      console.error('Error creating product request:', error);
      if (error?.name === 'ValidationError' || error?.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid product data', detail: error.message });
      }
      res.status(500).json({ message: 'Error creating product request' });
    }
  },
  
  // Get all product requests (admin only)
  getAllRequests: async (req, res) => {
    try {
      const { status, requestType, page = 1, limit = 10 } = req.query;
      
      const filter = {};
      if (status) filter.status = status;
      if (requestType) filter.requestType = requestType;
      
      const skip = (page - 1) * limit;
      
      const requests = await ProductRequest.find(filter)
        .populate('requesterId', 'firstName lastName email phone')
        .populate('reviewedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await ProductRequest.countDocuments(filter);
      
      res.json({
        requests,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          totalItems: total
        }
      });
    } catch (error) {
      console.error('Error fetching product requests:', error);
      res.status(500).json({ message: 'Error fetching product requests' });
    }
  },
  
  // Get pending requests count (for dashboard)
  getPendingCount: async (req, res) => {
    try {
      const pendingCount = await ProductRequest.countDocuments({ status: 'pending' });
      res.json({ pendingCount });
    } catch (error) {
      console.error('Error fetching pending count:', error);
      res.status(500).json({ message: 'Error fetching pending count' });
    }
  },
  
  // Get request by ID
  getRequestById: async (req, res) => {
    try {
      const request = await ProductRequest.findById(req.params.id)
        .populate('requesterId', 'firstName lastName email phone companyName')
        .populate('reviewedBy', 'firstName lastName');
      
      if (!request) {
        return res.status(404).json({ message: 'Product request not found' });
      }
      
      res.json(request);
    } catch (error) {
      console.error('Error fetching product request:', error);
      res.status(500).json({ message: 'Error fetching product request' });
    }
  },
  
  // Approve a product request
  approveRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;
      const adminId = req.user.id;
      
      const request = await ProductRequest.findById(id);
      if (!request) {
        return res.status(404).json({ message: 'Product request not found' });
      }
      
      if (request.status !== 'pending') {
        return res.status(400).json({ message: 'Request has already been processed' });
      }
      
      // Create the actual product based on request type
      let approvedProduct;
      if (request.requestType === 'vehicle') {
        const refNo = request.productData.refNo || await getNextRefNo('vhl');
        
        // Handle condition field mapping
        let conditionValue = 'old'; // default
        if (request.productData.category === 'salvageVehicles') {
          // For salvage vehicles, use conditionComments if provided
          conditionValue = request.productData.conditionComments || '';
        } else {
          // For other categories, use condition field (new/old)
          conditionValue = request.productData.condition || 'old';
          if (!['new', 'old'].includes(conditionValue)) {
            conditionValue = 'old';
          }
        }
        
        // Map request productData to Vehicle model fields
        const vData = {
          refNo,
          title: request.productData.title || request.productData.name || 'Unnamed Vehicle',
          price: request.productData.price || request.productData.totalPrice || '0',
          totalPrice: request.productData.totalPrice || request.productData.price || '0',
          stockNo: request.productData.stockNo || '',
          mileage: request.productData.mileage || '',
          year: request.productData.year || '',
          engine: request.productData.engine || '',
          engineCode: request.productData.engineCode || '',
          modelCode: request.productData.modelCode || '',
          transmission: request.productData.transmission || '',
          location: request.productData.location || '',
          color: request.productData.color || '',
          fuel: request.productData.fuel || request.productData.fuelType || '',
          drive: request.productData.drive || '',
          seats: request.productData.seats || '',
          doors: request.productData.doors || '',
          features: Array.isArray(request.productData.features) 
            ? request.productData.features 
            : (request.productData.features ? [String(request.productData.features)] : []),
          condition: conditionValue,
          capacity: request.productData.capacity || '',
          // Extended specifications
          chassisNo: request.productData.chassisNo || '',
          steering: request.productData.steering || '',
          versionClass: request.productData.versionClass || '',
          registrationYearMonth: request.productData.registrationYearMonth || '',
          manufactureYearMonth: request.productData.manufactureYearMonth || '',
          dimension: request.productData.dimension || '',
          weight: request.productData.weight || '',
          maxCapacity: request.productData.maxCapacity || '',
          // Media
          images: request.productData.images || [],
          image: request.productData.image || (request.productData.images && request.productData.images.length > 0 ? request.productData.images[0] : ''),
          video: request.productData.video || '',
          // Legacy fields for compatibility
          make: request.productData.make || '',
          model: request.productData.model || '',
          fuelType: request.productData.fuel || request.productData.fuelType || '',
          description: request.productData.description || '',
          // Listing management
          category: request.productData.category || 'stockCars',
          status: 'available',
          postedBy: request.requesterId,
          postedByRole: request.requesterRole,
          isApproved: true
        };
        
        // Apply text formatting to all text fields
        const formattedVData = formatProductData(vData, 'vehicle');
        approvedProduct = new Vehicle(formattedVData);
      } else if (request.requestType === 'part') {
        const refNo = request.productData.refNo || await getNextRefNo('part_ref');
        console.log(`Generated part reference number for approval: ${refNo}`);
        
        // Handle condition field for parts
        let conditionValue = request.productData.condition || 'old';
        if (!['new', 'old'].includes(conditionValue)) {
          conditionValue = 'old';
        }
        
        // Map request productData to Part model fields
        const pData = {
          refNo,
          name: request.productData.model || request.productData.title || request.productData.name || 'Unnamed Part', // Model name from form
          brand: request.productData.brand || '', // Brand from form
          make: request.productData.make || '', // Make from form (can be 'custom')
          customMaker: request.productData.customMaker || '', // Custom maker value when make is 'custom'
          category: request.productData.category || 'autoParts',
          price: parseNumber(request.productData.price) || 0,
          stock: parseNumber(request.productData.stock) || 0,
          images: request.productData.images || [],
          video: request.productData.video || '', // Add video field mapping
          description: request.productData.description || '',
          modelCode: request.productData.modelCode || '', // Model code from form
          year: request.productData.year || '', // Year from form
          condition: conditionValue, // Add condition field
          compatibleVehicles: Array.isArray(request.productData.compatibleVehicles) 
            ? request.productData.compatibleVehicles 
            : (request.productData.compatibleVehicles ? [String(request.productData.compatibleVehicles)] : []),
          comments: request.productData.comments || '' // Add comments field mapping
        };
        
        // Apply text formatting to all text fields
        const formattedPData = formatProductData(pData, 'part');
        approvedProduct = new Part(formattedPData);
      }
      
      await approvedProduct.save();
      
      // Update the request
      request.status = 'approved';
      request.reviewedBy = adminId;
      request.reviewedAt = new Date();
      request.adminNotes = adminNotes;
      request.approvedProductId = approvedProduct._id;
      request.approvedProductModel = request.requestType === 'vehicle' ? 'Vehicle' : 'Part';
      
      await request.save();
      
      res.json({
        message: 'Product request approved successfully',
        request,
        approvedProduct
      });
    } catch (error) {
      console.error('Error approving product request:', error);
      res.status(500).json({ message: 'Error approving product request' });
    }
  },
  
  // Reject a product request
  rejectRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const { rejectionReason, adminNotes } = req.body;
      const adminId = req.user.id;
      
      const request = await ProductRequest.findById(id);
      if (!request) {
        return res.status(404).json({ message: 'Product request not found' });
      }
      
      if (request.status !== 'pending') {
        return res.status(400).json({ message: 'Request has already been processed' });
      }
      
      request.status = 'rejected';
      request.reviewedBy = adminId;
      request.reviewedAt = new Date();
      request.rejectionReason = rejectionReason;
      request.adminNotes = adminNotes;
      
      await request.save();
      
      res.json({
        message: 'Product request rejected successfully',
        request
      });
    } catch (error) {
      console.error('Error rejecting product request:', error);
      res.status(500).json({ message: 'Error rejecting product request' });
    }
  },
  
  // Edit a product request (admin can modify and approve)
  editAndApproveRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const { productData, adminNotes } = req.body;
      const adminId = req.user.id;
      
      const request = await ProductRequest.findById(id);
      if (!request) {
        return res.status(404).json({ message: 'Product request not found' });
      }
      
      if (request.status !== 'pending') {
        return res.status(400).json({ message: 'Request has already been processed' });
      }
      
      // Update product data with admin edits
      request.productData = { ...request.productData, ...productData };
      request.status = 'edited';
      request.reviewedBy = adminId;
      request.reviewedAt = new Date();
      request.adminNotes = adminNotes;
      
      await request.save();
      
      // Create the actual product with edited data
      let approvedProduct;
      if (request.requestType === 'vehicle') {
        const refNo = request.productData.refNo || await getNextRefNo('veh');
        const vData = {
          ...request.productData,
          refNo,
          title: request.productData.title,
          price: request.productData.price,
          totalPrice: request.productData.totalPrice,
          image: Array.isArray(request.productData.images) && request.productData.images.length > 0
            ? request.productData.images[0]
            : request.productData.image,
          images: request.productData.images,
          video: request.productData.video,
          stockNo: request.productData.stockNo,
          mileage: request.productData.mileage,
          year: String(request.productData.year || request.productData.yearText || ''),
          engine: request.productData.engine,
          engineCode: request.productData.engineCode,
          modelCode: request.productData.modelCode,
          transmission: request.productData.transmission,
          location: request.productData.location,
          color: request.productData.color,
          fuel: request.productData.fuel || request.productData.fuelType,
          drive: request.productData.drive,
          seats: request.productData.seats,
          doors: request.productData.doors,
          features: request.productData.features,
          condition: request.productData.condition,
          capacity: request.productData.capacity,
          category: request.productData.category,
          status: 'available',
          postedBy: request.requesterId,
          postedByRole: request.requesterRole,
          isApproved: true
        };
        
        // Apply text formatting to all text fields
        const formattedVData = formatProductData(vData, 'vehicle');
        approvedProduct = new Vehicle(formattedVData);
      } else if (request.requestType === 'part') {
        const refNo = request.productData.refNo || await getNextRefNo('part_ref');
        console.log(`Generated part reference number for edit and approval: ${refNo}`);
        // Map request productData to Part model fields
        const pData = {
          refNo,
          name: request.productData.model || request.productData.title || request.productData.name || 'Unnamed Part', // Model name from form
          brand: request.productData.brand || '', // Brand from form
          make: request.productData.make || '', // Make from form (can be 'custom')
          customMaker: request.productData.customMaker || '', // Custom maker value when make is 'custom'
          category: request.productData.category || 'autoParts',
          price: parseNumber(request.productData.price) || 0,
          stock: parseNumber(request.productData.stock) || 0,
          images: request.productData.images || [],
          video: request.productData.video || '', // Add video field mapping
          description: request.productData.description || '',
          modelCode: request.productData.modelCode || '', // Model code from form
          year: request.productData.year || '', // Year from form
          compatibleVehicles: Array.isArray(request.productData.compatibleVehicles) 
            ? request.productData.compatibleVehicles 
            : (request.productData.compatibleVehicles ? [String(request.productData.compatibleVehicles)] : []),
          comments: request.productData.comments || '' // Add comments field mapping
        };
        
        // Apply text formatting to all text fields
        const formattedPData = formatProductData(pData, 'part');
        approvedProduct = new Part(formattedPData);
      }
      
      await approvedProduct.save();
      
      // Update request to approved
      request.status = 'approved';
      request.approvedProductId = approvedProduct._id;
      request.approvedProductModel = request.requestType === 'vehicle' ? 'Vehicle' : 'Part';
      
      await request.save();
      
      res.json({
        message: 'Product request edited and approved successfully',
        request,
        approvedProduct
      });
    } catch (error) {
      console.error('Error editing product request:', error);
      res.status(500).json({ message: 'Error editing product request' });
    }
  },
  
  // Get requests by requester (for dealers/agents to see their requests)
  getMyRequests: async (req, res) => {
    try {
      const requesterId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;
      
      const filter = { requesterId };
      if (status) filter.status = status;
      
      const skip = (page - 1) * limit;
      
      const requests = await ProductRequest.find(filter)
        .populate('reviewedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await ProductRequest.countDocuments(filter);
      
      res.json({
        requests,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          totalItems: total
        }
      });
    } catch (error) {
      console.error('Error fetching my requests:', error);
      res.status(500).json({ message: 'Error fetching requests' });
    }
  }
};

module.exports = productRequestController; 