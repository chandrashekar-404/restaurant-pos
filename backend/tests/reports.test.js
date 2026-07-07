const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Inventory = require('../src/models/Inventory');
const Bill = require('../src/models/Bill');
const BillItem = require('../src/models/BillItem');
const Expense = require('../src/models/Expense');
const { connectTestDB, disconnectTestDB, clearTestDB, generateTestToken } = require('./helpers');

let ownerToken, cashierToken, testOwner, testCashier;
let riceInventory, paneerInventory;
let biryaniProduct, paneerProduct;

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  testOwner = await User.create({
    username: 'testowner',
    password: 'hashedownerpassword',
    name: 'Test Owner',
    role: 'owner',
    isActive: true,
  });

  testCashier = await User.create({
    username: 'testcashier',
    password: 'hashedcashierpassword',
    name: 'Test Cashier',
    role: 'cashier',
    isActive: true,
  });

  ownerToken = generateTestToken(testOwner._id);
  cashierToken = generateTestToken(testCashier._id);

  // Setup Low Stock item and Good stock item
  riceInventory = await Inventory.create({
    name: 'Rice',
    currentStock: 2.0, // Low stock: 2.0 <= 10.0
    minStock: 10.0,
    unit: 'kg',
    supplier: 'Apex Grains',
  });

  paneerInventory = await Inventory.create({
    name: 'Paneer',
    currentStock: 40.0, // Safe stock: 40.0 > 10.0
    minStock: 10.0,
    unit: 'kg',
    supplier: 'Dairy Fresh Co',
  });

  biryaniProduct = await Product.create({
    name: 'Chicken Biryani',
    category: 'Main Course',
    type: 'non-veg',
    price: 250,
  });

  paneerProduct = await Product.create({
    name: 'Paneer Butter Masala',
    category: 'Main Course',
    type: 'veg',
    price: 200,
  });

  const today = new Date();

  // Create active bill
  const activeBill = await Bill.create({
    billNumber: 'BILL-20260707-0001',
    cashier: testCashier._id,
    tableNumber: 'Table-1',
    orderType: 'dine-in',
    items: [
      { product: biryaniProduct._id, name: biryaniProduct.name, price: biryaniProduct.price, quantity: 2, subtotal: 500 },
      { product: paneerProduct._id, name: paneerProduct.name, price: paneerProduct.price, quantity: 1, subtotal: 200 },
    ],
    discount: 50,
    grandTotal: 650,
    paymentMethod: 'upi',
    status: 'paid',
    createdAt: today,
  });

  // Create BillItems for reports
  await BillItem.create([
    {
      bill: activeBill._id,
      product: biryaniProduct._id,
      name: biryaniProduct.name,
      price: biryaniProduct.price,
      quantity: 2,
      subtotal: 500,
      paymentMethod: 'upi',
      status: 'paid',
      billDate: today,
    },
    {
      bill: activeBill._id,
      product: paneerProduct._id,
      name: paneerProduct.name,
      price: paneerProduct.price,
      quantity: 1,
      subtotal: 200,
      paymentMethod: 'upi',
      status: 'paid',
      billDate: today,
    },
  ]);

  // Create a cancelled bill
  await Bill.create({
    billNumber: 'BILL-20260707-0002',
    cashier: testCashier._id,
    tableNumber: 'Table-2',
    orderType: 'dine-in',
    items: [
      { product: biryaniProduct._id, name: biryaniProduct.name, price: biryaniProduct.price, quantity: 1, subtotal: 250 },
    ],
    discount: 0,
    grandTotal: 250,
    paymentMethod: 'cash',
    status: 'cancelled',
    cancelledBy: testOwner._id,
    cancellationReason: 'Wrong order',
    createdAt: today,
  });

  // Create a gas expense
  await Expense.create({
    category: 'gas',
    amount: 1200,
    date: today,
    description: 'LPG Refill',
  });
});

describe('Reports & Analytics API', () => {
  describe('GET /api/reports/dashboard', () => {
    it('should return dashboard summaries for logged in users', async () => {
      const res = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.todaySales).toBe(650);
      expect(res.body.data.todayBillsCount).toBe(1);
      expect(res.body.data.upiCollection).toBe(650);
      expect(res.body.data.cancelledBillsCount).toBe(1);
      
      // Check low stock alert count
      expect(res.body.data.lowStockAlerts.count).toBe(1);
      expect(res.body.data.lowStockAlerts.items[0].name).toBe('Rice');

      // Check best sellers
      expect(res.body.data.bestSellers.length).toBe(2);
      expect(res.body.data.bestSellers[0].name).toBe('Chicken Biryani');
      expect(res.body.data.bestSellers[0].totalQty).toBe(2);
    });
  });

  describe('GET /api/reports/sales', () => {
    it('should allow Owner to view sales report', async () => {
      const res = await request(app)
        .get('/api/reports/sales?range=today')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalSales).toBe(650);
      expect(res.body.data.discountGiven).toBe(50);
      expect(res.body.data.activeBillsCount).toBe(1);
      expect(res.body.data.cancelledBillsCount).toBe(1);
      expect(res.body.data.cancelledBillsList.length).toBe(1);
      expect(res.body.data.itemWiseSales.length).toBe(2);
    });

    it('should deny Cashier permission to view sales report (403)', async () => {
      const res = await request(app)
        .get('/api/reports/sales?range=today')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/reports/expenses', () => {
    it('should allow Owner to view monthly expense report', async () => {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const res = await request(app)
        .get(`/api/reports/expenses?year=${year}&month=${month}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalExpense).toBe(1200);
      expect(res.body.data.expensesList.length).toBe(1);
      expect(res.body.data.categoryBreakdown.length).toBe(1);
      expect(res.body.data.categoryBreakdown[0]._id).toBe('gas');
    });

    it('should deny Cashier permission to view expense report (403)', async () => {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const res = await request(app)
        .get(`/api/reports/expenses?year=${year}&month=${month}`)
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.statusCode).toBe(403);
    });
  });
});
