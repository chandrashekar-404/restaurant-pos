const Product = require('../models/Product');

// @desc    Get all products (with filters & search)
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res, next) => {
  try {
    const { search, category, type, isAvailable } = req.query;
    let query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (category) {
      query.category = category;
    }

    if (type) {
      query.type = type;
    }

    if (isAvailable !== undefined) {
      query.isAvailable = isAvailable === 'true';
    }

    const products = await Product.find(query).populate('recipe.inventoryItem', 'name unit currentStock');

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('recipe.inventoryItem', 'name unit currentStock');
    if (!product) {
      return res.status(404).json({ success: false, error: 'Menu item not found' });
    }
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create menu product
// @route   POST /api/products
// @access  Private/Owner
const createProduct = async (req, res, next) => {
  try {
    const { name, category, type, price, isAvailable, recipe } = req.body;

    const productExists = await Product.findOne({ name });
    if (productExists) {
      return res.status(400).json({
        success: false,
        error: 'Menu item name already exists',
      });
    }

    const product = await Product.create({
      name,
      category,
      type,
      price,
      isAvailable,
      recipe: recipe || [],
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Owner
const updateProduct = async (req, res, next) => {
  try {
    const { name, category, type, price, isAvailable, recipe } = req.body;
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Menu item not found' });
    }

    // Verify duplicate name if changing
    if (name && name !== product.name) {
      const duplicateExists = await Product.findOne({ name });
      if (duplicateExists) {
        return res.status(400).json({
          success: false,
          error: 'Another menu item already has this name',
        });
      }
    }

    product.name = name || product.name;
    product.category = category || product.category;
    product.type = type || product.type;
    product.price = price !== undefined ? price : product.price;
    product.isAvailable = isAvailable !== undefined ? isAvailable : product.isAvailable;
    if (recipe) product.recipe = recipe;

    await product.save();

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Owner
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Menu item not found' });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
