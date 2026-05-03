import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

const printReceipt = (order, user, taxSettings) => {
  const win = window.open("", "_blank", "width=320,height=600");
  if (!win) return;

  const lines = order.items.map(
    (item) =>
      `<tr>
        <td style="padding:2px 0;font-size:12px;">${item.name}</td>
        <td style="text-align:center;padding:2px 4px;font-size:12px;">${item.qty}</td>
        <td style="text-align:right;padding:2px 0;font-size:12px;">Ksh ${(item.price * item.qty).toLocaleString()}</td>
      </tr>`
  ).join("");

  const taxLabel = taxSettings ? `${taxSettings.taxName} (${taxSettings.taxRate}%)` : "Tax (16%)";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Receipt - ${order.orderNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'DM Mono', 'Courier New', monospace;
      font-size: 12px;
      color: #111;
      background: #fff;
      width: 280px;
      margin: 0 auto;
      padding: 16px 8px;
    }
    .center { text-align: center; }
    .divider { border: none; border-top: 1px dashed #aaa; margin: 8px 0; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: 2px; margin-bottom: 2px; }
    .sub { font-size: 10px; color: #555; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 10px; color: #888; text-transform: uppercase; padding: 4px 0; border-bottom: 1px dashed #ccc; }
    .total-row td { font-size: 13px; font-weight: 700; padding-top: 6px; }
    .tax-row td { font-size: 11px; color: #555; }
    .footer { font-size: 10px; color: #888; margin-top: 12px; }
    .order-num { font-size: 10px; color: #888; }
    .payment-badge {
      display: inline-block;
      background: #111;
      color: #fff;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 3px;
      letter-spacing: 1px;
      margin-top: 4px;
    }
    @media print {
      body { width: 280px; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="brand">POStore</div>
    <div class="sub">Point of Sale Receipt</div>
    <div class="sub">${new Date().toLocaleString()}</div>
    <div class="sub order-num">${order.orderNumber}</div>
  </div>

  <hr class="divider"/>

  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Item</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>${lines}</tbody>
  </table>

  <hr class="divider"/>

  <table>
    <tr class="tax-row">
      <td>Subtotal</td>
      <td style="text-align:right;">Ksh ${order.subtotal.toLocaleString()}</td>
    </tr>
    <tr class="tax-row">
      <td>${taxLabel}</td>
      <td style="text-align:right;">Ksh ${order.tax.toFixed(2)}</td>
    </tr>
    <tr class="total-row">
      <td>TOTAL</td>
      <td style="text-align:right;">Ksh ${order.total.toFixed(2)}</td>
    </tr>
  </table>

  <hr class="divider"/>

  <div class="center">
    <div class="sub">Served by: <strong>${user.name}</strong></div>
    <div><span class="payment-badge">${order.paymentMethod.toUpperCase()}</span></div>
    <div class="footer" style="margin-top:10px;">Thank you for shopping with us!</div>
    <div class="footer">POStore &bull; pos.upendoapps.com</div>
  </div>

  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
};

export default function StaffDashboard({ user, onLogout }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderComplete, setOrderComplete] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tax loaded from admin settings — default to 16% VAT as fallback
  const [taxSettings, setTaxSettings] = useState({
    taxName: "VAT",
    taxRate: 16,
    taxInclusive: false,
  });
  const [inventoryMode, setInventoryMode] = useState("auto");

  useEffect(() => {
    loadProducts();
    loadTaxSettings();
    loadInventoryMode();
  }, []);

  const loadTaxSettings = async () => {
    try {
      const stored = await window.electronAPI.getStoreData("taxSettings");
      if (stored && typeof stored.taxRate === "number") {
        setTaxSettings(stored);
      }
    } catch (err) {
      console.error("Failed to load tax settings:", err);
    }
  };

  const loadInventoryMode = async () => {
    try {
      const stored = await window.electronAPI.getStoreData("inventoryMode");
      if (stored) setInventoryMode(stored);
    } catch (err) {
      console.error("Failed to load inventory mode:", err);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    const result = await window.electronAPI.queryDatabase(
      "SELECT * FROM products WHERE is_active = 1 ORDER BY name"
    );
    if (result.success) {
      setProducts(result.data);
      const cats = [...new Set(result.data.map((p) => p.category).filter(Boolean))];
      setCategories(cats);
    }
    setLoading(false);
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || p.category === category;
    return matchSearch && matchCat;
  });

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0)
    );
  };

  // ── Dynamic tax calculation based on admin settings ──
  const taxRate = taxSettings.taxRate / 100;

  const subtotal = taxSettings.taxInclusive
    // If tax-inclusive: subtotal = price / (1 + rate), tax = price - subtotal
    ? cart.reduce((sum, i) => sum + (i.price * i.qty) / (1 + taxRate), 0)
    : cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const tax = taxSettings.taxInclusive
    ? cart.reduce((sum, i) => sum + (i.price * i.qty) - (i.price * i.qty) / (1 + taxRate), 0)
    : subtotal * taxRate;

  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const orderId = uuidv4();
    const orderNumber = `ORD-${Date.now()}`;

    // 1. Insert the order first and confirm it succeeded
    const orderResult = await window.electronAPI.executeDatabase(
      `INSERT INTO orders (id, order_number, staff_id, staff_name, subtotal, tax, total, payment_method, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
      [orderId, orderNumber, user.id, user.name, subtotal, tax, total, paymentMethod]
    );

    if (!orderResult.success) {
      alert("Failed to save order. Please try again.");
      return;
    }

    // 2. Insert order items linked to the confirmed orderId
    for (const item of cart) {
      await window.electronAPI.executeDatabase(
        `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), orderId, item.id, item.name, item.qty, item.price, item.price * item.qty]
      );

      // 3. Only deduct stock automatically if inventoryMode is "auto"
      if (inventoryMode === "auto") {
        await window.electronAPI.executeDatabase(
          "UPDATE products SET stock = stock - ? WHERE id = ?",
          [item.qty, item.id]
        );
      } else {
        // Manual mode: queue a pending approval for the deduction
        try {
          const approvals = await window.electronAPI.getStoreData("inventoryApprovals") || [];
          approvals.push({
            id: uuidv4(),
            productId: item.id,
            productName: item.name,
            quantity: -item.qty, // negative = deduction
            reason: `Sale from order ${orderNumber}`,
            status: "pending",
            createdAt: new Date().toISOString(),
          });
          await window.electronAPI.setStoreData("inventoryApprovals", approvals);
        } catch (err) {
          console.error("Failed to queue inventory approval:", err);
        }
      }
    }

    const completedOrder = {
      orderNumber,
      subtotal,
      tax,
      total,
      paymentMethod,
      items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
    };

    setLastOrder(completedOrder);
    setCart([]);
    setOrderComplete(true);
    loadProducts();
    setTimeout(() => setOrderComplete(false), 6000);
  };

  const taxLabel = `${taxSettings.taxName} (${taxSettings.taxRate}%)`;

  return (
    <div className="pos-layout">
      <header className="pos-header">
        <div className="pos-brand">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none" style={{ color: "var(--accent)" }}>
            <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" stroke="currentColor" strokeWidth="2" fill="none"/>
            <polygon points="16,8 23,12 23,20 16,24 9,20 9,12" fill="currentColor" opacity="0.3"/>
          </svg>
          <span>POStore POS</span>
        </div>
        <div className="pos-header-right">
          <span className="pos-staff">
            <span className="pos-avatar">{user.name[0]}</span>
            {user.name}
          </span>
          <button className="pos-logout" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <div className="pos-body">
        {/* Products Panel */}
        <div className="products-panel">
          <div className="products-toolbar">
            <input
              type="text"
              className="pos-search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="category-tabs">
              <button
                className={`cat-tab ${category === "all" ? "cat-active" : ""}`}
                onClick={() => setCategory("all")}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  className={`cat-tab ${category === c ? "cat-active" : ""}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="pos-loading">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="pos-empty">No products found</div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  className="product-card"
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                >
                  <div className="product-name">{product.name}</div>
                  <div className="product-price">Ksh {Number(product.price).toLocaleString()}</div>
                  <div className={`product-stock ${product.stock <= 5 ? "low-stock" : ""}`}>
                    {product.stock <= 0 ? "Out of stock" : `${product.stock} left`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart Panel */}
        <div className="cart-panel">
          <div className="cart-header">
            <h2>Current Order</h2>
            {cart.length > 0 && (
              <button className="clear-cart" onClick={() => setCart([])}>Clear</button>
            )}
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="cart-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
                <p>Add products to begin</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-controls">
                    <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                    <span className="qty-value">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                  </div>
                  <div className="cart-item-price">Ksh {(item.price * item.qty).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>

          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>Ksh {subtotal.toLocaleString()}</span>
            </div>
            <div className="summary-row">
              {/* Shows the actual tax name and rate set by admin e.g. "VAT (16%)" */}
              <span>{taxLabel}</span>
              <span>Ksh {tax.toFixed(2)}</span>
            </div>
            <div className="summary-row summary-total">
              <span>Total</span>
              <span>Ksh {total.toFixed(2)}</span>
            </div>

            <div className="payment-methods">
              {["cash", "card", "mpesa"].map((method) => (
                <button
                  key={method}
                  className={`payment-btn ${paymentMethod === method ? "payment-active" : ""}`}
                  onClick={() => setPaymentMethod(method)}
                >
                  {method.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              className="checkout-btn"
              onClick={handleCheckout}
              disabled={cart.length === 0}
            >
              Charge Ksh {total.toFixed(2)}
            </button>
          </div>

          {/* Order success overlay */}
          {orderComplete && lastOrder && (
            <div className="order-success">
              <div className="success-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Order Complete!</div>
              <div style={{ fontSize: 13, color: "var(--text-2)" }}>{lastOrder.orderNumber}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>
                Ksh {lastOrder.total.toFixed(2)}
              </div>
              <button
                onClick={() => printReceipt(lastOrder, user, taxSettings)}
                style={{
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--accent)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print Receipt
              </button>
              <button
                onClick={() => setOrderComplete(false)}
                style={{
                  marginTop: 4,
                  background: "none",
                  border: "none",
                  color: "var(--text-3)",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textDecoration: "underline",
                }}
              >
                Skip
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}