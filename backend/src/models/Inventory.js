const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a raw material name'],
      unique: true,
      trim: true,
    },
    currentStock: {
      type: Number,
      required: [true, 'Please add current stock'],
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    minStock: {
      type: Number,
      required: [true, 'Please add minimum stock level for alert'],
      default: 0,
      min: [0, 'Minimum stock level cannot be negative'],
    },
    unit: {
      type: String,
      required: [true, 'Please add a unit of measurement (e.g., kg, ltr, pcs)'],
      trim: true,
    },
    supplier: {
      type: String,
      trim: true,
      default: '',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to update lastUpdated date
inventorySchema.pre('save', function (next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);
