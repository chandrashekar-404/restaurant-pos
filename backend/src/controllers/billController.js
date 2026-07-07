const Bill = require('../models/Bill');
const BillItem = require('../models/BillItem');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

// Helper to generate bill number
const generateBillNumber = async () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  // Start of today (00:00:00)
  const startOfToday = new Date(today.setHours(0, 0, 0, 0));
  // End of today (23:59:59)
  const endOfToday = new Date(today.setHours(23, 59, 59, 999));

  // Count bills created today to get sequential number
  const count = await Bill.countDocuments({
    createdAt: { $gte: startOfToday, $lte: endOfToday }
  });

  const sequentialNum = String(count + 1).padStart(4, '0');
  return `BILL-${dateStr}-${sequentialNum}`;
};

// @desc    Create a new bill (auto-decrement inventory based on recipes)
// @route   POST /api/bills
// @access  Private
const createBill = async (req, res, next) => {
  try {
    const { tableNumber, orderType, items, discount, paymentMethod } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, error: 'Please add at least one item to the bill.' });
    }

    if (!orderType || !paymentMethod) {
      return res.status(400).json({ success: false, error: 'Order type and payment method are required.' });
    }

    let calculatedGrandTotal = 0;
    const validatedItems = [];

    // 1. Validate items, fetch prices, and build validated items array
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ success: false, error: `Menu item with ID ${item.product} not found.` });
      }

      if (!product.isAvailable) {
        return res.status(400).json({ success: false, error: `Menu item ${product.name} is currently unavailable.` });
      }

      const price = product.price;
      const quantity = parseInt(item.quantity, 10);
      const subtotal = price * quantity;
      calculatedGrandTotal += subtotal;

      validatedItems.push({
        product: product._id,
        name: product.name,
        price,
        quantity,
        subtotal,
        recipe: product.recipe || [] // hold for inventory deduct
      });
    }

    // 2. Apply discount
    const discAmount = parseFloat(discount) || 0;
    calculatedGrandTotal = Math.max(0, calculatedGrandTotal - discAmount);

    // 3. Deduct inventory items based on recipes
    for (const item of validatedItems) {
      if (item.recipe && item.recipe.length > 0) {
        for (const ingredient of item.recipe) {
          const quantityToDeduct = ingredient.quantity * item.quantity;
          await Inventory.findByIdAndUpdate(ingredient.inventoryItem, {
            $inc: { currentStock: -quantityToDeduct },
            $set: { lastUpdated: Date.now() }
          });
        }
      }
    }

    // 4. Generate bill number
    const billNumber = await generateBillNumber();

    // 5. Create bill
    const bill = await Bill.create({
      billNumber,
      cashier: req.user._id,
      tableNumber: tableNumber || '',
      orderType,
      items: validatedItems.map(vi => ({
        product: vi.product,
        name: vi.name,
        price: vi.price,
        quantity: vi.quantity,
        subtotal: vi.subtotal
      })),
      discount: discAmount,
      grandTotal: calculatedGrandTotal,
      paymentMethod,
      status: 'paid'
    });

    // 6. Create BillItems records for sales reporting
    const billItemsToCreate = validatedItems.map(vi => ({
      bill: bill._id,
      product: vi.product,
      name: vi.name,
      price: vi.price,
      quantity: vi.quantity,
      subtotal: vi.subtotal,
      paymentMethod,
      status: 'paid',
      billDate: bill.createdAt
    }));
    await BillItem.insertMany(billItemsToCreate);

    // Populate cashier info
    const populatedBill = await Bill.findById(bill._id).populate('cashier', 'name username');

    res.status(201).json({
      success: true,
      data: populatedBill
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bills (with filters by bill number, date range, etc.)
// @route   GET /api/bills
// @access  Private
const getBills = async (req, res, next) => {
  try {
    const { billNumber, startDate, endDate, cashier, paymentMethod, status } = req.query;
    let query = {};

    if (billNumber) {
      query.billNumber = { $regex: billNumber, $options: 'i' };
    }

    if (cashier) {
      query.cashier = cashier;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const bills = await Bill.find(query)
      .populate('cashier', 'name username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bills.length,
      data: bills
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single bill details
// @route   GET /api/bills/:id
// @access  Private
const getBill = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('cashier', 'name username')
      .populate('cancelledBy', 'name username');

    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found.' });
    }

    res.status(200).json({
      success: true,
      data: bill
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a bill (restores inventory, Owner only)
// @route   PUT /api/bills/:id/cancel
// @access  Private/Owner
const cancelBill = async (req, res, next) => {
  try {
    const { cancellationReason } = req.body;

    if (!cancellationReason) {
      return res.status(400).json({ success: false, error: 'Please provide a reason for cancellation.' });
    }

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found.' });
    }

    if (bill.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Bill is already cancelled.' });
    }

    // 1. Restore stock to inventory
    for (const item of bill.items) {
      const product = await Product.findById(item.product);
      if (product && product.recipe && product.recipe.length > 0) {
        for (const ingredient of product.recipe) {
          const qtyToRestore = ingredient.quantity * item.quantity;
          await Inventory.findByIdAndUpdate(ingredient.inventoryItem, {
            $inc: { currentStock: qtyToRestore },
            $set: { lastUpdated: Date.now() }
          });
        }
      }
    }

    // 2. Mark bill status as cancelled
    bill.status = 'cancelled';
    bill.cancelledBy = req.user._id;
    bill.cancellationReason = cancellationReason;
    await bill.save();

    // 3. Update BillItems status
    await BillItem.updateMany({ bill: bill._id }, { status: 'cancelled' });

    const populatedBill = await Bill.findById(bill._id)
      .populate('cashier', 'name username')
      .populate('cancelledBy', 'name username');

    res.status(200).json({
      success: true,
      message: 'Bill cancelled successfully and inventory stock restored.',
      data: populatedBill
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBill,
  getBills,
  getBill,
  cancelBill
};
