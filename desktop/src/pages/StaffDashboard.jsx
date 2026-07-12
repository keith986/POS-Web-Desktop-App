import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import UpdateBanner from "../components/UpdateBanner";

// Icons
const SunIcon = () => (

<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">

<circle cx="12" cy="12" r="5"/>

<line x1="12" y1="1" x2="12" y2="3"/>

<line x1="12" y1="21" x2="12" y2="23"/>

<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>

<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>

<line x1="1" y1="12" x2="3" y2="12"/>

<line x1="21" y1="12" x2="23" y2="12"/>

<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>

<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>

</svg>

);

const MoonIcon = () => (

<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">

<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>

</svg>

);

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

  const taxLabel = taxSettings ? `${taxSettings.taxName} (${taxSettings.taxRate}%)` : "VAT (16%)";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'DM Mono', monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 16px 8px; }
    .center { text-align: center; }
    .divider { border-top: 1px dashed #aaa; margin: 8px 0; }
    .brand { font-size: 20px; font-weight: 700; }
    table { width: 100%; }
    .total-row td { font-size: 13px; font-weight: 700; padding-top: 6px; }
    .footer { font-size: 10px; color: #888; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="center">
    <div class="brand">POStore</div>
    <div class="sub">${new Date().toLocaleString()}</div>
    <div class="sub">${order.orderNumber}</div>
  </div>
  <hr class="divider"/>
  <table>
    <thead><tr><th align="left">Item</th><th align="center">Qty</th><th align="right">Total</th></tr></thead>
    <tbody>${lines}</tbody>
  </table>
  <hr class="divider"/>
  <table>
    <tr><td>Subtotal</td><td align="right">Ksh ${order.subtotal.toLocaleString()}</td></tr>
    ${order.discount_applied > 0 ? `<tr><td style="color: #d946ef;">Discount</td><td align="right" style="color: #d946ef;">-Ksh ${order.discount_applied.toLocaleString()}</td></tr>` : ''}
    <tr><td>${taxLabel}</td><td align="right">Ksh ${order.tax.toFixed(2)}</td></tr>
    ${order.mpesa_amount ? `<tr><td>Mpesa Paid</td><td align="right">Ksh ${Number(order.mpesa_amount).toFixed(2)}</td></tr>` : ''}
    ${order.cash_amount ? `<tr><td>Cash Paid</td><td align="right">Ksh ${Number(order.cash_amount).toFixed(2)}</td></tr>` : ''}
    <tr class="total-row"><td>TOTAL</td><td align="right">Ksh ${order.total.toFixed(2)}</td></tr>
  </table>
  <div class="center" style="margin-top:15px;">
    <div>Served by: ${user.name}</div>
    <div class="footer">Thank you for shopping with us!</div>
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
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [applyBeforeVAT, setApplyBeforeVAT] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [mpesaAmount, setMpesaAmount] = useState(0);
  const [cashAmount, setCashAmount] = useState(0);
  const [orderComplete, setOrderComplete] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("postore-theme") || "dark");
  const [animating, setAnimating] = useState(false);
  const [taxSettings, setTaxSettings] = useState({ taxName: "VAT", taxRate: 16, taxInclusive: false });
  const [inventoryMode, setInventoryMode] = useState("auto");
  const [viewingProduct, setViewingProduct] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("postore-theme", theme);
  }, [theme]);

  useEffect(() => {
    loadProducts();
    loadTaxSettings();
    loadInventoryMode();
    loadDiscounts();
  }, []);

  const loadDiscounts = () => {
    const stored = localStorage.getItem("postore-discounts");
    if (stored) {
      const parsed = JSON.parse(stored);
      setAvailableDiscounts(parsed.filter(d => d.is_active));
    }
  };

  const loadTaxSettings = async () => {
    try {
      const stored = await window.electronAPI.getStoreData("taxSettings");
      if (stored && typeof stored.taxRate === "number") setTaxSettings(stored);
    } catch (err) { console.error(err); }
  };

  const loadInventoryMode = async () => {
    try {
      const stored = await window.electronAPI.getStoreData("inventoryMode");
      if (stored) setInventoryMode(stored);
    } catch (err) { console.error(err); }
  };

  const loadProducts = async () => {
    setLoading(true);
    const result = await window.electronAPI.queryDatabase("SELECT * FROM products WHERE is_active = 1 ORDER BY name");
    if (result.success) {
      setProducts(result.data);
      setCategories([...new Set(result.data.map((p) => p.category).filter(Boolean))]);
    }
    setLoading(false);
  };

  const toggleTheme = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setTheme(t => t === "dark" ? "light" : "dark");
      setTimeout(() => setAnimating(false), 800);
    }, 100);
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0));
  };

  // --- CALCULATIONS ---
  const taxRate = taxSettings.taxRate / 100;
  const rawCartTotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

  let discountVal = 0;
  if (selectedDiscount) {
    if (selectedDiscount.discount_type === "percentage") {
      discountVal = rawCartTotal * (selectedDiscount.discount_value / 100);
    } else {
      discountVal = selectedDiscount.discount_value;
    }
    if (selectedDiscount.max_discount && discountVal > selectedDiscount.max_discount) {
      discountVal = selectedDiscount.max_discount;
    }
  }

  let finalTax = 0;
  let finalTotal = 0;
  let subtotalForReceipt = rawCartTotal;

  if (applyBeforeVAT) {
    const discountedSubtotal = Math.max(0, rawCartTotal - discountVal);
    finalTax = discountedSubtotal * taxRate;
    finalTotal = discountedSubtotal + finalTax;
    subtotalForReceipt = discountedSubtotal;
  } else {
    const standardTax = rawCartTotal * taxRate;
    finalTax = standardTax;
    finalTotal = Math.max(0, (rawCartTotal + standardTax) - discountVal);
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const orderId = uuidv4();
    const orderNumber = `ORD-${Date.now()}`;

    // Standardized database key: "discount_applied"
    // Determine payment breakdown for split
    const mpesa_amt = paymentMethod === 'split' ? Number(mpesaAmount || 0) : (paymentMethod === 'mpesa' ? finalTotal : 0);
    const cash_amt = paymentMethod === 'split' ? Number(cashAmount || 0) : (paymentMethod === 'cash' ? finalTotal : 0);

    const orderResult = await window.electronAPI.executeDatabase(
      `INSERT INTO orders (id, order_number, staff_id, staff_name, subtotal, discount_applied, tax, total, payment_method, mpesa_amount, cash_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
      [orderId, orderNumber, user.id, user.name, subtotalForReceipt, discountVal, finalTax, finalTotal, paymentMethod, mpesa_amt, cash_amt]
    );

    if (!orderResult.success) return alert("Error saving order. Make sure 'discount_applied' column exists in database schema.");

    for (const item of cart) {
      await window.electronAPI.executeDatabase(
        `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), orderId, item.id, item.name, item.qty, item.price, item.price * item.qty]
      );
      if (inventoryMode === "auto") {
        await window.electronAPI.executeDatabase("UPDATE products SET stock = stock - ? WHERE id = ?", [item.qty, item.id]);
      }
    }

    setLastOrder({
      orderNumber, subtotal: subtotalForReceipt, tax: finalTax, total: finalTotal,
      discount_applied: discountVal, paymentMethod, mpesa_amount: mpesa_amt, cash_amount: cash_amt, items: cart.map(i => ({ ...i }))
    });
    setCart([]);
    setSelectedDiscount(null);
    setOrderComplete(true);
    loadProducts();
    setTimeout(() => setOrderComplete(false), 6000);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) && (category === "all" || p.category === category)
  );

  return (
    <div className="pos-layout">
      <UpdateBanner />
      <header className="pos-header">
        <div className="pos-brand">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none" style={{ color: "var(--accent)" }}>
            <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
          <span>POStore POS</span>
        </div>
        <div className="pos-header-right">
          <button className={`sky-toggle ${theme === "light" ? "sky-toggle--light" : "sky-toggle--dark"} ${animating ? "sky-toggle--animating" : ""}`}
          onClick={toggleTheme}
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          style={{ marginRight: "16px" }}
          >
        <span className="sky-toggle__arc">
        <span className="sky-toggle__celestial">{theme === "light" ? <SunIcon /> : <MoonIcon />}</span>
        </span>
        <span className="sky-toggle__label">{theme === "light" ? "Light" : "Dark"}</span>

          </button>
          <span className="pos-staff"><span className="pos-avatar">{user.name[0]}</span>{user.name}</span>
          <button className="pos-logout" onClick={() => setShowLogoutConfirm(true)}>Sign out</button>
        </div>
      </header>

      <div className="pos-body">
        <div className="products-panel">
          <div className="products-toolbar">
            <input type="text" className="pos-search" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="category-tabs">
              <button className={`cat-tab ${category === "all" ? "cat-active" : ""}`} onClick={() => setCategory("all")}>All</button>
              {categories.map(c => (
                <button key={c} className={`cat-tab ${category === c ? "cat-active" : ""}`} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>
          </div>

          <div className="products-grid">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className={`product-card ${product.stock <= 0 ? "product-card-disabled" : ""}`}
                onClick={() => product.stock > 0 && addToCart(product)}
                role="button"
                tabIndex={0}
              >
                <div className="product-thumb">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="product-thumb-img" />
                  ) : (
                    <span>📦</span>
                  )}
                  <button
                    type="button"
                    className="product-view-btn"
                    title="View details"
                    onClick={(e) => { e.stopPropagation(); setViewingProduct(product); }}
                  >
                    👁
                  </button>
                </div>
                <div className="product-name">{product.name}</div>
                <div className="product-price">Ksh {Number(product.price).toLocaleString()}</div>
                <div className={`product-stock ${product.stock <= 5 ? "low-stock" : ""}`}>{product.stock <= 0 ? "Out of stock" : `${product.stock} left`}</div>
              </div>
            ))}
          </div>

          {viewingProduct && (
            <div className="pv-modal-overlay" onClick={() => setViewingProduct(null)}>
              <div className="pv-modal" onClick={(e) => e.stopPropagation()}>
                <div className="pv-modal-img">
                  {viewingProduct.image ? (
                    <img src={viewingProduct.image} alt={viewingProduct.name} />
                  ) : (
                    <span style={{ fontSize: 36 }}>📦</span>
                  )}
                </div>
                <div className="pv-modal-body">
                  <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>{viewingProduct.name}</h2>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>
                    {viewingProduct.category || "Uncategorized"}{viewingProduct.sku ? ` · ${viewingProduct.sku}` : ""}
                  </div>
                  <div style={{ display: "flex", gap: 24, marginBottom: viewingProduct.description ? 12 : 0 }}>
                    <div>
                      <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--text-3)", marginBottom: 3 }}>Price</div>
                      <div className="product-price" style={{ fontSize: 15 }}>Ksh {Number(viewingProduct.price).toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--text-3)", marginBottom: 3 }}>Stock</div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{viewingProduct.stock} units</div>
                    </div>
                  </div>
                  {viewingProduct.description && (
                    <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                      {viewingProduct.description}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button className="btn-secondary" onClick={() => setViewingProduct(null)}>Close</button>
                    <button
                      className="btn-primary"
                      disabled={viewingProduct.stock <= 0}
                      onClick={() => { addToCart(viewingProduct); setViewingProduct(null); }}
                    >
                      {viewingProduct.stock <= 0 ? "Out of stock" : "Add to sale"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="cart-panel">
          <div className="cart-header">
            <h2>Current Order</h2>
            {cart.length > 0 && <button className="clear-cart" onClick={() => setCart([])}>Clear</button>}
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="cart-empty"><p>Add products to begin</p></div>
            ) : (
              cart.map(item => (
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
            {/* Discount Selector */}
            <div className="discount-selector-area" style={{marginBottom: '15px', borderBottom: '1px solid var(--border)', paddingBottom: '10px'}}>
              <label style={{fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '5px'}}>APPLY DISCOUNT</label>
              <select 
                className="pos-search" 
                value={selectedDiscount?.id || ""} 
                onChange={(e) => setSelectedDiscount(availableDiscounts.find(d => d.id === e.target.value))}
                style={{height: '35px', fontSize: '13px'}}
              >
                <option value="">No Discount</option>
                {availableDiscounts.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.discount_type === 'percentage' ? d.discount_value+'%' : 'Fixed'})</option>
                ))}
              </select>
              <div style={{display: 'flex', gap: '15px', marginTop: '8px', fontSize: '12px'}}>
                <label style={{cursor: 'pointer'}}><input type="radio" checked={applyBeforeVAT} onChange={() => setApplyBeforeVAT(true)} /> Before VAT</label>
                <label style={{cursor: 'pointer'}}><input type="radio" checked={!applyBeforeVAT} onChange={() => setApplyBeforeVAT(false)} /> After VAT</label>
              </div>
            </div>

            <div className="summary-row"><span>Subtotal</span><span>Ksh {rawCartTotal.toLocaleString()}</span></div>
            {discountVal > 0 && (
              <div className="summary-row" style={{color: '#10b981'}}>
                <span>Discount Applied</span><span>- Ksh {discountVal.toLocaleString()}</span>
              </div>
            )}
            <div className="summary-row"><span>{taxSettings.taxName} ({taxSettings.taxRate}%)</span><span>Ksh {finalTax.toFixed(2)}</span></div>
            <div className="summary-row summary-total"><span>Total</span><span>Ksh {finalTotal.toFixed(2)}</span></div>

            <div className="payment-methods">
              {["cash", "card", "mpesa", "split"].map(m => (
                <button key={m} className={`payment-btn ${paymentMethod === m ? "payment-active" : ""}`} onClick={() => setPaymentMethod(m)}>{m.toUpperCase()}</button>
              ))}
            </div>

            {paymentMethod === 'split' && (
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8}}>
                <div>
                  <label style={{fontSize: 12}}>Mpesa Amount</label>
                  <input type="number" min="0" step="0.01" value={mpesaAmount} onChange={(e) => setMpesaAmount(Number(e.target.value))} className="pos-search" />
                </div>
                <div>
                  <label style={{fontSize: 12}}>Cash Amount</label>
                  <input type="number" min="0" step="0.01" value={cashAmount} onChange={(e) => setCashAmount(Number(e.target.value))} className="pos-search" />
                </div>
              </div>
            )}

            <button className="checkout-btn" onClick={handleCheckout} disabled={cart.length === 0}>Charge Ksh {finalTotal.toFixed(2)}</button>
          </div>

          {orderComplete && lastOrder && (
            <div className="order-success">
              <div style={{fontWeight: 700}}>Order Complete!</div>
              <div style={{fontSize: 16, color: "var(--accent)"}}>Ksh {lastOrder.total.toFixed(2)}</div>
              <button className="btn-primary" style={{marginTop: 10}} onClick={() => printReceipt(lastOrder, user, taxSettings)}>Print Receipt</button>
              <button className="btn-secondary" style={{marginTop: 5, fontSize: '11px'}} onClick={() => setOrderComplete(false)}>Close</button>
            </div>
          )}
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Sign Out</h2>
            <div style={{display: "flex", gap: "10px", marginTop: '20px'}}>
              <button className="btn-secondary" onClick={() => setShowLogoutConfirm(false)} style={{flex: 1}}>Cancel</button>
              <button className="btn-primary" onClick={onLogout} style={{flex: 1, background: "#ef4444"}}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}