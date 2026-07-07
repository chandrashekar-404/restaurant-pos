const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Inventory = require('../src/models/Inventory');
const { connectTestDB, disconnectTestDB, clearTestDB, generateTestToken } = require('./helpers');

let ownerToken, cashierToken, testProduct, testInventoryItem;

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  const owner = await User.create({
    username: 'testowner',
    password: 'hashedownerpassword',
    name: 'Test Owner',
    role: 'owner',
    isActive: true,
  });

  const cashier = await User.create({
    username: 'testcashier',
    password: 'hashedcashierpassword',
    name: 'Test Cashier',
    role: 'cashier',
    isActive: true,
  });

  ownerToken = generateTestToken(owner._id);
  cashierToken = generateTestToken(cashier._id);

  testInventoryItem = await Inventory.create({
    name: 'Rice',
    currentStock: 50.0,
    minStock: 10.0,
    unit: 'kg',
    supplier: 'Apex Grains',
  });

  testProduct = await Product.create({
    name: 'Steamed Rice',
    category: 'Main Course',
    type: 'veg',
    price: 120,
    recipe: [
      { inventoryItem: testInventoryItem._id, quantity: 0.2 },
    ],
  });
});

describe('Products / Menu API', () => {
  describe('GET /api/products', () => {
    it('should allow Cashier to fetch all products', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Steamed Rice');
    });

    it('should allow Owner to fetch all products', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/products', () => {
    it('should allow Owner to create a product with recipe', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Fried Rice',
          category: 'Main Course',
          type: 'veg',
          price: 150,
          recipe: [
            { inventoryItem: testInventoryItem._id, quantity: 0.25 },
          ],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Fried Rice');
      expect(res.body.data.recipe.length).toBe(1);
    });

    it('should reject creation from Cashier (403)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          name: 'Hacker Dish',
          category: 'Main Course',
          type: 'veg',
          price: 1000,
        });

      expect(res.statusCode).toBe(403);
    });

    it('should reject product creation with negative price', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Bad Pricing Dish',
          category: 'Main Course',
          type: 'veg',
          price: -50,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should allow Owner to update product price and details', async () => {
      const res = await request(app)
        .put(`/api/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          price: 130,
          isAvailable: false,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.price).toBe(130);
      expect(res.body.data.isAvailable).toBe(false);
    });

    it('should deny Cashier permission to update product (403)', async () => {
      const res = await request(app)
        .put(`/api/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          price: 90,
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should deny Cashier permission to delete product (403)', async () => {
      const res = await request(app)
        .delete(`/api/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should allow Owner to delete product', async () => {
      const res = await request(app)
        .delete(`/api/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const checkProduct = await Product.findById(testProduct._id);
      expect(checkProduct).toBeNull();
    });
  });
});
