const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Inquiry = require('../models/Inquiry');
const Part = require('../models/Part');

const adminController = {
  getDashboardStats: async (req, res) => {
    try {
      const [
        totalUsers,
        totalVehicles,
        totalParts,
        totalInquiries,
        dealersCount,
        agentsCount,
        basicUsersCount
      ] = await Promise.all([
        User.countDocuments(),
        Vehicle.countDocuments(),
        Part.countDocuments(),
        Inquiry.countDocuments(),
        User.countDocuments({ role: 'dealer' }),
        User.countDocuments({ role: 'agent' }),
        User.countDocuments({ role: 'user' })
      ]);
      
      res.json({
        totalUsers,
        totalVehicles,
        totalParts,
        totalInquiries,
        dealersCount,
        agentsCount,
        usersCount: basicUsersCount
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find().select('-password');
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  updateUserStatus: async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = adminController; 