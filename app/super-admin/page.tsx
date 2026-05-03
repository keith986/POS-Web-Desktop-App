"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ── SVG Icons ── */
const Icons = {
  Users: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Store: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Staff: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Package: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  Clock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Cart: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  ),
  Revenue: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Bell: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Terminal: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
  ),
  Refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
  Logout: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Overview: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Link: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  Globe: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  CreditCard: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  Analytics: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  Trash: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
  Ban: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  ),
  Activate: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Server: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
      <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>
  ),
  MousePointer: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
      <path d="M13 13l6 6"/>
    </svg>
  ),
  Eye: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  DomainOff: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M4.93 4.93l14.14 14.14"/>
    </svg>
  ),
};

/* ── Types ── */
interface Stats {
  userCount: number; staffCount: number; orderCount: number;
  activeUsers: number; pendingUsers: number; activeStaff: number;
  todayOrders: number; totalRevenue: number;
  totalDomains: number; activeDomains: number;
  totalVisits: number; totalClicks: number;
}
interface User {
  id: string; full_name: string; email: string; role: string;
  store_name: string; domain: string; subdomain_url: string;
  subdomain_status: string; pos_type: string; created_at: string;
}
interface Staff {
  id: string; full_name: string; email: string; shift_role: string;
  status: string; last_login: string; created_at: string;
  store_name: string; domain: string;
}
interface Order {
  id: string; status: string; total: number; created_at: string;
  admin_id: string; store_name: string; domain: string;
  payment_status: string; staff_name: string;
}
interface Notification {
  title: string; message: string; type: string;
  created_at: string; full_name: string; email: string; domain: string;
}
interface Log {
  id: string; type: string; title: string; message: string;
  created_at: string; domain: string; store_name: string;
}
interface DomainStat {
  domain: string; store_name: string; status: string;
  requests: number; bytes: number; errors: number;
  last_seen: string; visits: number; clicks: number;
  user_id: string; user_email: string;
}
interface Payment {
  id: string; store_name: string; domain: string;
  amount: number; status: string; payment_method: string;
  reference: string; created_at: string; user_email: string;
  plan: string;
}
interface AnalyticsSummary {
  domain: string; store_name: string;
  total_visits: number; total_clicks: number;
  unique_visitors: number; last_visit: string;
}

/* ── Helpers ── */
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active:    { bg: "#dcfce7", color: "#16a34a" },
  pending:   { bg: "#fef3c7", color: "#d97706" },
  completed: { bg: "#dcfce7", color: "#16a34a" },
  cancelled: { bg: "#fee2e2", color: "#dc2626" },
  refunded:  { bg: "#ede9fe", color: "#7c3aed" },
  inactive:  { bg: "#fee2e2", color: "#dc2626" },
  login:     { bg: "#dbeafe", color: "#1d4ed8" },
  error:     { bg: "#fee2e2", color: "#dc2626" },
  warning:   { bg: "#fef3c7", color: "#d97706" },
  signup:    { bg: "#f3e8ff", color: "#7c3aed" },
  info:      { bg: "#f0fdf4", color: "#16a34a" },
  paid:      { bg: "#dcfce7", color: "#16a34a" },
  unpaid:    { bg: "#fee2e2", color: "#dc2626" },
  failed:    { bg: "#fee2e2", color: "#dc2626" },
  healthy:   { bg: "#dcfce7", color: "#16a34a" },
  down:      { bg: "#fee2e2", color: "#dc2626" },
};

function Badge({ status }: { status: string }) {
  const s = STATUS_COLORS[status?.toLowerCase()] ?? { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{
      padding: "2px 9px", borderRadius: 20, fontSize: 11,
      fontWeight: 600, background: s.bg, color: s.color,
      textTransform: "capitalize", whiteSpace: "nowrap"
    }}>{status}</span>
  );
}

function Th({ children }: { children: string }) {
  return (
    <th style={{
      padding: "9px 14px", textAlign: "left", fontSize: 10,
      fontWeight: 700, color: "#6b7280", textTransform: "uppercase",
      letterSpacing: "0.6px", whiteSpace: "nowrap", background: "#f9fafb",
      borderBottom: "1px solid #e5e7eb"
    }}>{children}</th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "11px 14px", fontSize: 13, color: "#374151", ...style }}>{children}</td>;
}

/* ── Mini bar chart ── */
function MiniBar({ value, max, color = "#d4522a" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 11, color: "#6b7280", minWidth: 36, textAlign: "right" }}>
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
      </span>
    </div>
  );
}

/* ── Confirm modal ── */
function ConfirmModal({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: "1.75rem 2rem",
        maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)"
      }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: "1.5rem", lineHeight: 1.5, color: "#111827" }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            padding: "8px 18px", borderRadius: 7, border: "1px solid #e2e0d8",
            background: "#fff", cursor: "pointer", fontSize: 13, color: "#374151"
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: "8px 18px", borderRadius: 7, border: "none",
            background: "#dc2626", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600
          }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { key: "overview",  label: "Overview",  Icon: Icons.Overview    },
  { key: "users",     label: "Users",     Icon: Icons.Users       },
  { key: "staff",     label: "Staff",     Icon: Icons.Staff       },
  { key: "orders",    label: "Orders",    Icon: Icons.Package     },
  { key: "payments",  label: "Payments",  Icon: Icons.CreditCard  },
  { key: "domains",   label: "Domains",   Icon: Icons.Globe       },
  { key: "analytics", label: "Analytics", Icon: Icons.Analytics   },
  { key: "activity",  label: "Activity",  Icon: Icons.Bell        },
  { key: "logs",      label: "Logs",      Icon: Icons.Terminal    },
];

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab]       = useState("overview");
  const [stats, setStats]               = useState<Stats | null>(null);
  const [users, setUsers]               = useState<User[]>([]);
  const [staff, setStaff]               = useState<Staff[]>([]);
  const [orders, setOrders]             = useState<Order[]>([]);
  const [notifications, setNotifs]      = useState<Notification[]>([]);
  const [logs, setLogs]                 = useState<Log[]>([]);
  const [domains, setDomains]           = useState<DomainStat[]>([]);
  const [payments, setPayments]         = useState<Payment[]>([]);
  const [analytics, setAnalytics]       = useState<AnalyticsSummary[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [orderFilter, setOrderFilter]   = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [autoRefresh, setAutoRefresh]   = useState(false);
  const [confirm, setConfirm]           = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [actionMsg, setActionMsg]       = useState<{ text: string; ok: boolean } | null>(null);

  /* Auth guard */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || user.email !== "admin@postore.app") router.push("/login");
  }, [router]);

  /* Flash message helper */
  const flash = (text: string, ok = true) => {
    setActionMsg({ text, ok });
    setTimeout(() => setActionMsg(null), 3500);
  };

  /* Fetch */
  const fetchData = useCallback(async (section: string) => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const res  = await fetch(`/api/admin/super?section=${section}`, {
        headers: { Authorization: `Bearer ${user?.id}` },
      });
      const data = await res.json();
      if (section === "overview")  setStats(data);
      if (section === "users")     setUsers(data.users      ?? []);
      if (section === "staff")     setStaff(data.staff      ?? []);
      if (section === "orders")    setOrders(data.orders    ?? []);
      if (section === "activity")  setNotifs(data.notifications ?? []);
      if (section === "logs")      setLogs(data.logs        ?? []);
      if (section === "domains")   setDomains(data.domains  ?? []);
      if (section === "payments")  setPayments(data.payments ?? []);
      if (section === "analytics") setAnalytics(data.analytics ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(activeTab); }, [activeTab, fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchData(activeTab), 30000);
    return () => clearInterval(id);
  }, [autoRefresh, activeTab, fetchData]);

  /* ── Admin action handler ── */
  const adminAction = async (action: string, userId: string, extra?: Record<string, string>) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const res  = await fetch("/api/admin/super", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.id}`,
        },
        body: JSON.stringify({ action, userId, ...extra }),
      });
      const data = await res.json();
      if (data.success) {
        flash(data.message || "Action completed");
        fetchData(activeTab);
      } else {
        flash(data.error || "Action failed", false);
      }
    } catch {
      flash("Network error", false);
    }
  };

  const askConfirm = (message: string, fn: () => void) =>
    setConfirm({ message, onConfirm: () => { setConfirm(null); fn(); } });

  /* Filtered lists */
  const match = (v: string | undefined) =>
    !search || v?.toLowerCase().includes(search.toLowerCase());

  const filteredUsers  = users.filter(u => match(u.full_name) || match(u.email) || match(u.domain));
  const filteredStaff  = staff.filter(s => match(s.full_name) || match(s.email) || match(s.domain));
  const filteredOrders = orders
    .filter(o => orderFilter === "all" || o.status === orderFilter)
    .filter(o => match(o.store_name) || match(o.domain) || match(o.id));
  const filteredPayments = payments
    .filter(p => paymentFilter === "all" || p.status === paymentFilter)
    .filter(p => match(p.store_name) || match(p.domain) || match(p.reference));
  const filteredDomains  = domains.filter(d => match(d.domain) || match(d.store_name));
  const filteredAnalytics = analytics.filter(a => match(a.domain) || match(a.store_name));

  const maxRequests = Math.max(...domains.map(d => d.requests), 1);
  const maxVisits   = Math.max(...analytics.map(a => a.total_visits), 1);
  const maxClicks   = Math.max(...analytics.map(a => a.total_clicks), 1);

  /* ── LOG line color ── */
  const logColor: Record<string, string> = {
    login: "#22d3ee", error: "#f87171",
    warning: "#fbbf24", signup: "#a78bfa", info: "#4ade80",
  };

  /* ── Action buttons ── */
  const ActionBtn = ({
    label, color, onClick, icon
  }: { label: string; color: string; onClick: () => void; icon: React.ReactNode }) => (
    <button
      onClick={onClick}
      title={label}
      style={{
        background: "transparent", border: `1px solid ${color}`,
        color, padding: "4px 8px", borderRadius: 5, cursor: "pointer",
        fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4,
        fontWeight: 500, whiteSpace: "nowrap",
        transition: "all 0.15s"
      }}
    >{icon}{label}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4f0", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Confirm modal ── */}
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {/* ── Flash message ── */}
      {actionMsg && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 999,
          background: actionMsg.ok ? "#16a34a" : "#dc2626",
          color: "#fff", padding: "12px 20px", borderRadius: 8,
          fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          animation: "slideUp 0.25s ease"
        }}>
          {actionMsg.text}
        </div>
      )}

      {/* ══ HEADER ══ */}
      <div style={{
        background: "#141410", color: "#fff",
        padding: "0.75rem 2rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.4)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 34, height: 34, background: "#d4522a", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 15, color: "#fff"
          }}>S</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Super Admin</div>
            <div style={{ fontSize: 11, color: "#9a9a8e" }}>upendoapps.com platform</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9a9a8e", cursor: "pointer" }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto-refresh
          </label>
          <button onClick={() => fetchData(activeTab)} style={{
            background: "#2a2a22", border: "1px solid #3a3a32",
            color: "#fff", padding: "6px 12px", borderRadius: 6,
            cursor: "pointer", fontSize: 12,
            display: "flex", alignItems: "center", gap: 5
          }}><Icons.Refresh /> Refresh</button>
          <button onClick={() => { localStorage.removeItem("user"); router.push("/login"); }} style={{
            background: "transparent", border: "1px solid #444",
            color: "#fff", padding: "6px 14px", borderRadius: 6,
            cursor: "pointer", fontSize: 13,
            display: "flex", alignItems: "center", gap: 5
          }}><Icons.Logout /> Logout</button>
        </div>
      </div>

      {/* ══ TABS ══ */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e2e0d8",
        padding: "0 2rem", display: "flex", gap: 0, overflowX: "auto"
      }}>
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => { setActiveTab(key); setSearch(""); }} style={{
            padding: "12px 16px", background: "transparent", border: "none",
            borderBottom: activeTab === key ? "2px solid #d4522a" : "2px solid transparent",
            color: activeTab === key ? "#d4522a" : "#6b7280",
            fontWeight: activeTab === key ? 600 : 400,
            cursor: "pointer", fontSize: 13,
            display: "flex", alignItems: "center", gap: 6,
            whiteSpace: "nowrap", transition: "color 0.15s"
          }}>
            <Icon />{label}
          </button>
        ))}
      </div>

      {/* ══ CONTENT ══ */}
      <div style={{ padding: "1.75rem 2rem", maxWidth: 1500, margin: "0 auto" }}>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && stats && !loading && (
          <div>
            <h2 style={{ marginBottom: "1.25rem", fontWeight: 600, fontSize: 18, color: "#111827" }}>Platform Overview</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 }}>
              {[
                { label: "Total Users",    value: stats.userCount,    color: "#3b82f6", Icon: Icons.Users        },
                { label: "Active Stores",  value: stats.activeUsers,  color: "#10b981", Icon: Icons.Store        },
                { label: "Staff Members",  value: stats.staffCount,   color: "#8b5cf6", Icon: Icons.Staff        },
                { label: "Total Orders",   value: stats.orderCount,   color: "#f59e0b", Icon: Icons.Package      },
                { label: "Pending Stores", value: stats.pendingUsers, color: "#ef4444", Icon: Icons.Clock        },
                { label: "Active Staff",   value: stats.activeStaff,  color: "#06b6d4", Icon: Icons.Check        },
                { label: "Today Orders",   value: stats.todayOrders,  color: "#f97316", Icon: Icons.Cart         },
                { label: "Total Revenue",  value: `KES ${Number(stats.totalRevenue).toLocaleString()}`, color: "#16a34a", Icon: Icons.Revenue },
                { label: "Total Domains",  value: stats.totalDomains  ?? 0, color: "#6366f1", Icon: Icons.Globe  },
                { label: "Active Domains", value: stats.activeDomains ?? 0, color: "#0891b2", Icon: Icons.Server },
                { label: "Total Visits",   value: (stats.totalVisits ?? 0).toLocaleString(),  color: "#7c3aed", Icon: Icons.Eye           },
                { label: "Total Clicks",   value: (stats.totalClicks ?? 0).toLocaleString(),  color: "#be185d", Icon: Icons.MousePointer  },
              ].map(s => (
                <div key={s.label} style={{
                  background: "#fff", borderRadius: 10, padding: "1.1rem",
                  border: "1px solid #e2e0d8"
                }}>
                  <div style={{ color: s.color, marginBottom: 8 }}><s.Icon /></div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SEARCH + FILTER bar ── */}
        {activeTab !== "overview" && (
          <div style={{ marginBottom: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>
                <Icons.Search />
              </div>
              <input
                placeholder={`Search ${activeTab}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: "9px 14px 9px 34px", borderRadius: 7,
                  border: "1px solid #e2e0d8", width: 260,
                  fontSize: 13, background: "#fff", outline: "none"
                }}
              />
            </div>

            {activeTab === "orders" && (
              <select value={orderFilter} onChange={e => setOrderFilter(e.target.value)} style={{
                padding: "9px 12px", borderRadius: 7, border: "1px solid #e2e0d8",
                fontSize: 13, background: "#fff", outline: "none", cursor: "pointer"
              }}>
                {["all", "pending", "completed", "cancelled", "refunded"].map(f => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            )}

            {activeTab === "payments" && (
              <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} style={{
                padding: "9px 12px", borderRadius: 7, border: "1px solid #e2e0d8",
                fontSize: 13, background: "#fff", outline: "none", cursor: "pointer"
              }}>
                {["all", "paid", "unpaid", "failed", "pending"].map(f => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            )}

            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              {activeTab === "users"     && `${filteredUsers.length} users`}
              {activeTab === "staff"     && `${filteredStaff.length} staff`}
              {activeTab === "orders"    && `${filteredOrders.length} orders`}
              {activeTab === "payments"  && `${filteredPayments.length} payments`}
              {activeTab === "domains"   && `${filteredDomains.length} domains`}
              {activeTab === "analytics" && `${filteredAnalytics.length} sites`}
            </span>
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === "users" && !loading && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e2e0d8", fontWeight: 600, fontSize: 14 }}>
              All Users ({filteredUsers.length})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Name","Email","Store","Domain","POS","Status","Joined","Actions"].map(h => <Th key={h}>{h}</Th>)}</tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <tr key={u.id} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <Td style={{ fontWeight: 500 }}>{u.full_name}</Td>
                      <Td style={{ color: "#6b7280" }}>{u.email}</Td>
                      <Td>{u.store_name || "—"}</Td>
                      <Td>
                        {u.domain ? (
                          <a href={`https://${u.domain}.upendoapps.com`} target="_blank" rel="noreferrer"
                            style={{ color: "#d4522a", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                            {u.domain} <Icons.Link />
                          </a>
                        ) : "—"}
                      </Td>
                      <Td>{u.pos_type || "—"}</Td>
                      <Td><Badge status={u.subdomain_status || "pending"} /></Td>
                      <Td style={{ color: "#9ca3af" }}>{new Date(u.created_at).toLocaleDateString()}</Td>
                      <Td>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {u.subdomain_status !== "active" ? (
                            <ActionBtn
                              label="Activate" color="#16a34a" icon={<Icons.Activate />}
                              onClick={() => askConfirm(`Activate ${u.full_name}'s account?`, () =>
                                adminAction("activate_user", u.id)
                              )}
                            />
                          ) : (
                            <ActionBtn
                              label="Deactivate" color="#d97706" icon={<Icons.Ban />}
                              onClick={() => askConfirm(`Deactivate ${u.full_name}'s account? They won't be able to log in.`, () =>
                                adminAction("deactivate_user", u.id)
                              )}
                            />
                          )}
                          {u.domain && (
                            <ActionBtn
                              label="Del Domain" color="#7c3aed" icon={<Icons.DomainOff />}
                              onClick={() => askConfirm(`Delete domain "${u.domain}.upendoapps.com"? This cannot be undone.`, () =>
                                adminAction("delete_domain", u.id, { domain: u.domain })
                              )}
                            />
                          )}
                          <ActionBtn
                            label="Delete" color="#dc2626" icon={<Icons.Trash />}
                            onClick={() => askConfirm(`Permanently delete ${u.full_name}? All their data will be removed.`, () =>
                              adminAction("delete_user", u.id)
                            )}
                          />
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── STAFF ── */}
        {activeTab === "staff" && !loading && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e2e0d8", fontWeight: 600, fontSize: 14 }}>
              All Staff ({filteredStaff.length})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Name","Email","Role","Store","Status","Last Login","Joined","Actions"].map(h => <Th key={h}>{h}</Th>)}</tr>
                </thead>
                <tbody>
                  {filteredStaff.map((s, i) => (
                    <tr key={s.id} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <Td style={{ fontWeight: 500 }}>{s.full_name}</Td>
                      <Td style={{ color: "#6b7280" }}>{s.email}</Td>
                      <Td>{s.shift_role || "staff"}</Td>
                      <Td>
                        <div>{s.store_name || "—"}</div>
                        {s.domain && <div style={{ fontSize: 11, color: "#9ca3af" }}>{s.domain}.upendoapps.com</div>}
                      </Td>
                      <Td><Badge status={s.status} /></Td>
                      <Td style={{ color: "#9ca3af" }}>{s.last_login ? new Date(s.last_login).toLocaleString() : "Never"}</Td>
                      <Td style={{ color: "#9ca3af" }}>{new Date(s.created_at).toLocaleDateString()}</Td>
                      <Td>
                        <div style={{ display: "flex", gap: 5 }}>
                          {s.status !== "active" ? (
                            <ActionBtn label="Activate" color="#16a34a" icon={<Icons.Activate />}
                              onClick={() => askConfirm(`Activate ${s.full_name}?`, () => adminAction("activate_staff", s.id))} />
                          ) : (
                            <ActionBtn label="Deactivate" color="#d97706" icon={<Icons.Ban />}
                              onClick={() => askConfirm(`Deactivate ${s.full_name}?`, () => adminAction("deactivate_staff", s.id))} />
                          )}
                          <ActionBtn label="Delete" color="#dc2626" icon={<Icons.Trash />}
                            onClick={() => askConfirm(`Delete staff member ${s.full_name}?`, () => adminAction("delete_staff", s.id))} />
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ORDERS ── */}
        {activeTab === "orders" && !loading && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e2e0d8", fontWeight: 600, fontSize: 14 }}>
              All Orders ({filteredOrders.length})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Order ID","Store","Domain","Total","Status","Payment","Staff","Date"].map(h => <Th key={h}>{h}</Th>)}</tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>No orders found</td></tr>
                  ) : filteredOrders.map((o, i) => (
                    <tr key={o.id} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <Td style={{ fontFamily: "monospace", fontSize: 11, color: "#6b7280" }}>{o.id.slice(0, 8)}…</Td>
                      <Td style={{ fontWeight: 500 }}>{o.store_name || "—"}</Td>
                      <Td>
                        {o.domain ? (
                          <a href={`https://${o.domain}.upendoapps.com`} target="_blank" rel="noreferrer"
                            style={{ color: "#d4522a", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                            {o.domain} <Icons.Link />
                          </a>
                        ) : "—"}
                      </Td>
                      <Td style={{ fontWeight: 600, color: "#16a34a" }}>KES {Number(o.total || 0).toLocaleString()}</Td>
                      <Td><Badge status={o.status || "pending"} /></Td>
                      <Td><Badge status={o.payment_status || "pending"} /></Td>
                      <Td style={{ color: "#6b7280" }}>{o.staff_name || "—"}</Td>
                      <Td style={{ color: "#9ca3af", whiteSpace: "nowrap" }}>{new Date(o.created_at).toLocaleString()}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PAYMENTS ── */}
        {activeTab === "payments" && !loading && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e2e0d8", fontWeight: 600, fontSize: 14 }}>
              Payment Records ({filteredPayments.length})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Store","Domain","Email","Amount","Plan","Method","Reference","Status","Date","Actions"].map(h => <Th key={h}>{h}</Th>)}</tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>No payment records</td></tr>
                  ) : filteredPayments.map((p, i) => (
                    <tr key={p.id} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <Td style={{ fontWeight: 500 }}>{p.store_name || "—"}</Td>
                      <Td style={{ fontSize: 12, color: "#6b7280" }}>{p.domain || "—"}</Td>
                      <Td style={{ fontSize: 12, color: "#6b7280" }}>{p.user_email || "—"}</Td>
                      <Td style={{ fontWeight: 600, color: "#16a34a" }}>KES {Number(p.amount || 0).toLocaleString()}</Td>
                      <Td>{p.plan || "—"}</Td>
                      <Td style={{ textTransform: "capitalize" }}>{p.payment_method || "—"}</Td>
                      <Td style={{ fontFamily: "monospace", fontSize: 11 }}>{p.reference || "—"}</Td>
                      <Td><Badge status={p.status || "pending"} /></Td>
                      <Td style={{ color: "#9ca3af", whiteSpace: "nowrap" }}>{new Date(p.created_at).toLocaleString()}</Td>
                      <Td>
                        <div style={{ display: "flex", gap: 5 }}>
                          {p.status !== "paid" && (
                            <ActionBtn label="Mark Paid" color="#16a34a" icon={<Icons.Check />}
                              onClick={() => askConfirm(`Mark payment ${p.reference} as paid?`, () =>
                                adminAction("mark_payment_paid", p.id)
                              )} />
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DOMAINS (Nginx stats) ── */}
        {activeTab === "domains" && !loading && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Domain Health — Nginx Stats ({filteredDomains.length})</div>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>Parsed from /var/log/nginx/access.log</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Domain","Store","Status","Requests","Errors","Data Served","Last Active","Visits","Clicks","Actions"].map(h => <Th key={h}>{h}</Th>)}</tr>
                </thead>
                <tbody>
                  {filteredDomains.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>No domain data available</td></tr>
                  ) : filteredDomains.map((d, i) => (
                    <tr key={d.domain} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <Td>
                        <a href={`https://${d.domain}.upendoapps.com`} target="_blank" rel="noreferrer"
                          style={{ color: "#d4522a", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500 }}>
                          {d.domain} <Icons.Link />
                        </a>
                      </Td>
                      <Td>{d.store_name || "—"}</Td>
                      <Td>
                        <Badge status={d.status === "active" ? "active" : "inactive"} />
                      </Td>
                      <Td style={{ minWidth: 140 }}>
                        <MiniBar value={d.requests} max={maxRequests} color="#3b82f6" />
                      </Td>
                      <Td style={{ color: d.errors > 0 ? "#dc2626" : "#6b7280" }}>{d.errors}</Td>
                      <Td style={{ color: "#6b7280", fontSize: 12 }}>
                        {d.bytes >= 1048576
                          ? `${(d.bytes / 1048576).toFixed(1)} MB`
                          : `${(d.bytes / 1024).toFixed(1)} KB`}
                      </Td>
                      <Td style={{ color: "#9ca3af", fontSize: 12, whiteSpace: "nowrap" }}>
                        {d.last_seen ? new Date(d.last_seen).toLocaleString() : "—"}
                      </Td>
                      <Td style={{ color: "#7c3aed" }}>{(d.visits || 0).toLocaleString()}</Td>
                      <Td style={{ color: "#be185d" }}>{(d.clicks || 0).toLocaleString()}</Td>
                      <Td>
                        <div style={{ display: "flex", gap: 5 }}>
                          <ActionBtn label="Del Domain" color="#7c3aed" icon={<Icons.DomainOff />}
                            onClick={() => askConfirm(`Delete domain "${d.domain}.upendoapps.com"?`, () =>
                              adminAction("delete_domain", d.user_id, { domain: d.domain })
                            )} />
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {activeTab === "analytics" && !loading && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Visits",   value: analytics.reduce((s, a) => s + a.total_visits, 0).toLocaleString(),  color: "#7c3aed", Icon: Icons.Eye           },
                { label: "Total Clicks",   value: analytics.reduce((s, a) => s + a.total_clicks, 0).toLocaleString(),  color: "#be185d", Icon: Icons.MousePointer  },
                { label: "Active Sites",   value: analytics.filter(a => a.total_visits > 0).length,                    color: "#10b981", Icon: Icons.Store         },
              ].map(s => (
                <div key={s.label} style={{ background: "#fff", borderRadius: 10, padding: "1rem", border: "1px solid #e2e0d8" }}>
                  <div style={{ color: s.color, marginBottom: 6 }}><s.Icon /></div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e2e0d8", fontWeight: 600, fontSize: 14 }}>
                Site Analytics — Visits &amp; Clicks per Domain
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>{["Domain","Store","Total Visits","Total Clicks","Unique Visitors","Last Visit"].map(h => <Th key={h}>{h}</Th>)}</tr>
                  </thead>
                  <tbody>
                    {filteredAnalytics.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>No analytics data yet</td></tr>
                    ) : filteredAnalytics.sort((a, b) => b.total_visits - a.total_visits).map((a, i) => (
                      <tr key={a.domain} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <Td>
                          <a href={`https://${a.domain}.upendoapps.com`} target="_blank" rel="noreferrer"
                            style={{ color: "#d4522a", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500 }}>
                            {a.domain} <Icons.Link />
                          </a>
                        </Td>
                        <Td>{a.store_name || "—"}</Td>
                        <Td style={{ minWidth: 160 }}>
                          <MiniBar value={a.total_visits} max={maxVisits} color="#7c3aed" />
                        </Td>
                        <Td style={{ minWidth: 160 }}>
                          <MiniBar value={a.total_clicks} max={maxClicks} color="#be185d" />
                        </Td>
                        <Td style={{ color: "#6b7280" }}>{(a.unique_visitors || 0).toLocaleString()}</Td>
                        <Td style={{ color: "#9ca3af", whiteSpace: "nowrap" }}>
                          {a.last_visit ? new Date(a.last_visit).toLocaleString() : "—"}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIVITY ── */}
        {activeTab === "activity" && !loading && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e2e0d8", fontWeight: 600, fontSize: 14 }}>
              Recent Activity ({notifications.length})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Type","Title","Message","User","Store","Time"].map(h => <Th key={h}>{h}</Th>)}</tr>
                </thead>
                <tbody>
                  {notifications.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>No activity yet</td></tr>
                  ) : notifications.map((n, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <Td><Badge status={n.type || "info"} /></Td>
                      <Td style={{ fontWeight: 500 }}>{n.title}</Td>
                      <Td style={{ color: "#6b7280", maxWidth: 260 }}>{n.message}</Td>
                      <Td>
                        <div style={{ fontWeight: 500 }}>{n.full_name}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{n.email}</div>
                      </Td>
                      <Td style={{ color: "#d4522a", fontSize: 12 }}>
                        {n.domain ? `${n.domain}.upendoapps.com` : "—"}
                      </Td>
                      <Td style={{ color: "#9ca3af", whiteSpace: "nowrap" }}>{new Date(n.created_at).toLocaleString()}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LOGS ── */}
        {activeTab === "logs" && !loading && (
          <div style={{ background: "#0d1117", borderRadius: 12, overflow: "hidden", border: "1px solid #1f2428" }}>
            <div style={{
              padding: "1rem 1.5rem", borderBottom: "1px solid #1f2428",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#e6edf3", fontWeight: 600, fontSize: 14 }}>
                <Icons.Terminal /> Server Logs ({logs.length})
              </div>
              <span style={{ fontSize: 11, color: "#6e7681" }}>Last 100 entries</span>
            </div>
            <div style={{ padding: "1rem", maxHeight: 600, overflowY: "auto" }}>
              {logs.length === 0 ? (
                <div style={{ color: "#6e7681", textAlign: "center", padding: "2rem", fontFamily: "monospace" }}>$ no logs found</div>
              ) : logs.map((log, i) => (
                <div key={i} style={{
                  padding: "6px 0", borderBottom: "1px solid #161b22",
                  fontFamily: "'Fira Code', 'Courier New', monospace", fontSize: 12, lineHeight: 1.6
                }}>
                  <span style={{ color: "#484f58" }}>[{new Date(log.created_at).toLocaleString()}]</span>{" "}
                  <span style={{ color: logColor[log.type] ?? "#8b949e", fontWeight: 700 }}>[{log.type?.toUpperCase() ?? "INFO"}]</span>{" "}
                  <span style={{ color: "#79c0ff" }}>{log.domain ? `[${log.domain}]` : "[system]"}</span>{" "}
                  <span style={{ color: "#e6edf3" }}>{log.title}</span>
                  {log.message && (
                    <div style={{ color: "#8b949e", paddingLeft: 20, marginTop: 2 }}>└ {log.message}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "4rem", color: "#9ca3af" }}>
            <div style={{
              width: 30, height: 30, border: "3px solid #e2e0d8",
              borderTopColor: "#d4522a", borderRadius: "50%",
              animation: "spin 0.7s linear infinite", margin: "0 auto 10px"
            }} />
            <p style={{ fontSize: 13 }}>Loading {activeTab}…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes slideUp { from { transform: translateY(20px); opacity:0 } to { transform: translateY(0); opacity:1 } }`}</style>
          </div>
        )}

      </div>
    </div>
  );
}