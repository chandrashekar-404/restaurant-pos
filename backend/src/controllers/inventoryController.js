const Inventory = require('../models/Inventory');

// @desc    Get all inventory items (with optional low-stock filter)
// @route   GET /api/inventory
// @access  Private
const getInventory = async (req, res, next) => {
  try {
    const { lowStock } = req.query;
    let query = {};

    if (lowStock === 'true') {
      // Find where stock is less than or equal to min stock alert level
      query = {
        $expr: { $lte: ['$currentStock', '$minStock'] }
      };
    }

    const items = await Inventory.find(query);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
// @access  Private
const getInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }
    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create inventory item
// @route   POST /api/inventory
// @access  Private/Owner
const createInventoryItem = async (req, res, next) => {
  try {
    const { name, currentStock, minStock, unit, supplier } = req.body;

    const itemExists = await Inventory.findOne({ name });
    if (itemExists) {
      return res.status(400).json({
        success: false,
        error: 'Inventory item name already exists',
      });
    }

    const item = await Inventory.create({
      name,
      currentStock: currentStock || 0,
      minStock: minStock || 0,
      unit,
      supplier: supplier || '',
    });

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private/Owner
const updateInventoryItem = async (req, res, next) => {
  try {
    const { name, currentStock, minStock, unit, supplier } = req.body;
    let item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }

    if (name && name !== item.name) {
      const duplicateExists = await Inventory.findOne({ name });
      if (duplicateExists) {
        return res.status(400).json({
          success: false,
          error: 'Another inventory item already has this name',
        });
      }
    }

    item.name = name || item.name;
    item.currentStock = currentStock !== undefined ? currentStock : item.currentStock;
    item.minStock = minStock !== undefined ? minStock : item.minStock;
    item.unit = unit || item.unit;
    item.supplier = supplier !== undefined ? supplier : item.supplier;

    await item.save();

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private/Owner
const deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }

    await Inventory.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
};
