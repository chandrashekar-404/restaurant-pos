const express = require('express');
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getProducts)
  .post(authorize('owner'), createProduct);

router.route('/:id')
  .get(getProduct)
  .put(authorize('owner'), updateProduct)
  .delete(authorize('owner'), deleteProduct);

module.exports = router;
