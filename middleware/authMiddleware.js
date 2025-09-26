const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = {
  protect: async (req, res, next) => {
    try {
      let token;
      
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }
      
      if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  },
  
  admin: (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Not authorized as admin' });
    }
  },

  requireAdmin: (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Not authorized as admin' });
    }
  },

  agent: (req, res, next) => {
    if (req.user && req.user.role === 'agent' && req.user.status === 'approved') {
      next();
    } else {
      res.status(403).json({ message: 'Not authorized as agent' });
    }
  },

  dealer: (req, res, next) => {
    if (req.user && req.user.role === 'dealer' && req.user.status === 'approved') {
      next();
    } else {
      res.status(403).json({ message: 'Not authorized as dealer' });
    }
  },

  user: (req, res, next) => {
    if (req.user && req.user.role === 'user' && req.user.status === 'active') {
      next();
    } else {
      res.status(403).json({ message: 'Not authorized as user' });
    }
  },

  // Allow multiple roles
  roles: (...allowedRoles) => {
    return (req, res, next) => {
      if (req.user && allowedRoles.includes(req.user.role)) {
        // For agents and dealers, check if they're approved
        if ((req.user.role === 'agent' || req.user.role === 'dealer') && req.user.status !== 'approved') {
          return res.status(403).json({ message: 'Account not approved' });
        }
        // For users, check if they're active
        if (req.user.role === 'user' && req.user.status !== 'active') {
          return res.status(403).json({ message: 'Account not active' });
        }
        return next();
      }
      return res.status(403).json({ message: 'Not authorized' });
    };
  }
};

module.exports = authMiddleware; 