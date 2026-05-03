import React, { useState, useEffect } from "react";

export default function Reports() {
  const [period, setPeriod] = useState("week");
  const [data, setData] = useState({ revenue: 0, orders: 0, avgOrder: 0, topProducts: [], staffPerformance: [] });
 // eslint-disable-next-line
  useEffect(() => { loadReports(); }, [period]);

  const loadReports = async () => {
    const dateFilter = period === "week" ? "datetime('now', '-7 days')" : period === "month" ? "datetime('now', '-30 days')" : "datetime('now', '-1 day')";

    const revenue = await window.electronAPI.queryDatabase(
      `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM orders WHERE created_at >= ${dateFilter}`
    );

    const topProducts = await window.electronAPI.queryDatabase(
      `SELECT oi.product_name, SUM(oi.quantity) as total_qty, SUM(oi.total_price) as total_revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.created_at >= ${dateFilter}
       GROUP BY oi.product_name
       ORDER BY total_revenue DESC
       LIMIT 5`
    );

    const staffPerf = await window.electronAPI.queryDatabase(
      `SELECT staff_name, COUNT(*) as orders, SUM(total) as revenue
       FROM orders
       WHERE created_at >= ${dateFilter}
       GROUP BY staff_name
       ORDER BY revenue DESC`
    );

    const rev = revenue.data?.[0]?.total || 0;
    const cnt = revenue.data?.[0]?.count || 0;

    setData({
      revenue: rev,
      orders: cnt,
      avgOrder: cnt > 0 ? rev / cnt : 0,
      topProducts: topProducts.data || [],
      staffPerformance: staffPerf.data || [],
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <div className="filter-tabs">
          {["today", "week", "month"].map((p) => (
            <button key={p} className={`filter-tab ${period === p ? "filter-active" : ""}`} onClick={() => setPeriod(p)}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">◈</div>
          <div className="stat-value">Ksh {Number(data.revenue).toLocaleString()}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">◫</div>
          <div className="stat-value">{data.orders}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">◎</div>
          <div className="stat-value">Ksh {Number(data.avgOrder).toFixed(0)}</div>
          <div className="stat-label">Avg Order Value</div>
        </div>
      </div>

      <div className="reports-grid">
        <div className="section">
          <h2 className="section-title">Top Products</h2>
          {data.topProducts.length === 0 ? (
            <div className="empty-state">No data for this period</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
              <tbody>
                {data.topProducts.map((p, i) => (
                  <tr key={i}>
                    <td>{p.product_name}</td>
                    <td>{p.total_qty}</td>
                    <td>Ksh {Number(p.total_revenue).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="section">
          <h2 className="section-title">Staff Performance</h2>
          {data.staffPerformance.length === 0 ? (
            <div className="empty-state">No data for this period</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Staff</th><th>Orders</th><th>Revenue</th></tr></thead>
              <tbody>
                {data.staffPerformance.map((s, i) => (
                  <tr key={i}>
                    <td>{s.staff_name}</td>
                    <td>{s.orders}</td>
                    <td>Ksh {Number(s.revenue).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
