const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Settings = require('../models/Settings');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const Bill = require('../models/Bill');
const BillItem = require('../models/BillItem');

const SEED_DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-pos';

const cleanDatabase = async () => {
  console.log('[SEED] Wiping existing database data...');
  await User.deleteMany({});
  await Settings.deleteMany({});
  await Inventory.deleteMany({});
  await Product.deleteMany({});
  await Purchase.deleteMany({});
  await Expense.deleteMany({});
  await Bill.deleteMany({});
  await BillItem.deleteMany({});
  console.log('[SEED] Database cleaned successfully.');
};

const hashPassword = async (pwd) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(pwd, salt);
};

const seedUsers = async () => {
  console.log('[SEED] Seeding users...');
  const ownerPassword = await hashPassword('owner123');
  const cashierPassword = await hashPassword('cashier123');

  const owner = await User.create({
    username: 'owner',
    password: ownerPassword,
    name: 'Gourmet Owner',
    role: 'owner',
    isActive: true,
  });

  const cashier1 = await User.create({
    username: 'cashier1',
    password: cashierPassword,
    name: 'Rahul Cashier',
    role: 'cashier',
    isActive: true,
  });

  const cashier2 = await User.create({
    username: 'cashier2',
    password: cashierPassword,
    name: 'Priya Cashier',
    role: 'cashier',
    isActive: true,
  });

  console.log('[SEED] Users seeded successfully.');
  return { owner, cashier1, cashier2 };
};

const seedSettings = async () => {
  console.log('[SEED] Seeding default settings...');
  const settings = await Settings.create({
    restaurantName: 'The Gourmet Bistro',
    address: '456 Culinary Boulevard, Foodie Haven',
    phoneNumber: '+19876543210',
    receiptFooter: 'Thank you for dining at Gourmet Bistro! Feed your soul.',
    printerSettings: {
      paperWidth: '80mm',
      printerType: 'thermal',
    },
  });
  console.log('[SEED] Settings seeded successfully.');
  return settings;
};

const seedInventory = async () => {
  console.log('[SEED] Seeding inventory items...');
  const items = [
    { name: 'Rice', currentStock: 0, minStock: 15.0, unit: 'kg', supplier: 'Apex Grains' },
    { name: 'Chicken', currentStock: 0, minStock: 20.0, unit: 'kg', supplier: 'Valley Farm Supplies' },
    { name: 'Oil', currentStock: 0, minStock: 8.0, unit: 'ltr', supplier: 'Mega Oils Ltd.' },
    { name: 'Onion', currentStock: 0, minStock: 10.0, unit: 'kg', supplier: 'Local Veg Market' },
    { name: 'Potato', currentStock: 0, minStock: 12.0, unit: 'kg', supplier: 'Local Veg Market' },
    { name: 'Paneer', currentStock: 0, minStock: 8.0, unit: 'kg', supplier: 'Dairy Fresh Co' },
    { name: 'Tomato', currentStock: 0, minStock: 10.0, unit: 'kg', supplier: 'Local Veg Market' },
    { name: 'Spices', currentStock: 0, minStock: 4.0, unit: 'kg', supplier: 'Spice Garden' },
    { name: 'Sugar', currentStock: 0, minStock: 5.0, unit: 'kg', supplier: 'Mega Groceries' },
    { name: 'Tea Leaves', currentStock: 0, minStock: 3.0, unit: 'kg', supplier: 'Assam Tea Distributors' },
    { name: 'Soft Drink Syrup', currentStock: 0, minStock: 10.0, unit: 'ltr', supplier: 'Beverages Inc.' },
  ];

  const seededInventory = {};
  for (const item of items) {
    const invItem = await Inventory.create(item);
    seededInventory[item.name] = invItem;
  }
  console.log('[SEED] Inventory items seeded.');
  return seededInventory;
};

const seedProducts = async (inventory) => {
  console.log('[SEED] Seeding products with recipes...');
  const products = [
    {
      name: 'Chicken Biryani',
      category: 'Main Course',
      type: 'non-veg',
      price: 250,
      recipe: [
        { inventoryItem: inventory['Rice']._id, quantity: 0.25 }, // 250g Rice
        { inventoryItem: inventory['Chicken']._id, quantity: 0.3 }, // 300g Chicken
        { inventoryItem: inventory['Oil']._id, quantity: 0.05 }, // 50ml Oil
        { inventoryItem: inventory['Onion']._id, quantity: 0.05 }, // 50g Onion
        { inventoryItem: inventory['Spices']._id, quantity: 0.01 }, // 10g Spices
      ],
    },
    {
      name: 'Paneer Butter Masala',
      category: 'Main Course',
      type: 'veg',
      price: 220,
      recipe: [
        { inventoryItem: inventory['Paneer']._id, quantity: 0.2 }, // 200g Paneer
        { inventoryItem: inventory['Oil']._id, quantity: 0.03 }, // 30ml Oil
        { inventoryItem: inventory['Tomato']._id, quantity: 0.1 }, // 100g Tomato
        { inventoryItem: inventory['Spices']._id, quantity: 0.015 }, // 15g Spices
      ],
    },
    {
      name: 'Garlic Naan',
      category: 'Sides',
      type: 'veg',
      price: 40,
      recipe: [
        { inventoryItem: inventory['Oil']._id, quantity: 0.01 },
        { inventoryItem: inventory['Spices']._id, quantity: 0.005 },
      ],
    },
    {
      name: 'French Fries',
      category: 'Starters',
      type: 'veg',
      price: 100,
      recipe: [
        { inventoryItem: inventory['Potato']._id, quantity: 0.2 }, // 200g Potato
        { inventoryItem: inventory['Oil']._id, quantity: 0.04 }, // 40ml Oil
      ],
    },
    {
      name: 'Chicken Wings',
      category: 'Starters',
      type: 'non-veg',
      price: 180,
      recipe: [
        { inventoryItem: inventory['Chicken']._id, quantity: 0.25 }, // 250g Chicken
        { inventoryItem: inventory['Oil']._id, quantity: 0.04 }, // 40ml Oil
        { inventoryItem: inventory['Spices']._id, quantity: 0.01 },
      ],
    },
    {
      name: 'Chocolate Brownie',
      category: 'Dessert',
      type: 'veg',
      price: 120,
      recipe: [
        { inventoryItem: inventory['Sugar']._id, quantity: 0.05 },
      ],
    },
    {
      name: 'Masala Tea',
      category: 'Beverage',
      type: 'veg',
      price: 30,
      recipe: [
        { inventoryItem: inventory['Sugar']._id, quantity: 0.02 },
        { inventoryItem: inventory['Tea Leaves']._id, quantity: 0.01 },
      ],
    },
    {
      name: 'Pepsi',
      category: 'Beverage',
      type: 'veg',
      price: 50,
      recipe: [
        { inventoryItem: inventory['Soft Drink Syrup']._id, quantity: 0.2 }, // 200ml syrup
      ],
    },
  ];

  const seededProducts = [];
  for (const prod of products) {
    const item = await Product.create(prod);
    seededProducts.push(item);
  }
  console.log('[SEED] Products seeded.');
  return seededProducts;
};

const seedPurchasesAndExpenses = async (inventory) => {
  console.log('[SEED] Seeding purchases and expenses...');
  const today = new Date();

  // Purchases
  const purchase1Date = new Date(today);
  purchase1Date.setDate(today.getDate() - 10);

  const purchase2Date = new Date(today);
  purchase2Date.setDate(today.getDate() - 3);

  // Raw purchases (updates inventory later based on calculation)
  const purchase1 = await Purchase.create({
    supplier: 'Apex Grains & Farms Co.',
    invoiceNumber: 'INV-2026-1001',
    purchaseDate: purchase1Date,
    items: [
      { inventoryItem: inventory['Rice']._id, quantity: 150, cost: 55 },      // 150 kg @ 55/kg
      { inventoryItem: inventory['Chicken']._id, quantity: 100, cost: 180 },  // 100 kg @ 180/kg
      { inventoryItem: inventory['Oil']._id, quantity: 60, cost: 110 },       // 60 ltr @ 110/ltr
      { inventoryItem: inventory['Paneer']._id, quantity: 40, cost: 240 },    // 40 kg @ 240/kg
    ],
    totalCost: (150 * 55) + (100 * 180) + (60 * 110) + (40 * 240), // 35,950
  });

  const purchase2 = await Purchase.create({
    supplier: 'Metro Wholesale Distributors',
    invoiceNumber: 'INV-2026-1002',
    purchaseDate: purchase2Date,
    items: [
      { inventoryItem: inventory['Onion']._id, quantity: 60, cost: 25 },
      { inventoryItem: inventory['Potato']._id, quantity: 80, cost: 15 },
      { inventoryItem: inventory['Tomato']._id, quantity: 40, cost: 35 },
      { inventoryItem: inventory['Spices']._id, quantity: 15, cost: 160 },
      { inventoryItem: inventory['Sugar']._id, quantity: 20, cost: 42 },
      { inventoryItem: inventory['Tea Leaves']._id, quantity: 10, cost: 210 },
      { inventoryItem: inventory['Soft Drink Syrup']._id, quantity: 50, cost: 75 },
    ],
    totalCost: (60 * 25) + (80 * 15) + (40 * 35) + (15 * 160) + (20 * 42) + (10 * 210) + (50 * 75), // 14,290
  });

  // Expenses
  const expRentDate = new Date(today);
  expRentDate.setDate(today.getDate() - 15);

  const expElectDate = new Date(today);
  expElectDate.setDate(today.getDate() - 8);

  const expGasDate = new Date(today);
  expGasDate.setDate(today.getDate() - 4);

  const expSalaryDate = new Date(today);
  expSalaryDate.setDate(today.getDate() - 1);

  await Expense.create({ category: 'rent', amount: 15000, date: expRentDate, description: 'Bistro Premises Monthly Rent' });
  await Expense.create({ category: 'electricity', amount: 4200, date: expElectDate, description: 'Electricity Bill - June' });
  await Expense.create({ category: 'gas', amount: 1800, date: expGasDate, description: '2x Commercial LPG Cylinder Refills' });
  await Expense.create({ category: 'salary', amount: 20000, date: expSalaryDate, description: 'Staff Salaries (Rahul & Priya)' });

  console.log('[SEED] Purchases and expenses seeded.');
  return {
    purchasedStock: {
      'Rice': 150,
      'Chicken': 100,
      'Oil': 60,
      'Paneer': 40,
      'Onion': 60,
      'Potato': 80,
      'Tomato': 40,
      'Spices': 15,
      'Sugar': 20,
      'Tea Leaves': 10,
      'Soft Drink Syrup': 50,
    }
  };
};

const seedHistoricalBills = async (users, products, inventory, purchasedStock) => {
  console.log('[SEED] Seeding historical bills over the last 7 days...');
  const today = new Date();
  
  // Track total consumption of inventory items to subtract from purchasedStock
  const consumedInventory = {};
  Object.keys(inventory).forEach(name => {
    consumedInventory[inventory[name]._id.toString()] = 0;
  });

  const paymentMethods = ['cash', 'upi', 'card'];
  const tables = ['Table-1', 'Table-2', 'Table-3', 'Table-4', 'Table-5', 'Table-6', 'Takeaway'];

  let billCount = 1;
  const createdBills = [];
  const createdBillItems = [];

  // Generate 7 days of historical bills
  for (let dayOffset = 7; dayOffset >= 0; dayOffset--) {
    const billDate = new Date(today);
    billDate.setDate(today.getDate() - dayOffset);
    
    // Day specific date components for bill sequential counter
    const yyyy = billDate.getFullYear();
    const mm = String(billDate.getMonth() + 1).padStart(2, '0');
    const dd = String(billDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    // Number of bills to generate today (3 to 6 bills)
    const billsTodayCount = Math.floor(Math.random() * 4) + 3;

    for (let j = 1; j <= billsTodayCount; j++) {
      // 1. Assign cashier, table, payment method
      const cashier = Math.random() > 0.5 ? users.cashier1 : users.cashier2;
      const orderType = Math.random() > 0.3 ? 'dine-in' : 'takeaway';
      const tableNumber = orderType === 'dine-in' ? tables[Math.floor(Math.random() * 6)] : '';
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      
      // Random hour in afternoon or evening
      const billTime = new Date(billDate);
      const hour = Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 12 : Math.floor(Math.random() * 4) + 19; // 12-15 or 19-23
      const minute = Math.floor(Math.random() * 60);
      billTime.setHours(hour, minute, 0, 0);

      // 2. Select 1 to 4 random products
      const itemsCount = Math.floor(Math.random() * 3) + 1;
      const selectedProducts = [];
      const usedProdIndexes = new Set();
      
      while (selectedProducts.length < itemsCount) {
        const prodIndex = Math.floor(Math.random() * products.length);
        if (!usedProdIndexes.has(prodIndex)) {
          usedProdIndexes.add(prodIndex);
          selectedProducts.push(products[prodIndex]);
        }
      }

      // 3. Assemble items list
      let subtotalSum = 0;
      const billItemsList = [];

      for (const prod of selectedProducts) {
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 items
        const itemSubtotal = prod.price * quantity;
        subtotalSum += itemSubtotal;

        billItemsList.push({
          product: prod._id,
          name: prod.name,
          price: prod.price,
          quantity,
          subtotal: itemSubtotal,
          recipe: prod.recipe || [],
        });
      }

      // 4. Calculate discount (occasionally apply a discount of 10, 20, 50, or 100)
      let discount = 0;
      if (subtotalSum > 300 && Math.random() > 0.6) {
        const discountOptions = [10, 20, 50, 100];
        discount = discountOptions[Math.floor(Math.random() * discountOptions.length)];
      }
      const grandTotal = Math.max(0, subtotalSum - discount);

      // Generate sequence number
      const seqStr = String(j).padStart(4, '0');
      const billNumber = `BILL-${dateStr}-${seqStr}`;

      // Simulate status (1 in 15 bills gets cancelled, unless it's today's last bill)
      const isCancelled = Math.random() < 0.08 && dayOffset > 0;
      const status = isCancelled ? 'cancelled' : 'paid';

      // 5. Track inventory usage (only deduct if PAID)
      if (status === 'paid') {
        for (const item of billItemsList) {
          for (const ingredient of item.recipe) {
            const ingId = ingredient.inventoryItem.toString();
            const qtyConsumed = ingredient.quantity * item.quantity;
            if (consumedInventory[ingId] !== undefined) {
              consumedInventory[ingId] += qtyConsumed;
            }
          }
        }
      }

      // 6. Build the Bill document
      const billObj = {
        billNumber,
        cashier: cashier._id,
        tableNumber,
        orderType,
        items: billItemsList.map(item => ({
          product: item.product,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
        discount,
        grandTotal,
        paymentMethod,
        status,
        createdAt: billTime,
        updatedAt: billTime,
      };

      if (isCancelled) {
        billObj.cancelledBy = users.owner._id;
        billObj.cancellationReason = 'Customer request / change of mind';
      }

      createdBills.push(billObj);
    }
  }

  // Save all bills
  console.log(`[SEED] Saving ${createdBills.length} Bill documents...`);
  const savedBills = await Bill.insertMany(createdBills);

  // Build corresponding BillItems (sales reports relies on this)
  console.log('[SEED] Saving BillItem documents...');
  for (let i = 0; i < savedBills.length; i++) {
    const bill = savedBills[i];
    
    // Reconstruct items
    for (const item of bill.items) {
      createdBillItems.push({
        bill: bill._id,
        product: item.product,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
        paymentMethod: bill.paymentMethod,
        status: bill.status,
        billDate: bill.createdAt,
        createdAt: bill.createdAt,
        updatedAt: bill.createdAt,
      });
    }
  }

  await BillItem.insertMany(createdBillItems);
  console.log(`[SEED] Saved ${createdBillItems.length} BillItems successfully.`);

  // 7. Finally, write the mathematically correct current stock to inventory
  console.log('[SEED] Calculating and updating current stock for all inventory items...');
  for (const name of Object.keys(inventory)) {
    const item = inventory[name];
    const purchased = purchasedStock[name] || 0;
    const consumed = consumedInventory[item._id.toString()] || 0;
    
    // Ensure stock does not go below zero by rounding or setting minimum starting stock
    const currentStock = Math.max(0, parseFloat((purchased - consumed).toFixed(3)));
    
    await Inventory.findByIdAndUpdate(item._id, {
      currentStock,
      lastUpdated: Date.now()
    });
    console.log(` - ${name}: Purchased=${purchased}, Consumed=${consumed.toFixed(2)}, Final Stock=${currentStock}`);
  }

  console.log('[SEED] Inventory stocks finalized.');
};

const run = async () => {
  try {
    console.log(`[SEED] Connecting to database at ${SEED_DB_URI}...`);
    await mongoose.connect(SEED_DB_URI);
    console.log('[SEED] Connection established.');

    await cleanDatabase();
    
    const users = await seedUsers();
    await seedSettings();
    const inventory = await seedInventory();
    const products = await seedProducts(inventory);
    
    const { purchasedStock } = await seedPurchasesAndExpenses(inventory);
    
    await seedHistoricalBills(users, products, inventory, purchasedStock);

    console.log('\n=============================================');
    console.log('[SEED] DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=============================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n[SEED] Seeding failed with error:\n', error);
    process.exit(1);
  }
};

run();
