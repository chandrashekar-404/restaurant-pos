const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { connectTestDB, disconnectTestDB, clearTestDB, createHashedPassword } = require('./helpers');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearTestDB();
  
  // Seed a default owner and a cashier
  const ownerPassword = await createHashedPassword('ownerpassword123');
  const cashierPassword = await createHashedPassword('cashierpassword123');

  await User.create([
    {
      username: 'testowner',
      password: ownerPassword,
      name: 'Test Owner',
      role: 'owner',
      isActive: true,
    },
    {
      username: 'testcashier',
      password: cashierPassword,
      name: 'Test Cashier',
      role: 'cashier',
      isActive: true,
    },
  ]);
});

describe('Auth Endpoints', () => {
  describe('POST /api/auth/login', () => {
    it('should login successfully with valid owner credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testowner', password: 'ownerpassword123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('owner');
    });

    it('should login successfully with valid cashier credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testcashier', password: 'cashierpassword123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('cashier');
    });

    it('should fail to login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testowner', password: 'wrongpassword' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should fail to login for a non-existent username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'password' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return profile details with a valid authorization token', async () => {
      // First log in to get a token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testcashier', password: 'cashierpassword123' });
      
      const token = loginRes.body.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.username).toBe('testcashier');
      expect(res.body.user.role).toBe('cashier');
    });

    it('should fail with 401 when token is missing', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with 401 when token is invalid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
