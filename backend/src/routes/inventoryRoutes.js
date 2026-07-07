const express = require('express');
const router = express.Router();
const { getInventory, getInventoryItem, createInventoryItem, updateInventoryItem, deleteInventoryItem } = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getInventory)
  .post(authorize('owner'), createInventoryItem);

router.route('/:id')
  .get(getInventoryItem)
  .put(authorize('owner'), updateInventoryItem)
  .delete(authorize('owner'), deleteInventoryItem);

module.exports = router;
