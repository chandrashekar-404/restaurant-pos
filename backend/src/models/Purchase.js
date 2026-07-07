const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  inventoryItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative'],
  },
  cost: {
    type: Number,
    required: true,
    min: [0, 'Cost cannot be negative'],
  },
});

const purchaseSchema = new mongoose.Schema(
  {
    supplier: {
      type: String,
      required: [true, 'Please add a supplier name'],
      trim: true,
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Please add a purchase date'],
      default: Date.now,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Please add an invoice number'],
      trim: true,
    },
    items: [purchaseItemSchema],
    totalCost: {
      type: Number,
      required: true,
      min: [0, 'Total cost cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Purchase', purchaseSchema);
