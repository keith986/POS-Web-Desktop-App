"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/app/_lib/StoreContext";

/* ── Types ── */
interface MenuItem {
  id:           string;
  name:         string;
  description:  string | null;
  category:     string;
  price:        number;
  cost:         number | null;
  calories:     number | null;
  prep_time:    number | null;       // minutes
  is_available: boolean;
  is_featured:  boolean;
  tags:         string[];            // e.g. ["vegan","spicy","gluten-free"]
  admin_id:     string;
  created_at:   string;
  updated_at:   string;
}

interface MenuForm {
  name:         string;
  description:  string;
  category:     string;
  price:        string;
  cost:         string;
  calories:     string;
  prep_time:    string;
  is_featured:  boolean;
  tags:         string;              // comma-separated
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

const MENU_CATEGORIES = [
  "All", "Starters", "Soups & Salads", "Mains", "Grills",
  "Pasta & Rice", "Burgers & Sandwiches", "Pizza",
  "Sides", "Desserts", "Drinks", "Specials", "Other",
];

const DIETARY_TAGS = ["Vegan", "Vegetarian", "Gluten-Free", "Spicy", "Halal", "Dairy-Free", "Nut-Free"];

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
function IconPlus() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function IconRefresh() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;
}
function IconEdit() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
function IconTrash() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
}
function IconStar() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
function IconClock() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function IconFire() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>;
}
function IconWarning() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}
function IconGrid() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
}
function IconList() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
}

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

/* ── Spinner ── */
function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", color: "#9a9a8e", fontSize: 13, gap: 10 }}>
      <div style={{ width: 18, height: 18, border: "2px solid #e2e0d8", borderTopColor: "#141410", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      Loading menu…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Confirm Modal ── */
function ConfirmModal({ open, title, message, danger, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; danger: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 14, padding: "1.75rem", width: "100%", maxWidth: 400, zIndex: 1001, boxShadow: "0 24px 60px rgba(0,0,0,0.18)", animation: "slideUp 0.2s ease" }}>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translate(-50%,-46%)}to{opacity:1;transform:translate(-50%,-50%)}}`}</style>
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

/* ── Menu Item Panel (Add / Edit) ── */
function MenuPanel({ open, onClose, mode, item, onSave, saving, formatCurrency }: {
  open:           boolean;
  onClose:        () => void;
  mode:           "add" | "edit";
  item?:          MenuItem | null;
  onSave:         (form: MenuForm) => void;
  saving:         boolean;
  formatCurrency: (n: number) => string;
}) {
  const blank: MenuForm = { name: "", description: "", category: "Mains", price: "", cost: "", calories: "", prep_time: "", is_featured: false, tags: "" };
  const [form, setForm] = useState<MenuForm>(blank);
  const prevOpen = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) {
      setForm(mode === "edit" && item ? {
        name:        item.name,
        description: item.description ?? "",
        category:    item.category,
        price:       String(item.price),
        cost:        item.cost != null ? String(item.cost) : "",
        calories:    item.calories != null ? String(item.calories) : "",
        prep_time:   item.prep_time != null ? String(item.prep_time) : "",
        is_featured: item.is_featured,
        tags:        item.tags.join(", "),
      } : blank);
    }
    prevOpen.current = open;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const set = (key: keyof MenuForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const profit = form.price && form.cost
    ? ((Number(form.price) - Number(form.cost)) / Number(form.price) * 100).toFixed(0)
    : null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 500, background: "#fff", zIndex: 901, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", animation: "panelIn 0.25s ease" }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{mode === "add" ? "Add Menu Item" : "Edit Menu Item"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e" }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.1rem" }}>

          {/* Name */}
          <div>
            <label style={labelStyle}>Item Name *</label>
            <input style={fieldStyle} placeholder="e.g. Grilled Chicken Burger" value={form.name} onChange={set("name")} />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...fieldStyle, resize: "vertical", minHeight: 72, lineHeight: 1.5 } as React.CSSProperties} placeholder="Brief description of the dish…" value={form.description} onChange={set("description")} />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category *</label>
            <select style={fieldStyle} value={form.category} onChange={set("category")}>
              {MENU_CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Price + Cost */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
            <div>
              <label style={labelStyle}>Selling Price *</label>
              <input style={fieldStyle} type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={set("price")} />
            </div>
            <div>
              <label style={labelStyle}>Cost Price</label>
              <input style={fieldStyle} type="number" min="0" step="0.01" placeholder="0.00" value={form.cost} onChange={set("cost")} />
            </div>
          </div>

          {/* Profit margin preview */}
          {profit !== null && (
            <div style={{ background: Number(profit) >= 60 ? "#f0fdf4" : Number(profit) >= 30 ? "#fffbeb" : "#fef2f2", border: `1px solid ${Number(profit) >= 60 ? "#bbf7d0" : Number(profit) >= 30 ? "#fde68a" : "#fecaca"}`, borderRadius: 8, padding: "0.65rem 1rem", fontSize: 12, color: Number(profit) >= 60 ? "#16a34a" : Number(profit) >= 30 ? "#d97706" : "#dc2626" }}>
              Profit margin: <strong>{profit}%</strong>
              {Number(profit) < 30 && " — Consider reviewing your pricing"}
            </div>
          )}

          {/* Calories + Prep time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
            <div>
              <label style={labelStyle}>Calories (kcal)</label>
              <input style={fieldStyle} type="number" min="0" placeholder="e.g. 650" value={form.calories} onChange={set("calories")} />
            </div>
            <div>
              <label style={labelStyle}>Prep Time (mins)</label>
              <input style={fieldStyle} type="number" min="0" placeholder="e.g. 15" value={form.prep_time} onChange={set("prep_time")} />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label style={labelStyle}>Dietary Tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {DIETARY_TAGS.map(tag => {
                const active = form.tags.toLowerCase().split(",").map(t => t.trim()).includes(tag.toLowerCase());
                return (
                  <button key={tag} type="button" onClick={() => {
                    const current = form.tags.split(",").map(t => t.trim()).filter(Boolean);
                    const next = active ? current.filter(t => t.toLowerCase() !== tag.toLowerCase()) : [...current, tag];
                    setForm(f => ({ ...f, tags: next.join(", ") }));
                  }} style={{ padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: active ? "#141410" : "#f5f4f0", color: active ? "#fff" : "#4a4a40", border: active ? "1px solid #141410" : "1px solid #c8c6bc", transition: "all 0.15s" }}>
                    {tag}
                  </button>
                );
              })}
            </div>
            <input style={{ ...fieldStyle, fontSize: 12 }} placeholder="Or type custom tags, comma separated" value={form.tags} onChange={set("tags")} />
          </div>

          {/* Featured toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f5f4f0", borderRadius: 8, padding: "0.75rem 1rem" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Featured Item</div>
              <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 2 }}>Highlighted at the top of the menu</div>
            </div>
            <Toggle checked={form.is_featured} onChange={() => setForm(f => ({ ...f, is_featured: !f.is_featured }))} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #e2e0d8", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.name || !form.price} style={{ padding: "9px 20px", background: saving || !form.name || !form.price ? "#9a9a8e" : "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "Saving…" : mode === "add" ? "Add to Menu" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Menu Item Card ── */
function MenuCard({ item, onEdit, onDelete, onToggleAvail, onToggleFeatured, formatCurrency }: {
  item:             MenuItem;
  onEdit:           () => void;
  onDelete:         () => void;
  onToggleAvail:    () => void;
  onToggleFeatured: () => void;
  formatCurrency:   (n: number) => string;
}) {
  const margin = item.cost ? ((item.price - item.cost) / item.price * 100).toFixed(0) : null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${item.is_available ? "#e2e0d8" : "#fecaca"}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", opacity: item.is_available ? 1 : 0.75, transition: "box-shadow 0.15s" }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}>

      {/* Colour bar — green available, red unavailable */}
      <div style={{ height: 3, background: item.is_available ? "#16a34a" : "#dc2626" }} />

      <div style={{ padding: "0.9rem", flex: 1 }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
              {item.is_featured && (
                <span style={{ color: "#d97706" }}><IconStar /></span>
              )}
              <span style={{ fontSize: 14, fontWeight: 600, color: "#141410", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
            </div>
            <span style={{ fontSize: 10, background: "#f5f4f0", color: "#4a4a40", border: "1px solid #e2e0d8", padding: "1px 7px", borderRadius: 4 }}>{item.category}</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#141410", flexShrink: 0 }}>{formatCurrency(item.price)}</div>
        </div>

        {/* Description */}
        {item.description && (
          <p style={{ fontSize: 11, color: "#9a9a8e", lineHeight: 1.5, margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
            {item.description}
          </p>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          {item.prep_time && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "#9a9a8e" }}>
              <IconClock /> {item.prep_time}m
            </span>
          )}
          {item.calories && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "#9a9a8e" }}>
              <IconFire /> {item.calories} kcal
            </span>
          )}
          {margin !== null && (
            <span style={{ fontSize: 10, fontWeight: 600, color: Number(margin) >= 60 ? "#16a34a" : Number(margin) >= 30 ? "#d97706" : "#dc2626", background: Number(margin) >= 60 ? "#f0fdf4" : Number(margin) >= 30 ? "#fffbeb" : "#fef2f2", padding: "1px 7px", borderRadius: 100, marginLeft: "auto" }}>
              {margin}% margin
            </span>
          )}
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {item.tags.map(tag => (
              <span key={tag} style={{ fontSize: 9, fontWeight: 600, color: "#4a4a40", background: "#f5f4f0", border: "1px solid #e2e0d8", padding: "1px 6px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "0.6rem 0.9rem", borderTop: "1px solid #f0ede6", display: "flex", alignItems: "center", gap: 6, background: "#fafaf8" }}>
        {/* Available toggle */}
        <Toggle checked={item.is_available} onChange={onToggleAvail} />
        <span style={{ fontSize: 11, color: item.is_available ? "#16a34a" : "#dc2626", fontWeight: 500, flex: 1 }}>
          {item.is_available ? "Available" : "Unavailable"}
        </span>
        <button onClick={onToggleFeatured} title={item.is_featured ? "Unfeature" : "Feature"} style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: item.is_featured ? "#fffbeb" : "#f5f4f0", border: `1px solid ${item.is_featured ? "#fde68a" : "#e2e0d8"}`, borderRadius: 6, cursor: "pointer", color: item.is_featured ? "#d97706" : "#9a9a8e" }}>
          <IconStar />
        </button>
        <button onClick={onEdit} style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 6, cursor: "pointer", color: "#4a4a40" }}>
          <IconEdit />
        </button>
        <button onClick={onDelete} style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", color: "#dc2626" }}>
          <IconTrash />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function AdminMenuPage() {
  const adminUser = getStoredUser();
  const { formatCurrency, config } = useStore();

  const [items,        setItems]       = useState<MenuItem[]>([]);
  const [fetching,     setFetching]    = useState(true);
  const [saving,       setSaving]      = useState(false);
  const [view,         setView]        = useState<"grid" | "list">("grid");
  const [catFilter,    setCatFilter]   = useState("All");
  const [availFilter,  setAvailFilter] = useState<"all" | "available" | "unavailable">("all");
  const [search,       setSearch]      = useState("");
  const [panelOpen,    setPanelOpen]   = useState(false);
  const [panelMode,    setPanelMode]   = useState<"add" | "edit">("add");
  const [editTarget,   setEditTarget]  = useState<MenuItem | null>(null);
  const [toast,        setToast]       = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirm,      setConfirm]     = useState({ open: false, title: "", message: "", danger: false, onConfirm: () => {} });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Fetch ── */
  const fetchItems = useCallback(async () => {
    if (!adminUser?.id) return;
    setFetching(true);
    try {
      const res  = await fetch(`/api/menu?admin_id=${adminUser.id}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { showToast("Failed to load menu", "error"); }
    finally  { setFetching(false); }
  }, [adminUser?.id]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  /* ── Save ── */
  const handleSave = async (form: MenuForm) => {
    if (!adminUser?.id) return;
    if (!form.name || !form.price) return showToast("Name and price are required", "error");

    setSaving(true);
    try {
      const isAdd  = panelMode === "add";
      const url    = isAdd ? "/api/menu" : `/api/menu/${editTarget?.id}`;
      const method = isAdd ? "POST" : "PUT";
      const tags   = form.tags.split(",").map(t => t.trim()).filter(Boolean);

      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         form.name,
          description:  form.description || null,
          category:     form.category,
          price:        Number(form.price),
          cost:         form.cost         ? Number(form.cost)       : null,
          calories:     form.calories     ? Number(form.calories)   : null,
          prep_time:    form.prep_time    ? Number(form.prep_time)  : null,
          is_featured:  form.is_featured,
          is_available: true,
          tags,
          admin_id: adminUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(isAdd ? "Item added to menu" : "Menu item updated");
      setPanelOpen(false);
      fetchItems();
    } catch (err) {
      showToast((err as Error).message || "Failed to save", "error");
    } finally { setSaving(false); }
  };

  /* ── Toggle availability ── */
  const handleToggleAvail = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/menu/${item.id}/status`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: !item.is_available, admin_id: adminUser?.id }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(`"${item.name}" marked as ${!item.is_available ? "available" : "unavailable"}`);
      fetchItems();
    } catch { showToast("Failed to update availability", "error"); }
  };

  /* ── Toggle featured ── */
  const handleToggleFeatured = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/menu/${item.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured: !item.is_featured, admin_id: adminUser?.id }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(`"${item.name}" ${!item.is_featured ? "featured" : "unfeatured"}`);
      fetchItems();
    } catch { showToast("Failed to update", "error"); }
  };

  /* ── Delete ── */
  const handleDelete = (item: MenuItem) => {
    setConfirm({
      open: true, danger: true,
      title: "Delete Menu Item",
      message: `Permanently delete "${item.name}" from the menu? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/menu/${item.id}?admin_id=${adminUser?.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed");
          showToast(`"${item.name}" removed from menu`);
          fetchItems();
        } catch { showToast("Failed to delete", "error"); }
      },
    });
  };

  /* ── Filtered ── */
  const filtered = items.filter(item => {
    const matchCat   = catFilter === "All" || item.category === catFilter;
    const matchAvail = availFilter === "all" || (availFilter === "available" ? item.is_available : !item.is_available);
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchAvail && matchSearch;
  });

  /* ── Categories that have items ── */
  const activeCats = ["All", ...Array.from(new Set(items.map(i => i.category))).sort()];

  /* ── Stats ── */
  const stats = {
    total:       items.length,
    available:   items.filter(i => i.is_available).length,
    unavailable: items.filter(i => !i.is_available).length,
    featured:    items.filter(i => i.is_featured).length,
    avgPrice:    items.length ? items.reduce((s, i) => s + i.price, 0) / items.length : 0,
  };

  const dater = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: config.timezone }).format(new Date());

  return (
    <>
      {toast   && <Toast msg={toast.msg} type={toast.type} />}
      <ConfirmModal {...confirm} onCancel={() => setConfirm(c => ({ ...c, open: false }))} />
      <MenuPanel
        open={panelOpen} onClose={() => setPanelOpen(false)}
        mode={panelMode} item={editTarget}
        onSave={handleSave} saving={saving}
        formatCurrency={formatCurrency}
      />

      {/* Header */}
      <header className="header">
        <div className="header-title">Menu</div>
        <div className="header-date">{dater}</div>
        <button onClick={fetchItems} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "#fff", color: "#141410", border: "1px solid #c8c6bc", borderRadius: 7, fontFamily: "inherit", fontSize: 13, cursor: "pointer" }}>
          <IconRefresh /> Refresh
        </button>
        <button onClick={() => { setPanelMode("add"); setEditTarget(null); setPanelOpen(true); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#141410", color: "#fff", border: "none", borderRadius: 7, fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <IconPlus /> Add Item
        </button>
      </header>

      <main className="main">

        {/* Stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
          {[
            { label: "Total Items",   value: stats.total,                       color: "#141410" },
            { label: "Available",     value: stats.available,                   color: "#16a34a" },
            { label: "Unavailable",   value: stats.unavailable,                 color: "#dc2626" },
            { label: "Featured",      value: stats.featured,                    color: "#d97706" },
            { label: "Avg Price",     value: formatCurrency(stats.avgPrice),    color: "#2563eb" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "0.9rem 1rem" }}>
              <div style={{ fontSize: 10, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.color, letterSpacing: "-0.5px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Menu card */}
        <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

            {/* Search */}
            <div style={{ flex: 1, minWidth: 180, display: "flex", alignItems: "center", gap: 8, background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 8, padding: "0 10px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9a9a8e" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input style={{ flex: 1, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: "#141410", outline: "none", padding: "7px 0" }} placeholder="Search items, tags, categories…" value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9a9a8e", fontSize: 16 }}>×</button>}
            </div>

            {/* Availability filter */}
            <div style={{ display: "flex", gap: 5 }}>
              {(["all", "available", "unavailable"] as const).map(f => (
                <button key={f} onClick={() => setAvailFilter(f)} style={{ padding: "5px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: availFilter === f ? "#141410" : "#f5f4f0", color: availFilter === f ? "#fff" : "#4a4a40", border: availFilter === f ? "1px solid #141410" : "1px solid #c8c6bc", fontWeight: availFilter === f ? 500 : 400, transition: "all 0.15s" }}>
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div style={{ display: "flex", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 7, overflow: "hidden" }}>
              {(["grid", "list"] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{ padding: "6px 12px", border: "none", cursor: "pointer", fontSize: 12, fontFamily: "inherit", background: view === v ? "#141410" : "transparent", color: view === v ? "#fff" : "#4a4a40" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {v === "grid" ? <><IconGrid /> Cards</> : <><IconList /> List</>}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Category tabs */}
          <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid #e2e0d8", display: "flex", gap: 5, flexWrap: "wrap", background: "#fafaf8" }}>
            {activeCats.map(c => (
              <button key={c} onClick={() => setCatFilter(c)} style={{ padding: "4px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: catFilter === c ? "#141410" : "transparent", color: catFilter === c ? "#fff" : "#4a4a40", border: catFilter === c ? "1px solid #141410" : "1px solid transparent", fontWeight: catFilter === c ? 500 : 400, transition: "all 0.15s" }}>
                {c}
                {c !== "All" && <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.6 }}>{items.filter(i => i.category === c).length}</span>}
              </button>
            ))}
          </div>

          {/* Content */}
          {fetching ? <Spinner /> : filtered.length === 0 ? (
            <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9a9a8e" strokeWidth="1.5" strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>{items.length === 0 ? "No menu items yet" : "No items match your filters"}</div>
              <div style={{ fontSize: 13, color: "#9a9a8e", marginBottom: "1.25rem" }}>{items.length === 0 ? "Start building your menu by adding your first dish" : "Try clearing your search or filters"}</div>
              {items.length === 0 && (
                <button onClick={() => { setPanelMode("add"); setEditTarget(null); setPanelOpen(true); }} style={{ padding: "8px 20px", background: "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconPlus /> Add First Item</span>
                </button>
              )}
            </div>
          ) : view === "grid" ? (

            /* ── GRID VIEW — grouped by category ── */
            <div style={{ padding: "1.5rem" }}>
              {/* Featured items first */}
              {(() => {
                const featured = filtered.filter(i => i.is_featured);
                if (featured.length === 0 || catFilter !== "All") return null;
                return (
                  <div style={{ marginBottom: "2rem" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#d97706", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: 8 }}>
                      <IconStar />
                      Featured
                      <div style={{ height: 1, flex: 1, background: "#fde68a" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.85rem" }}>
                      {featured.map(item => (
                        <MenuCard key={item.id} item={item} formatCurrency={formatCurrency}
                          onEdit={() => { setPanelMode("edit"); setEditTarget(item); setPanelOpen(true); }}
                          onDelete={() => handleDelete(item)}
                          onToggleAvail={() => handleToggleAvail(item)}
                          onToggleFeatured={() => handleToggleFeatured(item)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Remaining grouped by category */}
              {Array.from(new Set(filtered.map(i => i.category))).sort().map(cat => {
                const catItems = filtered.filter(i => i.category === cat && (catFilter !== "All" || !i.is_featured));
                if (catItems.length === 0) return null;
                return (
                  <div key={cat} style={{ marginBottom: "2rem" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#9a9a8e", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ height: 1, width: 20, background: "#e2e0d8" }} />
                      {cat}
                      <div style={{ height: 1, flex: 1, background: "#e2e0d8" }} />
                      <span style={{ fontWeight: 400, color: "#c8c6bc" }}>{catItems.length}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.85rem" }}>
                      {catItems.map(item => (
                        <MenuCard key={item.id} item={item} formatCurrency={formatCurrency}
                          onEdit={() => { setPanelMode("edit"); setEditTarget(item); setPanelOpen(true); }}
                          onDelete={() => handleDelete(item)}
                          onToggleAvail={() => handleToggleAvail(item)}
                          onToggleFeatured={() => handleToggleFeatured(item)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          ) : (

            /* ── LIST VIEW ── */
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Item", "Category", "Price", "Margin", "Prep", "Tags", "Available", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.6rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const margin = item.cost ? ((item.price - item.cost) / item.price * 100).toFixed(0) : null;
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #e2e0d8", opacity: item.is_available ? 1 : 0.65 }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {item.is_featured && <span style={{ color: "#d97706", flexShrink: 0 }}><IconStar /></span>}
                          <div>
                            <div style={{ fontWeight: 500, color: "#141410" }}>{item.name}</div>
                            {item.description && <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 1, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <span style={{ fontSize: 11, background: "#f5f4f0", padding: "2px 8px", borderRadius: 5, color: "#4a4a40", border: "1px solid #e2e0d8" }}>{item.category}</span>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", fontWeight: 600, color: "#141410" }}>{formatCurrency(item.price)}</td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        {margin ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: Number(margin) >= 60 ? "#16a34a" : Number(margin) >= 30 ? "#d97706" : "#dc2626" }}>{margin}%</span>
                        ) : <span style={{ color: "#c8c6bc" }}>—</span>}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40" }}>
                        {item.prep_time ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IconClock /> {item.prep_time}m</span> : <span style={{ color: "#c8c6bc" }}>—</span>}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {item.tags.slice(0, 3).map(t => (
                            <span key={t} style={{ fontSize: 9, color: "#4a4a40", background: "#f5f4f0", border: "1px solid #e2e0d8", padding: "1px 5px", borderRadius: 100 }}>{t}</span>
                          ))}
                          {item.tags.length > 3 && <span style={{ fontSize: 9, color: "#9a9a8e" }}>+{item.tags.length - 3}</span>}
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <Toggle checked={item.is_available} onChange={() => handleToggleAvail(item)} />
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setPanelMode("edit"); setEditTarget(item); setPanelOpen(true); }} style={{ padding: "5px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 6, fontSize: 12, color: "#141410", cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
                          <button onClick={() => handleDelete(item)} style={{ padding: "5px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
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
              <span>Showing {filtered.length} of {items.length} item{items.length !== 1 ? "s" : ""}</span>
              <span>{filtered.filter(i => i.is_available).length} available · {filtered.filter(i => i.is_featured).length} featured</span>
            </div>
          )}
        </div>
      </main>
    </>
  );
}