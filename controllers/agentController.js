const Agent = require('../models/Agent');

const agentController = {
  getAllAgents: async (req, res) => {
    try {
      const agents = await Agent.find();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  getAgentById: async (req, res) => {
    try {
      const agent = await Agent.findById(req.params.id);
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  createAgent: async (req, res) => {
    try {
      const agent = await Agent.create(req.body);
      res.status(201).json(agent);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  updateAgent: async (req, res) => {
    try {
      const agent = await Agent.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = agentController; 