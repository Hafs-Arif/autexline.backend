const Dealer = require('../models/Dealer');

const dealerController = {
  getAllDealers: async (req, res) => {
    try {
      const dealers = await Dealer.find();
      res.json(dealers);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  getDealerById: async (req, res) => {
    try {
      const dealer = await Dealer.findById(req.params.id);
      if (!dealer) {
        return res.status(404).json({ message: 'Dealer not found' });
      }
      res.json(dealer);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  createDealer: async (req, res) => {
    try {
      const dealer = await Dealer.create(req.body);
      res.status(201).json(dealer);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  updateDealer: async (req, res) => {
    try {
      const dealer = await Dealer.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!dealer) {
        return res.status(404).json({ message: 'Dealer not found' });
      }
      res.json(dealer);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = dealerController; 