import React, { useState, useEffect } from "react";

/* ── SVG Icons ── */
function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [dateFilter, setDateFilter] = useState("today");
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [showApprovals, setShowApprovals] = useState(false);

  useEffect(() => {
    loadOrders();
    loadPendingApprovals();
  }, [dateFilter]);

  const loadOrders = async () => {
    let where = "";
    const today = new Date().toISOString().split("T")[0];
    if (dateFilter === "today") where = `WHERE date(orders.created_at) = '${today}'`;
    else if (dateFilter === "week") where = `WHERE orders.created_at >= datetime('now', '-7 days')`;
    else if (dateFilter === "month") where = `WHERE orders.created_at >= datetime('now', '-30 days')`;

    // Fetching the dynamic properties along with the newly saved 'discount_applied'
    const result = await window.electronAPI.queryDatabase(
      `SELECT orders.*,
           COALESCE(SUM(oi.quantity), 0) AS item_count,
           GROUP_CONCAT(oi.product_name || ' x' || oi.quantity, ', ') AS item_names
         FROM orders
         LEFT JOIN order_items oi ON oi.order_id = orders.id
         ${where}
         GROUP BY orders.id
         ORDER BY orders.created_at DESC`
    );
    if (result.success) setOrders(result.data);
  };

  const loadPendingApprovals = async () => {
    try {
      const approvals = await window.electronAPI.getStoreData("inventoryApprovals");
      if (approvals && Array.isArray(approvals)) {
        setPendingApprovals(approvals.filter(a => a.status === "pending"));
      }
    } catch (err) {
      console.error("Failed to load pending approvals:", err);
    }
  };

  const handleApproveInventory = async (approvalId) => {
    const approval = pendingApprovals.find(a => a.id === approvalId);
    if (!approval) return;
    try {
      const result = await window.electronAPI.executeDatabase(
        "UPDATE products SET stock = stock + ? WHERE id = ?",
        [approval.quantity, approval.productId]
      );
      if (result.success) {
        const updated = pendingApprovals.map(a => a.id === approvalId ? { ...a, status: "approved" } : a);
        await window.electronAPI.setStoreData("inventoryApprovals", updated);
        setPendingApprovals(updated.filter(a => a.status === "pending"));
        alert("Inventory change approved!");
        loadOrders();
      }
    } catch (err) { console.error(err); }
  };

  const handleRejectInventory = async (approvalId) => {
    try {
      const updated = pendingApprovals.map(a => a.id === approvalId ? { ...a, status: "rejected" } : a);
      await window.electronAPI.setStoreData("inventoryApprovals", updated);
      setPendingApprovals(updated.filter(a => a.status === "pending"));
      alert("Inventory change rejected!");
    } catch (err) { console.error(err); }
  };

  const viewOrder = async (order) => {
    setSelected(order);
    const result = await window.electronAPI.queryDatabase(
      "SELECT * FROM order_items WHERE order_id = ?",
      [order.id]
    );
    if (result.success) setItems(result.data);
  };

  const downloadReceipt = async (order) => {
    let receiptItems = (selected?.id === order.id && items.length > 0) ? items : [];
    if (receiptItems.length === 0) {
      const result = await window.electronAPI.queryDatabase("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
      if (result.success) receiptItems = result.data;
    }

    const lines = receiptItems.map(item => `
      <tr>
        <td style="padding:2px 0;font-size:12px;">${item.product_name}</td>
        <td style="text-align:center;padding:2px 4px;font-size:12px;">${item.quantity}</td>
        <td style="text-align:right;padding:2px 0;font-size:12px;">Ksh ${Number(item.total_price).toLocaleString()}</td>
      </tr>`).join("");

    // Fallbacks set up so that both 'discount' and 'discount_applied' naming schemes are supported
    const discountValue = Number(order.discount_applied || order.discount || 0);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'DM Mono', monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 16px 8px; color: #111; }
    .center { text-align: center; }
    .divider { border-top: 1px dashed #aaa; margin: 8px 0; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: 2px; }
    table { width: 100%; border-collapse: collapse; }
    .total-row td { font-size: 13px; font-weight: 700; padding-top: 6px; }
    .tax-row td { font-size: 11px; color: #555; }
    .discount-line { color: #d946ef; font-weight: 500; }
  </style>
</head>
<body>
  <div class="center">
    <div class="brand">POStore</div>
    <div style="font-size:10px;">Point of Sale Receipt</div>
    <div style="font-size:10px;">${new Date(order.created_at).toLocaleString()}</div>
    <div style="font-size:10px; color:#888;">${order.order_number}</div>
  </div>
  <hr class="divider"/>
  <table>
    <thead><tr><th align="left">Item</th><th align="center">Qty</th><th align="right">Total</th></tr></thead>
    <tbody>${lines}</tbody>
  </table>
  <hr class="divider"/>
  <table>
    <tr class="tax-row"><td>Subtotal</td><td align="right">Ksh ${Number(order.subtotal).toLocaleString()}</td></tr>
    
    ${discountValue > 0 ? `
    <tr class="tax-row">
      <td class="discount-line">Discount</td>
      <td align="right" class="discount-line">- Ksh ${discountValue.toLocaleString()}</td>
    </tr>` : ''}
    
    <tr class="tax-row"><td>Tax</td><td align="right">Ksh ${Number(order.tax).toFixed(2)}</td></tr>
    <tr class="total-row"><td>TOTAL</td><td align="right">Ksh ${Number(order.total).toFixed(2)}</td></tr>
  </table>
  <div class="center" style="margin-top:15px;">
    <div style="font-size:10px;">Served by: ${order.staff_name}</div>
    <div style="background:#111; color:#fff; display:inline-block; padding:2px 8px; border-radius:3px; font-size:10px; margin-top:4px;">${order.payment_method.toUpperCase()}</div>
  </div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=320,height=600");
    if (win) { win.document.write(html); win.document.close(); }
  };

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Orders</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div className="filter-tabs">
            {["today", "week", "month", "all"].map((f) => (
              <button key={f} className={`filter-tab ${dateFilter === f ? "filter-active" : ""}`} onClick={() => setDateFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button className="badge" onClick={() => setShowApprovals(!showApprovals)} style={{ padding: "6px 12px", background: pendingApprovals.length > 0 ? "#fffbeb" : "#f5f4f0", color: pendingApprovals.length > 0 ? "#d97706" : "#9a9a8e", cursor: "pointer", borderRadius: "4px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <ClipboardIcon /> Pending: {pendingApprovals.length}
          </button>
        </div>
      </div>

      {showApprovals && pendingApprovals.length > 0 && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "15px", marginBottom: "20px" }}>
          <h3 style={{ marginTop: 0, color: "#d97706" }}>⚠ Pending Inventory Approvals</h3>
          {pendingApprovals.map(approval => (
            <div key={approval.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#fff", borderRadius: "4px", marginBottom: "8px" }}>
              <div>
                <div style={{ fontWeight: "500" }}>{approval.productName}</div>
                <div style={{ fontSize: "12px", color: "#9a9a8e" }}>Qty: {approval.quantity} | {approval.reason}</div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn-primary" onClick={() => handleApproveInventory(approval.id)} style={{ padding: "6px 12px", fontSize: "12px" }}><CheckCircleIcon /> Approve</button>
                <button className="btn-secondary" onClick={() => handleRejectInventory(approval.id)} style={{ padding: "6px 12px", fontSize: "12px" }}><XCircleIcon /> Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="revenue-banner">
        <span>Total Revenue</span>
        <span className="revenue-amount">Ksh {totalRevenue.toLocaleString()}</span>
        <span>{orders.length} orders</span>
      </div>

      <table className="data-table">
        <thead>
          <tr><th>Order #</th><th>Staff</th><th>Items</th><th>Total</th><th>Payment</th><th>Time</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="order-number" onClick={() => viewOrder(order)} style={{ cursor: "pointer" }}>{order.order_number}</td>
              <td>{order.staff_name}</td>
              <td>{order.item_count} items</td>
              <td>Ksh {Number(order.total).toLocaleString()}</td>
              <td><span className="badge">{order.payment_method}</span></td>
              <td>{new Date(order.created_at).toLocaleString()}</td>
              <td><button className="btn-secondary" onClick={() => downloadReceipt(order)} style={{ padding: "4px 8px", fontSize: "12px" }}><DownloadIcon /> Download</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Order {selected.order_number}</h2>
            <table className="data-table">
              <thead><tr><th>Product</th><th>Qty</th><th>Total</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}><td>{item.product_name}</td><td>{item.quantity}</td><td>Ksh {Number(item.total_price).toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="order-totals">
              <div className="summary-row"><span>Subtotal</span><span>Ksh {Number(selected.subtotal).toLocaleString()}</span></div>
              
              {/* REFLECT DISCOUNT IN MODAL DETAILED SUMMARY */}
              {Number(selected.discount_applied || selected.discount || 0) > 0 && (
                <div className="summary-row" style={{ color: "#d946ef", fontWeight: "600" }}>
                  <span>Discount Applied</span><span>- Ksh {Number(selected.discount_applied || selected.discount).toLocaleString()}</span>
                </div>
              )}
              
              <div className="summary-row"><span>Tax</span><span>Ksh {Number(selected.tax).toFixed(2)}</span></div>
              <div className="summary-row summary-total"><span>Total</span><span>Ksh {Number(selected.total).toLocaleString()}</span></div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
              <button className="btn-primary" onClick={() => downloadReceipt(selected)}><DownloadIcon /> Download Receipt</button>
              <button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}