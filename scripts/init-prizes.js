const mongoose = require('mongoose');
const Prize = require('../models/Prize');

// MongoDB connection
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://herbal:herbal@cluster0.3tskji1.mongodb.net/herbal_ayurveda?retryWrites=true&w=majority';

async function initializePrizes() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Check if prizes already exist
    const existingPrizes = await Prize.countDocuments();
    if (existingPrizes > 0) {
      console.log(`Found ${existingPrizes} existing prizes. Skipping initialization.`);
      return;
    }

    // Default prizes data
    const defaultPrizes = [
      {
        title: 'Maruti XL6',
        description: 'Maruti XL6 Rs 14,80,000',
        amount: 1480000,
        image: 'win1.jpg',
        position: 1,
        emoji: '🏆',
        medal: '🥇',
        isActive: true
      },
      {
        title: 'Tata Nexon',
        description: 'Tata Nexon Rs 9,80,000',
        amount: 980000,
        image: 'win2.jpg',
        position: 2,
        emoji: '🏆',
        medal: '🥈',
        isActive: true
      },
      {
        title: 'Maruti Swift Dzire',
        description: 'Maruti Swift Dzire Rs 9,30,000',
        amount: 930000,
        image: 'win3.jpg',
        position: 3,
        emoji: '🏆',
        medal: '🥉',
        isActive: true
      },
      {
        title: 'Honda City',
        description: 'Honda City Rs 12,50,000',
        amount: 1250000,
        image: 'win4.jpg',
        position: 4,
        emoji: '🏆',
        medal: '🏆',
        isActive: true
      },
      {
        title: 'Hyundai Creta',
        description: 'Hyundai Creta Rs 15,20,000',
        amount: 1520000,
        image: 'win5.jpg',
        position: 5,
        emoji: '🏆',
        medal: '🏆',
        isActive: true
      }
    ];

    // Insert default prizes
    await Prize.insertMany(defaultPrizes);
    console.log('✅ Default prizes initialized successfully!');
    console.log(`Created ${defaultPrizes.length} prizes:`);
    
    defaultPrizes.forEach((prize, index) => {
      console.log(`${index + 1}. ${prize.medal} ${prize.title} - ₹${prize.amount.toLocaleString('en-IN')}`);
    });

  } catch (error) {
    console.error('❌ Error initializing prizes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run initialization
initializePrizes();
