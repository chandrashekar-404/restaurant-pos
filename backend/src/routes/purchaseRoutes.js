const express = require('express');
const router = express.Router();
const { getPurchases, createPurchase } = require('../controllers/purchaseController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('owner'));

router.route('/')
  .get(getPurchases)
  .post(createPurchase);

module.exports = router;
