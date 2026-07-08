import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';
import { 
  LogOut, Search, Plus, Minus, Trash2, 
  ShoppingBag, CreditCard, DollarSign, Smartphone, 
  Receipt, MapPin, Phone, ChefHat
} from 'lucide-react';

const CashierPOS = () => {
  const { user, token, logout } = useAuth();
  
  // App States
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  
  // Checkout States
  const [tableNumber, setTableNumber] = useState('');
  const [orderType, setOrderType] = useState('dine-in');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [discount, setDiscount] = useState('');
  const [settings, setSettings] = useState(null);
  
  // UI Flow States
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successBill, setSuccessBill] = useState(null);

  // Load products & settings
  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetchApi('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
        
        // Extract unique categories
        const cats = ['All', ...new Set(data.data.map(p => p.category))];
        setCategories(cats);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetchApi('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  // Cart Operations
  const addToCart = (product) => {
    if (!product.isAvailable) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.product._id === product._id);
      if (existing) {
        return prev.map(item => 
          item.product._id === product._id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, amount) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product._id === productId) {
          const nextQty = item.quantity + amount;
          return nextQty > 0 ? { ...item, quantity: nextQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product._id !== productId));
  };

  // Pricing calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const discountVal = parseFloat(discount) || 0;
  const grandTotal = Math.max(0, cartSubtotal - discountVal);

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // POS Checkout trigger
  const handleCheckout = async () => {
    if (!cart.length) {
      setErrorMessage('Your cart is empty. Please add items.');
      return;
    }
    
    setErrorMessage('');
    setCheckoutLoading(true);

    const checkoutBody = {
      tableNumber: orderType === 'dine-in' ? tableNumber : '',
      orderType,
      discount: discountVal,
      paymentMethod,
      items: cart.map(item => ({
        product: item.product._id,
        quantity: item.quantity
      }))
    };

    try {
      const res = await fetchApi('/api/bills', {
        method: 'POST',
        body: JSON.stringify(checkoutBody)
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccessBill(data.data);
        setCart([]);
        setTableNumber('');
        setDiscount('');
        fetchProducts(); // Refresh stocks
      } else {
        setErrorMessage(data.error || 'Failed to place order.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMessage('Network error during checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="pos-layout">
      {/* Top Navbar */}
      <header className="pos-navbar glass-panel">
        <div className="nav-brand">
          <div className="brand-logo">
            <ChefHat size={22} />
          </div>
          <div>
            <h2>{settings?.restaurantName || 'Kings Family Restaurant'}</h2>
            <p className="subtitle">Billing Desk Terminal</p>
          </div>
        </div>

        <div className="nav-user-controls">
          <div className="user-profile">
            <div className="avatar">{user?.name?.charAt(0)}</div>
            <div>
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>
          <button onClick={logout} className="btn btn-outline nav-logout-btn">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main split dashboard panels */}
      <main className="pos-main">
        {/* Left Side: Catalogue */}
        <section className="pos-catalogue">
          {/* Search bar & Category Row */}
          <div className="catalogue-controls glass-card">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="category-scroll-container">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="products-grid">
            {filteredProducts.map(prod => (
              <div 
                key={prod._id} 
                onClick={() => addToCart(prod)}
                className={`product-card glass-card ${!prod.isAvailable ? 'unavailable' : ''}`}
              >
                <div className="product-header">
                  <span className={`badge ${prod.type === 'veg' ? 'badge-veg' : 'badge-nonveg'}`}>
                    {prod.type}
                  </span>
                  <span className="product-category">{prod.category}</span>
                </div>
                
                <h3 className="product-name">{prod.name}</h3>
                
                <div className="product-footer">
                  <span className="product-price">₹{prod.price}</span>
                  {prod.isAvailable ? (
                    <button className="add-btn btn btn-primary">
                      <Plus size={14} />
                      <span>Add</span>
                    </button>
                  ) : (
                    <span className="sold-out">Sold Out</span>
                  )}
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="empty-state">
                <p>No products found matching filters.</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Cart Terminal */}
        <section className="pos-cart-panel glass-panel">
          <div className="cart-header">
            <ShoppingBag size={20} />
            <h3>Current Order</h3>
            <span className="cart-count badge">{cart.reduce((sum, item) => sum + item.quantity, 0)} Items</span>
          </div>

          {errorMessage && (
            <div className="pos-error-toast animate-fade-in">
              {errorMessage}
            </div>
          )}

          {/* Cart items scrollbox */}
          <div className="cart-items-scroll">
            {cart.map(item => (
              <div key={item.product._id} className="cart-item glass-card">
                <div className="item-details">
                  <h4>{item.product.name}</h4>
                  <p>₹{item.product.price} each</p>
                </div>
                
                <div className="item-controls">
                  <div className="quantity-adjuster">
                    <button onClick={() => updateQuantity(item.product._id, -1)} className="adjust-btn">
                      <Minus size={12} />
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product._id, 1)} className="adjust-btn">
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="item-total">₹{item.product.price * item.quantity}</span>
                  <button onClick={() => removeFromCart(item.product._id)} className="delete-btn">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            
            {cart.length === 0 && (
              <div className="cart-empty-state">
                <Receipt size={40} className="empty-icon" />
                <p>Cart is empty</p>
                <span>Select items from the catalog on the left to start billing</span>
              </div>
            )}
          </div>

          {/* Form configurations */}
          <div className="cart-checkout-configs">
            <div className="configs-row">
              <div className="form-group flex-1">
                <label className="form-label">Order Type</label>
                <div className="toggle-selector">
                  <button 
                    type="button" 
                    className={orderType === 'dine-in' ? 'active' : ''}
                    onClick={() => setOrderType('dine-in')}
                  >
                    Dine-In
                  </button>
                  <button 
                    type="button" 
                    className={orderType === 'takeaway' ? 'active' : ''}
                    onClick={() => setOrderType('takeaway')}
                  >
                    Takeaway
                  </button>
                </div>
              </div>

              {orderType === 'dine-in' && (
                <div className="form-group flex-1 animate-scale-in">
                  <label className="form-label" htmlFor="table-num">Table Number</label>
                  <input
                    id="table-num"
                    type="text"
                    className="form-input"
                    placeholder="e.g. T-5"
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Payment options */}
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <div className="payment-options-grid">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`payment-btn ${paymentMethod === 'upi' ? 'active' : ''}`}
                >
                  <Smartphone size={16} />
                  <span>UPI / QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`payment-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                >
                  <DollarSign size={16} />
                  <span>Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`payment-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                >
                  <CreditCard size={16} />
                  <span>Card</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="discount-input">Discount Amount (₹)</label>
              <input
                id="discount-input"
                type="number"
                className="form-input"
                placeholder="Discount value"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
              />
            </div>
          </div>

          {/* Pricing calculations footer */}
          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>₹{cartSubtotal}</span>
            </div>
            {discountVal > 0 && (
              <div className="summary-row discount-text">
                <span>Discount Applied</span>
                <span>-₹{discountVal}</span>
              </div>
            )}
            <div className="summary-row grand-total-row">
              <span>Grand Total</span>
              <span>₹{grandTotal}</span>
            </div>
            
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || !cart.length}
              className="btn btn-success checkout-btn btn-block"
            >
              {checkoutLoading ? 'Processing Checkout...' : 'Place Order & Print'}
            </button>
          </div>
        </section>
      </main>

      {/* Invoice Receipt Modal Overlay */}
      {successBill && (
        <div className="modal-overlay animate-fade-in">
          <div className="receipt-modal glass-card animate-scale-in">
            <div className="receipt-header">
              <ChefHat size={28} className="receipt-logo" />
              <h3>{settings?.restaurantName || 'Kings Family Restaurant'}</h3>
              <p className="receipt-detail"><MapPin size={12} /> {settings?.address || 'NH7 Bypass Road, near HP Petrol Pump, Agalagurki, Chikkaballapur'}</p>
              <p className="receipt-detail"><Phone size={12} /> {settings?.phoneNumber || 'Phone Number'}</p>
              <div className="divider-dots"></div>
            </div>

            <div className="receipt-meta">
              <div className="meta-row">
                <span>Bill ID:</span>
                <span>{successBill.billNumber}</span>
              </div>
              <div className="meta-row">
                <span>Date:</span>
                <span>{new Date(successBill.createdAt).toLocaleString()}</span>
              </div>
              <div className="meta-row">
                <span>Cashier Desk:</span>
                <span>{successBill.cashier?.name || user?.name}</span>
              </div>
              {successBill.tableNumber && (
                <div className="meta-row">
                  <span>Table Number:</span>
                  <span>{successBill.tableNumber}</span>
                </div>
              )}
              <div className="meta-row">
                <span>Payment Mode:</span>
                <span className="uppercase">{successBill.paymentMethod}</span>
              </div>
            </div>

            <div className="divider-dots"></div>

            <div className="receipt-items">
              <div className="items-header">
                <span>Item Description</span>
                <span>Qty</span>
                <span>Price</span>
                <span>Amount</span>
              </div>
              {successBill.items?.map((item, idx) => (
                <div key={idx} className="receipt-item-row">
                  <span>{item.name}</span>
                  <span>{item.quantity}</span>
                  <span>₹{item.price}</span>
                  <span>₹{item.subtotal}</span>
                </div>
              ))}
            </div>

            <div className="divider-dots"></div>

            <div className="receipt-pricing">
              <div className="pricing-row">
                <span>Subtotal</span>
                <span>₹{successBill.grandTotal + successBill.discount}</span>
              </div>
              {successBill.discount > 0 && (
                <div className="pricing-row">
                  <span>Discount</span>
                  <span>-₹{successBill.discount}</span>
                </div>
              )}
              <div className="pricing-row grand-total">
                <span>Grand Total</span>
                <span>₹{successBill.grandTotal}</span>
              </div>
            </div>

            <div className="divider-dots"></div>

            <div className="receipt-footer">
              <p>{settings?.receiptFooter || 'Thank you for dining with us!'}</p>
              <div style={{ display: 'flex', gap: '10px' }} className="receipt-actions">
                <button onClick={() => window.print()} className="btn btn-outline" style={{ flex: 1 }}>
                  Print Receipt
                </button>
                <button onClick={() => setSuccessBill(null)} className="btn btn-primary" style={{ flex: 1 }}>
                  New Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pos-layout {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          background-color: var(--bg-dark);
        }

        .pos-navbar {
          height: 70px;
          width: 100%;
          padding: 0 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          border-bottom: 1px solid var(--border);
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-logo {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--primary-glow);
          border: 1px solid rgba(99, 102, 241, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }

        .nav-brand h2 {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text-main);
          margin: 0;
        }

        .subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .nav-user-controls {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: right;
        }

        .avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--primary);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1rem;
        }

        .user-name {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-main);
        }

        .user-role {
          display: block;
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .nav-logout-btn {
          padding: 8px 14px;
          font-size: 0.85rem;
        }

        /* Split main POS panels */
        .pos-main {
          flex: 1;
          display: flex;
          height: calc(100vh - 70px);
          overflow: hidden;
        }

        .pos-catalogue {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 24px;
          overflow-y: auto;
          gap: 20px;
        }

        .catalogue-controls {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .search-box {
          position: relative;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .search-box input {
          width: 100%;
          padding: 12px 12px 12px 42px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-main);
          outline: none;
          transition: all var(--transition-fast);
        }

        .search-box input:focus {
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.08);
        }

        .category-scroll-container {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 2px;
        }

        .category-chip {
          padding: 8px 16px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border);
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }

        .category-chip:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.08);
        }

        .category-chip.active {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
          box-shadow: 0 4px 10px var(--primary-glow);
        }

        /* Products Grid */
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px;
          padding-bottom: 30px;
        }

        .product-card {
          padding: 20px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 170px;
        }

        .product-card.unavailable {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .product-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .product-category {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .product-name {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--text-main);
          margin: 12px 0;
          line-height: 1.3;
        }

        .product-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .product-price {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--accent);
        }

        .product-card .add-btn {
          opacity: 0;
          padding: 6px 12px;
          font-size: 0.75rem;
        }

        .product-card:hover .add-btn {
          opacity: 1;
        }

        .sold-out {
          font-size: 0.75rem;
          color: var(--danger);
          font-weight: 600;
          text-transform: uppercase;
        }

        /* Right Cart Panel */
        .pos-cart-panel {
          width: 440px;
          display: flex;
          flex-direction: column;
          border-left: 1px solid var(--border);
          overflow: hidden;
        }

        .cart-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .cart-header h3 {
          font-size: 1.1rem;
          font-weight: 600;
        }

        .cart-count {
          margin-left: auto;
          background: var(--primary-glow);
          color: var(--primary);
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .pos-error-toast {
          margin: 10px 24px 0;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.2);
          color: #fb7185;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 0.8rem;
        }

        .cart-items-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .cart-item {
          padding: 14px 16px;
          border-radius: 12px;
        }

        .item-details h4 {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 2px;
        }

        .item-details p {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .item-controls {
          display: flex;
          align-items: center;
          margin-top: 10px;
          gap: 10px;
        }

        .quantity-adjuster {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 2px;
        }

        .adjust-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          border-radius: 4px;
        }

        .adjust-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-main);
        }

        .quantity-adjuster span {
          width: 28px;
          text-align: center;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .item-total {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--accent);
          margin-left: auto;
        }

        .delete-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all var(--transition-fast);
        }

        .delete-btn:hover {
          color: var(--danger);
          background: rgba(244, 63, 94, 0.1);
        }

        .cart-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: var(--text-muted);
          padding: 20px;
        }

        .empty-icon {
          color: rgba(255, 255, 255, 0.05);
          margin-bottom: 16px;
        }

        .cart-empty-state p {
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 6px;
        }

        .cart-empty-state span {
          font-size: 0.75rem;
          max-width: 220px;
          line-height: 1.4;
        }

        /* Cart inputs forms */
        .cart-checkout-configs {
          padding: 20px 24px;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          background: rgba(0, 0, 0, 0.1);
        }

        .configs-row {
          display: flex;
          gap: 16px;
        }

        .flex-1 {
          flex: 1;
        }

        .toggle-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 2px;
        }

        .toggle-selector button {
          border: none;
          background: transparent;
          color: var(--text-muted);
          padding: 8px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 6px;
          transition: all var(--transition-fast);
        }

        .toggle-selector button.active {
          background: var(--primary);
          color: #fff;
          box-shadow: 0 2px 6px var(--primary-glow);
        }

        .payment-options-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .payment-btn {
          border: 1px solid var(--border);
          background: var(--bg-input);
          color: var(--text-muted);
          padding: 10px 4px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          transition: all var(--transition-fast);
        }

        .payment-btn:hover {
          border-color: rgba(255, 255, 255, 0.15);
          color: var(--text-main);
        }

        .payment-btn.active {
          border-color: var(--accent);
          background: var(--accent-glow);
          color: var(--accent);
          box-shadow: 0 0 15px var(--accent-glow);
        }

        /* Cart Pricing calculation panel */
        .cart-summary {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: rgba(0, 0, 0, 0.15);
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          color: var(--text-muted);
        }

        .discount-text {
          color: var(--danger);
        }

        .grand-total-row {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
          border-top: 1px dashed var(--border);
          padding-top: 12px;
          margin-top: 4px;
        }

        .grand-total-row span:last-child {
          color: var(--accent);
        }

        .checkout-btn {
          padding: 14px;
          font-size: 1rem;
          font-weight: 600;
          margin-top: 8px;
        }

        /* Receipt Modal overlays */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }

        .receipt-modal {
          width: 100%;
          max-width: 400px;
          background: #111827;
          border: 1px solid rgba(255,255,255,0.1);
          padding: 30px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.6);
        }

        .receipt-header {
          text-align: center;
        }

        .receipt-logo {
          color: var(--accent);
          margin-bottom: 10px;
        }

        .receipt-header h3 {
          font-size: 1.2rem;
          color: #fff;
          margin-bottom: 6px;
        }

        .receipt-detail {
          font-size: 0.75rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 2px;
        }

        .divider-dots {
          height: 1px;
          border-bottom: 1px dashed var(--border);
          margin: 16px 0;
        }

        .receipt-meta {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .meta-row span:last-child {
          color: var(--text-main);
          font-weight: 500;
        }

        .receipt-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .items-header {
          display: grid;
          grid-template-columns: 2fr 0.5fr 0.8fr 1fr;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-muted);
          padding-bottom: 6px;
        }

        .items-header span:nth-child(2),
        .items-header span:nth-child(3),
        .items-header span:nth-child(4) {
          text-align: right;
        }

        .receipt-item-row {
          display: grid;
          grid-template-columns: 2fr 0.5fr 0.8fr 1fr;
          font-size: 0.8rem;
          color: var(--text-main);
        }

        .receipt-item-row span:nth-child(2),
        .receipt-item-row span:nth-child(3),
        .receipt-item-row span:nth-child(4) {
          text-align: right;
        }

        .receipt-pricing {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .pricing-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .pricing-row.grand-total {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--accent);
          margin-top: 4px;
        }

        .receipt-footer {
          text-align: center;
        }

        .receipt-footer p {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 16px;
        }

        .receipt-footer .btn {
          width: 100%;
        }

        .uppercase {
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
};

export default CashierPOS;
