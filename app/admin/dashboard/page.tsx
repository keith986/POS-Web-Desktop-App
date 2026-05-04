"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/app/_lib/StoreContext";
import WeeklyRevenueChart from "@/app/admin/WeeklyRevenueChart";
import Link from "next/link";

/* ── Types ── */
interface Notification {
  id:      string;
  type:    "order" | "login" | "stock" | "refund";
  title:   string;
  message: string;
  time:    string;
  read:    boolean;
}

interface DashboardData {
  revenue_today:   number;
  revenue_week:    number;
  orders_today:    number;
  orders_pending:  number;
  active_staff:    number;
  total_customers: number;
  low_stock_count: number;
  recent_orders: {
    id:             string;
    order_number:   string;
    customer_name:  string;
    total:          number;
    status:         string;
    payment_status: string;
    created_at:     string;
  }[];
  top_products: {
    name:       string;
    category:   string;
    sku:        string | null;
    units_sold: number;
    revenue:    number;
  }[];
  activity: {
    color:   string;
    message: string;
    time:    string;
  }[];
  weekly_revenue: { day: string; revenue: number }[];
  payment_methods: { method: string; count: number; pct: number }[];
}

interface StoredUser {
  id:         string;
  full_name:  string;
  email:      string;
  role:       string;
  store_name: string | null;
  domain:     string;
}

/* ── Helpers ── */
function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("user") ?? "null"); }
  catch { return null; }
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── Status badge config ── */
const STATUS_CFG: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  completed:  { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", dot: "#16a34a" },
  paid:       { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", dot: "#16a34a" },
  pending:    { bg: "#fffbeb", color: "#d97706", border: "#fde68a", dot: "#d97706" },
  processing: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", dot: "#2563eb" },
  refunded:   { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", dot: "#dc2626" },
  cancelled:  { bg: "#f5f4f0", color: "#9a9a8e", border: "#e2e0d8", dot: "#9a9a8e" },
};

const METHOD_COLOR: Record<string, string> = {
  card: "#141410", cash: "#2563eb", mobile: "#16a34a",
};

/* ── Notification type config ── */
const NOTIF_CFG: Record<Notification["type"], { icon: React.ReactNode; color: string; bg: string }> = {
  order:  { icon: <IconOrder  />, color: "#16a34a", bg: "#f0fdf4" },
  login:  { icon: <IconLogin  />, color: "#2563eb", bg: "#eff6ff" },
  stock:  { icon: <IconStock  />, color: "#d97706", bg: "#fffbeb" },
  refund: { icon: <IconRefund />, color: "#dc2626", bg: "#fef2f2" },
};

/* ── Spinner ── */
function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", color: "#9a9a8e", fontSize: 13, gap: 10 }}>
      <div style={{ width: 18, height: 18, border: "2px solid #e2e0d8", borderTopColor: "#141410", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      Loading dashboard…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Donut Chart ── */
function DonutChart({ data }: { data: { method: string; pct: number }[] }) {
  const r = 44; const cx = 56; const cy = 56;
  const circ = 2 * Math.PI * r;

  /* Pre-calculate offsets with reduce — no variable mutation inside map */
  const slices = data.reduce<{ method: string; len: number; offset: number }[]>((acc, d) => {
    const len    = (d.pct / 100) * circ;
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].len : 0;
    return [...acc, { method: d.method, len, offset }];
  }, []);

  return (
    <svg width="112" height="112" viewBox="0 0 112 112">
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r}
          fill="none" stroke={METHOD_COLOR[s.method] ?? "#9a9a8e"}
          strokeWidth="16"
          strokeDasharray={`${s.len} ${circ - s.len}`}
          strokeDashoffset={-s.offset}
          style={{ transform: "rotate(-90deg)", transformOrigin: "56px 56px" }}
        />
      ))}
      <circle cx={cx} cy={cy} r={r - 10} fill="white" />
    </svg>
  );
}

/* ── Bell Icon ── */
function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}

/* ── Stat / UI Icons ── */
function IconRevenue() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  );
}
function IconOrders() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"/><path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
}
function IconStaff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}
function IconCustomers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function IconBox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}
function IconTrend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  );
}
function IconRefresh() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
function IconOrder() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
}
function IconLogin() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function IconStock() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
}
function IconRefund() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>;
}

/* ── Notification Bell ── */
function NotificationBell({ adminId }: { adminId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open,          setOpen]           = useState(false);
  const [loading,       setLoading]        = useState(false);
  const [mounted,       setMounted]        = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.read).length;

  /* Set mounted on client only — prevents hydration mismatch */
  useEffect(() => { setMounted(true); }, []);

  /* Fetch notifications */
  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/notifications?admin_id=${adminId}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        /* Merge with read state from localStorage */
        const readIds: string[] = JSON.parse(localStorage.getItem("read_notifs") ?? "[]");
        setNotifications(data.map((n: Notification) => ({ ...n, read: readIds.includes(n.id) })));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [adminId]);

  /* Auto-fetch every 60 seconds */
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Mark one as read */
  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const readIds: string[] = JSON.parse(localStorage.getItem("read_notifs") ?? "[]");
    if (!readIds.includes(id)) {
      localStorage.setItem("read_notifs", JSON.stringify([...readIds, id]));
    }
  };

  /* Mark all as read */
  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    localStorage.setItem("read_notifs", JSON.stringify(allIds));
  };

  /* Return null on server — React won't compare this to server HTML at all */
  if (!mounted) return null;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifs(); }}
        style={{
          width: 36, height: 36,
          border: "1px solid #e2e0d8",
          borderRadius: 8, background: open ? "#f5f4f0" : "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", position: "relative", transition: "background 0.15s",
        }}
      >
        <BellIcon />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "#dc2626", color: "#fff",
            fontSize: 9, fontWeight: 700,
            width: 16, height: 16, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid #fff",
            fontFamily: "inherit",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 360, background: "#fff",
          border: "1px solid #e2e0d8", borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          zIndex: 200, overflow: "hidden",
          animation: "notifIn 0.15s ease",
        }}>
          <style>{`@keyframes notifIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.1rem", borderBottom: "1px solid #e2e0d8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#141410" }}>Notifications</span>
              {unread > 0 && (
                <span style={{ background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 100 }}>
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background: "none", border: "none", fontSize: 12, color: "#2563eb", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>Loading…</div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c8c6bc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
                </div>
                <div style={{ fontSize: 13, color: "#9a9a8e" }}>No notifications yet</div>
              </div>
            ) : (
              notifications.map(n => {
                const cfg = NOTIF_CFG[n.type];
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "0.85rem 1.1rem",
                      borderBottom: "1px solid #f0ede6",
                      background: n.read ? "#fff" : "#fafaf8",
                      cursor: "pointer", transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f5f4f0"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = n.read ? "#fff" : "#fafaf8"}
                  >
                    {/* Icon */}
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: "#141410", lineHeight: 1.4 }}>{n.title}</span>
                        {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563eb", flexShrink: 0, marginTop: 4 }} />}
                      </div>
                      <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: "#c8c6bc", marginTop: 4 }}>{n.time}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{ padding: "0.65rem 1.1rem", borderTop: "1px solid #e2e0d8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#9a9a8e" }}>{notifications.length} total notification{notifications.length !== 1 ? "s" : ""}</span>
              <button
                onClick={fetchNotifs}
                style={{ background: "none", border: "none", fontSize: 12, color: "#4a4a40", cursor: "pointer", fontFamily: "inherit" }}
              >
                <IconRefresh /> Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function AdminDashboard() {
  const [adminUser, setAdminUser] = useState<StoredUser | null>(null);
  const [checked,   setChecked]   = useState(false);
  const { formatCurrency } = useStore();
  const usd = (n: number) => formatCurrency(n);
  const [data,      setData]     = useState<DashboardData | null>(null);
  const [fetching,  setFetching] = useState(true);
  const [error,     setError]    = useState<string | null>(null);
 

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const sessionParam = params.get("session");

  if (sessionParam) {
    try {
      const user = JSON.parse(decodeURIComponent(sessionParam));
      localStorage.setItem("user", JSON.stringify(user));
      window.history.replaceState({}, "", window.location.pathname);
      setAdminUser(user);
      setChecked(true);
    } catch {
      window.location.href = "https://pos.upendoapps.com";
    }
    return;
  }

  const user = getStoredUser();
  if (!user) {
    window.location.href = "https://pos.upendoapps.com";
    return;
  }
  setAdminUser(user);
  setChecked(true);
}, []);


  const fetchDashboard = useCallback(async () => {
    if (!adminUser?.id) return;
    setFetching(true); setError(null);
    try {
      const res  = await fetch(`/api/dashboard?admin_id=${adminUser.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError((e as Error).message || "Failed to load dashboard");
    } finally {
      setFetching(false);
    }
  }, [adminUser?.id]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const dater = new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).format(new Date());

  const weeklyRevenue = data?.weekly_revenue ?? [];
  const maxBar = weeklyRevenue.length > 0 ? Math.max(...weeklyRevenue.map(d => d.revenue), 1) : 1;

if (!checked) return (
  <div style={{
    minHeight: "100vh", display: "flex",
    alignItems: "center", justifyContent: "center",
    background: "#f5f4f0", gap: 10, color: "#9a9a8e", fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
  }}>
    <div style={{
      width: 18, height: 18,
      border: "2px solid #e2e0d8",
      borderTopColor: "#141410",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    Loading…
  </div>
);

  return (
    <>
      <header className="header">
        <div className="header-title">Overview</div>
        <div className="header-date">{dater}</div>
        <button
          onClick={fetchDashboard}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted, #9a9a8e)", padding: 4, display: "flex", alignItems: "center" }}
          title="Refresh"
        >
          <IconRefresh />
        </button>
        <Link
          href="/admin/download"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--muted, #9a9a8e)",
            padding: 4,
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#141410")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted, #9a9a8e)")}
          title="Download Desktop App"
        >
          <IconDownload />
        </Link>

        {/* ── Notification Bell ── stable shell prevents layout shift ── */}
        <div style={{ width: 36, height: 36, flexShrink: 0 }}>
          {adminUser?.id && <NotificationBell adminId={adminUser.id} />}
        </div>
      </header>

      <main className="main">

        {fetching ? <Spinner /> : error ? (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "1.25rem", color: "#dc2626", fontSize: 13, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#dc2626", flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {error}
          </div>
        ) : !data ? null : (<>

          {/* ── Stat cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
            {[
              { label: "Today's Revenue", value: usd(data.revenue_today),  change: usd(data.revenue_week) + " this week", up: true,                          icon: <IconRevenue  />, color: "#d4522a", bg: "#fff4f0" },
              { label: "Orders Today",    value: data.orders_today,         change: `${data.orders_pending} pending`,      up: data.orders_pending === 0,     icon: <IconOrders   />, color: "#2563eb", bg: "#eff6ff" },
              { label: "Active Staff",    value: data.active_staff,         change: "on shift",                            up: true,                          icon: <IconStaff    />, color: "#16a34a", bg: "#f0fdf4" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: 12, color: "#9a9a8e" }}>{s.label}</span>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>
                    {s.icon}
                  </div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.5px", marginBottom: 6 }}>{s.value}</div>
                <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, color: s.up ? "#16a34a" : "#d97706" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {s.up ? (
                      <>
                        <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                      </>
                    ) : (
                      <>
                        <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                      </>
                    )}
                  </svg>
                  <span>{s.change}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Secondary stats + Promotional Ad ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
            {[
              { label: "Total Customers", value: data.total_customers,  icon: <IconCustomers />, color: "#16a34a", bg: "#f0fdf4" },
              { label: "Low Stock Items", value: data.low_stock_count,   icon: <IconBox       />, color: data.low_stock_count > 0 ? "#d97706" : "#9a9a8e", bg: data.low_stock_count > 0 ? "#fffbeb" : "#f5f4f0" },
              { label: "Week Revenue",    value: usd(data.revenue_week), icon: <IconTrend     />, color: "#2563eb", bg: "#eff6ff" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.5px" }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>


          {/* ── Weekly chart + Payment methods ── */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
            <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid #e2e0d8" }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Weekly Revenue</span>
                <span style={{ fontSize: 12, color: "#9a9a8e" }}>{usd(data.revenue_week)} total</span>
              </div>
              <div style={{ padding: "1.25rem" }}>
                 <WeeklyRevenueChart
                   data={data.weekly_revenue}
                   formatCurrency={usd}
                  />
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e0d8" }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Payment Methods</span>
              </div>
              <div style={{ padding: "1.25rem" }}>
                {(data.payment_methods ?? []).length === 0 ? (
                  <div style={{ textAlign: "center", color: "#9a9a8e", fontSize: 13, padding: "1rem" }}>No payment data.</div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                    <DonutChart data={data.payment_methods} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                      {(data.payment_methods ?? []).map(m => (
                        <div key={m.method} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: METHOD_COLOR[m.method] ?? "#9a9a8e", flexShrink: 0 }} />
                          <span style={{ flex: 1, color: "#4a4a40", textTransform: "capitalize" }}>{m.method}</span>
                          <span style={{ fontWeight: 500 }}>{m.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Recent orders + Activity ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid #e2e0d8" }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Recent Orders</span>
                <Link href="/admin/orders" style={{ fontSize: 12, color: "#d4522a", textDecoration: "none" }}>View all</Link>
              </div>
              {(data.recent_orders ?? []).length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>No orders yet.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Order", "Customer", "Total", "Status"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "0.55rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#fafaf8" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.recent_orders ?? []).map(o => {
                      const cfg = STATUS_CFG[o.status] ?? STATUS_CFG.pending;
                      return (
                        <tr key={o.id} style={{ borderBottom: "1px solid #e2e0d8" }}
                          onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"}
                          onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}>
                          <td style={{ padding: "0.75rem 1.25rem", fontWeight: 500, color: "#141410", fontFamily: "monospace", fontSize: 12 }}>{o.order_number}</td>
                          <td style={{ padding: "0.75rem 1.25rem", color: "#4a4a40" }}>{o.customer_name}</td>
                          <td style={{ padding: "0.75rem 1.25rem", fontWeight: 500, color: "#141410" }}>{usd(o.total)}</td>
                          <td style={{ padding: "0.75rem 1.25rem" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 500, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot }} />
                              {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid #e2e0d8" }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Activity Feed</span>
                <span style={{ fontSize: 12, color: "#9a9a8e" }}>Live</span>
              </div>
              {(data.activity ?? []).length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>No activity yet.</div>
              ) : (
                <div>
                  {(data.activity ?? []).map((a, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "0.75rem 1.25rem", borderBottom: i < (data.activity ?? []).length - 1 ? "1px solid #e2e0d8" : "none" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, marginTop: 4, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 13, color: "#4a4a40", lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: a.message }} />
                      <div style={{ fontSize: 11, color: "#9a9a8e", whiteSpace: "nowrap", flexShrink: 0 }}>{a.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Top products ── */}
          <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid #e2e0d8" }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Top Products</span>
             <Link href="/admin/inventory" style={{ fontSize: 12, color: "#d4522a", textDecoration: "none" }}>Manage inventory</Link>
            </div>
            {(data.top_products ?? []).length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>No product sales yet.</div>
            ) : (
              <div>
                {(data.top_products ?? []).map((p, i) => (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "0.85rem 1.25rem", borderBottom: i < (data.top_products ?? []).length - 1 ? "1px solid #e2e0d8" : "none" }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#fafaf8"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ""}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#9a9a8e", flexShrink: 0 }}>
                      #{i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#141410" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "#9a9a8e" }}>{p.category}{p.sku ? ` · ${p.sku}` : ""} · {p.units_sold} sold</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#141410" }}>{usd(p.revenue)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </>)}
      </main>
    </>
  );
}