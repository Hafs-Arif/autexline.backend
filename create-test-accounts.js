const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const createTestAccounts = async () => {
  try {
    console.log('Creating test accounts...');

    // Test Admin Account
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@autoshop.com',
      loginId: 'admin',
      password: adminPassword,
      phone: '0312-0339999',
      city: 'Karachi',
      county: 'Sindh',
      role: 'admin',
      status: 'approved',
      isApproved: true
    });

    // Test Dealer Account
    const dealerPassword = await bcrypt.hash('dealer123', 10);
    const dealerUser = new User({
      firstName: 'Dealer',
      lastName: 'User',
      email: 'dealer@autoshop.com',
      loginId: 'dealer',
      password: dealerPassword,
      phone: '0312-0339998',
      city: 'Lahore',
      county: 'Punjab',
      role: 'dealer',
      status: 'approved',
      isApproved: true,
      companyName: 'Auto Dealer Co.',
      companyAddress: '123 Main Street, Lahore'
    });

    // Test Agent Account
    const agentPassword = await bcrypt.hash('agent123', 10);
    const agentUser = new User({
      firstName: 'Agent',
      lastName: 'User',
      email: 'agent@autoshop.com',
      loginId: 'agent',
      password: agentPassword,
      phone: '0312-0339997',
      city: 'Islamabad',
      county: 'Federal',
      role: 'agent',
      status: 'approved',
      isApproved: true,
      agentId: 'AG001'
    });

    // Test Regular User Account
    const userPassword = await bcrypt.hash('user123', 10);
    const regularUser = new User({
      firstName: 'Regular',
      lastName: 'User',
      email: 'user@autoshop.com',
      loginId: 'user',
      password: userPassword,
      phone: '0312-0339996',
      city: 'Faisalabad',
      county: 'Punjab',
      role: 'user',
      status: 'approved',
      isApproved: true
    });

    // Save all users
    await adminUser.save();
    await dealerUser.save();
    await agentUser.save();
    await regularUser.save();

    console.log('✅ Test accounts created successfully!');
    console.log('\n📋 Test Account Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 Admin Account:');
    console.log('   Email: admin@autoshop.com');
    console.log('   Login ID: admin');
    console.log('   Password: admin123');
    console.log('   Dashboard: /admin');
    console.log('');
    console.log('🚗 Dealer Account:');
    console.log('   Email: dealer@autoshop.com');
    console.log('   Login ID: dealer');
    console.log('   Password: dealer123');
    console.log('   Dashboard: /dealer');
    console.log('');
    console.log('📋 Agent Account:');
    console.log('   Email: agent@autoshop.com');
    console.log('   Login ID: agent');
    console.log('   Password: agent123');
    console.log('   Dashboard: /agent');
    console.log('');
    console.log('👤 Regular User Account:');
    console.log('   Email: user@autoshop.com');
    console.log('   Login ID: user');
    console.log('   Password: user123');
    console.log('   Dashboard: / (home page)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error creating test accounts:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed.');
  }
};

// Run the script
createTestAccounts(); 