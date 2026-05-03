"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/app/_lib/StoreContext";

/* ── Types ── */
interface Table {
  id:          string;
  table_number: number;
  label:        string;
  capacity:     number;
  status:       "available" | "occupied" | "reserved" | "cleaning";
  section:      string;
  current_order_id: string | null;
  admin_id:     string;
  updated_at:   string;
}

interface TableForm {
  label:    string;
  capacity: string;
  section:  string;
}

interface StoredUser {
  id:        string;
  full_name: string;
  role:      string;
  store_name: string | null;
}

function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("user") ?? "null"); }
  catch { return null; }
}

/* ── Status config ── */
const STATUS_CFG = {
  available: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", dot: "#16a34a", label: "Available" },
  occupied:  { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", dot: "#dc2626", label: "Occupied"  },
  reserved:  { bg: "#fffbeb", color: "#d97706", border: "#fde68a", dot: "#d97706", label: "Reserved"  },
  cleaning:  { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", dot: "#2563eb", label: "Cleaning"  },
} as const;

type TableStatus = keyof typeof STATUS_CFG;

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
function IconUsers() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
}
function IconEdit() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
function IconTrash() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
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

/* ── Toast ── */
function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div style={{ position: "fixed", bottom: "2rem", right: "2rem", background: type === "error" ? "#dc2626" : "#141410", color: "#fff", padding: "0.85rem 1.25rem", borderRadius: 10, fontSize: 13, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 30px rgba(0,0,0,0.2)", animation: "toastIn 0.3s ease", zIndex: 1100 }}>
      <span style={{ display: "inline-flex", alignItems: "center" }}>
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
      Loading tables…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Table Panel (Add / Edit) ── */
function TablePanel({ open, onClose, mode, table, onSave, saving, sections }: {
  open:     boolean;
  onClose:  () => void;
  mode:     "add" | "edit";
  table?:   Table | null;
  onSave:   (form: TableForm) => void;
  saving:   boolean;
  sections: string[];
}) {
  const [form, setForm] = useState<TableForm>({ label: "", capacity: "4", section: "Main" });
  const prevOpen = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) {
      setForm(mode === "edit" && table
        ? { label: table.label, capacity: String(table.capacity), section: table.section }
        : { label: "", capacity: "4", section: sections[0] ?? "Main" }
      );
    }
    prevOpen.current = open;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 400, background: "#fff", zIndex: 901, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", animation: "panelIn 0.25s ease" }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{mode === "add" ? "Add Table" : "Edit Table"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e" }}>×</button>
        </div>

        <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div>
            <label style={labelStyle}>Table Label *</label>
            <input style={fieldStyle} placeholder="e.g. T1, Window Table, Booth 3" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
            <p style={{ fontSize: 11, color: "#9a9a8e", marginTop: 4 }}>Displayed on the floor plan and order screens</p>
          </div>

          <div>
            <label style={labelStyle}>Capacity (seats) *</label>
            <input style={fieldStyle} type="number" min="1" max="50" placeholder="4" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
          </div>

          <div>
            <label style={labelStyle}>Section</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <select style={fieldStyle} value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}>
                {sections.map(s => <option key={s}>{s}</option>)}
                <option value="__new__">+ Add new section…</option>
              </select>
              {form.section === "__new__" && (
                <input style={fieldStyle} placeholder="New section name" autoFocus onChange={e => setForm(f => ({ ...f, section: e.target.value }))} />
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #e2e0d8", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.label || !form.capacity} style={{ padding: "9px 20px", background: saving || !form.label ? "#9a9a8e" : "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "Saving…" : mode === "add" ? "Add Table" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Status Change Popover — fixed to viewport, no anchorRef needed ── */
function StatusPopover({ table, onClose, onUpdate }: { 
  table:    Table; 
  onClose:  () => void; 
  onUpdate: (status: TableStatus) => void;
}) {
  const statuses: TableStatus[] = ["available", "occupied", "reserved", "cleaning"];
  return (
    <>
      {/* Full-screen backdrop to catch outside clicks */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200 }} />
      {/* Dropdown — fixed to viewport centre-top so it's always visible */}
      <div style={{ 
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, 
        padding: "0.5rem", boxShadow: "0 16px 40px rgba(0,0,0,0.18)", 
        zIndex: 1201, minWidth: 200,
        animation: "fadeUp 0.15s ease",
      }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translate(-50%,-46%)}to{opacity:1;transform:translate(-50%,-50%)}}`}</style>
        <div style={{ fontSize: 10, color: "#9a9a8e", padding: "6px 10px 4px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>
          Set status — {table.label}
        </div>
        <div style={{ height: 1, background: "#f0ede6", margin: "4px 0 4px" }} />
        {statuses.map(s => {
          const cfg = STATUS_CFG[s];
          const isCurrent = table.status === s;
          return (
            <button key={s} onClick={() => { if (!isCurrent) { onUpdate(s); onClose(); } }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", background: isCurrent ? cfg.bg : "none", border: "none", borderRadius: 7, cursor: isCurrent ? "default" : "pointer", fontFamily: "inherit", fontSize: 13, color: isCurrent ? cfg.color : "#4a4a40", transition: "background 0.1s" }}
              onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = "#f5f4f0"; }}
              onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: "left" }}>{cfg.label}</span>
              {isCurrent && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ── Table Card ── */
function TableCard({ table, onStatusClick, onEdit, onDelete, showStatusPopover, onClosePopover, onUpdateStatus }: {
  table:              Table;
  onStatusClick:      () => void;
  onEdit:             () => void;
  onDelete:           () => void;
  showStatusPopover:  boolean;
  onClosePopover:     () => void;
  onUpdateStatus:     (s: TableStatus) => void;
}) {
  const cfg = STATUS_CFG[table.status];
  return (
    <div style={{ background: "#fff", border: `2px solid ${cfg.border}`, borderRadius: 14, display: "flex", flexDirection: "column", position: "relative", transition: "box-shadow 0.15s" }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}>

      {/* Status bar */}
      <div style={{ height: 4, background: cfg.dot }} />

      {/* Body */}
      <div style={{ padding: "1rem", flex: 1 }}>
        {/* Table number + label */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#141410", letterSpacing: "-0.5px" }}>{table.label}</div>
            <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 1 }}>Table #{table.table_number}</div>
          </div>
          {/* Capacity badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 100, padding: "3px 8px", fontSize: 11, color: "#4a4a40" }}>
            <IconUsers />
            {table.capacity}
          </div>
        </div>

        {/* Status button */}
        <div style={{ position: "relative" }}>
          <button onClick={onStatusClick} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 100, fontSize: 11, fontWeight: 500, color: cfg.color, cursor: "pointer", fontFamily: "inherit" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
            {cfg.label}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {showStatusPopover && (
            <StatusPopover table={table} onClose={onClosePopover} onUpdate={onUpdateStatus} />
          )}
        </div>
      </div>

      {/* Section tag */}
      <div style={{ padding: "0 1rem 0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "#9a9a8e", background: "#f5f4f0", padding: "2px 7px", borderRadius: 4, border: "1px solid #e2e0d8" }}>{table.section}</span>
        {/* Actions */}
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={onEdit} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 6, cursor: "pointer", color: "#4a4a40" }}>
            <IconEdit />
          </button>
          <button onClick={onDelete} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", color: "#dc2626" }}>
            <IconTrash />
          </button>
        </div>
      </div>
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
            {danger ? "Yes, proceed" : "Confirm"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function AdminTablesPage() {
  const adminUser = getStoredUser();
  const { config } = useStore();

  const [tables,        setTables]       = useState<Table[]>([]);
  const [fetching,      setFetching]     = useState(true);
  const [saving,        setSaving]       = useState(false);
  const [view,          setView]         = useState<"grid" | "list">("grid");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [statusFilter,  setStatusFilter]  = useState<"all" | TableStatus>("all");
  const [panelOpen,     setPanelOpen]    = useState(false);
  const [panelMode,     setPanelMode]    = useState<"add" | "edit">("add");
  const [editTarget,    setEditTarget]   = useState<Table | null>(null);
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [toast,         setToast]        = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirm,       setConfirm]      = useState<{ open: boolean; title: string; message: string; danger: boolean; onConfirm: () => void }>({ open: false, title: "", message: "", danger: false, onConfirm: () => {} });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openConfirm = (title: string, message: string, danger: boolean, onConfirm: () => void) =>
    setConfirm({ open: true, title, message, danger, onConfirm });

  /* ── Fetch tables ── */
  const fetchTables = useCallback(async () => {
    if (!adminUser?.id) return;
    setFetching(true);
    try {
      const res  = await fetch(`/api/tables?admin_id=${adminUser.id}`);
      const data = await res.json();
      setTables(Array.isArray(data) ? data : []);
    } catch {
      showToast("Failed to load tables", "error");
    } finally {
      setFetching(false);
    }
  }, [adminUser?.id]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  /* ── Sections derived from tables ── */
  const sections = ["All", ...Array.from(new Set(tables.map(t => t.section))).sort()];

  /* ── Save (add / edit) ── */
  const handleSave = async (form: TableForm) => {
    if (!adminUser?.id) return;
    if (!form.label || !form.capacity) return showToast("Label and capacity are required", "error");
    if (Number(form.capacity) < 1) return showToast("Capacity must be at least 1", "error");

    setSaving(true);
    try {
      const isAdd  = panelMode === "add";
      const url    = isAdd ? "/api/tables" : `/api/tables/${editTarget?.id}`;
      const method = isAdd ? "POST" : "PUT";
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: form.label, capacity: Number(form.capacity), section: form.section || "Main", admin_id: adminUser.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(isAdd ? "Table added" : "Table updated");
      setPanelOpen(false);
      fetchTables();
    } catch (err) {
      showToast((err as Error).message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Update status ── */
  const handleUpdateStatus = async (table: Table, status: TableStatus) => {
    if (!adminUser?.id) return;
    setActivePopover(null);
    try {
      const res = await fetch(`/api/tables/${table.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, admin_id: adminUser.id }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(`Table ${table.label} marked as ${STATUS_CFG[status].label}`);
      fetchTables();
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  /* ── Delete ── */
  const handleDelete = (table: Table) => {
    if (table.status === "occupied") return showToast("Cannot delete an occupied table", "error");
    openConfirm("Delete Table", `Permanently delete "${table.label}"? This cannot be undone.`, true, async () => {
      try {
        const res = await fetch(`/api/tables/${table.id}?admin_id=${adminUser?.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed");
        showToast(`"${table.label}" deleted`);
        fetchTables();
      } catch { showToast("Failed to delete", "error"); }
    });
  };

  /* ── Filtered ── */
  const filtered = tables.filter(t => {
    const matchSection = sectionFilter === "All" || t.section === sectionFilter;
    const matchStatus  = statusFilter === "all" || t.status === statusFilter;
    return matchSection && matchStatus;
  });

  /* ── Stats ── */
  const stats = {
    total:     tables.length,
    available: tables.filter(t => t.status === "available").length,
    occupied:  tables.filter(t => t.status === "occupied").length,
    reserved:  tables.filter(t => t.status === "reserved").length,
    cleaning:  tables.filter(t => t.status === "cleaning").length,
    capacity:  tables.reduce((s, t) => s + t.capacity, 0),
  };

  const dater = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: config.timezone }).format(new Date());

  return (
    <>
      {toast    && <Toast msg={toast.msg} type={toast.type} />}
      <ConfirmModal {...confirm} onCancel={() => setConfirm(c => ({ ...c, open: false }))} />
      <TablePanel
        open={panelOpen} onClose={() => setPanelOpen(false)}
        mode={panelMode} table={editTarget}
        onSave={handleSave} saving={saving}
        sections={sections.filter(s => s !== "All")}
      />

      {/* Header */}
      <header className="header">
        <div className="header-title">Tables</div>
        <div className="header-date">{dater}</div>
        <button onClick={fetchTables} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "#fff", color: "#141410", border: "1px solid #c8c6bc", borderRadius: 7, fontFamily: "inherit", fontSize: 13, cursor: "pointer" }}>
          <IconRefresh /> Refresh
        </button>
        <button onClick={() => { setPanelMode("add"); setEditTarget(null); setPanelOpen(true); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#141410", color: "#fff", border: "none", borderRadius: 7, fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <IconPlus /> Add Table
        </button>
      </header>

      <main className="main">

        {/* Stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.75rem" }}>
          {[
            { label: "Total",     value: stats.total,     color: "#141410", alert: false },
            { label: "Available", value: stats.available, color: "#16a34a", alert: false },
            { label: "Occupied",  value: stats.occupied,  color: "#dc2626", alert: stats.occupied > 0 },
            { label: "Reserved",  value: stats.reserved,  color: "#d97706", alert: false },
            { label: "Cleaning",  value: stats.cleaning,  color: "#2563eb", alert: false },
            { label: "Seats",     value: stats.capacity,  color: "#141410", alert: false },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: `1px solid ${s.alert ? "#fecaca" : "#e2e0d8"}`, borderRadius: 12, padding: "0.9rem 1rem" }}>
              <div style={{ fontSize: 10, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.color, letterSpacing: "-0.5px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Floor plan card */}
        <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

            {/* Section pills */}
            <div style={{ display: "flex", gap: 5, flex: 1, flexWrap: "wrap" }}>
              {sections.map(s => (
                <button key={s} onClick={() => setSectionFilter(s)} style={{ padding: "5px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: sectionFilter === s ? "#141410" : "#f5f4f0", color: sectionFilter === s ? "#fff" : "#4a4a40", border: sectionFilter === s ? "1px solid #141410" : "1px solid #c8c6bc", fontWeight: sectionFilter === s ? 500 : 400, transition: "all 0.15s" }}>
                  {s}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | TableStatus)} style={{ padding: "6px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 7, fontFamily: "inherit", fontSize: 12, color: "#4a4a40", cursor: "pointer", outline: "none" }}>
              <option value="all">All statuses</option>
              {(Object.keys(STATUS_CFG) as TableStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_CFG[s].label}</option>
              ))}
            </select>

            {/* View toggle */}
            <div style={{ display: "flex", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 7, overflow: "hidden" }}>
              {(["grid", "list"] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{ padding: "6px 12px", border: "none", cursor: "pointer", fontSize: 12, fontFamily: "inherit", background: view === v ? "#141410" : "transparent", color: view === v ? "#fff" : "#4a4a40" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {v === "grid" ? <><IconGrid /> Floor Plan</> : <><IconList /> List</>}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {fetching ? <Spinner /> : filtered.length === 0 ? (
            <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9a9a8e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#141410", marginBottom: 6 }}>
                {tables.length === 0 ? "No tables yet" : "No tables match your filters"}
              </div>
              <div style={{ fontSize: 13, color: "#9a9a8e", marginBottom: "1.25rem" }}>
                {tables.length === 0 ? "Add your first table to get started with floor management" : "Try changing the section or status filter"}
              </div>
              {tables.length === 0 && (
                <button onClick={() => { setPanelMode("add"); setEditTarget(null); setPanelOpen(true); }} style={{ padding: "8px 20px", background: "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconPlus /> Add First Table</span>
                </button>
              )}
            </div>
          ) : view === "grid" ? (

            /* ── GRID / FLOOR PLAN VIEW ── */
            <div style={{ padding: "1.5rem" }}>
              {/* Group by section */}
              {Array.from(new Set(filtered.map(t => t.section))).sort().map(section => (
                <div key={section} style={{ marginBottom: "2rem" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#9a9a8e", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ height: 1, width: 20, background: "#e2e0d8" }} />
                    {section}
                    <div style={{ height: 1, flex: 1, background: "#e2e0d8" }} />
                    <span style={{ fontSize: 11, fontWeight: 400, color: "#c8c6bc" }}>
                      {filtered.filter(t => t.section === section).length} table{filtered.filter(t => t.section === section).length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "0.85rem" }}>
                    {filtered.filter(t => t.section === section).map(table => (
                      <TableCard
                        key={table.id}
                        table={table}
                        onStatusClick={() => setActivePopover(activePopover === table.id ? null : table.id)}
                        onEdit={() => { setPanelMode("edit"); setEditTarget(table); setPanelOpen(true); }}
                        onDelete={() => handleDelete(table)}
                        showStatusPopover={activePopover === table.id}
                        onClosePopover={() => setActivePopover(null)}
                        onUpdateStatus={(s) => handleUpdateStatus(table, s)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

          ) : (

            /* ── LIST VIEW ── */
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["#", "Label", "Section", "Capacity", "Status", "Last Updated", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.6rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(table => {
                  const cfg = STATUS_CFG[table.status];
                  return (
                    <tr key={table.id} style={{ borderBottom: "1px solid #e2e0d8" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}>
                      <td style={{ padding: "0.85rem 1.25rem", color: "#9a9a8e", fontWeight: 600 }}>#{table.table_number}</td>
                      <td style={{ padding: "0.85rem 1.25rem", fontWeight: 500, color: "#141410" }}>{table.label}</td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <span style={{ fontSize: 11, background: "#f5f4f0", padding: "2px 8px", borderRadius: 5, color: "#4a4a40", border: "1px solid #e2e0d8" }}>{table.section}</span>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "#4a4a40" }}><IconUsers /> {table.capacity}</span>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", position: "relative" }}>
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <button onClick={() => setActivePopover(activePopover === table.id ? null : table.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 100, fontSize: 11, fontWeight: 500, color: cfg.color, cursor: "pointer", fontFamily: "inherit" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
                            {cfg.label}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                          </button>
                          {activePopover === table.id && (
                            <StatusPopover table={table} onClose={() => setActivePopover(null)} onUpdate={(s) => handleUpdateStatus(table, s)} />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", color: "#9a9a8e", fontSize: 12 }}>
                        {new Date(table.updated_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: config.timezone })}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setPanelMode("edit"); setEditTarget(table); setPanelOpen(true); }} style={{ padding: "5px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 6, fontSize: 12, color: "#141410", cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
                          <button onClick={() => handleDelete(table)} style={{ padding: "5px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
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
              <span>Showing {filtered.length} of {tables.length} table{tables.length !== 1 ? "s" : ""}</span>
              <span>{filtered.reduce((s, t) => s + t.capacity, 0)} total seats in view</span>
            </div>
          )}
        </div>
      </main>
    </>
  );
}