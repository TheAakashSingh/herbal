const mongoose = require('mongoose');

const companyBankDetailsSchema = new mongoose.Schema({
  // Company Bank Information
  companyName: {
    type: String,
    required: true,
    trim: true,
    default: 'Herbal Ayurveda Pvt. Ltd.'
  },
  
  // Primary Bank Account
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true
  },
  ifscCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  accountHolderName: {
    type: String,
    required: true,
    trim: true
  },
  branchName: {
    type: String,
    trim: true
  },
  branchAddress: {
    type: String,
    trim: true
  },
  
  // Account Type and Purpose
  accountType: {
    type: String,
    enum: ['Current', 'Savings', 'Business'],
    default: 'Current'
  },
  purpose: {
    type: String,
    enum: ['Prize Distribution', 'Registration Fees', 'General', 'Other'],
    default: 'Prize Distribution'
  },
  
  // Display Settings
  displayName: {
    type: String,
    trim: true,
    default: 'Prize Distributor Department'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  
  // Additional Information
  description: {
    type: String,
    trim: true
  },
  instructions: {
    type: String,
    trim: true
  },
  
  // Contact Information
  contactPhone: {
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  // UPI Information (if applicable)
  upiId: {
    type: String,
    trim: true,
    lowercase: true
  },
  qrCodePath: {
    type: String,
    trim: true
  },
  
  // Audit Trail
  createdBy: {
    type: String,
    default: 'Admin'
  },
  updatedBy: {
    type: String
  },
  
  // Display Order
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
companyBankDetailsSchema.index({ isActive: 1, isPrimary: -1, sortOrder: 1 });
companyBankDetailsSchema.index({ purpose: 1, isActive: 1 });

// Virtual for formatted account number (partially masked for security)
companyBankDetailsSchema.virtual('displayAccountNumber').get(function() {
  if (this.accountNumber && this.accountNumber.length > 6) {
    const first3 = this.accountNumber.slice(0, 3);
    const last3 = this.accountNumber.slice(-3);
    const middle = 'X'.repeat(this.accountNumber.length - 6);
    return first3 + middle + last3;
  }
  return this.accountNumber;
});

// Virtual for full bank details display
companyBankDetailsSchema.virtual('fullBankDetails').get(function() {
  return {
    accountNumber: this.accountNumber,
    ifscCode: this.ifscCode,
    accountHolderName: this.accountHolderName,
    bankName: this.bankName,
    branchName: this.branchName,
    displayName: this.displayName
  };
});

// Static method to get primary bank details
companyBankDetailsSchema.statics.getPrimary = function() {
  return this.findOne({ isActive: true, isPrimary: true });
};

// Static method to get all active bank details
companyBankDetailsSchema.statics.getAllActive = function() {
  return this.find({ isActive: true }).sort({ isPrimary: -1, sortOrder: 1 });
};

// Static method to get bank details by purpose
companyBankDetailsSchema.statics.getByPurpose = function(purpose) {
  return this.find({ isActive: true, purpose }).sort({ isPrimary: -1, sortOrder: 1 });
};

// Method to format for frontend display
companyBankDetailsSchema.methods.toFrontendFormat = function() {
  return {
    id: this._id,
    companyName: this.companyName,
    bankName: this.bankName,
    accountNumber: this.accountNumber,
    ifscCode: this.ifscCode,
    accountHolderName: this.accountHolderName,
    branchName: this.branchName,
    displayName: this.displayName,
    purpose: this.purpose,
    instructions: this.instructions,
    contactPhone: this.contactPhone,
    upiId: this.upiId,
    isPrimary: this.isPrimary
  };
};

// Pre-save middleware to ensure only one primary account per purpose
companyBankDetailsSchema.pre('save', async function(next) {
  if (this.isPrimary && this.isModified('isPrimary')) {
    // Remove primary flag from other accounts with same purpose
    await this.constructor.updateMany(
      { 
        purpose: this.purpose, 
        _id: { $ne: this._id },
        isActive: true 
      },
      { isPrimary: false }
    );
  }
  next();
});

module.exports = mongoose.model('CompanyBankDetails', companyBankDetailsSchema);
