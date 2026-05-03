import React, { useState, useEffect } from "react";

export default function Overview() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    totalProducts: 0,
    activeStaff: 0,
    recentOrders: [],
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const today = new Date().toISOString().split("T")[0];

    const revenue = await window.electronAPI.queryDatabase(
      "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE date(created_at) = ?",
      [today]
    );
    const orders = await window.electronAPI.queryDatabase(
      "SELECT COUNT(*) as count FROM orders WHERE date(created_at) = ?",
      [today]
    );
    const products = await window.electronAPI.queryDatabase(
      "SELECT COUNT(*) as count FROM products WHERE is_active = 1"
    );
    const staff = await window.electronAPI.queryDatabase(
      "SELECT COUNT(*) as count FROM users WHERE is_active = 1"
    );
    const recent = await window.electronAPI.queryDatabase(
      "SELECT * FROM orders ORDER BY created_at DESC LIMIT 5"
    );

    setStats({
      todayRevenue: revenue.data?.[0]?.total || 0,
      todayOrders: orders.data?.[0]?.count || 0,
      totalProducts: products.data?.[0]?.count || 0,
      activeStaff: staff.data?.[0]?.count || 0,
      recentOrders: recent.data || [],
    });
  };

  const statCards = [
    { label: "Today's Revenue", value: `Ksh ${Number(stats.todayRevenue).toLocaleString()}`, icon: "◈" },
    { label: "Orders Today", value: stats.todayOrders, icon: "◫" },
    { label: "Products", value: stats.totalProducts, icon: "◧" },
    { label: "Staff Members", value: stats.activeStaff, icon: "◉" },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Overview</h1>
        <span className="page-date">{new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
      </div>

      <div className="stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="section">
        <h2 className="section-title">Recent Orders</h2>
        {stats.recentOrders.length === 0 ? (
          <div className="empty-state">No orders yet today</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Staff</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="order-number">{order.order_number}</td>
                  <td>{order.staff_name}</td>
                  <td>Ksh {Number(order.total).toLocaleString()}</td>
                  <td><span className="badge">{order.payment_method}</span></td>
                  <td>{new Date(order.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
