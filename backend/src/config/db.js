const mongoose = require('mongoose');
const User = require('../models/User');
const Settings = require('../models/Settings');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Seed default owner if none exists
    const ownerExists = await User.findOne({ role: 'owner' });
    if (!ownerExists) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('owner123', salt);
      await User.create({
        username: 'owner',
        password: hashedPassword,
        name: 'Restaurant Owner',
        role: 'owner',
        isActive: true
      });
      console.log('Default owner user seeded successfully (owner / owner123)');
    }

    // Seed default settings if none exists
    let settings = await Settings.findOne();
    if (!settings) {
      await Settings.create({
        restaurantName: 'Kings Family Restaurant',
        address: 'NH7 Bypass Road, near HP Petrol Pump, Agalagurki, Chikkaballapur',
        phoneNumber: '+1234567890',
        receiptFooter: 'Thank you for dining with us! Please visit again.',
        printerSettings: {
          paperWidth: '80mm',
          printerType: 'browser'
        }
      });
      console.log('Default settings seeded successfully');
    } else {
      // Automatically update placeholder values to the new restaurant details
      if (
        settings.restaurantName === 'Gourmet Bistro' ||
        settings.restaurantName === 'The Gourmet Bistro' ||
        settings.restaurantName === 'Restaurant POS' ||
        settings.address === '123 Foodie Street, Culinary Plaza'
      ) {
        settings.restaurantName = 'Kings Family Restaurant';
        settings.address = 'NH7 Bypass Road, near HP Petrol Pump, Agalagurki, Chikkaballapur';
        await settings.save();
        console.log('Settings updated to Kings Family Restaurant');
      }
    }

  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
