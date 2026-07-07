const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    restaurantName: {
      type: String,
      required: [true, 'Please add a restaurant name'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Please add an address'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Please add a phone number'],
    },
    logoUrl: {
      type: String,
      default: '',
    },
    receiptFooter: {
      type: String,
      default: 'Thank you for your visit!',
    },
    printerSettings: {
      paperWidth: {
        type: String,
        enum: ['58mm', '80mm'],
        default: '80mm',
      },
      printerType: {
        type: String,
        enum: ['thermal', 'browser'],
        default: 'browser',
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Settings', settingsSchema);
