"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/app/_lib/StoreContext";

/* ── Types ── */
interface Service {
  id:           string;
  name:         string;
  category:     string;
  description:  string | null;
  duration:     number;       // minutes
  price:        number;
  deposit:      number;
  is_active:    boolean;
  staff_ids:    string[];
  image_url:    string | null;
  admin_id:     string;
  created_at:   string;
}

interface ServiceForm {
  name:         string;
  category:     string;
  description:  string;
  duration:     string;
  price:        string;
  deposit:      string;
  is_active:    boolean;
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

/* ── Category colours ── */
const CATEGORY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  "Hair":       { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  "Nails":      { bg: "#fdf4ff", color: "#9333ea", border: "#e9d5ff" },
  "Skin":       { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  "Makeup":     { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  "Massage":    { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  "Waxing":     { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  "Other":      { bg: "#f5f4f0", color: "#4a4a40", border: "#c8c6bc" },
};

const DEFAULT_CATEGORIES = ["Hair", "Nails", "Skin", "Makeup", "Massage", "Waxing", "Other"];

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS["Other"];
}

/* ── Helpers ── */
function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
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
function IconScissors() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>; }
function IconClock()    { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function IconTag()      { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>; }
function IconWarning()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function IconGrid()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>; }
function IconList()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>; }
function IconEdit()     { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function IconTrash()    { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>; }

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

/* ── Service Form Panel ── */
function ServiceFormPanel({ open, onClose, mode, service, onSave, saving }: {
  open:     boolean;
  onClose:  () => void;
  mode:     "add" | "edit";
  service?: Service | null;
  onSave:   (form: ServiceForm) => void;
  saving:   boolean;
}) {
  const blank: ServiceForm = {
    name: "", category: "Hair", description: "",
    duration: "60", price: "", deposit: "0", is_active: true,
  };
  const [form, setForm] = useState<ServiceForm>(blank);
  const [customCategory, setCustomCategory] = useState("");
  const prevOpen = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) {
      setForm(mode === "edit" && service ? {
        name:        service.name,
        category:    service.category,
        description: service.description ?? "",
        duration:    String(service.duration),
        price:       String(service.price),
        deposit:     String(service.deposit),
        is_active:   service.is_active,
      } : blank);
      setCustomCategory("");
    }
    prevOpen.current = open;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const set = (key: keyof ServiceForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const canSave = !!form.name && !!form.price && !!form.duration;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 480, background: "#fff", zIndex: 901, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", animation: "panelIn 0.25s ease" }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{mode === "add" ? "New Service" : "Edit Service"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>

          {/* Basic Info */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Service Info</div>
            <div>
              <label style={labelStyle}>Service Name *</label>
              <input style={fieldStyle} placeholder="e.g. Haircut & Blow Dry" value={form.name} onChange={set("name")} />
            </div>
            <div>
              <label style={labelStyle}>Category *</label>
              <select style={fieldStyle} value={form.category} onChange={set("category")}>
                {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...fieldStyle, resize: "vertical", minHeight: 72, lineHeight: 1.5 } as React.CSSProperties}
                placeholder="Brief description of what's included…"
                value={form.description} onChange={set("description")} />
            </div>
          </div>

          {/* Schedule */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Duration</div>
            <div>
              <label style={labelStyle}>Duration (minutes) *</label>
              <select style={fieldStyle} value={form.duration} onChange={set("duration")}>
                {[15, 30, 45, 60, 75, 90, 120, 150, 180, 240].map(d => (
                  <option key={d} value={d}>{formatDuration(d)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pricing</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Price *</label>
                <input style={fieldStyle} type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={set("price")} />
              </div>
              <div>
                <label style={labelStyle}>Deposit</label>
                <input style={fieldStyle} type="number" min="0" step="0.01" placeholder="0.00" value={form.deposit} onChange={set("deposit")} />
              </div>
            </div>
            {form.deposit && Number(form.deposit) > 0 && Number(form.price) > 0 && (
              <div style={{ fontSize: 12, color: "#9a9a8e" }}>
                Deposit is <strong style={{ color: "#141410" }}>{Math.round((Number(form.deposit) / Number(form.price)) * 100)}%</strong> of the service price.
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f5f4f0", borderRadius: 10, padding: "0.85rem 1rem" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#141410" }}>Active</div>
              <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 2 }}>Visible for booking when active</div>
            </div>
            <Toggle checked={form.is_active} onChange={() => setForm(f => ({ ...f, is_active: !f.is_active }))} />
          </div>
        </div>

        <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #e2e0d8", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !canSave}
            style={{ padding: "9px 20px", background: saving || !canSave ? "#9a9a8e" : "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving || !canSave ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "Saving…" : mode === "add" ? "Add Service" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Service Card (Grid view) ── */
function ServiceCard({ service, onEdit, onDelete, onToggle, formatCurrency }: {
  service: Service; onEdit: () => void; onDelete: () => void; onToggle: () => void; formatCurrency: (n: number) => string;
}) {
  const cat = getCategoryColor(service.category);
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", opacity: service.is_active ? 1 : 0.6, transition: "box-shadow 0.15s" }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}>

      {/* Colour bar */}
      <div style={{ height: 4, background: cat.color }} />

      <div style={{ padding: "1rem 1.1rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {/* Category badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: cat.bg, border: `1px solid ${cat.border}`, borderRadius: 100, fontSize: 10, fontWeight: 600, color: cat.color }}>
            <IconTag />{service.category}
          </span>
          <Toggle checked={service.is_active} onChange={onToggle} />
        </div>

        {/* Name */}
        <div style={{ fontSize: 14, fontWeight: 600, color: "#141410", lineHeight: 1.3 }}>{service.name}</div>

        {/* Description */}
        {service.description && (
          <div style={{ fontSize: 12, color: "#9a9a8e", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {service.description}
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "auto", paddingTop: 4 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#9a9a8e" }}>
            <IconClock />{formatDuration(service.duration)}
          </span>
          {service.deposit > 0 && (
            <span style={{ fontSize: 10, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 100, padding: "1px 6px", fontWeight: 500 }}>
              Deposit: {formatCurrency(service.deposit)}
            </span>
          )}
        </div>

        {/* Price */}
        <div style={{ fontSize: 18, fontWeight: 700, color: "#141410", letterSpacing: "-0.5px" }}>
          {formatCurrency(service.price)}
        </div>
      </div>

      {/* Actions */}
      <div style={{ borderTop: "1px solid #e2e0d8", display: "flex" }}>
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
export default function AdminServicesPage() {
  const adminUser = getStoredUser();
  const { formatCurrency, config } = useStore();

  const [services,    setServices]    = useState<Service[]>([]);
  const [fetching,    setFetching]    = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [viewMode,    setViewMode]    = useState<"grid" | "list">("grid");
  const [search,      setSearch]      = useState("");
  const [catFilter,   setCatFilter]   = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [formOpen,    setFormOpen]    = useState(false);
  const [formMode,    setFormMode]    = useState<"add" | "edit">("add");
  const [editTarget,  setEditTarget]  = useState<Service | null>(null);
  const [toast,       setToast]       = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirm,     setConfirm]     = useState({ open: false, title: "", message: "", danger: false, onConfirm: () => {} });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  /* ── Fetch ── */
  const fetchServices = useCallback(async () => {
    if (!adminUser?.id) return;
    setFetching(true);
    try {
      const res  = await fetch(`/api/services?admin_id=${adminUser.id}`);
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch { showToast("Failed to load services", "error"); }
    finally  { setFetching(false); }
  }, [adminUser?.id]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  /* ── Save ── */
  const handleSave = async (form: ServiceForm) => {
    if (!adminUser?.id) return;
    setSaving(true);
    try {
      const isAdd  = formMode === "add";
      const url    = isAdd ? "/api/services" : `/api/services/${editTarget?.id}`;
      const method = isAdd ? "POST" : "PUT";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          duration: Number(form.duration),
          price:    Number(form.price),
          deposit:  Number(form.deposit || 0),
          admin_id: adminUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(isAdd ? "Service added" : "Service updated");
      setFormOpen(false);
      fetchServices();
    } catch (err) {
      showToast((err as Error).message || "Failed to save", "error");
    } finally { setSaving(false); }
  };

  /* ── Toggle active ── */
  const handleToggle = async (service: Service) => {
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...service, is_active: !service.is_active, admin_id: adminUser?.id }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(service.is_active ? "Service deactivated" : "Service activated");
      fetchServices();
    } catch { showToast("Failed to update service", "error"); }
  };

  /* ── Delete ── */
  const handleDelete = (service: Service) => {
    setConfirm({
      open: true, danger: true,
      title: "Delete Service",
      message: `Delete "${service.name}"? This cannot be undone and may affect existing appointments.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/services/${service.id}?admin_id=${adminUser?.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed");
          showToast("Service deleted");
          fetchServices();
        } catch { showToast("Failed to delete", "error"); }
      },
    });
  };

  /* ── Filtered ── */
  const allCategories = Array.from(new Set(services.map(s => s.category))).sort();

  const filtered = services.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter === "all" || s.category === catFilter;
    const matchActive = activeFilter === "all" || (activeFilter === "active" ? s.is_active : !s.is_active);
    return matchSearch && matchCat && matchActive;
  });

  /* ── Stats ── */
  const stats = {
    total:    services.length,
    active:   services.filter(s => s.is_active).length,
    inactive: services.filter(s => !s.is_active).length,
    avgPrice: services.length ? services.reduce((s, v) => s + v.price, 0) / services.length : 0,
    categories: allCategories.length,
  };

  const dater = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    timeZone: config?.timezone,
  }).format(new Date());

  return (
    <>
      {toast   && <Toast msg={toast.msg} type={toast.type} />}
      <ConfirmModal {...confirm} onCancel={() => setConfirm(c => ({ ...c, open: false }))} />

      <ServiceFormPanel
        open={formOpen} onClose={() => setFormOpen(false)}
        mode={formMode} service={editTarget}
        onSave={handleSave} saving={saving}
      />

      {/* Header */}
      <header className="header">
        <div className="header-title">Services</div>
        <div className="header-date">{dater}</div>

        {/* View toggle */}
        <div style={{ display: "flex", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 8, overflow: "hidden" }}>
          {([ { v: "grid" as const, icon: <IconGrid />, label: "Grid" }, { v: "list" as const, icon: <IconList />, label: "List" } ]).map(({ v, icon, label }) => (
            <button key={v} onClick={() => setViewMode(v)}
              style={{ padding: "6px 12px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500, background: viewMode === v ? "#141410" : "transparent", color: viewMode === v ? "#fff" : "#4a4a40", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}>
              {icon} {label}
            </button>
          ))}
        </div>

        <button onClick={() => { setFormMode("add"); setEditTarget(null); setFormOpen(true); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#141410", color: "#fff", border: "none", borderRadius: 7, fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <IconPlus /> Add Service
        </button>
      </header>

      <main className="main">

        {/* Stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
          {[
            { label: "Total",      value: stats.total,                  color: "#141410" },
            { label: "Active",     value: stats.active,                 color: "#16a34a" },
            { label: "Inactive",   value: stats.inactive,               color: "#9a9a8e" },
            { label: "Categories", value: stats.categories,             color: "#2563eb" },
            { label: "Avg Price",  value: formatCurrency(stats.avgPrice), color: "#141410" },
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
            <div style={{ position: "relative", minWidth: 200, flex: 1, maxWidth: 280 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9a9a8e", display: "flex" }}><IconSearch /></span>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search services…"
                style={{ ...fieldStyle, paddingLeft: 32, fontSize: 13 }}
              />
            </div>

            <div style={{ flex: 1 }} />

            {/* Category filter */}
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              style={{ padding: "6px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 7, fontFamily: "inherit", fontSize: 12, color: "#4a4a40", cursor: "pointer", outline: "none" }}>
              <option value="all">All categories</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Active filter */}
            <div style={{ display: "flex", gap: 5 }}>
              {(["all", "active", "inactive"] as const).map(f => (
                <button key={f} onClick={() => setActiveFilter(f)}
                  style={{ padding: "5px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: activeFilter === f ? "#141410" : "#f5f4f0", color: activeFilter === f ? "#fff" : "#4a4a40", border: activeFilter === f ? "1px solid #141410" : "1px solid #c8c6bc", transition: "all 0.15s", textTransform: "capitalize" }}>
                  {f}
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
              <div style={{ width: 48, height: 48, background: "#f5f4f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", color: "#c8c6bc" }}><IconScissors /></div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#9a9a8e", marginBottom: 6 }}>No services found</div>
              <div style={{ fontSize: 12, color: "#c8c6bc" }}>
                {search ? `No results for "${search}"` : "Add your first service to get started"}
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
              {filtered.map(s => (
                <ServiceCard key={s.id} service={s}
                  onEdit={() => { setFormMode("edit"); setEditTarget(s); setFormOpen(true); }}
                  onDelete={() => handleDelete(s)}
                  onToggle={() => handleToggle(s)}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          ) : (
            /* List view */
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Service", "Category", "Duration", "Price", "Deposit", "Status", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.6rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const cat = getCategoryColor(s.category);
                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid #e2e0d8" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ fontWeight: 500 }}>{s.name}</div>
                        {s.description && <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 2, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.description}</div>}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: cat.bg, border: `1px solid ${cat.border}`, borderRadius: 100, fontSize: 11, fontWeight: 500, color: cat.color }}>
                          <IconTag />{s.category}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IconClock />{formatDuration(s.duration)}</span>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", fontWeight: 600 }}>{formatCurrency(s.price)}</td>
                      <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40" }}>{s.deposit > 0 ? formatCurrency(s.deposit) : "—"}</td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Toggle checked={s.is_active} onChange={() => handleToggle(s)} />
                          <span style={{ fontSize: 11, color: s.is_active ? "#16a34a" : "#9a9a8e" }}>{s.is_active ? "Active" : "Inactive"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
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