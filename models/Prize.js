const mongoose = require('mongoose');

const prizeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  position: {
    type: Number,
    required: true,
    unique: true
  },
  emoji: {
    type: String,
    default: '🏆'
  },
  medal: {
    type: String,
    enum: ['🥇', '🥈', '🥉', '🏆', '🎁'],
    default: '🏆'
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
prizeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Format amount with commas
prizeSchema.virtual('formattedAmount').get(function() {
  return this.amount ? this.amount.toLocaleString('en-IN') : '0';
});

// Ensure virtual fields are serialized
prizeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Prize', prizeSchema);
