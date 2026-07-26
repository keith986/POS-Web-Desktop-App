import React, { useState, useEffect } from "react";
import { WalletIcon, CartIcon, BoxIcon, UsersIcon } from "../../components/Icons";
import { SortTh, Pagination, sortRows, toggleSort } from "../../components/TableControls";

export default function Overview() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    totalProducts: 0,
    activeStaff: 0,
    recentOrders: [],
  });
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

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
    // Pull a larger recent window so the table below has something to sort/paginate through
    const recent = await window.electronAPI.queryDatabase(
      "SELECT * FROM orders ORDER BY created_at DESC LIMIT 100"
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
    { label: "Today's Revenue", value: `Ksh ${Number(stats.todayRevenue).toLocaleString()}`, icon: <WalletIcon size={19} />, wrapClass: "stat-icon-revenue" },
    { label: "Orders Today", value: stats.todayOrders, icon: <CartIcon size={19} />, wrapClass: "stat-icon-orders" },
    { label: "Products", value: stats.totalProducts, icon: <BoxIcon size={19} />, wrapClass: "stat-icon-products" },
    { label: "Staff Members", value: stats.activeStaff, icon: <UsersIcon size={19} />, wrapClass: "stat-icon-staff" },
  ];

  const handleSort = (key) => setSort((s) => toggleSort(s, key));
  const sortedOrders = sortRows(stats.recentOrders, sort);
  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = sortedOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Overview</h1>
        <span className="page-date">{new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
      </div>

      <div className="stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className={`stat-icon-wrap ${card.wrapClass}`}>{card.icon}</div>
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
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <SortTh label="Order #" sortKey="order_number" sort={sort} onSort={handleSort} />
                  <SortTh label="Staff" sortKey="staff_name" sort={sort} onSort={handleSort} />
                  <SortTh label="Total" sortKey="total" sort={sort} onSort={handleSort} />
                  <SortTh label="Payment" sortKey="payment_method" sort={sort} onSort={handleSort} />
                  <SortTh label="Time" sortKey="created_at" sort={sort} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order, i) => (
                  <tr key={order.id}>
                    <td className="row-number-cell">{(currentPage - 1) * pageSize + i + 1}</td>
                    <td className="order-number">{order.order_number}</td>
                    <td>{order.staff_name}</td>
                    <td>Ksh {Number(order.total).toLocaleString()}</td>
                    <td><span className="badge">{order.payment_method}</span></td>
                    <td>{new Date(order.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={currentPage}
              pageSize={pageSize}
              totalItems={sortedOrders.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </div>
    </div>
  );
}
