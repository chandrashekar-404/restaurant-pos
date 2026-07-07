const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['rent', 'salary', 'electricity', 'gas', 'miscellaneous'],
      required: [true, 'Please select a valid category (rent, salary, electricity, gas, miscellaneous)'],
    },
    amount: {
      type: Number,
      required: [true, 'Please add an amount'],
      min: [0, 'Amount cannot be negative'],
    },
    date: {
      type: Date,
      required: [true, 'Please specify the expense date'],
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index on date for monthly expense reports
expenseSchema.index({ date: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
