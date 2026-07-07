const express = require('express');
const router = express.Router();
const { getDashboardData, getSalesReport, getExpenseReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Dashboard data is accessible to all logged in users (Owners and Cashiers)
router.get('/dashboard', getDashboardData);

// Sales reports and expense reports are restricted to Owner only
router.get('/sales', authorize('owner'), getSalesReport);
router.get('/expenses', authorize('owner'), getExpenseReport);

module.exports = router;
