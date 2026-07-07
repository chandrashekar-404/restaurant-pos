const Purchase = require('../models/Purchase');
const Inventory = require('../models/Inventory');

// @desc    Get all purchase invoices
// @route   GET /api/purchases
// @access  Private/Owner
const getPurchases = async (req, res, next) => {
  try {
    const purchases = await Purchase.find({}).populate('items.inventoryItem', 'name unit');
    res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchases,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new purchase and auto-update inventory stock
// @route   POST /api/purchases
// @access  Private/Owner
const createPurchase = async (req, res, next) => {
  try {
    const { supplier, purchaseDate, invoiceNumber, items, totalCost } = req.body;

    if (!supplier || !invoiceNumber || !items || !items.length) {
      return res.status(400).json({
        success: false,
        error: 'Please provide supplier, invoice number, and at least one purchase item.',
      });
    }

    // Verify all inventory items exist before proceeding
    for (const item of items) {
      const invItem = await Inventory.findById(item.inventoryItem);
      if (!invItem) {
        return res.status(404).json({
          success: false,
          error: `Inventory item with ID ${item.inventoryItem} not found`,
        });
      }
    }

    // Update inventory stock levels
    for (const item of items) {
      await Inventory.findByIdAndUpdate(item.inventoryItem, {
        $inc: { currentStock: item.quantity },
        $set: { lastUpdated: Date.now() }
      });
    }

    // Create the purchase record
    const purchase = await Purchase.create({
      supplier,
      purchaseDate: purchaseDate || Date.now(),
      invoiceNumber,
      items,
      totalCost,
    });

    res.status(201).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPurchases,
  createPurchase,
};
