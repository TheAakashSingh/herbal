const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema({
  // Winner Information
  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Winner',
    required: true
  },
  winnerName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  wcode: {
    type: String,
    required: true,
    trim: true
  },
  
  // Bank Information
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
  
  // Prize Information
  prizeAmount: {
    type: Number,
    required: true,
    min: 0
  },
  prizeType: {
    type: String,
    enum: ['Cash', 'Car', 'Other'],
    default: 'Cash'
  },
  
  // Status and Verification
  status: {
    type: String,
    enum: ['Pending', 'Verified', 'Approved', 'Paid', 'Rejected'],
    default: 'Pending'
  },
  verificationStatus: {
    type: String,
    enum: ['Not Verified', 'Under Review', 'Verified', 'Failed'],
    default: 'Not Verified'
  },
  
  // Additional Information
  notes: {
    type: String,
    trim: true
  },
  adminNotes: {
    type: String,
    trim: true
  },
  
  // Payment Information
  paymentDate: {
    type: Date
  },
  transactionId: {
    type: String,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Other'],
    default: 'Bank Transfer'
  },
  
  // Verification Documents
  documents: [{
    type: {
      type: String,
      enum: ['Bank Passbook', 'Cancelled Cheque', 'ID Proof', 'Address Proof', 'Other']
    },
    filename: String,
    path: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Audit Trail
  createdBy: {
    type: String,
    default: 'System'
  },
  updatedBy: {
    type: String
  },
  
  // Timestamps
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
bankDetailsSchema.index({ phone: 1 });
bankDetailsSchema.index({ winnerId: 1 });
bankDetailsSchema.index({ status: 1 });
bankDetailsSchema.index({ verificationStatus: 1 });
bankDetailsSchema.index({ createdAt: -1 });

// Virtual for formatted prize amount
bankDetailsSchema.virtual('formattedPrizeAmount').get(function() {
  return `₹${this.prizeAmount.toLocaleString('en-IN')}`;
});

// Virtual for formatted account number (masked)
bankDetailsSchema.virtual('maskedAccountNumber').get(function() {
  if (this.accountNumber && this.accountNumber.length > 4) {
    const last4 = this.accountNumber.slice(-4);
    const masked = 'X'.repeat(this.accountNumber.length - 4);
    return masked + last4;
  }
  return this.accountNumber;
});

// Method to get status badge class
bankDetailsSchema.methods.getStatusBadgeClass = function() {
  switch (this.status) {
    case 'Verified': return 'success';
    case 'Approved': return 'info';
    case 'Paid': return 'primary';
    case 'Rejected': return 'danger';
    default: return 'warning';
  }
};

// Method to get verification status badge class
bankDetailsSchema.methods.getVerificationBadgeClass = function() {
  switch (this.verificationStatus) {
    case 'Verified': return 'success';
    case 'Under Review': return 'info';
    case 'Failed': return 'danger';
    default: return 'secondary';
  }
};

// Static method to get bank details by winner
bankDetailsSchema.statics.findByWinner = function(winnerId) {
  return this.findOne({ winnerId, isActive: true });
};

// Static method to get bank details by phone
bankDetailsSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone, isActive: true });
};

// Pre-save middleware to update timestamps
bankDetailsSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('BankDetails', bankDetailsSchema);
