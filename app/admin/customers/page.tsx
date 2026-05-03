"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/app/_lib/StoreContext";

/* ── Types ── */
interface Customer {
  id:          string;
  full_name:   string;
  email:       string;
  phone:       string | null;
  status:      "active" | "inactive";
  total_orders: number;
  total_spent:  number;
  loyalty_points: number;
  admin_id:    string;
  created_at:  string;
  last_order?:  string | null;
}

interface CustomerForm {
  full_name: string;
  email:     string;
  phone:     string;
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

/* ── Helpers ── */
function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

/* ── Avatar colours based on initials ── */
const AVATAR_COLORS = ["#141410", "#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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

/* ── SVG Icons ── */
function IconWarning() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function IconStar() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function IconUserPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  );
}

/* ── Toast ── */
function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div style={{
      position: "fixed", bottom: "2rem", right: "2rem",
      background: type === "error" ? "#dc2626" : "#141410",
      color: "#fff", padding: "0.85rem 1.25rem", borderRadius: 10,
      fontSize: 13, display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
      animation: "toastIn 0.3s ease", zIndex: 1100,
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
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        background: "#fff", borderRadius: 14, padding: "1.75rem",
        width: "100%", maxWidth: 400, zIndex: 1001,
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        animation: "slideUp 0.2s ease",
      }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: state.danger ? "#fef2f2" : "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: "1rem" }}>
          {state.danger ? <IconWarning /> : <IconUser />}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#141410", marginBottom: 8 }}>{state.title}</div>
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
      Loading customers…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Customer Panel (add / edit / view) ── */
function CustomerPanel({
  open, onClose, mode, customer, onSave, saving, formatCurrency, formatDate,
}: {
  open:           boolean;
  onClose:        () => void;
  mode:           "add" | "edit" | "view";
  customer?:      Customer | null;
  onSave:         (form: CustomerForm) => void;
  saving:         boolean;
  formatCurrency: (n: number) => string;
  formatDate:     (d: string) => string;
}) {
  const blank: CustomerForm = { full_name: "", email: "", phone: "" };
  const [form, setForm] = useState<CustomerForm>(blank);
  const prevOpen = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) {
      setForm(
        mode !== "add" && customer
          ? { full_name: customer.full_name, email: customer.email, phone: customer.phone ?? "" }
          : blank
      );
    }
    prevOpen.current = open;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const set = (key: keyof CustomerForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const isView = mode === "view";
  const color  = customer ? avatarColor(customer.full_name) : "#141410";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "100%", maxWidth: 440,
        background: "#fff", zIndex: 901,
        boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column",
        animation: "panelIn 0.25s ease",
      }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>
            {mode === "add" ? "Add Customer" : mode === "edit" ? "Edit Customer" : "Customer Details"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.1rem" }}>

          {/* View mode — customer profile card */}
          {isView && customer && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "1rem", background: "#f5f4f0", borderRadius: 10 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 600, flexShrink: 0 }}>
                  {getInitials(customer.full_name)}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{customer.full_name}</div>
                  <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2 }}>{customer.email}</div>
                  {customer.phone && <div style={{ fontSize: 12, color: "#9a9a8e" }}>{customer.phone}</div>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {[
                  { label: "Total Orders",    value: customer.total_orders },
                  { label: "Total Spent",     value: formatCurrency(customer.total_spent) },
                  { label: "Loyalty Points",  value: `${customer.loyalty_points} pts` },
                  { label: "Member Since",    value: formatDate(customer.created_at) },
                ].map(s => (
                  <div key={s.label} style={{ background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 8, padding: "0.75rem 1rem" }}>
                    <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 500 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {customer.last_order && (
                <div style={{ background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 8, padding: "0.75rem 1rem" }}>
                  <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Last Order</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{formatDate(customer.last_order)}</div>
                </div>
              )}

              <div style={{ background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 8, padding: "0.75rem 1rem" }}>
                <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Account Status</div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: customer.status === "active" ? "#16a34a" : "#9a9a8e" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: customer.status === "active" ? "#16a34a" : "#c8c6bc" }} />
                  {customer.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
            </>
          )}

          {/* Add / Edit form */}
          {!isView && (
            <>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input style={fieldStyle} placeholder="e.g. Amara Osei" value={form.full_name} onChange={set("full_name")} />
              </div>
              <div>
                <label style={labelStyle}>Email Address *</label>
                <input style={fieldStyle} type="email" placeholder="customer@email.com" value={form.email} onChange={set("email")} />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input style={fieldStyle} type="tel" placeholder="+254 700 000 000" value={form.phone} onChange={set("phone")} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isView && (
          <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #e2e0d8", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
            <button onClick={onClose} style={{ padding: "9px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button
              onClick={() => onSave(form)}
              disabled={saving}
              style={{ padding: "9px 20px", background: saving ? "#9a9a8e" : "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}
            >
              {saving ? "Saving…" : mode === "add" ? "Add Customer" : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE 
───────────────────────────────────────── */
export default function AdminCustomersPage() {
  const [adminUser]  = useState<StoredUser | null>(getStoredUser);
  const { formatCurrency, formatDate } = useStore();
  const [customers,  setCustomers]  = useState<Customer[]>([]);
  const [fetching,   setFetching]   = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState<"all" | "active" | "inactive">("all");
  const [panelOpen,  setPanelOpen]  = useState(false);
  const [panelMode,  setPanelMode]  = useState<"add" | "edit" | "view">("add");
  const [selected,   setSelected]   = useState<Customer | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirm,    setConfirm]    = useState<ConfirmState>({ open: false, title: "", message: "", danger: false, onConfirm: () => {} });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openConfirm = (title: string, message: string, danger: boolean, onConfirm: () => void) =>
    setConfirm({ open: true, title, message, danger, onConfirm });
  const closeConfirm = () => setConfirm(c => ({ ...c, open: false }));

  /* ── Fetch customers ── */
  const fetchCustomers = useCallback(async () => {
    if (!adminUser?.id) return;
    setFetching(true);
    try {
      const res  = await fetch(`/api/customers?admin_id=${adminUser.id}`);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch {
      showToast("Failed to load customers", "error");
    } finally {
      setFetching(false);
    }
  }, [adminUser?.id]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  /* ── Save (add / edit) ── */
  const handleSave = (form: CustomerForm) => {
    if (!adminUser?.id) return showToast("Not logged in", "error");
    if (!form.full_name || !form.email) return showToast("Name and email are required", "error");

    const isAdd = panelMode === "add";
    openConfirm(
      isAdd ? "Add Customer" : "Update Customer",
      isAdd
        ? `Add ${form.full_name} as a customer?`
        : `Save changes to ${form.full_name}?`,
      false,
      async () => {
        setSaving(true);
        try {
          const url    = isAdd ? "/api/customers" : `/api/customers/${selected?.id}`;
          const method = isAdd ? "POST" : "PUT";
          const res    = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, admin_id: adminUser.id }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          showToast(isAdd ? "Customer added" : "Customer updated");
          setPanelOpen(false);
          fetchCustomers();
        } catch (err) {
          showToast((err as Error).message || "Failed to save", "error");
        } finally {
          setSaving(false);
        }
      }
    );
  };

  /* ── Toggle status ── */
  const handleToggleStatus = (customer: Customer) => {
    if (!adminUser?.id) return;
    const next = customer.status === "active" ? "inactive" : "active";
    openConfirm(
      `${next === "active" ? "Activate" : "Deactivate"} Customer`,
      `${next === "inactive" ? "Deactivate" : "Activate"} ${customer.full_name}'s account?`,
      next === "inactive",
      async () => {
        try {
          const res = await fetch(`/api/customers/${customer.id}/status`, {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ status: next, admin_id: adminUser.id }),
          });
          if (!res.ok) throw new Error("Failed");
          showToast(`${customer.full_name} ${next === "active" ? "activated" : "deactivated"}`);
          fetchCustomers();
        } catch {
          showToast("Failed to update status", "error");
        }
      }
    );
  };

  /* ── Delete ── */
  const handleDelete = (customer: Customer) => {
    if (!adminUser?.id) return;
    openConfirm(
      "Delete Customer",
      `Permanently delete ${customer.full_name}? This cannot be undone.`,
      true,
      async () => {
        try {
          const res = await fetch(
            `/api/customers/${customer.id}?admin_id=${adminUser.id}`,
            { method: "DELETE" }
          );
          if (!res.ok) throw new Error("Failed");
          showToast(`${customer.full_name} deleted`);
          fetchCustomers();
        } catch {
          showToast("Failed to delete customer", "error");
        }
      }
    );
  };

  /* ── Filtered list ── */
  const filtered = customers.filter(c => {
    const matchSearch =
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search);
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  /* ── Stats ── */
  const activeCount   = customers.filter(c => c.status === "active").length;
  const totalRevenue  = customers.reduce((s, c) => s + c.total_spent, 0);
  const totalOrders   = customers.reduce((s, c) => s + c.total_orders, 0);

  const dater = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(new Date());

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <ConfirmModal state={confirm} onCancel={closeConfirm} />
      <CustomerPanel
        key={`${panelMode}-${selected?.id ?? "new"}`}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        mode={panelMode}
        customer={selected}
        onSave={handleSave}
        saving={saving}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />

      {/* ── Header ── */}
      <header className="header">
        <div className="header-title">Customers</div>
        <div className="header-date">{dater}</div>
        <button
          onClick={() => { setPanelMode("add"); setSelected(null); setPanelOpen(true); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#141410", color: "#fff", border: "none", borderRadius: 7, fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          <IconUserPlus /> Add Customer
        </button>
      </header>

      <main className="main">

        {/* Stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
          {[
            { label: "Total Customers", value: customers.length, sub: "Registered"         },
            { label: "Active",          value: activeCount,       sub: "Accounts"           },
            { label: "Total Revenue",   value: formatCurrency(totalRevenue), sub: "From customers" },
            { label: "Total Orders",    value: totalOrders,       sub: "All time"           },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "1.1rem 1.25rem" }}>
              <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.5px" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Customer table */}
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
                placeholder="Search by name, email or phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9a9a8e", fontSize: 16, lineHeight: 1 }}>×</button>}
            </div>

            {/* Filter pills */}
            <div style={{ display: "flex", gap: 5 }}>
              {([
                { key: "all",      label: "All"      },
                { key: "active",   label: "Active"   },
                { key: "inactive", label: "Inactive" },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  padding: "5px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  background: filter === f.key ? "#141410" : "#f5f4f0",
                  color:      filter === f.key ? "#fff"     : "#4a4a40",
                  border:     filter === f.key ? "1px solid #141410" : "1px solid #c8c6bc",
                  fontWeight: filter === f.key ? 500 : 400,
                  transition: "all 0.15s",
                }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {fetching ? <Spinner /> : filtered.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>
              {search || filter !== "all" ? "No customers match your search." : "No customers yet. Add your first one."}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Customer", "Status", "Orders", "Total Spent", "Loyalty Points", "Joined", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.6rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const color = avatarColor(c.full_name);
                  return (
                    <tr key={c.id}
                      style={{ borderBottom: "1px solid #e2e0d8" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}
                    >
                      {/* Customer */}
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                            {getInitials(c.full_name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: "#141410" }}>{c.full_name}</div>
                            <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 1 }}>{c.email}</div>
                            {c.phone && <div style={{ fontSize: 11, color: "#9a9a8e" }}>{c.phone}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: c.status === "active" ? "#16a34a" : "#9a9a8e" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.status === "active" ? "#16a34a" : "#c8c6bc" }} />
                          {c.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Orders */}
                      <td style={{ padding: "0.85rem 1.25rem", color: "#141410", fontWeight: 500 }}>
                        {c.total_orders}
                      </td>

                      {/* Total spent */}
                      <td style={{ padding: "0.85rem 1.25rem", fontWeight: 500, color: "#141410" }}>
                        {formatCurrency(c.total_spent)}
                      </td>

                      {/* Loyalty */}
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: 100, fontWeight: 500 }}>
                          <IconStar /> {c.loyalty_points} pts
                        </span>
                      </td>

                      {/* Joined */}
                      <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40" }}>
                        {formatDate(c.created_at)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            onClick={() => { setPanelMode("view"); setSelected(c); setPanelOpen(true); }}
                            style={{ padding: "5px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 6, fontSize: 12, color: "#141410", cursor: "pointer", fontFamily: "inherit" }}
                          >
                            View
                          </button>
                          <button
                            onClick={() => { setPanelMode("edit"); setSelected(c); setPanelOpen(true); }}
                            style={{ padding: "5px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 6, fontSize: 12, color: "#141410", cursor: "pointer", fontFamily: "inherit" }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleStatus(c)}
                            style={{ padding: "5px 10px", background: c.status === "active" ? "#fffbeb" : "#f0fdf4", border: `1px solid ${c.status === "active" ? "#fde68a" : "#bbf7d0"}`, borderRadius: 6, fontSize: 12, color: c.status === "active" ? "#d97706" : "#16a34a", cursor: "pointer", fontFamily: "inherit" }}
                          >
                            {c.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            style={{ padding: "5px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Footer */}
          {!fetching && filtered.length > 0 && (
            <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid #e2e0d8", fontSize: 12, color: "#9a9a8e", display: "flex", justifyContent: "space-between" }}>
              <span>Showing {filtered.length} of {customers.length} customer{customers.length !== 1 ? "s" : ""}</span>
              <span>Combined spend: <strong style={{ color: "#141410" }}>{formatCurrency(filtered.reduce((s, c) => s + c.total_spent, 0))}</strong></span>
            </div>
          )}
        </div>
      </main>
    </>
  );
}