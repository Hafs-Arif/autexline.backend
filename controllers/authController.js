const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const authController = {
  // Regular user registration
  registerUser: async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;
      
      // Check if user exists
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create user
      const user = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: 'user',
        status: 'active'
      });
      
      // Generate token
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.status(201).json({ 
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Agent registration (pending admin approval)
  registerAgent: async (req, res) => {
    try {
      const { 
        firstName, 
        lastName, 
        email, 
        phone, 
        county, 
        city, 
        loginId, 
        password 
      } = req.body;
      
      // Check if user exists
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Check if loginId exists
      if (loginId) {
        const loginIdExists = await User.findOne({ loginId });
        if (loginIdExists) {
          return res.status(400).json({ message: 'Login ID already exists' });
        }
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create agent (pending approval)
      const agent = await User.create({
        firstName,
        lastName,
        email,
        phone,
        county,
        city,
        loginId,
        password: hashedPassword,
        role: 'agent',
        status: 'pending'
      });
      
      res.status(201).json({ 
        message: 'Agent application submitted successfully. Waiting for admin approval.',
        agent: {
          id: agent._id,
          firstName: agent.firstName,
          lastName: agent.lastName,
          email: agent.email,
          role: agent.role,
          status: agent.status
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Dealer registration (pending admin approval)
  registerDealer: async (req, res) => {
    try {
      const { 
        firstName, 
        lastName, 
        companyName, 
        companyAddress, 
        email, 
        phone, 
        county, 
        city, 
        loginId, 
        password 
      } = req.body;
      
      // Check if user exists
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Check if loginId exists
      if (loginId) {
        const loginIdExists = await User.findOne({ loginId });
        if (loginIdExists) {
          return res.status(400).json({ message: 'Login ID already exists' });
        }
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create dealer (pending approval)
      const dealer = await User.create({
        firstName,
        lastName,
        companyName,
        companyAddress,
        email,
        phone,
        county,
        city,
        loginId,
        password: hashedPassword,
        role: 'dealer',
        status: 'pending'
      });
      
      res.status(201).json({ 
        message: 'Dealer application submitted successfully. Waiting for admin approval.',
        dealer: {
          id: dealer._id,
          firstName: dealer.firstName,
          lastName: dealer.lastName,
          email: dealer.email,
          role: dealer.role,
          status: dealer.status
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  // Login for all user types
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Check if user is approved (for agents and dealers)
      if (user.role === 'agent' || user.role === 'dealer') {
        if (user.status === 'pending') {
          return res.status(403).json({ 
            message: 'Your account is pending admin approval. Please wait for approval before logging in.' 
          });
        }
        if (user.status === 'rejected') {
          return res.status(403).json({ 
            message: 'Your account application has been rejected. Please contact admin for more information.' 
          });
        }
        if (user.status === 'suspended') {
          return res.status(403).json({ 
            message: 'Your account has been suspended. Please contact admin for more information.' 
          });
        }
        // Allow login for 'active' status (dealers) and 'approved' status (agents)
      }
      
      // Generate token
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.json({ 
        message: 'Login successful',
        token, 
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status,
          agentId: user.agentId,
          companyName: user.companyName
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get current user profile
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const { firstName, lastName, phone, county, city } = req.body;
      
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { firstName, lastName, phone, county, city },
        { new: true, runValidators: true }
      ).select('-password');
      
      res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      const user = await User.findById(req.user.id);
      
      // Check current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Update password
      user.password = hashedPassword;
      await user.save();
      
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Admin: Get pending applications
  getPendingApplications: async (req, res) => {
    try {
      const pendingUsers = await User.find({
        status: 'pending',
        role: { $in: ['agent', 'dealer'] }
      }).select('-password');
      
      res.json(pendingUsers);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Admin: Approve application
  approveApplication: async (req, res) => {
    try {
      const { userId, agentId } = req.body;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (user.status !== 'pending') {
        return res.status(400).json({ message: 'User is not pending approval' });
      }
      
      // Update user status and add agentId if provided
      const updateData = {
        status: 'active', // Changed from 'approved' to 'active' for dealers
        approvedBy: req.user.id,
        approvedAt: new Date()
      };
      
      if (user.role === 'agent' && agentId) {
        updateData.agentId = agentId;
      }
      
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
      ).select('-password');
      
      res.json({ 
        message: 'Application approved successfully',
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Admin: Reject application
  rejectApplication: async (req, res) => {
    try {
      const { userId, rejectionReason } = req.body;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (user.status !== 'pending') {
        return res.status(400).json({ message: 'User is not pending approval' });
      }
      
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          status: 'rejected',
          approvedBy: req.user.id,
          approvedAt: new Date(),
          rejectionReason
        },
        { new: true }
      ).select('-password');
      
      res.json({ 
        message: 'Application rejected successfully',
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Admin: Get all users
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find().select('-password');
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Admin: Suspend user
  suspendUser: async (req, res) => {
    try {
      const { userId } = req.body;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (user.role === 'admin') {
        return res.status(403).json({ message: 'Cannot suspend admin users' });
      }
      
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { status: 'suspended' },
        { new: true }
      ).select('-password');
      
      res.json({ 
        message: 'User suspended successfully',
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Admin: Activate user
  activateUser: async (req, res) => {
    try {
      const { userId } = req.body;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { status: 'active' },
        { new: true }
      ).select('-password');
      
      res.json({ 
        message: 'User activated successfully',
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Forgot password - verify email exists
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found with this email' });
      }

      // Check if user is active or approved (allow both for dealers/agents)
      if (user.status !== 'active' && user.status !== 'approved') {
        return res.status(400).json({ message: 'Account is not active. Please contact support.' });
      }

      // For now, we'll just verify the email exists
      // In a production environment, you would send a reset code via email
      // and store it temporarily in the database with an expiration time
      
      res.status(200).json({ 
        message: 'Email verified successfully',
        email: user.email
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
  },

  // Reset password - update password for verified email
  resetPassword: async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      
      if (!email || !newPassword) {
        return res.status(400).json({ message: 'Email and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found with this email' });
      }

      // Check if user is active or approved (allow both for dealers/agents)
      if (user.status !== 'active' && user.status !== 'approved') {
        return res.status(400).json({ message: 'Account is not active. Please contact support.' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Update password
      user.password = hashedPassword;
      await user.save();
      
      res.status(200).json({ 
        message: 'Password updated successfully',
        email: user.email
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
  }
};

module.exports = authController; 