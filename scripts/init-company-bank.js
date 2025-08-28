const mongoose = require('mongoose');
const CompanyBankDetails = require('../models/CompanyBankDetails');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/herbal_ayurveda', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const initializeCompanyBankDetails = async () => {
  try {
    // Check if company bank details already exist
    const existingBank = await CompanyBankDetails.findOne({ isActive: true });
    
    if (existingBank) {
      console.log('Company bank details already exist');
      return;
    }

    // Create default company bank details
    const defaultBankDetails = new CompanyBankDetails({
      companyName: 'Herbal Ayurveda Pvt. Ltd.',
      bankName: 'State Bank of India',
      accountNumber: '12345678901234',
      ifscCode: 'SBIN0001234',
      accountHolderName: 'HERBAL AYURVEDA PVT LTD',
      branchName: 'Mumbai Main Branch',
      branchAddress: 'Mumbai, Maharashtra',
      accountType: 'Current',
      purpose: 'Prize Distribution',
      displayName: 'Prize Distributor Department',
      description: 'Official bank account for prize distribution',
      instructions: 'Please use this account for all prize-related transactions',
      contactPhone: '9876543210',
      contactEmail: 'prizes@herbalayurveda.com',
      upiId: 'herbalayurveda@sbi',
      isPrimary: true,
      isActive: true,
      createdBy: 'System'
    });

    await defaultBankDetails.save();
    console.log('✅ Default company bank details created successfully');

    // Create a secondary account for registration fees
    const registrationBankDetails = new CompanyBankDetails({
      companyName: 'Herbal Ayurveda Pvt. Ltd.',
      bankName: 'HDFC Bank',
      accountNumber: '98765432109876',
      ifscCode: 'HDFC0001234',
      accountHolderName: 'HERBAL AYURVEDA PVT LTD',
      branchName: 'Delhi Branch',
      branchAddress: 'Delhi, India',
      accountType: 'Current',
      purpose: 'Registration Fees',
      displayName: 'Registration Department',
      description: 'Bank account for registration and entry fees',
      instructions: 'Use this account for registration payments only',
      contactPhone: '9876543211',
      contactEmail: 'registration@herbalayurveda.com',
      upiId: 'registration@hdfc',
      isPrimary: false,
      isActive: true,
      createdBy: 'System'
    });

    await registrationBankDetails.save();
    console.log('✅ Registration bank details created successfully');

  } catch (error) {
    console.error('❌ Error creating company bank details:', error);
  }
};

const main = async () => {
  await connectDB();
  await initializeCompanyBankDetails();
  
  console.log('\n🎉 Company bank details initialization completed!');
  console.log('\nDefault accounts created:');
  console.log('1. Prize Distribution Account (Primary)');
  console.log('2. Registration Fees Account');
  
  process.exit(0);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Run the script
main();
