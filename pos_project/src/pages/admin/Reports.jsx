import React, { useState, useEffect } from "react";
import { WalletIcon, CartIcon, ReceiptIcon, TrendingUpIcon } from "../../components/Icons";
import ExportMenu from "../../components/ExportMenu";
import { exportToExcel } from "../../utils/excelUtils";
import { buildPdfReport } from "../../utils/pdfReport";
import { renderChartImage, CHART_COLORS } from "../../utils/chartImage";

export default function Reports() {
  const [period, setPeriod] = useState("week");
  const [data, setData] = useState({ revenue: 0, orders: 0, avgOrder: 0, topProducts: [], staffPerformance: [], profitByProduct: [], revenueTrend: [] });
 // eslint-disable-next-line
  useEffect(() => { loadReports(); }, [period]);

  const loadReports = async () => {
    let dateFilter;
    if (period === "week") {
      dateFilter = "datetime('now', '-7 days')";
    } else if (period === "month") {
      dateFilter = "datetime('now', '-30 days')";
    } else if (period === "today") {
      dateFilter = "datetime('now', '-1 day')";
    } else {
      // "all" — no date filter
      dateFilter = "datetime('1970-01-01')";
    }

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

    const profitByProduct = await window.electronAPI.queryDatabase(
      `SELECT oi.product_name,
              SUM(oi.quantity) as total_qty,
              SUM(oi.total_price) as total_revenue,
              SUM(oi.total_price) - SUM(oi.quantity * COALESCE(p.buying_price, 0)) as total_profit
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.created_at >= ${dateFilter}
       GROUP BY oi.product_name
       ORDER BY total_profit DESC
       LIMIT 8`
    );

    const revenueTrend = await window.electronAPI.queryDatabase(
      `SELECT date(created_at) as day, SUM(total) as revenue
       FROM orders
       WHERE created_at >= ${dateFilter}
       GROUP BY date(created_at)
       ORDER BY day ASC`
    );

    const rev = revenue.data?.[0]?.total || 0;
    const cnt = revenue.data?.[0]?.count || 0;

    setData({
      revenue: rev,
      orders: cnt,
      avgOrder: cnt > 0 ? rev / cnt : 0,
      topProducts: topProducts.data || [],
      staffPerformance: staffPerf.data || [],
      profitByProduct: profitByProduct.data || [],
      revenueTrend: revenueTrend.data || [],
    });
  };

  /* ── EXPORT ── */
  const handleExportExcel = () => {
    exportToExcel(`sales-report-${period}`, [
      {
        name: "Summary",
        rows: [
          { Period: period, "Total Revenue (Ksh)": data.revenue, "Total Orders": data.orders, "Avg Order Value (Ksh)": +data.avgOrder.toFixed(2) },
        ],
      },
      {
        name: "Top Products",
        rows: data.topProducts.map((p) => ({ Product: p.product_name, "Qty Sold": p.total_qty, "Revenue (Ksh)": p.total_revenue })),
      },
      {
        name: "Profit by Product",
        rows: data.profitByProduct.map((p) => ({ Product: p.product_name, "Qty Sold": p.total_qty, "Revenue (Ksh)": p.total_revenue, "Profit (Ksh)": p.total_profit })),
      },
      {
        name: "Staff Performance",
        rows: data.staffPerformance.map((s) => ({ Staff: s.staff_name, Orders: s.orders, "Revenue (Ksh)": s.revenue })),
      },
      {
        name: "Revenue Trend",
        rows: data.revenueTrend.map((r) => ({ Date: r.day, "Revenue (Ksh)": r.revenue })),
      },
    ]);
  };

  const handleExportPDF = async () => {
    const sections = [
      {
        type: "stats",
        items: [
          { label: "Total Revenue", value: `Ksh ${Number(data.revenue).toLocaleString()}` },
          { label: "Total Orders", value: data.orders },
          { label: "Avg. Order Value", value: `Ksh ${Number(data.avgOrder).toFixed(0)}` },
        ],
      },
    ];

    if (data.revenueTrend.length > 1) {
      const trendImage = await renderChartImage({
        type: "line",
        labels: data.revenueTrend.map((r) => r.day),
        datasets: [{ label: "Revenue (Ksh)", data: data.revenueTrend.map((r) => r.revenue), borderColor: CHART_COLORS[0], backgroundColor: "rgba(232,93,47,0.15)", fill: true, tension: 0.3 }],
      });
      sections.push({ type: "chart", title: "Revenue Trend", image: trendImage, height: 200 });
    }

    if (data.topProducts.length > 0) {
      const topImage = await renderChartImage({
        type: "bar",
        labels: data.topProducts.map((p) => p.product_name),
        datasets: [{ label: "Revenue (Ksh)", data: data.topProducts.map((p) => p.total_revenue), backgroundColor: CHART_COLORS[1] }],
      });
      sections.push({ type: "chart", title: "Top Products by Revenue", image: topImage, height: 200 });
      sections.push({
        type: "table",
        title: "Top Products",
        head: ["Product", "Qty Sold", "Revenue (Ksh)"],
        body: data.topProducts.map((p) => [p.product_name, p.total_qty, Number(p.total_revenue).toLocaleString()]),
      });
    }

    if (data.profitByProduct.length > 0) {
      const profitImage = await renderChartImage({
        type: "bar",
        labels: data.profitByProduct.map((p) => p.product_name),
        datasets: [{ label: "Profit (Ksh)", data: data.profitByProduct.map((p) => p.total_profit), backgroundColor: CHART_COLORS[2] }],
      });
      sections.push({ type: "chart", title: "Most Profitable Products", image: profitImage, height: 200 });
      sections.push({
        type: "table",
        title: "Profit by Product",
        head: ["Product", "Qty Sold", "Revenue (Ksh)", "Profit (Ksh)"],
        body: data.profitByProduct.map((p) => [p.product_name, p.total_qty, Number(p.total_revenue).toLocaleString(), Number(p.total_profit).toLocaleString()]),
      });
    }

    if (data.staffPerformance.length > 0) {
      const staffImage = await renderChartImage({
        type: "bar",
        labels: data.staffPerformance.map((s) => s.staff_name),
        datasets: [{ label: "Revenue (Ksh)", data: data.staffPerformance.map((s) => s.revenue), backgroundColor: CHART_COLORS[3] }],
      });
      sections.push({ type: "chart", title: "Staff Performance", image: staffImage, height: 200 });
      sections.push({
        type: "table",
        title: "Staff Performance",
        head: ["Staff", "Orders", "Revenue (Ksh)"],
        body: data.staffPerformance.map((s) => [s.staff_name, s.orders, Number(s.revenue).toLocaleString()]),
      });
    }

    buildPdfReport({
      title: "Sales Report",
      subtitle: `POStore · Period: ${period} · Generated ${new Date().toLocaleString()}`,
      filename: `sales-report-${period}`,
      sections,
    });
  };


  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <div className="toolbar-actions">
          <div className="filter-tabs">
            {["today", "week", "month", "all"].map((p) => (
              <button key={p} className={`filter-tab ${period === p ? "filter-active" : ""}`} onClick={() => setPeriod(p)}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <ExportMenu onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} />
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-revenue"><WalletIcon size={19} /></div>
          <div className="stat-value">Ksh {Number(data.revenue).toLocaleString()}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-orders"><CartIcon size={19} /></div>
          <div className="stat-value">{data.orders}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-products"><ReceiptIcon size={19} /></div>
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

        <div className="section">
          <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUpIcon size={15} /> Most Profitable Products
          </h2>
          {data.profitByProduct.length === 0 ? (
            <div className="empty-state">No data for this period</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Product</th><th>Qty Sold</th><th>Revenue</th><th>Profit</th></tr></thead>
              <tbody>
                {data.profitByProduct.map((p, i) => (
                  <tr key={i}>
                    <td>{p.product_name}</td>
                    <td>{p.total_qty}</td>
                    <td>Ksh {Number(p.total_revenue).toLocaleString()}</td>
                    <td style={{ color: p.total_profit >= 0 ? "var(--green)" : "var(--red)" }}>
                      Ksh {Number(p.total_profit).toLocaleString()}
                    </td>
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
