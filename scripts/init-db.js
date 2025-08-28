const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

async function initializeDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/herbal-lucky-draw', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create default admin user
    const defaultAdmin = new Admin({
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      email: 'admin@herballuckydraw.com',
      role: 'super_admin'
    });

    await defaultAdmin.save();
    console.log('Default admin user created successfully');
    console.log('Username:', defaultAdmin.username);
    console.log('Password:', process.env.ADMIN_PASSWORD || 'admin123');

  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the initialization
initializeDatabase();
