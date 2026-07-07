const Bill = require('../models/Bill');
const BillItem = require('../models/BillItem');
const Inventory = require('../models/Inventory');
const Expense = require('../models/Expense');

// Helper to get date boundaries
const getDateRange = (range, startDate, endDate) => {
  const start = new Date();
  const end = new Date();

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      // Get start of current week (Sunday or Monday, let's say Sunday)
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yearly':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'custom':
      if (startDate) {
        start.setTime(new Date(startDate).getTime());
      } else {
        start.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        end.setTime(new Date(endDate).getTime());
      } else {
        end.setHours(23, 59, 59, 999);
      }
      break;
    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

// @desc    Get dashboard metrics (Today's sales, payment modes, best sellers, alerts)
// @route   GET /api/reports/dashboard
// @access  Private
const getDashboardData = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Fetch today's bills summary
    const billsToday = await Bill.find({
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });

    let todaySales = 0;
    let todayBillsCount = 0;
    let cashCollection = 0;
    let upiCollection = 0;
    let cardCollection = 0;
    let cancelledBillsCount = 0;

    billsToday.forEach(bill => {
      if (bill.status === 'paid') {
        todaySales += bill.grandTotal;
        todayBillsCount++;
        if (bill.paymentMethod === 'cash') cashCollection += bill.grandTotal;
        else if (bill.paymentMethod === 'upi') upiCollection += bill.grandTotal;
        else if (bill.paymentMethod === 'card') cardCollection += bill.grandTotal;
      } else {
        cancelledBillsCount++;
      }
    });

    // 2. Fetch best selling items (aggregate BillItem)
    const bestSellers = await BillItem.aggregate([
      { $match: { status: 'paid' } },
      {
        $group: {
          _id: '$product',
          name: { $first: '$name' },
          totalQty: { $sum: '$quantity' },
          totalRevenue: { $sum: '$subtotal' }
        }
      },
      { $sort: { totalQty: -1 } },
      { $limit: 5 }
    ]);

    // 3. Fetch low stock inventory alerts
    const lowStockAlerts = await Inventory.find({
      $expr: { $lte: ['$currentStock', '$minStock'] }
    });

    res.status(200).json({
      success: true,
      data: {
        todaySales,
        todayBillsCount,
        cashCollection,
        upiCollection,
        cardCollection,
        cancelledBillsCount,
        bestSellers,
        lowStockAlerts: {
          count: lowStockAlerts.length,
          items: lowStockAlerts
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed sales report
// @route   GET /api/reports/sales
// @access  Private/Owner
const getSalesReport = async (req, res, next) => {
  try {
    const { range, startDate, endDate } = req.query;
    const { start, end } = getDateRange(range, startDate, endDate);

    // 1. General totals
    const bills = await Bill.find({
      createdAt: { $gte: start, $lte: end }
    }).populate('cashier', 'name');

    let totalSales = 0;
    let activeBills = 0;
    let discountGiven = 0;
    let paymentBreakdown = { cash: 0, upi: 0, card: 0 };
    const cancelledBills = [];

    bills.forEach(bill => {
      if (bill.status === 'paid') {
        totalSales += bill.grandTotal;
        discountGiven += bill.discount;
        activeBills++;
        paymentBreakdown[bill.paymentMethod] = (paymentBreakdown[bill.paymentMethod] || 0) + bill.grandTotal;
      } else {
        cancelledBills.push(bill);
      }
    });

    // 2. Item-wise sales breakdown (aggregate BillItem)
    const itemSales = await BillItem.aggregate([
      {
        $match: {
          billDate: { $gte: start, $lte: end },
          status: 'paid'
        }
      },
      {
        $group: {
          _id: '$product',
          name: { $first: '$name' },
          price: { $first: '$price' },
          totalQuantity: { $sum: '$quantity' },
          totalSubtotal: { $sum: '$subtotal' }
        }
      },
      { $sort: { totalQuantity: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: { start, end },
        totalSales,
        activeBillsCount: activeBills,
        cancelledBillsCount: cancelledBills.length,
        discountGiven,
        paymentBreakdown,
        itemWiseSales: itemSales,
        cancelledBillsList: cancelledBills
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly expense report
// @route   GET /api/reports/expenses
// @access  Private/Owner
const getExpenseReport = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month, 10) - 1 : new Date().getMonth(); // 0-indexed month

    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const expenses = await Expense.find({
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).sort({ date: 1 });

    const categoryBreakdown = await Expense.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalExpense = categoryBreakdown.reduce((sum, item) => sum + item.totalAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        period: {
          year: currentYear,
          month: currentMonth + 1,
          start: startOfMonth,
          end: endOfMonth
        },
        totalExpense,
        categoryBreakdown,
        expensesList: expenses
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardData,
  getSalesReport,
  getExpenseReport
};
