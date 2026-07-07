const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { connectTestDB, disconnectTestDB, clearTestDB, createHashedPassword, generateTestToken } = require('./helpers');

let ownerToken, cashierToken, testOwner, testCashier;

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  const ownerPassword = await createHashedPassword('owner123');
  const cashierPassword = await createHashedPassword('cashier123');

  testOwner = await User.create({
    username: 'testowner',
    password: ownerPassword,
    name: 'Test Owner',
    role: 'owner',
    isActive: true,
  });

  testCashier = await User.create({
    username: 'testcashier',
    password: cashierPassword,
    name: 'Test Cashier',
    role: 'cashier',
    isActive: true,
  });

  ownerToken = generateTestToken(testOwner._id);
  cashierToken = generateTestToken(testCashier._id);
});

describe('Users API (Access Controls)', () => {
  describe('GET /api/users', () => {
    it('should allow Owner to view the list of users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should deny Cashier access to view the list of users (403)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/users', () => {
    it('should allow Owner to create a new user', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          username: 'newcashier',
          password: 'password123',
          name: 'New Cashier',
          role: 'cashier',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('newcashier');
      
      const createdUser = await User.findOne({ username: 'newcashier' });
      expect(createdUser).toBeDefined();
      expect(createdUser.name).toBe('New Cashier');
    });

    it('should deny Cashier permission to create a new user (403)', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          username: 'hackercashier',
          password: 'password123',
          name: 'Hacker Cashier',
          role: 'cashier',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject user creation with duplicate username', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          username: 'testcashier', // Duplicate of testCashier
          password: 'password123',
          name: 'Duplicate Cashier',
          role: 'cashier',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Username already taken');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should allow Owner to update user details', async () => {
      const res = await request(app)
        .put(`/api/users/${testCashier._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Updated Name',
          isActive: false,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.isActive).toBe(false);
    });

    it('should deny Cashier permission to update users (403)', async () => {
      const res = await request(app)
        .put(`/api/users/${testOwner._id}`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          name: 'Cashier Edit',
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should allow Owner to delete a cashier', async () => {
      const res = await request(app)
        .delete(`/api/users/${testCashier._id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const checkUser = await User.findById(testCashier._id);
      expect(checkUser).toBeNull();
    });

    it('should prevent Owner from deleting their own profile', async () => {
      const res = await request(app)
        .delete(`/api/users/${testOwner._id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('You cannot delete your own profile');
    });

    it('should deny Cashier permission to delete users (403)', async () => {
      const res = await request(app)
        .delete(`/api/users/${testCashier._id}`)
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.statusCode).toBe(403);
    });
  });
});
