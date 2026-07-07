const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema(
  {
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card'],
      required: true,
    },
    status: {
      type: String,
      enum: ['paid', 'cancelled'],
      default: 'paid',
    },
    billDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for efficient report generation
billItemSchema.index({ billDate: 1 });
billItemSchema.index({ product: 1 });
billItemSchema.index({ status: 1 });

module.exports = mongoose.model('BillItem', billItemSchema);
