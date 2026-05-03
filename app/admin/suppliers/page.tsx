"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/app/_lib/StoreContext";

/* ── Types ── */
interface Supplier {
  id:           string;
  name:         string;
  category:     string;
  contact_name: string | null;
  email:        string | null;
  phone:        string | null;
  address:      string | null;
  city:         string | null;
  country:      string | null;
  tax_number:   string | null;
  payment_terms: string | null;  // e.g. "Net 30"
  credit_limit: number;
  balance_due:  number;
  status:       "active" | "inactive" | "blacklisted";
  notes:        string | null;
  admin_id:     string;
  created_at:   string;
}

interface SupplierForm {
  name:          string;
  category:      string;
  contact_name:  string;
  email:         string;
  phone:         string;
  address:       string;
  city:          string;
  country:       string;
  tax_number:    string;
  payment_terms: string;
  credit_limit:  string;
  status:        "active" | "inactive" | "blacklisted";
  notes:         string;
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

/* ── Status config ── */
const STATUS_CFG: Record<Supplier["status"], { bg: string; color: string; border: string; dot: string; label: string }> = {
  active:      { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", dot: "#16a34a", label: "Active"      },
  inactive:    { bg: "#f5f4f0", color: "#9a9a8e", border: "#e2e0d8", dot: "#9a9a8e", label: "Inactive"    },
  blacklisted: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", dot: "#dc2626", label: "Blacklisted" },
};

/* ── Category colours ── */
const CATEGORY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  "Electronics":    { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  "Food & Beverage":{ bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  "Clothing":       { bg: "#fdf4ff", color: "#9333ea", border: "#e9d5ff" },
  "Hardware":       { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  "Pharmaceuticals":{ bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  "Raw Materials":  { bg: "#f0f9ff", color: "#0284c7", border: "#bae6fd" },
  "Packaging":      { bg: "#fdf2f8", color: "#c026d3", border: "#f0abfc" },
  "Other":          { bg: "#f5f4f0", color: "#4a4a40", border: "#c8c6bc" },
};

const DEFAULT_CATEGORIES = [
  "Electronics", "Food & Beverage", "Clothing", "Hardware",
  "Pharmaceuticals", "Raw Materials", "Packaging", "Other",
];

const PAYMENT_TERMS = ["Net 7", "Net 15", "Net 30", "Net 60", "Net 90", "COD", "Prepaid"];

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS["Other"];
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
function IconTag()      { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>; }
function IconPhone()    { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.7A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>; }
function IconMail()     { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function IconMapPin()   { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function IconBuilding() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h1"/><path d="M14 9h1"/><path d="M9 14h1"/><path d="M14 14h1"/><path d="M9 3v18"/></svg>; }
function IconCreditCard(){ return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }
function IconUser()     { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }

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
function DetailPanel({ supplier, onClose, onEdit, onDelete, formatCurrency }: {
  supplier:       Supplier;
  onClose:        () => void;
  onEdit:         () => void;
  onDelete:       () => void;
  formatCurrency: (n: number) => string;
}) {
  const scfg = STATUS_CFG[supplier.status];
  const cat  = getCategoryColor(supplier.category);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 420, background: "#fff", zIndex: 901, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", animation: "panelIn 0.25s ease" }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        <div style={{ height: 4, background: scfg.dot }} />

        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{supplier.name}</div>
            <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: cat.bg, border: `1px solid ${cat.border}`, borderRadius: 100, fontSize: 10, fontWeight: 600, color: cat.color }}>
                <IconTag />{supplier.category}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: scfg.bg, border: `1px solid ${scfg.border}`, borderRadius: 100, fontSize: 10, fontWeight: 600, color: scfg.color }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: scfg.dot }} />{scfg.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Contact info */}
          {(supplier.contact_name || supplier.email || supplier.phone) && (
            <div style={{ background: "#f5f4f0", borderRadius: 8, padding: "0.75rem 0.85rem", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 10, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>Contact</div>
              {supplier.contact_name && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#141410", fontWeight: 500 }}>
                  <IconUser />{supplier.contact_name}
                </div>
              )}
              {supplier.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#4a4a40" }}>
                  <IconPhone />{supplier.phone}
                </div>
              )}
              {supplier.email && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9a9a8e" }}>
                  <IconMail />{supplier.email}
                </div>
              )}
            </div>
          )}

          {/* Location */}
          {(supplier.address || supplier.city || supplier.country) && (
            <div style={{ background: "#f5f4f0", borderRadius: 8, padding: "0.75rem 0.85rem" }}>
              <div style={{ fontSize: 10, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Location</div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 13, color: "#4a4a40", lineHeight: 1.5 }}>
                <span style={{ marginTop: 1 }}><IconMapPin /></span>
                <span>{[supplier.address, supplier.city, supplier.country].filter(Boolean).join(", ")}</span>
              </div>
            </div>
          )}

          {/* Financial info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            {[
              { label: "Payment Terms", value: supplier.payment_terms ?? "—", icon: <IconCreditCard /> },
              { label: "Tax Number",    value: supplier.tax_number    ?? "—", icon: <IconTag />        },
              { label: "Credit Limit",  value: formatCurrency(supplier.credit_limit), icon: <IconCreditCard /> },
              { label: "Balance Due",   value: formatCurrency(supplier.balance_due),  icon: <IconCreditCard /> },
            ].map(row => (
              <div key={row.label} style={{ background: "#f5f4f0", borderRadius: 8, padding: "0.65rem 0.85rem" }}>
                <div style={{ fontSize: 10, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
                  {row.icon}{row.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: row.label === "Balance Due" && supplier.balance_due > 0 ? "#dc2626" : "#141410" }}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {supplier.notes && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "0.75rem 0.85rem" }}>
              <div style={{ fontSize: 10, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.5 }}>{supplier.notes}</div>
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
function SupplierFormPanel({ open, onClose, mode, supplier, onSave, saving }: {
  open:      boolean;
  onClose:   () => void;
  mode:      "add" | "edit";
  supplier?: Supplier | null;
  onSave:    (form: SupplierForm) => void;
  saving:    boolean;
}) {
  const blank: SupplierForm = {
    name: "", category: "Other", contact_name: "", email: "",
    phone: "", address: "", city: "", country: "",
    tax_number: "", payment_terms: "Net 30", credit_limit: "0",
    status: "active", notes: "",
  };
  const [form, setForm] = useState<SupplierForm>(blank);
  const prevOpen = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) {
      setForm(mode === "edit" && supplier ? {
        name:          supplier.name,
        category:      supplier.category,
        contact_name:  supplier.contact_name  ?? "",
        email:         supplier.email         ?? "",
        phone:         supplier.phone         ?? "",
        address:       supplier.address       ?? "",
        city:          supplier.city          ?? "",
        country:       supplier.country       ?? "",
        tax_number:    supplier.tax_number    ?? "",
        payment_terms: supplier.payment_terms ?? "Net 30",
        credit_limit:  String(supplier.credit_limit),
        status:        supplier.status,
        notes:         supplier.notes         ?? "",
      } : blank);
    }
    prevOpen.current = open;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const set = (key: keyof SupplierForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const canSave = !!form.name;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 500, background: "#fff", zIndex: 901, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", animation: "panelIn 0.25s ease" }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{mode === "add" ? "New Supplier" : "Edit Supplier"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>

          {/* Basic info */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Supplier Info</div>
            <div>
              <label style={labelStyle}>Company Name *</label>
              <input style={fieldStyle} placeholder="e.g. Nairobi Wholesale Distributors" value={form.name} onChange={set("name")} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select style={fieldStyle} value={form.category} onChange={set("category")}>
                  {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select style={fieldStyle} value={form.status} onChange={set("status")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="blacklisted">Blacklisted</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Contact Details</div>
            <div>
              <label style={labelStyle}>Contact Person</label>
              <input style={fieldStyle} placeholder="e.g. James Kariuki" value={form.contact_name} onChange={set("contact_name")} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={fieldStyle} type="tel" placeholder="+254 7xx xxx xxx" value={form.phone} onChange={set("phone")} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={fieldStyle} type="email" placeholder="supplier@email.com" value={form.email} onChange={set("email")} />
              </div>
            </div>
          </div>

          {/* Location */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Location</div>
            <div>
              <label style={labelStyle}>Address</label>
              <input style={fieldStyle} placeholder="Street address" value={form.address} onChange={set("address")} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>City</label>
                <input style={fieldStyle} placeholder="e.g. Nairobi" value={form.city} onChange={set("city")} />
              </div>
              <div>
                <label style={labelStyle}>Country</label>
                <input style={fieldStyle} placeholder="e.g. Kenya" value={form.country} onChange={set("country")} />
              </div>
            </div>
          </div>

          {/* Financial */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Financial</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Payment Terms</label>
                <select style={fieldStyle} value={form.payment_terms} onChange={set("payment_terms")}>
                  {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Credit Limit</label>
                <input style={fieldStyle} type="number" min="0" step="0.01" placeholder="0.00" value={form.credit_limit} onChange={set("credit_limit")} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Tax / VAT Number</label>
              <input style={fieldStyle} placeholder="e.g. P051234567A" value={form.tax_number} onChange={set("tax_number")} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...fieldStyle, resize: "vertical", minHeight: 72, lineHeight: 1.5 } as React.CSSProperties}
              placeholder="Any additional information about this supplier…"
              value={form.notes} onChange={set("notes")} />
          </div>
        </div>

        <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #e2e0d8", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !canSave}
            style={{ padding: "9px 20px", background: saving || !canSave ? "#9a9a8e" : "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving || !canSave ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "Saving…" : mode === "add" ? "Add Supplier" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Supplier Card (Grid view) ── */
function SupplierCard({ supplier, onView, onEdit, onDelete, formatCurrency }: {
  supplier:       Supplier;
  onView:         () => void;
  onEdit:         () => void;
  onDelete:       () => void;
  formatCurrency: (n: number) => string;
}) {
  const scfg = STATUS_CFG[supplier.status];
  const cat  = getCategoryColor(supplier.category);

  return (
    <div onClick={onView}
      style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", cursor: "pointer", transition: "box-shadow 0.15s" }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}>

      <div style={{ height: 4, background: scfg.dot }} />

      <div style={{ padding: "1rem 1.1rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.55rem" }}>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#141410", lineHeight: 1.3 }}>{supplier.name}</div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", background: scfg.bg, border: `1px solid ${scfg.border}`, borderRadius: 100, fontSize: 10, fontWeight: 600, color: scfg.color, flexShrink: 0 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: scfg.dot }} />{scfg.label}
          </span>
        </div>

        {/* Category */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", background: cat.bg, border: `1px solid ${cat.border}`, borderRadius: 100, fontSize: 10, fontWeight: 600, color: cat.color, alignSelf: "flex-start" }}>
          <IconTag />{supplier.category}
        </span>

        {/* Contact */}
        {supplier.contact_name && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#4a4a40" }}>
            <IconUser />{supplier.contact_name}
          </div>
        )}
        {supplier.phone && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9a9a8e" }}>
            <IconPhone />{supplier.phone}
          </div>
        )}
        {(supplier.city || supplier.country) && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9a9a8e" }}>
            <IconMapPin />{[supplier.city, supplier.country].filter(Boolean).join(", ")}
          </div>
        )}

        {/* Financial footer */}
        <div style={{ marginTop: "auto", paddingTop: 8, borderTop: "1px solid #f0ede6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.4px" }}>Balance Due</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: supplier.balance_due > 0 ? "#dc2626" : "#141410" }}>
              {formatCurrency(supplier.balance_due)}
            </div>
          </div>
          {supplier.payment_terms && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "#4a4a40", background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 100, padding: "2px 7px", fontWeight: 500 }}>
              <IconCreditCard />{supplier.payment_terms}
            </span>
          )}
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
export default function AdminSuppliersPage() {
  const adminUser = getStoredUser();
  const { formatCurrency, config } = useStore();

  const [suppliers,     setSuppliers]     = useState<Supplier[]>([]);
  const [fetching,      setFetching]      = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [viewMode,      setViewMode]      = useState<"grid" | "list">("grid");
  const [search,        setSearch]        = useState("");
  const [catFilter,     setCatFilter]     = useState<string>("all");
  const [statusFilter,  setStatusFilter]  = useState<"all" | Supplier["status"]>("all");
  const [selected,      setSelected]      = useState<Supplier | null>(null);
  const [detailOpen,    setDetailOpen]    = useState(false);
  const [formOpen,      setFormOpen]      = useState(false);
  const [formMode,      setFormMode]      = useState<"add" | "edit">("add");
  const [editTarget,    setEditTarget]    = useState<Supplier | null>(null);
  const [toast,         setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirm,       setConfirm]       = useState({ open: false, title: "", message: "", danger: false, onConfirm: () => {} });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  /* ── Fetch ── */
  const fetchSuppliers = useCallback(async () => {
    if (!adminUser?.id) return;
    setFetching(true);
    try {
      const res  = await fetch(`/api/suppliers?admin_id=${adminUser.id}`);
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch { showToast("Failed to load suppliers", "error"); }
    finally  { setFetching(false); }
  }, [adminUser?.id]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  /* ── Save ── */
  const handleSave = async (form: SupplierForm) => {
    if (!adminUser?.id) return;
    setSaving(true);
    try {
      const isAdd  = formMode === "add";
      const url    = isAdd ? "/api/suppliers" : `/api/suppliers/${editTarget?.id}`;
      const method = isAdd ? "POST" : "PUT";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          credit_limit: Number(form.credit_limit) || 0,
          admin_id: adminUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(isAdd ? "Supplier added" : "Supplier updated");
      setFormOpen(false);
      fetchSuppliers();
    } catch (err) {
      showToast((err as Error).message || "Failed to save", "error");
    } finally { setSaving(false); }
  };

  /* ── Delete ── */
  const handleDelete = (supplier: Supplier) => {
    setConfirm({
      open: true, danger: true,
      title: "Delete Supplier",
      message: `Delete "${supplier.name}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/suppliers/${supplier.id}?admin_id=${adminUser?.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed");
          showToast("Supplier deleted");
          setDetailOpen(false);
          fetchSuppliers();
        } catch { showToast("Failed to delete", "error"); }
      },
    });
  };

  /* ── Filtered ── */
  const allCategories = Array.from(new Set(suppliers.map(s => s.category))).sort();

  const filtered = suppliers.filter(s => {
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contact_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.city ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter    === "all" || s.category === catFilter;
    const matchStatus = statusFilter === "all" || s.status   === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  /* ── Stats ── */
  const totalBalanceDue  = suppliers.reduce((sum, s) => sum + s.balance_due,  0);
  const totalCreditLimit = suppliers.reduce((sum, s) => sum + s.credit_limit, 0);

  const stats = {
    total:      suppliers.length,
    active:     suppliers.filter(s => s.status === "active").length,
    overdue:    suppliers.filter(s => s.balance_due > 0).length,
    balance:    totalBalanceDue,
    credit:     totalCreditLimit,
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
          supplier={selected}
          onClose={() => setDetailOpen(false)}
          onEdit={() => { setFormMode("edit"); setEditTarget(selected); setDetailOpen(false); setFormOpen(true); }}
          onDelete={() => { setDetailOpen(false); handleDelete(selected); }}
          formatCurrency={formatCurrency}
        />
      )}

      <SupplierFormPanel
        open={formOpen} onClose={() => setFormOpen(false)}
        mode={formMode} supplier={editTarget}
        onSave={handleSave} saving={saving}
      />

      {/* Header */}
      <header className="header">
        <div className="header-title">Suppliers</div>
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
          <IconPlus /> Add Supplier
        </button>
      </header>

      <main className="main">

        {/* Stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
          {[
            { label: "Total",        value: stats.total,                    color: "#141410" },
            { label: "Active",       value: stats.active,                   color: "#16a34a" },
            { label: "With Balance", value: stats.overdue,                  color: "#d97706" },
            { label: "Balance Due",  value: formatCurrency(stats.balance),  color: "#dc2626" },
            { label: "Credit Given", value: formatCurrency(stats.credit),   color: "#2563eb" },
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
                placeholder="Search suppliers…"
                style={{ ...fieldStyle, paddingLeft: 32, fontSize: 13 }} />
            </div>

            <div style={{ flex: 1 }} />

            {/* Category filter */}
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              style={{ padding: "6px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 7, fontFamily: "inherit", fontSize: 12, color: "#4a4a40", cursor: "pointer", outline: "none" }}>
              <option value="all">All categories</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Status filter */}
            <div style={{ display: "flex", gap: 5 }}>
              {([{ v: "all", label: "All" }, { v: "active", label: "Active" }, { v: "inactive", label: "Inactive" }, { v: "blacklisted", label: "Blacklisted" }] as const).map(({ v, label }) => (
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
              <div style={{ width: 48, height: 48, background: "#f5f4f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", color: "#c8c6bc" }}><IconBuilding /></div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#9a9a8e", marginBottom: 6 }}>No suppliers found</div>
              <div style={{ fontSize: 12, color: "#c8c6bc" }}>
                {search ? `No results for "${search}"` : "Add your first supplier to get started"}
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
              {filtered.map(s => (
                <SupplierCard key={s.id} supplier={s}
                  onView={() => { setSelected(s); setDetailOpen(true); }}
                  onEdit={() => { setFormMode("edit"); setEditTarget(s); setFormOpen(true); }}
                  onDelete={() => handleDelete(s)}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          ) : (
            /* List view */
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Supplier", "Category", "Contact", "Location", "Payment Terms", "Balance Due", "Credit Limit", "Status", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.6rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const scfg = STATUS_CFG[s.status];
                  const cat  = getCategoryColor(s.category);
                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid #e2e0d8", cursor: "pointer" }}
                      onClick={() => { setSelected(s); setDetailOpen(true); }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ fontWeight: 500 }}>{s.name}</div>
                        {s.email && <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 2 }}>{s.email}</div>}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: cat.bg, border: `1px solid ${cat.border}`, borderRadius: 100, fontSize: 11, fontWeight: 500, color: cat.color }}>
                          <IconTag />{s.category}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40" }}>
                        <div>{s.contact_name ?? "—"}</div>
                        {s.phone && <div style={{ fontSize: 11, color: "#9a9a8e" }}>{s.phone}</div>}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", color: "#9a9a8e", fontSize: 12 }}>
                        {[s.city, s.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40" }}>{s.payment_terms ?? "—"}</td>
                      <td style={{ padding: "0.85rem 1.25rem", fontWeight: 600, color: s.balance_due > 0 ? "#dc2626" : "#141410" }}>
                        {formatCurrency(s.balance_due)}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40" }}>{formatCurrency(s.credit_limit)}</td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: scfg.bg, border: `1px solid ${scfg.border}`, borderRadius: 100, fontSize: 11, fontWeight: 500, color: scfg.color }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: scfg.dot }} />{scfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setFormMode("edit"); setEditTarget(s); setFormOpen(true); }}
                            style={{ padding: "5px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                            <IconEdit /> Edit
                          </button>
                          <button onClick={() => handleDelete(s)}
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