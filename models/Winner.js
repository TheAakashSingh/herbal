const mongoose = require('mongoose');

const winnerSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  paid: {
    type: String,
    required: true
  },
  product: {
    type: String,
    required: true,
    trim: true
  },
  prizeAmount: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Active', 'ACTIVE', 'Inactive'],
    default: 'Active'
  },
  wcode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  image: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
winnerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better search performance
winnerSchema.index({ phone: 1 });
winnerSchema.index({ name: 1 });
winnerSchema.index({ wcode: 1 });
winnerSchema.index({ status: 1 });
winnerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Winner', winnerSchema);
