const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Inventory = require('../src/models/Inventory');
const Bill = require('../src/models/Bill');
const BillItem = require('../src/models/BillItem');
const { connectTestDB, disconnectTestDB, clearTestDB, generateTestToken } = require('./helpers');

let ownerToken, cashierToken, testOwner, testCashier;
let riceInventory, chickenInventory;
let biryaniProduct;

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

  // Setup Inventory with initial stocks
  riceInventory = await Inventory.create({
    name: 'Rice',
    currentStock: 50.0, // 50 kg
    minStock: 10.0,
    unit: 'kg',
    supplier: 'Apex Grains',
  });

  chickenInventory = await Inventory.create({
    name: 'Chicken',
    currentStock: 30.0, // 30 kg
    minStock: 10.0,
    unit: 'kg',
    supplier: 'Poultry Farm',
  });

  // Setup Product with recipe
  biryaniProduct = await Product.create({
    name: 'Chicken Biryani',
    category: 'Main Course',
    type: 'non-veg',
    price: 250,
    recipe: [
      { inventoryItem: riceInventory._id, quantity: 0.25 }, // 250g
      { inventoryItem: chickenInventory._id, quantity: 0.3 }, // 300g
    ],
  });
});

describe('Billing & Inventory API', () => {
  describe('POST /api/bills', () => {
    it('should create a bill, calculate total/discount, deduct inventory and create BillItems', async () => {
      const billData = {
        tableNumber: 'Table-12',
        orderType: 'dine-in',
        discount: 30,
        paymentMethod: 'cash',
        items: [
          { product: biryaniProduct._id, quantity: 2 },
        ],
      };

      const res = await request(app)
        .post('/api/bills')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send(billData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.billNumber).toBeDefined();
      // Price calculation: (250 * 2) - 30 = 470
      expect(res.body.data.grandTotal).toBe(470);
      expect(res.body.data.discount).toBe(30);

      // Verify stock deduction
      // Rice: 50 - (0.25 * 2) = 49.5
      // Chicken: 30 - (0.3 * 2) = 29.4
      const updatedRice = await Inventory.findById(riceInventory._id);
      const updatedChicken = await Inventory.findById(chickenInventory._id);
      expect(updatedRice.currentStock).toBe(49.5);
      expect(updatedChicken.currentStock).toBe(29.4);

      // Verify BillItem documents are created
      const createdItems = await BillItem.find({ bill: res.body.data._id });
      expect(createdItems.length).toBe(1);
      expect(createdItems[0].name).toBe('Chicken Biryani');
      expect(createdItems[0].quantity).toBe(2);
      expect(createdItems[0].subtotal).toBe(500);
      expect(createdItems[0].status).toBe('paid');
    });

    it('should fail if payment method is missing', async () => {
      const billData = {
        tableNumber: 'Table-12',
        orderType: 'dine-in',
        items: [
          { product: biryaniProduct._id, quantity: 2 },
        ],
      };

      const res = await request(app)
        .post('/api/bills')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send(billData);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('PUT /api/bills/:id/cancel', () => {
    let testBill;

    beforeEach(async () => {
      // Create a bill to test cancellation
      const billData = {
        tableNumber: 'Table-12',
        orderType: 'dine-in',
        discount: 30,
        paymentMethod: 'cash',
        items: [
          { product: biryaniProduct._id, quantity: 2 },
        ],
      };

      const res = await request(app)
        .post('/api/bills')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send(billData);

      testBill = res.body.data;
    });

    it('should restrict bill cancellation to Owners (return 403 for Cashier)', async () => {
      const res = await request(app)
        .put(`/api/bills/${testBill._id}/cancel`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ cancellationReason: 'Accidental click' });

      expect(res.statusCode).toBe(403);
    });

    it('should allow Owner to cancel, mark bill/billItems cancelled, and restore stock levels', async () => {
      const res = await request(app)
        .put(`/api/bills/${testBill._id}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ cancellationReason: 'Incorrect quantity' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('cancelled');
      expect(res.body.data.cancelledBy).toBeDefined();
      expect(res.body.data.cancellationReason).toBe('Incorrect quantity');

      // Verify BillItems status updated
      const updatedItems = await BillItem.find({ bill: testBill._id });
      expect(updatedItems[0].status).toBe('cancelled');

      // Verify stock restored
      // Rice: 49.5 + (0.25 * 2) = 50.0
      // Chicken: 29.4 + (0.3 * 2) = 30.0
      const restoredRice = await Inventory.findById(riceInventory._id);
      const restoredChicken = await Inventory.findById(chickenInventory._id);
      expect(restoredRice.currentStock).toBe(50.0);
      expect(restoredChicken.currentStock).toBe(30.0);
    });

    it('should fail to cancel if cancellation reason is missing', async () => {
      const res = await request(app)
        .put(`/api/bills/${testBill._id}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
    });
  });
});
