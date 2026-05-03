"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/app/_lib/StoreContext";

/* ── Types ── */
interface PriceTier {
  id:               string;
  name:             string;
  description:      string | null;
  discount_type:    "percentage" | "fixed";
  discount_value:   number;
  min_order_qty:    number;
  min_order_amount: number;
  customer_group:   string;
  is_active:        boolean;
  priority:         number;
  applies_to:       "all" | "category" | "product";
  category_ids:     string[];
  product_ids:      string[];
  valid_from:       string | null;
  valid_until:      string | null;
  admin_id:         string;
  created_at:       string;
}

interface PriceTierForm {
  name:             string;
  description:      string;
  discount_type:    "percentage" | "fixed";
  discount_value:   string;
  min_order_qty:    string;
  min_order_amount: string;
  customer_group:   string;
  is_active:        boolean;
  priority:         string;
  applies_to:       "all" | "category" | "product";
  valid_from:       string;
  valid_until:      string;
}

interface StoredUser {
  id:         string;
  full_name:  string;
  store_name: string | null;
}

function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("user") ?? "null"); }
  catch { return null; }
}

/* ── Customer groups ── */
const CUSTOMER_GROUPS = ["Retail", "Wholesale", "VIP", "Distributor", "Staff", "Online", "Walk-in", "All Customers"];

/* ── Tier colour system (by priority / group) ── */
const GROUP_COLORS: Record<string, { bg: string; color: string; border: string; accent: string }> = {
  "Retail":         { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", accent: "#2563eb" },
  "Wholesale":      { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", accent: "#16a34a" },
  "VIP":            { bg: "#fdf4ff", color: "#9333ea", border: "#e9d5ff", accent: "#9333ea" },
  "Distributor":    { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa", accent: "#ea580c" },
  "Staff":          { bg: "#fffbeb", color: "#d97706", border: "#fde68a", accent: "#d97706" },
  "Online":         { bg: "#f0f9ff", color: "#0284c7", border: "#bae6fd", accent: "#0284c7" },
  "Walk-in":        { bg: "#fdf2f8", color: "#c026d3", border: "#f0abfc", accent: "#c026d3" },
  "All Customers":  { bg: "#f5f4f0", color: "#4a4a40", border: "#c8c6bc", accent: "#4a4a40" },
};

function getGroupColor(group: string) {
  return GROUP_COLORS[group] ?? GROUP_COLORS["All Customers"];
}

/* ── Helpers ── */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isExpired(until: string | null): boolean {
  if (!until) return false;
  return new Date(until) < new Date();
}

function isUpcoming(from: string | null): boolean {
  if (!from) return false;
  return new Date(from) > new Date();
}

/* ── Shared styles ── */
const fieldStyle: React.CSSProperties = {
  width: "100%", background: "#f5f4f0", border: "1px solid #c8c6bc",
  borderRadius: 8, padding: "9px 12px", color: "#141410",
  fontFamily: "inherit", fontSize: 14, outline: "none",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px",
  textTransform: "uppercase", color: "#4a4a40", marginBottom: 5,
};

/* ── SVG Icons ── */
function IconPlus()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IconSearch()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function IconGrid()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>; }
function IconList()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>; }
function IconEdit()     { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function IconTrash()    { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>; }
function IconWarning()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function IconPercent()  { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>; }
function IconTag()      { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>; }
function IconClock()    { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function IconUsers()    { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>; }
function IconZap()      { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>; }
function IconLayers()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>; }

/* ── Toggle ── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{ width: 40, height: 22, borderRadius: 100, background: checked ? "#141410" : "#e2e0d8", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

/* ── Toast ── */
function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div style={{ position: "fixed", bottom: "2rem", right: "2rem", background: type === "error" ? "#dc2626" : "#141410", color: "#fff", padding: "0.85rem 1.25rem", borderRadius: 10, fontSize: 13, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 30px rgba(0,0,0,0.2)", animation: "toastIn 0.3s ease", zIndex: 1100 }}>
      <span style={{ display: "inline-flex" }}>
        {type === "error"
          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
      </span>
      {msg}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

/* ── Confirm Modal ── */
function ConfirmModal({ open, title, message, danger, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; danger: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 14, padding: "1.75rem", width: "100%", maxWidth: 400, zIndex: 1001, boxShadow: "0 24px 60px rgba(0,0,0,0.18)" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: danger ? "#fef2f2" : "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}><IconWarning /></div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#9a9a8e", lineHeight: 1.6, marginBottom: "1.5rem" }}>{message}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "8px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => { onConfirm(); onCancel(); }} style={{ padding: "8px 18px", background: danger ? "#dc2626" : "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            {danger ? "Yes, delete" : "Confirm"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Detail Panel ── */
function DetailPanel({ tier, onClose, onEdit, onDelete, formatCurrency }: {
  tier:           PriceTier;
  onClose:        () => void;
  onEdit:         () => void;
  onDelete:       () => void;
  formatCurrency: (n: number) => string;
}) {
  const grp     = getGroupColor(tier.customer_group);
  const expired  = isExpired(tier.valid_until);
  const upcoming = isUpcoming(tier.valid_from);

  const discountLabel = tier.discount_type === "percentage"
    ? `${tier.discount_value}% off`
    : `${formatCurrency(tier.discount_value)} off`;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 420, background: "#fff", zIndex: 901, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", animation: "panelIn 0.25s ease" }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        <div style={{ height: 4, background: grp.accent }} />

        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{tier.name}</div>
            <div style={{ marginTop: 5, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: grp.bg, border: `1px solid ${grp.border}`, borderRadius: 100, fontSize: 10, fontWeight: 600, color: grp.color }}>
                <IconUsers />{tier.customer_group}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: tier.is_active && !expired ? "#f0fdf4" : "#f5f4f0", border: `1px solid ${tier.is_active && !expired ? "#bbf7d0" : "#e2e0d8"}`, borderRadius: 100, fontSize: 10, fontWeight: 600, color: tier.is_active && !expired ? "#16a34a" : "#9a9a8e" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: tier.is_active && !expired ? "#16a34a" : "#9a9a8e" }} />
                {expired ? "Expired" : upcoming ? "Upcoming" : tier.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Discount highlight */}
          <div style={{ background: grp.bg, border: `1px solid ${grp.border}`, borderRadius: 12, padding: "1.1rem", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: grp.color, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, fontWeight: 600 }}>Discount</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: grp.color, letterSpacing: "-1px" }}>{discountLabel}</div>
            <div style={{ fontSize: 11, color: grp.color, opacity: 0.7, marginTop: 2 }}>
              {tier.discount_type === "percentage" ? "Percentage discount" : "Fixed amount off"}
            </div>
          </div>

          {/* Info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            {[
              { label: "Applies To",    value: tier.applies_to === "all" ? "All Products" : tier.applies_to === "category" ? "By Category" : "By Product", icon: <IconTag />     },
              { label: "Priority",      value: `#${tier.priority}`,                                                                                          icon: <IconZap />     },
              { label: "Min Qty",       value: tier.min_order_qty > 0 ? `${tier.min_order_qty} units` : "No minimum",                                       icon: <IconLayers />  },
              { label: "Min Amount",    value: tier.min_order_amount > 0 ? formatCurrency(tier.min_order_amount) : "No minimum",                             icon: <IconTag />     },
              { label: "Valid From",    value: formatDate(tier.valid_from),                                                                                  icon: <IconClock />   },
              { label: "Valid Until",   value: formatDate(tier.valid_until),                                                                                 icon: <IconClock />   },
            ].map(row => (
              <div key={row.label} style={{ background: "#f5f4f0", borderRadius: 8, padding: "0.65rem 0.85rem" }}>
                <div style={{ fontSize: 10, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
                  {row.icon}{row.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#141410" }}>{row.value}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          {tier.description && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "0.75rem 0.85rem" }}>
              <div style={{ fontSize: 10, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Description</div>
              <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.5 }}>{tier.description}</div>
            </div>
          )}

          {/* Expiry warning */}
          {expired && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.75rem 0.85rem", display: "flex", alignItems: "center", gap: 8 }}>
              <IconWarning />
              <div style={{ fontSize: 13, color: "#dc2626" }}>This tier expired on {formatDate(tier.valid_until)}.</div>
            </div>
          )}
        </div>

        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e2e0d8", display: "flex", gap: 8 }}>
          <button onClick={onEdit}   style={{ flex: 1, padding: "9px 0", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, color: "#141410", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Edit</button>
          <button onClick={onDelete} style={{ flex: 1, padding: "9px 0", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#dc2626", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Delete</button>
        </div>
      </div>
    </>
  );
}

/* ── Form Panel ── */
function TierFormPanel({ open, onClose, mode, tier, onSave, saving }: {
  open:    boolean;
  onClose: () => void;
  mode:    "add" | "edit";
  tier?:   PriceTier | null;
  onSave:  (form: PriceTierForm) => void;
  saving:  boolean;
}) {
  const blank: PriceTierForm = {
    name: "", description: "", discount_type: "percentage",
    discount_value: "", min_order_qty: "0", min_order_amount: "0",
    customer_group: "All Customers", is_active: true,
    priority: "1", applies_to: "all", valid_from: "", valid_until: "",
  };
  const [form, setForm] = useState<PriceTierForm>(blank);
  const prevOpen = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) {
      setForm(mode === "edit" && tier ? {
        name:             tier.name,
        description:      tier.description      ?? "",
        discount_type:    tier.discount_type,
        discount_value:   String(tier.discount_value),
        min_order_qty:    String(tier.min_order_qty),
        min_order_amount: String(tier.min_order_amount),
        customer_group:   tier.customer_group,
        is_active:        tier.is_active,
        priority:         String(tier.priority),
        applies_to:       tier.applies_to,
        valid_from:       tier.valid_from   ?? "",
        valid_until:      tier.valid_until  ?? "",
      } : blank);
    }
    prevOpen.current = open;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const set = (key: keyof PriceTierForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const canSave = !!form.name && !!form.discount_value;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 500, background: "#fff", zIndex: 901, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", animation: "panelIn 0.25s ease" }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{mode === "add" ? "New Price Tier" : "Edit Price Tier"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>

          {/* Basic info */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tier Info</div>
            <div>
              <label style={labelStyle}>Tier Name *</label>
              <input style={fieldStyle} placeholder="e.g. Wholesale Discount, VIP Pricing" value={form.name} onChange={set("name")} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Customer Group</label>
                <select style={fieldStyle} value={form.customer_group} onChange={set("customer_group")}>
                  {CUSTOMER_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <input style={fieldStyle} type="number" min="1" placeholder="1" value={form.priority} onChange={set("priority")} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...fieldStyle, resize: "vertical", minHeight: 60, lineHeight: 1.5 } as React.CSSProperties}
                placeholder="Brief description of this pricing tier…"
                value={form.description} onChange={set("description")} />
            </div>
          </div>

          {/* Discount */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Discount</div>

            {/* Type toggle */}
            <div style={{ display: "flex", background: "#e2e0d8", borderRadius: 8, overflow: "hidden", padding: 3, gap: 3 }}>
              {(["percentage", "fixed"] as const).map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, discount_type: t }))}
                  style={{ flex: 1, padding: "7px 0", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500, background: form.discount_type === t ? "#fff" : "transparent", color: form.discount_type === t ? "#141410" : "#9a9a8e", borderRadius: 6, transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <IconPercent />
                  {t === "percentage" ? "Percentage (%)" : "Fixed Amount"}
                </button>
              ))}
            </div>

            <div>
              <label style={labelStyle}>
                {form.discount_type === "percentage" ? "Discount %" : "Discount Amount"} *
              </label>
              <div style={{ position: "relative" }}>
                <input style={{ ...fieldStyle, paddingRight: 40 }} type="number" min="0" step="0.01"
                  placeholder={form.discount_type === "percentage" ? "e.g. 15" : "e.g. 500"}
                  value={form.discount_value} onChange={set("discount_value")} />
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9a9a8e", fontWeight: 600 }}>
                  {form.discount_type === "percentage" ? "%" : "KES"}
                </span>
              </div>
              {form.discount_type === "percentage" && Number(form.discount_value) > 100 && (
                <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>Discount cannot exceed 100%</div>
              )}
            </div>
          </div>

          {/* Applies to */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Applies To</div>
            <div style={{ display: "flex", gap: 6 }}>
              {([{ v: "all", label: "All Products" }, { v: "category", label: "Category" }, { v: "product", label: "Product" }] as const).map(({ v, label }) => (
                <button key={v} onClick={() => setForm(f => ({ ...f, applies_to: v }))}
                  style={{ flex: 1, padding: "7px 0", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500, background: form.applies_to === v ? "#141410" : "#e2e0d8", color: form.applies_to === v ? "#fff" : "#4a4a40", borderRadius: 7, transition: "all 0.15s" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Minimums */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Minimum Requirements</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Min Order Qty</label>
                <input style={fieldStyle} type="number" min="0" placeholder="0 = no minimum" value={form.min_order_qty} onChange={set("min_order_qty")} />
              </div>
              <div>
                <label style={labelStyle}>Min Order Amount</label>
                <input style={fieldStyle} type="number" min="0" step="0.01" placeholder="0 = no minimum" value={form.min_order_amount} onChange={set("min_order_amount")} />
              </div>
            </div>
          </div>

          {/* Validity */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Validity Period <span style={{ fontWeight: 400, color: "#9a9a8e" }}>(optional)</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Valid From</label>
                <input style={fieldStyle} type="date" value={form.valid_from} onChange={set("valid_from")} />
              </div>
              <div>
                <label style={labelStyle}>Valid Until</label>
                <input style={fieldStyle} type="date" value={form.valid_until} onChange={set("valid_until")} />
              </div>
            </div>
            {!form.valid_from && !form.valid_until && (
              <div style={{ fontSize: 11, color: "#9a9a8e" }}>Leave blank for a permanent tier with no expiry.</div>
            )}
          </div>

          {/* Active toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f5f4f0", borderRadius: 10, padding: "0.85rem 1rem" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#141410" }}>Active</div>
              <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 2 }}>Tier will apply to matching customers when active</div>
            </div>
            <Toggle checked={form.is_active} onChange={() => setForm(f => ({ ...f, is_active: !f.is_active }))} />
          </div>
        </div>

        <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #e2e0d8", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !canSave}
            style={{ padding: "9px 20px", background: saving || !canSave ? "#9a9a8e" : "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving || !canSave ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "Saving…" : mode === "add" ? "Create Tier" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Tier Card (Grid view) ── */
function TierCard({ tier, onView, onEdit, onDelete, onToggle, formatCurrency }: {
  tier:           PriceTier;
  onView:         () => void;
  onEdit:         () => void;
  onDelete:       () => void;
  onToggle:       () => void;
  formatCurrency: (n: number) => string;
}) {
  const grp      = getGroupColor(tier.customer_group);
  const expired  = isExpired(tier.valid_until);
  const upcoming = isUpcoming(tier.valid_from);

  const discountLabel = tier.discount_type === "percentage"
    ? `${tier.discount_value}%`
    : formatCurrency(tier.discount_value);

  const statusLabel  = expired ? "Expired" : upcoming ? "Upcoming" : tier.is_active ? "Active" : "Inactive";
  const statusColor  = expired || !tier.is_active ? "#9a9a8e" : upcoming ? "#d97706" : "#16a34a";
  const statusBg     = expired || !tier.is_active ? "#f5f4f0" : upcoming ? "#fffbeb" : "#f0fdf4";
  const statusBorder = expired || !tier.is_active ? "#e2e0d8" : upcoming ? "#fde68a" : "#bbf7d0";

  return (
    <div onClick={onView}
      style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", cursor: "pointer", opacity: expired || !tier.is_active ? 0.75 : 1, transition: "box-shadow 0.15s" }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}>

      <div style={{ height: 4, background: grp.accent }} />

      <div style={{ padding: "1rem 1.1rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#141410", lineHeight: 1.3 }}>{tier.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={e => e.stopPropagation()}>
            <Toggle checked={tier.is_active} onChange={onToggle} />
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", background: grp.bg, border: `1px solid ${grp.border}`, borderRadius: 100, fontSize: 10, fontWeight: 600, color: grp.color }}>
            <IconUsers />{tier.customer_group}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", background: statusBg, border: `1px solid ${statusBorder}`, borderRadius: 100, fontSize: 10, fontWeight: 600, color: statusColor }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor }} />{statusLabel}
          </span>
        </div>

        {/* Big discount number */}
        <div style={{ background: grp.bg, border: `1px solid ${grp.border}`, borderRadius: 8, padding: "0.6rem 0.75rem", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: grp.color, fontWeight: 500, marginBottom: 2 }}>
            {tier.discount_type === "percentage" ? "Percentage Off" : "Fixed Discount"}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: grp.color, letterSpacing: "-0.5px" }}>{discountLabel}</div>
        </div>

        {/* Meta */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9a9a8e" }}>
            <IconTag />
            {tier.applies_to === "all" ? "All products" : tier.applies_to === "category" ? "Specific categories" : "Specific products"}
          </div>
          {tier.min_order_qty > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9a9a8e" }}>
              <IconLayers />Min qty: {tier.min_order_qty} units
            </div>
          )}
          {tier.min_order_amount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9a9a8e" }}>
              <IconZap />Min order: {formatCurrency(tier.min_order_amount)}
            </div>
          )}
          {tier.valid_until && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: expired ? "#dc2626" : "#9a9a8e" }}>
              <IconClock />{expired ? "Expired" : "Until"} {formatDate(tier.valid_until)}
            </div>
          )}
        </div>

        {/* Priority badge */}
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 10, color: "#9a9a8e", background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 100, padding: "1px 7px", fontWeight: 500 }}>
            Priority #{tier.priority}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ borderTop: "1px solid #e2e0d8", display: "flex" }} onClick={e => e.stopPropagation()}>
        <button onClick={onEdit}
          style={{ flex: 1, padding: "8px 0", background: "none", border: "none", borderRight: "1px solid #e2e0d8", cursor: "pointer", fontSize: 12, color: "#4a4a40", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontWeight: 500 }}>
          <IconEdit /> Edit
        </button>
        <button onClick={onDelete}
          style={{ flex: 1, padding: "8px 0", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#dc2626", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontWeight: 500 }}>
          <IconTrash /> Delete
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function AdminPriceTiersPage() {
  const adminUser = getStoredUser();
  const { formatCurrency, config } = useStore();

  const [tiers,         setTiers]         = useState<PriceTier[]>([]);
  const [fetching,      setFetching]       = useState(true);
  const [saving,        setSaving]         = useState(false);
  const [viewMode,      setViewMode]       = useState<"grid" | "list">("grid");
  const [search,        setSearch]         = useState("");
  const [groupFilter,   setGroupFilter]    = useState<string>("all");
  const [statusFilter,  setStatusFilter]   = useState<"all" | "active" | "inactive" | "expired">("all");
  const [selected,      setSelected]       = useState<PriceTier | null>(null);
  const [detailOpen,    setDetailOpen]     = useState(false);
  const [formOpen,      setFormOpen]       = useState(false);
  const [formMode,      setFormMode]       = useState<"add" | "edit">("add");
  const [editTarget,    setEditTarget]     = useState<PriceTier | null>(null);
  const [toast,         setToast]          = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirm,       setConfirm]        = useState({ open: false, title: "", message: "", danger: false, onConfirm: () => {} });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  /* ── Fetch ── */
  const fetchTiers = useCallback(async () => {
    if (!adminUser?.id) return;
    setFetching(true);
    try {
      const res  = await fetch(`/api/price-tiers?admin_id=${adminUser.id}`);
      const data = await res.json();
      const parsed = (Array.isArray(data) ? data : []).map((t: PriceTier) => ({
        ...t,
        is_active:   Boolean(t.is_active),
        category_ids: t.category_ids ?? [],
        product_ids:  t.product_ids  ?? [],
      }));
      setTiers(parsed);
    } catch { showToast("Failed to load price tiers", "error"); }
    finally  { setFetching(false); }
  }, [adminUser?.id]);

  useEffect(() => { fetchTiers(); }, [fetchTiers]);

  /* ── Save ── */
  const handleSave = async (form: PriceTierForm) => {
    if (!adminUser?.id) return;
    setSaving(true);
    try {
      const isAdd  = formMode === "add";
      const url    = isAdd ? "/api/price-tiers" : `/api/price-tiers/${editTarget?.id}`;
      const method = isAdd ? "POST" : "PUT";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          discount_value:   Number(form.discount_value),
          min_order_qty:    Number(form.min_order_qty)    || 0,
          min_order_amount: Number(form.min_order_amount) || 0,
          priority:         Number(form.priority)         || 1,
          valid_from:       form.valid_from  || null,
          valid_until:      form.valid_until || null,
          admin_id: adminUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(isAdd ? "Price tier created" : "Price tier updated");
      setFormOpen(false);
      fetchTiers();
    } catch (err) {
      showToast((err as Error).message || "Failed to save", "error");
    } finally { setSaving(false); }
  };

  /* ── Toggle active ── */
  const handleToggle = async (tier: PriceTier) => {
    try {
      const res = await fetch(`/api/price-tiers/${tier.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tier, is_active: !tier.is_active, admin_id: adminUser?.id }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(tier.is_active ? "Tier deactivated" : "Tier activated");
      fetchTiers();
    } catch { showToast("Failed to update tier", "error"); }
  };

  /* ── Delete ── */
  const handleDelete = (tier: PriceTier) => {
    setConfirm({
      open: true, danger: true,
      title: "Delete Price Tier",
      message: `Delete "${tier.name}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/price-tiers/${tier.id}?admin_id=${adminUser?.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed");
          showToast("Price tier deleted");
          setDetailOpen(false);
          fetchTiers();
        } catch { showToast("Failed to delete", "error"); }
      },
    });
  };

  /* ── Filtered ── */
  const allGroups = Array.from(new Set(tiers.map(t => t.customer_group))).sort();

  const filtered = tiers.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.customer_group.toLowerCase().includes(search.toLowerCase());
    const matchGroup  = groupFilter  === "all" || t.customer_group === groupFilter;
    const expired     = isExpired(t.valid_until);
    const matchStatus =
      statusFilter === "all"      ? true :
      statusFilter === "expired"  ? expired :
      statusFilter === "active"   ? t.is_active && !expired :
      !t.is_active && !expired;
    return matchSearch && matchGroup && matchStatus;
  });

  /* ── Stats ── */
  const stats = {
    total:      tiers.length,
    active:     tiers.filter(t => t.is_active && !isExpired(t.valid_until)).length,
    expired:    tiers.filter(t => isExpired(t.valid_until)).length,
    percentage: tiers.filter(t => t.discount_type === "percentage").length,
    fixed:      tiers.filter(t => t.discount_type === "fixed").length,
  };

  const dater = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    timeZone: config?.timezone,
  }).format(new Date());

  return (
    <>
      {toast   && <Toast msg={toast.msg} type={toast.type} />}
      <ConfirmModal {...confirm} onCancel={() => setConfirm(c => ({ ...c, open: false }))} />

      {detailOpen && selected && (
        <DetailPanel
          tier={selected}
          onClose={() => setDetailOpen(false)}
          onEdit={() => { setFormMode("edit"); setEditTarget(selected); setDetailOpen(false); setFormOpen(true); }}
          onDelete={() => { setDetailOpen(false); handleDelete(selected); }}
          formatCurrency={formatCurrency}
        />
      )}

      <TierFormPanel
        open={formOpen} onClose={() => setFormOpen(false)}
        mode={formMode} tier={editTarget}
        onSave={handleSave} saving={saving}
      />

      {/* Header */}
      <header className="header">
        <div className="header-title">Price Tiers</div>
        <div className="header-date">{dater}</div>

        {/* View toggle */}
        <div style={{ display: "flex", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 8, overflow: "hidden" }}>
          {([{ v: "grid" as const, icon: <IconGrid />, label: "Grid" }, { v: "list" as const, icon: <IconList />, label: "List" }]).map(({ v, icon, label }) => (
            <button key={v} onClick={() => setViewMode(v)}
              style={{ padding: "6px 12px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500, background: viewMode === v ? "#141410" : "transparent", color: viewMode === v ? "#fff" : "#4a4a40", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}>
              {icon} {label}
            </button>
          ))}
        </div>

        <button onClick={() => { setFormMode("add"); setEditTarget(null); setFormOpen(true); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#141410", color: "#fff", border: "none", borderRadius: 7, fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <IconPlus /> New Tier
        </button>
      </header>

      <main className="main">

        {/* Stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
          {[
            { label: "Total Tiers",  value: stats.total,      color: "#141410" },
            { label: "Active",       value: stats.active,     color: "#16a34a" },
            { label: "Expired",      value: stats.expired,    color: "#dc2626" },
            { label: "% Discount",   value: stats.percentage, color: "#2563eb" },
            { label: "Fixed Discount", value: stats.fixed,    color: "#d97706" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "0.9rem 1rem" }}>
              <div style={{ fontSize: 10, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.color, letterSpacing: "-0.5px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Main card */}
        <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

            {/* Search */}
            <div style={{ position: "relative", minWidth: 200, flex: 1, maxWidth: 300 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9a9a8e", display: "flex" }}><IconSearch /></span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search tiers…"
                style={{ ...fieldStyle, paddingLeft: 32, fontSize: 13 }} />
            </div>

            <div style={{ flex: 1 }} />

            {/* Group filter */}
            <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
              style={{ padding: "6px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 7, fontFamily: "inherit", fontSize: 12, color: "#4a4a40", cursor: "pointer", outline: "none" }}>
              <option value="all">All groups</option>
              {allGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            {/* Status filter */}
            <div style={{ display: "flex", gap: 5 }}>
              {([{ v: "all", label: "All" }, { v: "active", label: "Active" }, { v: "inactive", label: "Inactive" }, { v: "expired", label: "Expired" }] as const).map(({ v, label }) => (
                <button key={v} onClick={() => setStatusFilter(v)}
                  style={{ padding: "5px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: statusFilter === v ? "#141410" : "#f5f4f0", color: statusFilter === v ? "#fff" : "#4a4a40", border: statusFilter === v ? "1px solid #141410" : "1px solid #c8c6bc", transition: "all 0.15s" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {fetching ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", color: "#9a9a8e", fontSize: 13, gap: 10 }}>
              <div style={{ width: 18, height: 18, border: "2px solid #e2e0d8", borderTopColor: "#141410", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              Loading…<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "4rem", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, background: "#f5f4f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", color: "#c8c6bc" }}><IconLayers /></div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#9a9a8e", marginBottom: 6 }}>No price tiers found</div>
              <div style={{ fontSize: 12, color: "#c8c6bc" }}>
                {search ? `No results for "${search}"` : "Create your first pricing tier to get started"}
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "1rem" }}>
              {filtered.map(t => (
                <TierCard key={t.id} tier={t}
                  onView={() => { setSelected(t); setDetailOpen(true); }}
                  onEdit={() => { setFormMode("edit"); setEditTarget(t); setFormOpen(true); }}
                  onDelete={() => handleDelete(t)}
                  onToggle={() => handleToggle(t)}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Tier", "Group", "Discount", "Applies To", "Min Qty", "Min Amount", "Validity", "Priority", "Status", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.6rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const grp      = getGroupColor(t.customer_group);
                  const expired  = isExpired(t.valid_until);
                  const upcoming = isUpcoming(t.valid_from);
                  const statusLabel = expired ? "Expired" : upcoming ? "Upcoming" : t.is_active ? "Active" : "Inactive";
                  const statusColor = expired || !t.is_active ? "#9a9a8e" : upcoming ? "#d97706" : "#16a34a";
                  const statusBg    = expired || !t.is_active ? "#f5f4f0" : upcoming ? "#fffbeb" : "#f0fdf4";
                  const statusBdr   = expired || !t.is_active ? "#e2e0d8" : upcoming ? "#fde68a" : "#bbf7d0";

                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid #e2e0d8", cursor: "pointer", opacity: expired || !t.is_active ? 0.75 : 1 }}
                      onClick={() => { setSelected(t); setDetailOpen(true); }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ fontWeight: 500 }}>{t.name}</div>
                        {t.description && <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 2, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</div>}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: grp.bg, border: `1px solid ${grp.border}`, borderRadius: 100, fontSize: 11, fontWeight: 500, color: grp.color }}>
                          <IconUsers />{t.customer_group}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: grp.accent }}>
                          {t.discount_type === "percentage" ? `${t.discount_value}%` : formatCurrency(t.discount_value)}
                        </div>
                        <div style={{ fontSize: 10, color: "#9a9a8e" }}>{t.discount_type === "percentage" ? "Percentage" : "Fixed"}</div>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40", fontSize: 12 }}>
                        {t.applies_to === "all" ? "All products" : t.applies_to === "category" ? "Category" : "Product"}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40" }}>{t.min_order_qty > 0 ? t.min_order_qty : "—"}</td>
                      <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40" }}>{t.min_order_amount > 0 ? formatCurrency(t.min_order_amount) : "—"}</td>
                      <td style={{ padding: "0.85rem 1.25rem", fontSize: 12, whiteSpace: "nowrap" }}>
                        {t.valid_from || t.valid_until
                          ? <><div style={{ color: "#4a4a40" }}>{formatDate(t.valid_from)} –</div><div style={{ color: expired ? "#dc2626" : "#4a4a40" }}>{formatDate(t.valid_until)}</div></>
                          : <span style={{ color: "#9a9a8e" }}>Permanent</span>}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", color: "#9a9a8e", textAlign: "center" }}>#{t.priority}</td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: statusBg, border: `1px solid ${statusBdr}`, borderRadius: 100, fontSize: 11, fontWeight: 500, color: statusColor }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor }} />{statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setFormMode("edit"); setEditTarget(t); setFormOpen(true); }}
                            style={{ padding: "5px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                            <IconEdit /> Edit
                          </button>
                          <button onClick={() => handleDelete(t)}
                            style={{ padding: "5px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#dc2626", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                            <IconTrash /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}