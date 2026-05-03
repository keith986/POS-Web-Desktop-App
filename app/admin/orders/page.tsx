"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/app/_lib/StoreContext";

/* ── Types ── */
interface OrderItem {
  id:         string;
  product_id: string;
  name:       string;
  qty:        number;
  price:      number;
}

interface Order {
  id:           string;
  order_number: string;
  customer_id:  string | null;
  customer_name: string;
  customer_email: string;
  items:        OrderItem[];
  subtotal:     number;
  tax:          number;
  total:        number;
  status:       "pending" | "processing" | "completed" | "refunded" | "cancelled";
  payment_method: "card" | "cash" | "mobile";
  payment_status: "paid" | "pending" | "refunded";
  staff_name:   string | null;
  note:         string | null;
  admin_id:     string;
  created_at:   string;
  updated_at:   string;
}

interface ConfirmState {
  open:      boolean;
  title:     string;
  message:   string;
  danger:    boolean;
  onConfirm: () => void;
}

interface StoredUser {
  id:         string;
  full_name:  string;
  email:      string;
  role:       string;
  store_name: string | null;
}

type OrderStatus = Order["status"];

/* ── Helpers ── */
function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/* ── Status config ── */
const STATUS_CFG: Record<OrderStatus, { bg: string; color: string; border: string; label: string }> = {
  pending:    { bg: "#fffbeb", color: "#d97706", border: "#fde68a", label: "Pending"    },
  processing: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", label: "Processing" },
  completed:  { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", label: "Completed"  },
  refunded:   { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "Refunded"   },
  cancelled:  { bg: "#f5f4f0", color: "#9a9a8e", border: "#e2e0d8", label: "Cancelled"  },
};

const PAYMENT_CFG: Record<string, { bg: string; color: string; border: string }> = {
  paid:     { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  pending:  { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  refunded: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

/* ── Shared styles ── */
const fieldStyle: React.CSSProperties = {
  width: "100%", background: "#f5f4f0",
  border: "1px solid #c8c6bc", borderRadius: 8,
  padding: "9px 12px", color: "#141410",
  fontFamily: "inherit", fontSize: 14, outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 500,
  letterSpacing: "0.5px", textTransform: "uppercase",
  color: "#4a4a40", marginBottom: 5,
};

/* ── Toast ── */
function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div style={{
      position: "fixed", bottom: "2rem", right: "2rem",
      background: type === "error" ? "#dc2626" : "#141410",
      color: "#fff", padding: "0.85rem 1.25rem", borderRadius: 10,
      fontSize: 13, display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 8px 30px rgba(0,0,0,0.2)", animation: "toastIn 0.3s ease", zIndex: 1100,
    }}>
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        {type === "error"
          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        }
      </span>
      {msg}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

/* ── Confirm Modal ── */
function ConfirmModal({ state, onCancel }: { state: ConfirmState; onCancel: () => void }) {
  if (!state.open) return null;
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        background: "#fff", borderRadius: 14, padding: "1.75rem",
        width: "100%", maxWidth: 400, zIndex: 1001,
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)", animation: "slideUp 0.2s ease",
      }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: state.danger ? "#fef2f2" : "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: "1rem" }}>
          {state.danger ? <IconWarning /> : <IconPackage />}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{state.title}</div>
        <div style={{ fontSize: 13, color: "#9a9a8e", lineHeight: 1.6, marginBottom: "1.5rem" }}>{state.message}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "8px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => { state.onConfirm(); onCancel(); }} style={{ padding: "8px 18px", background: state.danger ? "#dc2626" : "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            {state.danger ? "Yes, proceed" : "Confirm"}
          </button>
        </div>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translate(-50%,-46%)}to{opacity:1;transform:translate(-50%,-50%)}}`}</style>
      </div>
    </>
  );
}

/* ── Spinner ── */
function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", color: "#9a9a8e", fontSize: 13, gap: 10 }}>
      <div style={{ width: 18, height: 18, border: "2px solid #e2e0d8", borderTopColor: "#141410", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      Loading orders…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── SVG Icons ── */
function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
    </svg>
  );
}
function IconCard() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}
function IconCash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
    </svg>
  );
}
function IconMobile() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
}
function IconNote() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}
function IconWarning() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function IconPackage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}

/* ── Payment method SVG map ── */
const PAYMENT_METHOD_SVG: Record<string, React.ReactNode> = {
  card:   <IconCard   />,
  cash:   <IconCash   />,
  mobile: <IconMobile />,
};

/* ── Status Badge ── */
function StatusBadge({ status }: { status: OrderStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 100, fontSize: 11, fontWeight: 500, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.color }} />
      {c.label}
    </span>
  );
}

/* ── Order Detail Panel ── */
function OrderPanel({
  open, onClose, order, onUpdateStatus, updating, formatCurrency, formatDateTime,
}: {
  open:            boolean;
  onClose:         () => void;
  order:           Order | null;
  onUpdateStatus:  (status: OrderStatus) => void;
  updating:        boolean;
  formatCurrency:  (n: number) => string;
  formatDateTime:  (d: string) => string;
}) {
  if (!open || !order) return null;

  const statusFlow: OrderStatus[] = ["pending", "processing", "completed"];
  const canAdvance = statusFlow.indexOf(order.status) < statusFlow.length - 1 && order.status !== "refunded" && order.status !== "cancelled";
  const nextStatus = statusFlow[statusFlow.indexOf(order.status) + 1] as OrderStatus | undefined;
  const payConfig  = PAYMENT_CFG[order.payment_status] ?? PAYMENT_CFG.pending;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 480,
        background: "#fff", zIndex: 901, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column", animation: "panelIn 0.25s ease",
      }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Order {order.order_number}</div>
            <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2 }}>{formatDateTime(order.created_at)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Status row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <StatusBadge status={order.status} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 100, fontSize: 11, fontWeight: 500, background: payConfig.bg, color: payConfig.color, border: `1px solid ${payConfig.border}` }}>
              {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
            </span>
          </div>

          {/* Customer */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem" }}>
            <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Customer</div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{order.customer_name}</div>
            <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2 }}>{order.customer_email}</div>
            {order.staff_name && <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2 }}>Served by: {order.staff_name}</div>}
          </div>

          {/* Items */}
          <div>
            <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Items</div>
            <div style={{ border: "1px solid #e2e0d8", borderRadius: 10, overflow: "hidden" }}>
              {order.items.map((item, i) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderBottom: i < order.items.length - 1 ? "1px solid #e2e0d8" : "none" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: "#9a9a8e" }}>×{item.qty} @ {formatCurrency(item.price)}</div>
                  </div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{formatCurrency(item.price * item.qty)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div style={{ border: "1px solid #e2e0d8", borderRadius: 10, overflow: "hidden" }}>
            {[
              { label: "Subtotal", value: formatCurrency(order.subtotal) },
              { label: "Tax",      value: formatCurrency(order.tax) },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.65rem 1rem", borderBottom: "1px solid #e2e0d8", fontSize: 13, color: "#4a4a40" }}>
                <span>{r.label}</span><span>{r.value}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.8rem 1rem", fontSize: 15, fontWeight: 600 }}>
              <span>Total</span><span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4a4a40" }}>
            <span style={{ display: "inline-flex", alignItems: "center", color: "#4a4a40" }}>
              {PAYMENT_METHOD_SVG[order.payment_method]}
            </span>
            Paid via <strong style={{ color: "#141410" }}>{order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1)}</strong>
          </div>

          {/* Note */}
          {order.note && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "0.75rem 1rem", fontSize: 12, color: "#92400e" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IconNote /> {order.note}
              </span>
            </div>
          )}

          {/* Status actions */}
          <div style={{ borderTop: "1px solid #e2e0d8", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Update Status</div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {canAdvance && nextStatus && (
                <button
                  onClick={() => onUpdateStatus(nextStatus)}
                  disabled={updating}
                  style={{ padding: "8px 16px", background: "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: updating ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: updating ? 0.6 : 1 }}
                >
                  {updating ? "Updating…" : `Mark as ${STATUS_CFG[nextStatus].label}`}
                </button>
              )}

              {order.status !== "refunded" && order.status !== "cancelled" && order.status !== "completed" && (
                <button
                  onClick={() => onUpdateStatus("cancelled")}
                  disabled={updating}
                  style={{ padding: "8px 16px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, cursor: updating ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                >
                  Cancel Order
                </button>
              )}

              {order.status === "completed" && order.payment_status === "paid" && (
                <button
                  onClick={() => onUpdateStatus("refunded")}
                  disabled={updating}
                  style={{ padding: "8px 16px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, cursor: updating ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                >
                  Issue Refund
                </button>
              )}
            </div>

            {(order.status === "completed" || order.status === "refunded" || order.status === "cancelled") && (
              <div style={{ fontSize: 12, color: "#9a9a8e", fontStyle: "italic" }}>
                This order is {order.status} — no further status changes available.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function AdminOrdersPage() {
  const [adminUser]  = useState<StoredUser | null>(getStoredUser);
  const { formatCurrency, formatDate, formatDateTime } = useStore();
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [fetching,   setFetching]   = useState(true);
  const [updating,   setUpdating]   = useState(false);
  const [search,     setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [methodFilter, setMethodFilter] = useState<"all" | "card" | "cash" | "mobile">("all");
  const [selected,   setSelected]   = useState<Order | null>(null);
  const [panelOpen,  setPanelOpen]  = useState(false);
  const [toast,      setToast]      = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirm,    setConfirm]    = useState<ConfirmState>({ open: false, title: "", message: "", danger: false, onConfirm: () => {} });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openConfirm = (title: string, message: string, danger: boolean, onConfirm: () => void) =>
    setConfirm({ open: true, title, message, danger, onConfirm });
  const closeConfirm = () => setConfirm(c => ({ ...c, open: false }));

  /* ── Fetch orders ── */
  const fetchOrders = useCallback(async () => {
    if (!adminUser?.id) return;
    setFetching(true);
    try {
      const res  = await fetch(`/api/orders?admin_id=${adminUser.id}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      showToast("Failed to load orders", "error");
    } finally {
      setFetching(false);
    }
  }, [adminUser?.id]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* ── Update order status ── */
  const handleUpdateStatus = (order: Order, newStatus: OrderStatus) => {
    const cfg = STATUS_CFG[newStatus];
    openConfirm(
      `Mark as ${cfg.label}`,
      `Update order ${order.order_number} to "${cfg.label}"?`,
      newStatus === "cancelled" || newStatus === "refunded",
      async () => {
        setUpdating(true);
        try {
          const res = await fetch(`/api/orders/${order.id}/status`, {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ status: newStatus, admin_id: adminUser?.id }),
          });
          if (!res.ok) throw new Error("Failed");
          showToast(`Order ${order.order_number} marked as ${cfg.label}`);
          // Update local state immediately
          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
          if (selected?.id === order.id) setSelected(o => o ? { ...o, status: newStatus } : o);
        } catch {
          showToast("Failed to update status", "error");
        } finally {
          setUpdating(false);
        }
      }
    );
  };

  /* ── Filtered ── */
  const filtered = orders.filter(o => {
    const matchSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchMethod = methodFilter === "all" || o.payment_method === methodFilter;
    return matchSearch && matchStatus && matchMethod;
  });

  /* ── Stats ── */
  const totalRevenue  = orders.filter(o => o.payment_status === "paid").reduce((s, o) => s + o.total, 0);
  const pendingCount  = orders.filter(o => o.status === "pending").length;
  const completedCount = orders.filter(o => o.status === "completed").length;
  const refundedTotal = orders.filter(o => o.status === "refunded").reduce((s, o) => s + o.total, 0);

  const dater = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(new Date());

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <ConfirmModal state={confirm} onCancel={closeConfirm} />
      <OrderPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        order={selected}
        onUpdateStatus={(status) => selected && handleUpdateStatus(selected, status)}
        updating={updating}
        formatCurrency={formatCurrency}
        formatDateTime={formatDateTime}
      />

      {/* ── Header ── */}
      <header className="header">
        <div className="header-title">Orders</div>
        <div className="header-date">{dater}</div>
        <button
          onClick={fetchOrders}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#fff", color: "#141410", border: "1px solid #c8c6bc", borderRadius: 7, fontFamily: "inherit", fontSize: 13, cursor: "pointer" }}
        >
          <IconRefresh /> Refresh
        </button>
      </header>

      <main className="main">

        {/* Stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
          {[
            { label: "Total Revenue",   value: formatCurrency(totalRevenue), sub: "Paid orders",    alert: false },
            { label: "Total Orders",    value: orders.length,                sub: "All time",       alert: false },
            { label: "Pending",         value: pendingCount,                 sub: "Need attention", alert: pendingCount > 0 },
            { label: "Refunded",        value: formatCurrency(refundedTotal),sub: "Total refunded", alert: refundedTotal > 0 },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: `1px solid ${s.alert ? "#fde68a" : "#e2e0d8"}`, borderRadius: 12, padding: "1.1rem 1.25rem", position: "relative" }}>
              {s.alert && <div style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: "50%", background: "#d97706" }} />}
              <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.5px", color: s.alert ? "#d97706" : "#141410" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Orders table card */}
        <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

            {/* Search */}
            <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 8, padding: "0 10px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9a9a8e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                style={{ flex: 1, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: "#141410", outline: "none", padding: "7px 0" }}
                placeholder="Search order #, customer name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9a9a8e", fontSize: 16, lineHeight: 1 }}>×</button>}
            </div>

            {/* Status filter */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {(["all", "pending", "processing", "completed", "refunded", "cancelled"] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} style={{
                  padding: "5px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  background: statusFilter === s ? "#141410" : "#f5f4f0",
                  color:      statusFilter === s ? "#fff"     : "#4a4a40",
                  border:     statusFilter === s ? "1px solid #141410" : "1px solid #c8c6bc",
                  fontWeight: statusFilter === s ? 500 : 400, transition: "all 0.15s",
                }}>
                  {s === "all" ? "All" : STATUS_CFG[s as OrderStatus].label}
                </button>
              ))}
            </div>

            {/* Payment method filter */}
            <div style={{ display: "flex", gap: 5 }}>
              {(["all", "card", "cash", "mobile"] as const).map(m => (
                <button key={m} onClick={() => setMethodFilter(m)} style={{
                  padding: "5px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  background: methodFilter === m ? "#141410" : "#f5f4f0",
                  color:      methodFilter === m ? "#fff"     : "#4a4a40",
                  border:     methodFilter === m ? "1px solid #141410" : "1px solid #c8c6bc",
                  transition: "all 0.15s",
                }}>
                  {m === "all" ? "All Methods" : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      {PAYMENT_METHOD_SVG[m]} {m.charAt(0).toUpperCase() + m.slice(1)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {fetching ? <Spinner /> : filtered.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>
              {search || statusFilter !== "all" || methodFilter !== "all"
                ? "No orders match your filters."
                : "No orders yet."}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Order", "Customer", "Items", "Total", "Payment", "Status", "Date", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.6rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id}
                    style={{ borderBottom: "1px solid #e2e0d8", cursor: "pointer" }}
                    onClick={() => { setSelected(o); setPanelOpen(true); }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}
                  >
                    {/* Order # */}
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <div style={{ fontWeight: 600, color: "#141410", fontFamily: "monospace", fontSize: 12 }}>{o.order_number}</div>
                    </td>

                    {/* Customer */}
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <div style={{ fontWeight: 500, color: "#141410" }}>{o.customer_name}</div>
                      <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 1 }}>{o.customer_email}</div>
                    </td>

                    {/* Items summary */}
                    <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40", maxWidth: 160 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {Array.isArray(o.items)
                          ? o.items.map(i => `${i.name} ×${i.qty}`).join(", ")
                          : "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 1 }}>
                        {Array.isArray(o.items) ? `${o.items.length} item${o.items.length !== 1 ? "s" : ""}` : ""}
                      </div>
                    </td>

                    {/* Total */}
                    <td style={{ padding: "0.85rem 1.25rem", fontWeight: 600, color: "#141410" }}>
                      {formatCurrency(o.total)}
                    </td>

                    {/* Payment */}
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5, color: "#4a4a40" }}>
                          {PAYMENT_METHOD_SVG[o.payment_method]}
                          {o.payment_method.charAt(0).toUpperCase() + o.payment_method.slice(1)}
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 7px", borderRadius: 100, fontSize: 10, fontWeight: 500, background: PAYMENT_CFG[o.payment_status]?.bg, color: PAYMENT_CFG[o.payment_status]?.color, border: `1px solid ${PAYMENT_CFG[o.payment_status]?.border}`, width: "fit-content" }}>
                          {o.payment_status.charAt(0).toUpperCase() + o.payment_status.slice(1)}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <StatusBadge status={o.status} />
                    </td>

                    {/* Date */}
                    <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40", whiteSpace: "nowrap", fontSize: 12 }}>
                      {formatDate(o.created_at)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "0.85rem 1.25rem" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => { setSelected(o); setPanelOpen(true); }}
                          style={{ padding: "5px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 6, fontSize: 12, color: "#141410", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          View
                        </button>
                        {o.status === "pending" && (
                          <button
                            onClick={() => handleUpdateStatus(o, "processing")}
                            style={{ padding: "5px 10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 12, color: "#2563eb", cursor: "pointer", fontFamily: "inherit" }}
                          >
                            Process
                          </button>
                        )}
                        {o.status === "processing" && (
                          <button
                            onClick={() => handleUpdateStatus(o, "completed")}
                            style={{ padding: "5px 10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, fontSize: 12, color: "#16a34a", cursor: "pointer", fontFamily: "inherit" }}
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Footer */}
          {!fetching && filtered.length > 0 && (
            <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid #e2e0d8", fontSize: 12, color: "#9a9a8e", display: "flex", justifyContent: "space-between" }}>
              <span>Showing {filtered.length} of {orders.length} order{orders.length !== 1 ? "s" : ""}</span>
              <span>Filtered total: <strong style={{ color: "#141410" }}>{formatCurrency(filtered.filter(o => o.payment_status === "paid").reduce((s, o) => s + o.total, 0))}</strong></span>
            </div>
          )}
        </div>
      </main>
    </>
  );
}