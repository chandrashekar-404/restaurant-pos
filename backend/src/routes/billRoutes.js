const express = require('express');
const router = express.Router();
const { createBill, getBills, getBill, cancelBill } = require('../controllers/billController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getBills)
  .post(createBill);

router.route('/:id')
  .get(getBill);

router.route('/:id/cancel')
  .put(authorize('owner'), cancelBill);

module.exports = router;
