import React, { useState, useEffect } from "react";
import { WalletIcon, CartIcon, BoxIcon, UsersIcon, TrendingUpIcon } from "../../components/Icons";
import { SortTh, Pagination, sortRows, toggleSort } from "../../components/TableControls";

/* ───────────────── BUSINESS TYPE ICONS ───────────────── */

const BagIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
const UtensilsIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3Zm0 0v7" />
  </svg>
);
const ScissorsIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);
const PillIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" />
  </svg>
);
const StoreIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9 5 3h14l2 6" /><path d="M3 9v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9" /><path d="M3 9h18" /><path d="M9 21v-6h6v6" />
  </svg>
);

const BUSINESS_TYPES = {
  retail: { label: "Retail Store", icon: BagIcon, from: "#e85d2f", to: "#f6a536", tagline: "Every sale, every shelf, tracked in real time.", orderLabel: "Orders Today" },
  restaurant: { label: "Restaurant & Cafe", icon: UtensilsIcon, from: "#dc2626", to: "#f97316", tagline: "From kitchen to table, service running smooth.", orderLabel: "Tables Served" },
  salon: { label: "Salon & Services", icon: ScissorsIcon, from: "#9333ea", to: "#ec4899", tagline: "Bookings, walk-ins, and happy regulars.", orderLabel: "Appointments" },
  pharmacy: { label: "Pharmacy & Health", icon: PillIcon, from: "#0d9488", to: "#22c55e", tagline: "Stock levels and prescriptions, always in check.", orderLabel: "Orders Filled" },
  general: { label: "General Store", icon: StoreIcon, from: "#2563eb", to: "#6366f1", tagline: "One dashboard for everything you sell.", orderLabel: "Orders Today" },
};

function Delta({ pct }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span className={`stat-delta ${up ? "stat-delta-up" : "stat-delta-down"}`}>
      <TrendingUpIcon size={11} style={up ? {} : { transform: "scaleY(-1)" }} />
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function Sparkline({ points }) {
  const max = Math.max(...points, 1);
  const w = 280, h = 72, pad = 4;
  const step = (w - pad * 2) / (points.length - 1 || 1);
  const coords = points.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)]);
  const line = coords.map((c) => c.join(",")).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="sparkline-svg" preserveAspectRatio="none">
      <polygon points={area} fill="url(#sparkFill)" opacity="0.25" />
      <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === coords.length - 1 ? 4 : 0} fill="var(--accent)" stroke="var(--bg-2)" strokeWidth="2" />
      ))}
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Donut({ pct, color = "var(--accent)" }) {
  const r = 42, c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg viewBox="0 0 100 100" className="donut-svg">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-strong)" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="50" y="47" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text)">{pct}%</text>
      <text x="50" y="63" textAnchor="middle" fontSize="8" fill="var(--text-3)">healthy</text>
    </svg>
  );
}

export default function Overview() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    totalProducts: 0,
    activeStaff: 0,
    yesterdayRevenue: 0,
    yesterdayOrders: 0,
    trend: [0, 0, 0, 0, 0, 0, 0],
    healthyPct: 100,
    lowStockCount: 0,
    recentOrders: [],
  });
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [businessType, setBusinessType] = useState("retail");

  useEffect(() => {
    loadStats();
    window.electronAPI?.getStoreData?.("businessType").then((v) => { if (v && BUSINESS_TYPES[v]) setBusinessType(v); });
  }, []);

  const changeBusinessType = (key) => {
    setBusinessType(key);
    window.electronAPI?.setStoreData?.("businessType", key);
  };

  const loadStats = async () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const revenue = await window.electronAPI.queryDatabase(
      "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE date(created_at) = ?", [today]
    );
    const orders = await window.electronAPI.queryDatabase(
      "SELECT COUNT(*) as count FROM orders WHERE date(created_at) = ?", [today]
    );
    const yRevenue = await window.electronAPI.queryDatabase(
      "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE date(created_at) = ?", [yesterday]
    );
    const yOrders = await window.electronAPI.queryDatabase(
      "SELECT COUNT(*) as count FROM orders WHERE date(created_at) = ?", [yesterday]
    );
    const products = await window.electronAPI.queryDatabase(
      "SELECT COUNT(*) as count FROM products WHERE is_active = 1"
    );
    const staff = await window.electronAPI.queryDatabase(
      "SELECT COUNT(*) as count FROM users WHERE is_active = 1"
    );
    const healthy = await window.electronAPI.queryDatabase(
      "SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND stock > 5"
    );
    const lowStock = await window.electronAPI.queryDatabase(
      "SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND stock <= 5"
    );
    const weekTrend = await window.electronAPI.queryDatabase(
      "SELECT date(created_at) as day, COALESCE(SUM(total),0) as total FROM orders WHERE date(created_at) >= date('now','-6 days') GROUP BY day"
    );
    const recent = await window.electronAPI.queryDatabase(
      "SELECT * FROM orders ORDER BY created_at DESC LIMIT 100"
    );

    // Build a continuous 7-day trend, filling in days with no sales as 0
    const byDay = {};
    (weekTrend.data || []).forEach((r) => { byDay[r.day] = Number(r.total); });
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      trend.push(byDay[d] || 0);
    }

    const totalProducts = products.data?.[0]?.count || 0;
    const healthyCount = healthy.data?.[0]?.count || 0;

    setStats({
      todayRevenue: revenue.data?.[0]?.total || 0,
      todayOrders: orders.data?.[0]?.count || 0,
      yesterdayRevenue: yRevenue.data?.[0]?.total || 0,
      yesterdayOrders: yOrders.data?.[0]?.count || 0,
      totalProducts,
      activeStaff: staff.data?.[0]?.count || 0,
      trend,
      healthyPct: totalProducts > 0 ? Math.round((healthyCount / totalProducts) * 100) : 100,
      lowStockCount: lowStock.data?.[0]?.count || 0,
      recentOrders: recent.data || [],
    });
  };

  const pctChange = (curr, prev) => (prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : null));

  const biz = BUSINESS_TYPES[businessType];

  const statCards = [
    { label: "Today's Revenue", value: `Ksh ${Number(stats.todayRevenue).toLocaleString()}`, icon: <WalletIcon size={19} />, wrapClass: "stat-icon-revenue", delta: pctChange(stats.todayRevenue, stats.yesterdayRevenue) },
    { label: biz.orderLabel, value: stats.todayOrders, icon: <CartIcon size={19} />, wrapClass: "stat-icon-orders", delta: pctChange(stats.todayOrders, stats.yesterdayOrders) },
    { label: "Products", value: stats.totalProducts, icon: <BoxIcon size={19} />, wrapClass: "stat-icon-products", delta: null },
    { label: "Staff Members", value: stats.activeStaff, icon: <UsersIcon size={19} />, wrapClass: "stat-icon-staff", delta: null },
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

      <div className="biz-banner" style={{ background: `linear-gradient(120deg, ${biz.from}, ${biz.to})` }}>
        <div className="biz-banner-icon"><biz.icon /></div>
        <div className="biz-banner-text">
          <div className="biz-banner-eyebrow">Store type</div>
          <div className="biz-banner-title">{biz.label}</div>
          <div className="biz-banner-tagline">{biz.tagline}</div>
        </div>
        <div className="biz-switcher">
          {Object.entries(BUSINESS_TYPES).map(([key, cfg]) => (
            <button
              key={key}
              className={`biz-switcher-btn ${businessType === key ? "biz-switcher-active" : ""}`}
              onClick={() => changeBusinessType(key)}
              title={cfg.label}
            >
              <cfg.icon size={15} />
            </button>
          ))}
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="stat-card-top">
              <div className={`stat-icon-wrap ${card.wrapClass}`}>{card.icon}</div>
              <Delta pct={card.delta} />
            </div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-card-head">
            <div>
              <div className="analytics-card-title">Sales, last 7 days</div>
              <div className="analytics-card-sub">Ksh {stats.trend.reduce((a, b) => a + b, 0).toLocaleString()} total</div>
            </div>
          </div>
          <Sparkline points={stats.trend} />
        </div>
        <div className="analytics-card analytics-card-donut">
          <div className="analytics-card-head">
            <div>
              <div className="analytics-card-title">Inventory health</div>
              <div className="analytics-card-sub">{stats.lowStockCount} item{stats.lowStockCount === 1 ? "" : "s"} running low</div>
            </div>
          </div>
          <Donut pct={stats.healthyPct} color={stats.healthyPct >= 60 ? "var(--green)" : stats.healthyPct >= 30 ? "var(--yellow)" : "var(--red)"} />
        </div>
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
