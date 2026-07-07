require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');
const app = require('./src/app');
const User = require('./src/models/User');
const Product = require('./src/models/Product');
const Inventory = require('./src/models/Inventory');
const Bill = require('./src/models/Bill');
const BillItem = require('./src/models/BillItem');
const Purchase = require('./src/models/Purchase');
const Expense = require('./src/models/Expense');
const Settings = require('./src/models/Settings');
const connectDB = require('./src/config/db');

const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api`;

let server;
let ownerToken = '';
let cashierToken = '';
let chickenBiryaniId = '';
let riceId = '';
let chickenId = '';
let oilId = '';
let billId = '';
let cashierUserId = '';

const startTestServer = () => {
  return new Promise((resolve, reject) => {
    server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`[TEST SERVER] Running on port ${PORT}`);
      resolve();
    });
    server.on('error', reject);
  });
};

const stopTestServer = async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
    console.log('[TEST SERVER] Stopped');
  }
  await mongoose.connection.close();
  console.log('[DB] Disconnected');
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(` ✅ PASS: ${message}`);
};

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json();
  return { status: response.status, data };
};

const runTests = async () => {
  try {
    console.log('\n--- STARTING RESTAURANT POS API VERIFICATION ---\n');

    // 1. Check Welcome Route
    const welcome = await request(`http://localhost:${PORT}/`);
    assert(welcome.status === 200, 'Welcome route should respond with 200');
    assert(welcome.data.success === true, 'Welcome response success should be true');

    // 2. Login as seeded default owner
    const loginRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: 'owner', password: 'owner123' }),
    });
    assert(loginRes.status === 200, 'Owner login should respond with 200');
    assert(loginRes.data.token, 'Owner login should return a token');
    ownerToken = loginRes.data.token;
    console.log(`[AUTH] Owner logged in successfully`);

    // 3. Create Cashier user (Owner only)
    const cashierRes = await request(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        username: 'cashier1',
        password: 'cashierPassword123',
        name: 'John Cashier',
        role: 'cashier',
      }),
    });
    assert(cashierRes.status === 201, 'Owner should be able to create Cashier');
    cashierUserId = cashierRes.data.data._id;
    console.log(`[USER] Created Cashier with ID: ${cashierUserId}`);

    // 4. Try creating cashier without token
    const unauthCashier = await request(`${BASE_URL}/users`, {
      method: 'POST',
      body: JSON.stringify({ username: 'hacker', password: 'password', name: 'Hacker' }),
    });
    assert(unauthCashier.status === 401, 'User creation without token should fail with 401');

    // 5. Login as Cashier
    const cashierLogin = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: 'cashier1', password: 'cashierPassword123' }),
    });
    assert(cashierLogin.status === 200, 'Cashier login should succeed with 200');
    cashierToken = cashierLogin.data.token;
    console.log('[AUTH] Cashier logged in successfully');

    // 6. Test Cashier cannot create other users
    const cashierCreateUser = await request(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({ username: 'cashier2', password: 'password', name: 'Cashier 2' }),
    });
    assert(cashierCreateUser.status === 403, 'Cashier should be forbidden from creating users (403)');

    // 7. Create Inventory items (Owner only)
    const createRice = await request(`${BASE_URL}/inventory`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ name: 'Rice', minStock: 5.0, unit: 'kg', supplier: 'Rice Wholesaler' }),
    });
    assert(createRice.status === 201, 'Owner should create Rice inventory item');
    riceId = createRice.data.data._id;

    const createChicken = await request(`${BASE_URL}/inventory`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ name: 'Chicken', minStock: 10.0, unit: 'kg', supplier: 'Poultry Farm' }),
    });
    assert(createChicken.status === 201, 'Owner should create Chicken inventory item');
    chickenId = createChicken.data.data._id;

    const createOil = await request(`${BASE_URL}/inventory`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ name: 'Oil', minStock: 2.0, unit: 'ltr', supplier: 'Oil Refineries' }),
    });
    assert(createOil.status === 201, 'Owner should create Oil inventory item');
    oilId = createOil.data.data._id;

    console.log('[INVENTORY] Created Rice, Chicken, Oil items');

    // 8. Create Menu Product (Chicken Biryani) with Recipe
    const createBiryani = await request(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        name: 'Chicken Biryani',
        category: 'Main Course',
        type: 'non-veg',
        price: 250,
        recipe: [
          { inventoryItem: riceId, quantity: 0.25 }, // 250g Rice
          { inventoryItem: chickenId, quantity: 0.3 }, // 300g Chicken
          { inventoryItem: oilId, quantity: 0.05 }, // 50ml Oil
        ],
      }),
    });
    assert(createBiryani.status === 201, 'Owner should create Product Chicken Biryani');
    chickenBiryaniId = createBiryani.data.data._id;
    console.log(`[PRODUCT] Created Chicken Biryani with recipe`);

    // 9. Add inventory stock via Purchase (Owner only)
    const createPur = await request(`${BASE_URL}/purchases`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        supplier: 'Mega Agro Food Suppliers',
        invoiceNumber: 'INV-2026-0001',
        totalCost: 1500,
        items: [
          { inventoryItem: riceId, quantity: 50, cost: 50 }, // 50 kg Rice
          { inventoryItem: chickenId, quantity: 30, cost: 200 }, // 30 kg Chicken
          { inventoryItem: oilId, quantity: 20, cost: 120 }, // 20 ltr Oil
        ],
      }),
    });
    assert(createPur.status === 201, 'Owner should purchase raw materials and increase stock');
    
    // Verify stock is increased
    const getRiceStock = await request(`${BASE_URL}/inventory/${riceId}`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(getRiceStock.data.data.currentStock === 50, 'Rice stock should be updated to 50');
    console.log('[INVENTORY] Stock successfully added through Purchase');

    // 10. Cashier Creates Bill (2 Chicken Biryanis)
    const createBillRes = await request(`${BASE_URL}/bills`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({
        tableNumber: 'Table-5',
        orderType: 'dine-in',
        discount: 50,
        paymentMethod: 'upi',
        items: [
          { product: chickenBiryaniId, quantity: 2 },
        ],
      }),
    });
    assert(createBillRes.status === 201, 'Cashier should be able to check out / create a bill');
    billId = createBillRes.data.data._id;
    // Expected grand total: (250 * 2) - 50 = 450
    assert(createBillRes.data.data.grandTotal === 450, 'Grand total must be calculated accurately');
    console.log(`[BILL] Created bill ${createBillRes.data.data.billNumber}`);

    // 11. Verify inventory is decremented
    // Biryani uses 0.25kg Rice and 0.3kg Chicken and 0.05ltr Oil.
    // For 2 biryanis: Rice - 0.5kg, Chicken - 0.6kg, Oil - 0.1ltr.
    // Rice should be 50 - 0.5 = 49.5
    // Chicken should be 30 - 0.6 = 29.4
    // Oil should be 20 - 0.1 = 19.9
    const getRiceStockAfter = await request(`${BASE_URL}/inventory/${riceId}`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(getRiceStockAfter.data.data.currentStock === 49.5, 'Rice stock should be decremented to 49.5');
    
    const getChickenStockAfter = await request(`${BASE_URL}/inventory/${chickenId}`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(getChickenStockAfter.data.data.currentStock === 29.4, 'Chicken stock should be decremented to 29.4');
    console.log('[INVENTORY] Stock successfully decremented based on product recipes');

    // 12. Cashier tries to Cancel Bill (should fail)
    const cancelByCashier = await request(`${BASE_URL}/bills/${billId}/cancel`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${cashierToken}` },
      body: JSON.stringify({ cancellationReason: 'Customer changed mind' }),
    });
    assert(cancelByCashier.status === 403, 'Cashier cancelling bill should return 403 Forbidden');

    // 13. Owner Cancels Bill (should succeed & restore stock)
    const cancelByOwner = await request(`${BASE_URL}/bills/${billId}/cancel`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ cancellationReason: 'Incorrect order entered' }),
    });
    assert(cancelByOwner.status === 200, 'Owner cancelling bill should return 200 Success');

    // Verify stock is restored
    const getRiceStockRestored = await request(`${BASE_URL}/inventory/${riceId}`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(getRiceStockRestored.data.data.currentStock === 50, 'Rice stock should be restored to 50');
    console.log('[INVENTORY] Stock successfully restored after bill cancellation');

    // 14. Add an expense (Owner only)
    const createExp = await request(`${BASE_URL}/expenses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        category: 'gas',
        amount: 800,
        description: 'Commercial LPG Cylinder',
      }),
    });
    assert(createExp.status === 201, 'Owner should be able to log gas expense');
    console.log('[EXPENSE] Expense logged successfully');

    // 15. Verify Dashboard stats
    const dashRes = await request(`${BASE_URL}/reports/dashboard`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    assert(dashRes.status === 200, 'Dashboard request should succeed');
    // Note: Cancelled bills should be counted, and since we cancelled the bill, todaySales should be 0.
    assert(dashRes.data.data.cancelledBillsCount === 1, 'Cancelled bills today should be 1');
    assert(dashRes.data.data.todaySales === 0, 'Today sales should be 0 since the only bill was cancelled');
    console.log('[REPORTS] Dashboard analytics verified successfully');

    // 16. Verify Sales Report (Owner only)
    const salesReportRes = await request(`${BASE_URL}/reports/sales?range=today`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(salesReportRes.status === 200, 'Owner sales report should succeed');
    assert(salesReportRes.data.data.cancelledBillsList.length === 1, 'Sales report should list 1 cancelled bill');
    console.log('[REPORTS] Sales report query verified successfully');

    // 17. Verify Expense Report (Owner only)
    const expReportRes = await request(`${BASE_URL}/reports/expenses?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(expReportRes.status === 200, 'Owner expense report should succeed');
    assert(expReportRes.data.data.totalExpense === 800, 'Expense report sum should be 800');
    console.log('[REPORTS] Monthly expense report verified successfully');

    console.log('\n--- ALL API INTEGRATION TESTS PASSED SUCCESSFULLY! ---\n');
  } catch (error) {
    console.error('\n ❌ TEST RUN FAILED with error:\n', error);
    process.exit(1);
  }
};

const main = async () => {
  try {
    await connectDB();
    
    // Clear test database details to avoid dirty data
    await User.deleteMany({ username: 'cashier1' });
    await Inventory.deleteMany({ name: { $in: ['Rice', 'Chicken', 'Oil'] } });
    await Product.deleteMany({ name: 'Chicken Biryani' });
    await Bill.deleteMany({});
    await BillItem.deleteMany({});
    await Purchase.deleteMany({});
    await Expense.deleteMany({});
    
    await startTestServer();
    await runTests();
    await stopTestServer();
    process.exit(0);
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  }
};

main();
