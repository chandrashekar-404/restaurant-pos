const mongoose = require('mongoose');

const recipeItemSchema = new mongoose.Schema({
  inventoryItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Please add a quantity for the ingredient'],
    min: [0, 'Quantity cannot be negative'],
  },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a menu item name'],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please add a category (e.g., Starter, Main Course, Dessert, Beverage)'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['veg', 'non-veg'],
      required: [true, 'Please specify if the item is Veg or Non-Veg'],
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      min: [0, 'Price cannot be negative'],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    recipe: [recipeItemSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', productSchema);
