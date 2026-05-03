"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/app/_lib/StoreContext";

/* ── Types ── */
interface Appointment {
  id:             string;
  client_name:    string;
  client_phone:   string | null;
  client_email:   string | null;
  service_name:   string;
  service_id:     string | null;
  staff_name:     string | null;
  staff_id:       string | null;
  date:           string;           // YYYY-MM-DD
  start_time:     string;           // HH:MM
  end_time:       string;           // HH:MM
  duration:       number;           // minutes
  price:          number;
  deposit:        number;
  payment_status: "unpaid" | "deposit" | "paid";
  status:         "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
  type:           "booked" | "walk_in";
  notes:          string | null;
  admin_id:       string;
  created_at:     string;
}

interface AppointmentForm {
  client_name:    string;
  client_phone:   string;
  client_email:   string;
  service_name:   string;
  staff_name:     string;
  date:           string;
  start_time:     string;
  duration:       string;
  price:          string;
  deposit:        string;
  payment_status: "unpaid" | "deposit" | "paid";
  type:           "booked" | "walk_in";
  notes:          string;
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

type AppStatus = Appointment["status"];
type ViewMode  = "day" | "week" | "list";

/* ── Status config ── */
const STATUS_CFG: Record<AppStatus, { bg: string; color: string; border: string; dot: string; label: string }> = {
  scheduled:   { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", dot: "#2563eb", label: "Scheduled"   },
  confirmed:   { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", dot: "#16a34a", label: "Confirmed"   },
  in_progress: { bg: "#fffbeb", color: "#d97706", border: "#fde68a", dot: "#d97706", label: "In Progress" },
  completed:   { bg: "#f5f4f0", color: "#4a4a40", border: "#e2e0d8", dot: "#4a4a40", label: "Completed"   },
  cancelled:   { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", dot: "#dc2626", label: "Cancelled"   },
  no_show:     { bg: "#fef2f2", color: "#9a9a8e", border: "#fecaca", dot: "#9a9a8e", label: "No Show"     },
};

const PAYMENT_CFG = {
  unpaid:  { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "Unpaid"  },
  deposit: { bg: "#fffbeb", color: "#d97706", border: "#fde68a", label: "Deposit" },
  paid:    { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", label: "Paid"    },
};

/* ── Helpers ── */
function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total  = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function getWeekDays(dateStr: string): string[] {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd.toISOString().slice(0, 10);
  });
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const HOUR_SLOTS = Array.from({ length: 14 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`); // 07:00–20:00

/* ── Shared styles ── */
const fieldStyle: React.CSSProperties = {
  width: "100%", background: "#f5f4f0", border: "1px solid #c8c6bc",
  borderRadius: 8, padding: "9px 12px", color: "#141410",
  fontFamily: "inherit", fontSize: 14, outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px",
  textTransform: "uppercase", color: "#4a4a40", marginBottom: 5,
};

/* ── SVG Icons ── */
function IconPlus()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IconChevL()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>; }
function IconChevR()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>; }
function IconCalendar(){ return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IconClock()   { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function IconUser()    { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function IconScissors(){ return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>; }
function IconWarning() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function IconWalkIn()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="4" r="2"/><path d="M9 8l-2 4h6l-1 8"/><path d="M13 12l2 4"/></svg>; }

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
function ConfirmModal({ open, title, message, danger, onConfirm, onCancel }: { open: boolean; title: string; message: string; danger: boolean; onConfirm: () => void; onCancel: () => void }) {
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
            {danger ? "Yes, proceed" : "Confirm"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Appointment Detail Panel ── */
function DetailPanel({ appt, onClose, onUpdateStatus, onEdit, onDelete, formatCurrency }: {
  appt:           Appointment;
  onClose:        () => void;
  onUpdateStatus: (s: AppStatus) => void;
  onEdit:         () => void;
  onDelete:       () => void;
  formatCurrency: (n: number) => string;
}) {
  const scfg = STATUS_CFG[appt.status];
  const pcfg = PAYMENT_CFG[appt.payment_status];
  const nextStatuses: AppStatus[] = appt.status === "scheduled" ? ["confirmed", "cancelled"]
    : appt.status === "confirmed" ? ["in_progress", "no_show", "cancelled"]
    : appt.status === "in_progress" ? ["completed"]
    : [];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 420, background: "#fff", zIndex: 901, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", animation: "panelIn 0.25s ease" }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Colour header */}
        <div style={{ height: 4, background: scfg.dot }} />

        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{appt.client_name}</div>
            <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: appt.type === "walk_in" ? "#f5f4f0" : "#eff6ff", border: `1px solid ${appt.type === "walk_in" ? "#e2e0d8" : "#bfdbfe"}`, borderRadius: 100, padding: "1px 7px", fontSize: 10, fontWeight: 600, color: appt.type === "walk_in" ? "#4a4a40" : "#2563eb" }}>
                {appt.type === "walk_in" ? <IconWalkIn /> : <IconCalendar />}
                {appt.type === "walk_in" ? "Walk-in" : "Booked"}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Status + Payment */}
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", background: scfg.bg, border: `1px solid ${scfg.border}`, borderRadius: 100, fontSize: 12, fontWeight: 500, color: scfg.color }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: scfg.dot }} />{scfg.label}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", background: pcfg.bg, border: `1px solid ${pcfg.border}`, borderRadius: 100, fontSize: 12, fontWeight: 500, color: pcfg.color }}>
              {pcfg.label}
            </span>
          </div>

          {/* Info cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            {[
              { label: "Service",   value: appt.service_name,                       icon: <IconScissors /> },
              { label: "Staff",     value: appt.staff_name ?? "Any",                icon: <IconUser />     },
              { label: "Date",      value: formatDateLabel(appt.date),              icon: <IconCalendar /> },
              { label: "Time",      value: `${formatTime(appt.start_time)} – ${formatTime(appt.end_time)}`, icon: <IconClock /> },
              { label: "Duration",  value: `${appt.duration} min`,                  icon: <IconClock />    },
              { label: "Price",     value: formatCurrency(appt.price),              icon: null             },
            ].map(row => (
              <div key={row.label} style={{ background: "#f5f4f0", borderRadius: 8, padding: "0.65rem 0.85rem" }}>
                <div style={{ fontSize: 10, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
                  {row.icon}{row.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#141410" }}>{row.value}</div>
              </div>
            ))}
          </div>

          {/* Contact */}
          {(appt.client_phone || appt.client_email) && (
            <div style={{ background: "#f5f4f0", borderRadius: 8, padding: "0.75rem 0.85rem" }}>
              <div style={{ fontSize: 10, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Contact</div>
              {appt.client_phone && <div style={{ fontSize: 13, color: "#141410", marginBottom: 2 }}>{appt.client_phone}</div>}
              {appt.client_email && <div style={{ fontSize: 12, color: "#9a9a8e" }}>{appt.client_email}</div>}
            </div>
          )}

          {/* Notes */}
          {appt.notes && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "0.75rem 0.85rem" }}>
              <div style={{ fontSize: 10, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.5 }}>{appt.notes}</div>
            </div>
          )}

          {/* Deposit */}
          {appt.deposit > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "0.65rem 0.85rem", background: "#f5f4f0", borderRadius: 8 }}>
              <span style={{ color: "#9a9a8e" }}>Deposit paid</span>
              <strong>{formatCurrency(appt.deposit)}</strong>
            </div>
          )}

          {/* Status actions */}
          {nextStatuses.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Update Status</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {nextStatuses.map(s => {
                  const c = STATUS_CFG[s];
                  return (
                    <button key={s} onClick={() => onUpdateStatus(s)} style={{ padding: "7px 14px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 12, fontWeight: 500, color: c.color, cursor: "pointer", fontFamily: "inherit" }}>
                      → {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e2e0d8", display: "flex", gap: 8 }}>
          <button onClick={onEdit} style={{ flex: 1, padding: "9px 0", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, color: "#141410", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Edit</button>
          <button onClick={onDelete} style={{ flex: 1, padding: "9px 0", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#dc2626", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Cancel / Delete</button>
        </div>
      </div>
    </>
  );
}

/* ── Appointment Form Panel ── */
function FormPanel({ open, onClose, mode, appt, onSave, saving, defaultDate }: {
  open:        boolean;
  onClose:     () => void;
  mode:        "add" | "edit";
  appt?:       Appointment | null;
  onSave:      (form: AppointmentForm) => void;
  saving:      boolean;
  defaultDate: string;
}) {
  const blank: AppointmentForm = {
    client_name: "", client_phone: "", client_email: "",
    service_name: "", staff_name: "", date: defaultDate,
    start_time: "09:00", duration: "60", price: "",
    deposit: "0", payment_status: "unpaid", type: "booked", notes: "",
  };
  const [form, setForm] = useState<AppointmentForm>(blank);
  const prevOpen = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) {
      setForm(mode === "edit" && appt ? {
        client_name:    appt.client_name,
        client_phone:   appt.client_phone ?? "",
        client_email:   appt.client_email ?? "",
        service_name:   appt.service_name,
        staff_name:     appt.staff_name ?? "",
        date:           appt.date,
        start_time:     appt.start_time,
        duration:       String(appt.duration),
        price:          String(appt.price),
        deposit:        String(appt.deposit),
        payment_status: appt.payment_status,
        type:           appt.type,
        notes:          appt.notes ?? "",
      } : { ...blank, date: defaultDate });
    }
    prevOpen.current = open;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const set = (key: keyof AppointmentForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const endTime = form.start_time && form.duration
    ? addMinutes(form.start_time, Number(form.duration))
    : "";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 480, background: "#fff", zIndex: 901, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", animation: "panelIn 0.25s ease" }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{mode === "add" ? "New Appointment" : "Edit Appointment"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>

          {/* Type toggle */}
          <div style={{ display: "flex", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 8, overflow: "hidden" }}>
            {(["booked", "walk_in"] as const).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{ flex: 1, padding: "8px 0", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500, background: form.type === t ? "#141410" : "transparent", color: form.type === t ? "#fff" : "#4a4a40", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s" }}>
                {t === "booked" ? <IconCalendar /> : <IconWalkIn />}
                {t === "booked" ? "Booked" : "Walk-in"}
              </button>
            ))}
          </div>

          {/* Client */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Client</div>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input style={fieldStyle} placeholder="e.g. Amara Osei" value={form.client_name} onChange={set("client_name")} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={fieldStyle} type="tel" placeholder="+254 7xx xxx xxx" value={form.client_phone} onChange={set("client_phone")} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={fieldStyle} type="email" placeholder="client@email.com" value={form.client_email} onChange={set("client_email")} />
              </div>
            </div>
          </div>

          {/* Service + Staff */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Service</div>
            <div>
              <label style={labelStyle}>Service Name *</label>
              <input style={fieldStyle} placeholder="e.g. Haircut & Blow Dry" value={form.service_name} onChange={set("service_name")} />
            </div>
            <div>
              <label style={labelStyle}>Assigned Staff</label>
              <input style={fieldStyle} placeholder="e.g. Janet Wanjiku" value={form.staff_name} onChange={set("staff_name")} />
            </div>
          </div>

          {/* Date + Time */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Schedule</div>
            <div>
              <label style={labelStyle}>Date *</label>
              <input style={fieldStyle} type="date" value={form.date} onChange={set("date")} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Start Time *</label>
                <input style={fieldStyle} type="time" value={form.start_time} onChange={set("start_time")} />
              </div>
              <div>
                <label style={labelStyle}>Duration (mins) *</label>
                <select style={fieldStyle} value={form.duration} onChange={set("duration")}>
                  {[15,30,45,60,75,90,120,150,180].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            </div>
            {endTime && (
              <div style={{ fontSize: 12, color: "#9a9a8e", display: "flex", alignItems: "center", gap: 4 }}>
                <IconClock /> Ends at <strong style={{ color: "#141410" }}>{formatTime(endTime)}</strong>
              </div>
            )}
          </div>

          {/* Payment */}
          <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase", letterSpacing: "0.5px" }}>Payment</div>
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
            <div>
              <label style={labelStyle}>Payment Status</label>
              <select style={fieldStyle} value={form.payment_status} onChange={set("payment_status")}>
                <option value="unpaid">Unpaid</option>
                <option value="deposit">Deposit Paid</option>
                <option value="paid">Fully Paid</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...fieldStyle, resize: "vertical", minHeight: 72, lineHeight: 1.5 } as React.CSSProperties} placeholder="Any special requests or notes…" value={form.notes} onChange={set("notes")} />
          </div>
        </div>

        <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #e2e0d8", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.client_name || !form.service_name || !form.date} style={{ padding: "9px 20px", background: saving || !form.client_name || !form.service_name ? "#9a9a8e" : "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "Saving…" : mode === "add" ? "Book Appointment" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Appointment Pill (used in Day/Week views) ── */
function ApptPill({ appt, onClick, formatCurrency }: { appt: Appointment; onClick: () => void; formatCurrency: (n: number) => string }) {
  const cfg = STATUS_CFG[appt.status];
  return (
    <div onClick={onClick} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderLeft: `3px solid ${cfg.dot}`, borderRadius: 6, padding: "4px 7px", cursor: "pointer", overflow: "hidden", transition: "box-shadow 0.1s" }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#141410", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{appt.client_name}</div>
      <div style={{ fontSize: 10, color: "#9a9a8e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{appt.service_name}</div>
      {appt.staff_name && <div style={{ fontSize: 9, color: cfg.color, fontWeight: 500 }}>{appt.staff_name}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function AdminAppointmentsPage() {
  const adminUser = getStoredUser();
  const { formatCurrency, config } = useStore();

  const [appts,       setAppts]       = useState<Appointment[]>([]);
  const [fetching,    setFetching]    = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [view,        setView]        = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(todayStr());
  const [selected,    setSelected]    = useState<Appointment | null>(null);
  const [detailOpen,  setDetailOpen]  = useState(false);
  const [formOpen,    setFormOpen]    = useState(false);
  const [formMode,    setFormMode]    = useState<"add" | "edit">("add");
  const [editTarget,  setEditTarget]  = useState<Appointment | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | AppStatus>("all");
  const [typeFilter,   setTypeFilter]   = useState<"all" | "booked" | "walk_in">("all");
  const [toast,       setToast]       = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirm,     setConfirm]     = useState({ open: false, title: "", message: "", danger: false, onConfirm: () => {} });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  /* ── Fetch ── */
  const fetchAppts = useCallback(async () => {
    if (!adminUser?.id) return;
    setFetching(true);
    try {
      const res  = await fetch(`/api/appointments?admin_id=${adminUser.id}`);
      const data = await res.json();
      setAppts(Array.isArray(data) ? data : []);
    } catch { showToast("Failed to load appointments", "error"); }
    finally  { setFetching(false); }
  }, [adminUser?.id]);

  useEffect(() => { fetchAppts(); }, [fetchAppts]);

  /* ── Save ── */
  const handleSave = async (form: AppointmentForm) => {
    if (!adminUser?.id) return;
    setSaving(true);
    try {
      const isAdd  = formMode === "add";
      const url    = isAdd ? "/api/appointments" : `/api/appointments/${editTarget?.id}`;
      const method = isAdd ? "POST" : "PUT";
      const end_time = addMinutes(form.start_time, Number(form.duration));
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form, duration: Number(form.duration),
          price: Number(form.price), deposit: Number(form.deposit || 0),
          end_time, admin_id: adminUser.id,
          status: isAdd ? (form.type === "walk_in" ? "in_progress" : "scheduled") : editTarget?.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(isAdd ? "Appointment booked" : "Appointment updated");
      setFormOpen(false);
      fetchAppts();
    } catch (err) {
      showToast((err as Error).message || "Failed to save", "error");
    } finally { setSaving(false); }
  };

  /* ── Update status ── */
  const handleUpdateStatus = async (appt: Appointment, status: AppStatus) => {
    try {
      const res = await fetch(`/api/appointments/${appt.id}/status`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, admin_id: adminUser?.id }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(`Appointment marked as ${STATUS_CFG[status].label}`);
      setDetailOpen(false);
      fetchAppts();
    } catch { showToast("Failed to update status", "error"); }
  };

  /* ── Delete ── */
  const handleDelete = (appt: Appointment) => {
    setConfirm({
      open: true, danger: true,
      title: "Delete Appointment",
      message: `Delete appointment for ${appt.client_name} on ${formatDateLabel(appt.date)}? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/appointments/${appt.id}?admin_id=${adminUser?.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed");
          showToast("Appointment deleted");
          setDetailOpen(false);
          fetchAppts();
        } catch { showToast("Failed to delete", "error"); }
      },
    });
  };

  /* ── Navigation ── */
  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate + "T00:00:00");
    if (view === "day")  d.setDate(d.getDate() + dir);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    if (view === "list") d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d.toISOString().slice(0, 10));
  };

  /* ── Filtered + date-scoped ── */
  const weekDays = getWeekDays(currentDate);

  const filterAppt = (a: Appointment) => {
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchType   = typeFilter   === "all" || a.type   === typeFilter;
    return matchStatus && matchType;
  };

  const dayAppts  = appts.filter(a => a.date === currentDate && filterAppt(a))
                         .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const weekAppts = appts.filter(a => weekDays.includes(a.date) && filterAppt(a));
  const listAppts = appts.filter(filterAppt).sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));

  /* ── Stats ── */
  const todayAppts   = appts.filter(a => a.date === todayStr());
  const stats = {
    today:     todayAppts.length,
    upcoming:  appts.filter(a => a.date > todayStr() && !["cancelled","completed"].includes(a.status)).length,
    completed: appts.filter(a => a.status === "completed").length,
    revenue:   appts.filter(a => a.payment_status === "paid").reduce((s, a) => s + a.price, 0),
    walk_ins:  todayAppts.filter(a => a.type === "walk_in").length,
  };

  const dater = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: config.timezone }).format(new Date());

  /* ── Nav label ── */
  const navLabel = view === "day" ? formatDateLabel(currentDate)
    : view === "week" ? `${formatDateLabel(weekDays[0])} – ${formatDateLabel(weekDays[6])}`
    : "All Appointments";

  return (
    <>
      {toast   && <Toast msg={toast.msg} type={toast.type} />}
      <ConfirmModal {...confirm} onCancel={() => setConfirm(c => ({ ...c, open: false }))} />

      {detailOpen && selected && (
        <DetailPanel
          appt={selected} onClose={() => setDetailOpen(false)}
          onUpdateStatus={s => handleUpdateStatus(selected, s)}
          onEdit={() => { setFormMode("edit"); setEditTarget(selected); setDetailOpen(false); setFormOpen(true); }}
          onDelete={() => handleDelete(selected)}
          formatCurrency={formatCurrency}
        />
      )}

      <FormPanel
        open={formOpen} onClose={() => setFormOpen(false)}
        mode={formMode} appt={editTarget}
        onSave={handleSave} saving={saving}
        defaultDate={currentDate}
      />

      {/* Header */}
      <header className="header">
        <div className="header-title">Appointments</div>
        <div className="header-date">{dater}</div>
        {/* View switcher */}
        <div style={{ display: "flex", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 8, overflow: "hidden" }}>
          {(["day", "week", "list"] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "6px 14px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500, background: view === v ? "#141410" : "transparent", color: view === v ? "#fff" : "#4a4a40", transition: "all 0.15s", textTransform: "capitalize" }}>
              {v}
            </button>
          ))}
        </div>
        <button onClick={() => { setFormMode("add"); setEditTarget(null); setFormOpen(true); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#141410", color: "#fff", border: "none", borderRadius: 7, fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <IconPlus /> New Appointment
        </button>
      </header>

      <main className="main">

        {/* Stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
          {[
            { label: "Today",      value: stats.today,                     color: "#141410" },
            { label: "Walk-ins",   value: stats.walk_ins,                  color: "#2563eb" },
            { label: "Upcoming",   value: stats.upcoming,                  color: "#d97706" },
            { label: "Completed",  value: stats.completed,                 color: "#16a34a" },
            { label: "Revenue",    value: formatCurrency(stats.revenue),   color: "#141410" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "0.9rem 1rem" }}>
              <div style={{ fontSize: 10, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.color, letterSpacing: "-0.5px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Calendar card */}
        <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Date nav */}
            {view !== "list" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => navigate(-1)} style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 7, cursor: "pointer" }}><IconChevL /></button>
                <button onClick={() => setCurrentDate(todayStr())} style={{ padding: "5px 12px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, color: "#141410" }}>Today</button>
                <button onClick={() => navigate(1)}  style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 7, cursor: "pointer" }}><IconChevR /></button>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#141410", marginLeft: 4 }}>{navLabel}</span>
              </div>
            )}

            <div style={{ flex: 1 }} />

            {/* Type filter */}
            <div style={{ display: "flex", gap: 5 }}>
              {(["all", "booked", "walk_in"] as const).map(t => (
                <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: "5px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: typeFilter === t ? "#141410" : "#f5f4f0", color: typeFilter === t ? "#fff" : "#4a4a40", border: typeFilter === t ? "1px solid #141410" : "1px solid #c8c6bc", transition: "all 0.15s" }}>
                  {t === "all" ? "All" : t === "booked" ? "Booked" : "Walk-in"}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | AppStatus)} style={{ padding: "6px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 7, fontFamily: "inherit", fontSize: 12, color: "#4a4a40", cursor: "pointer", outline: "none" }}>
              <option value="all">All statuses</option>
              {(Object.keys(STATUS_CFG) as AppStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_CFG[s].label}</option>
              ))}
            </select>
          </div>

          {/* ── DAY VIEW ── */}
          {view === "day" && (
            <div style={{ display: "flex", height: 600, overflow: "auto" }}>
              {/* Time gutter */}
              <div style={{ width: 56, flexShrink: 0, borderRight: "1px solid #e2e0d8" }}>
                <div style={{ height: 40, borderBottom: "1px solid #e2e0d8" }} />
                {HOUR_SLOTS.map(slot => (
                  <div key={slot} style={{ height: 60, borderBottom: "1px solid #f0ede6", padding: "4px 6px", fontSize: 10, color: "#c8c6bc", textAlign: "right" }}>{formatTime(slot)}</div>
                ))}
              </div>

              {/* Day column */}
              <div style={{ flex: 1, position: "relative", minWidth: 200 }}>
                {/* Header */}
                <div style={{ height: 40, borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: currentDate === todayStr() ? "#2563eb" : "#141410", background: currentDate === todayStr() ? "#eff6ff" : "transparent" }}>
                  {formatDateLabel(currentDate)}
                  {currentDate === todayStr() && <span style={{ marginLeft: 6, fontSize: 10, background: "#2563eb", color: "#fff", padding: "1px 6px", borderRadius: 100 }}>Today</span>}
                </div>

                {/* Hour slots */}
                {HOUR_SLOTS.map(slot => (
                  <div key={slot} style={{ height: 60, borderBottom: "1px solid #f0ede6", position: "relative" }}
                    onClick={() => { setFormMode("add"); setEditTarget(null); setFormOpen(true); }}>
                  </div>
                ))}

                {/* Appointment pills */}
                {dayAppts.map(appt => {
                  const [sh, sm] = appt.start_time.split(":").map(Number);
                  const startOffset = (sh - 7) * 60 + sm;
                  const top  = 40 + (startOffset / 60) * 60;
                  const height = Math.max((appt.duration / 60) * 60 - 4, 24);
                  return (
                    <div key={appt.id} style={{ position: "absolute", top, left: 4, right: 4, height, zIndex: 1 }}>
                      <ApptPill appt={appt} onClick={() => { setSelected(appt); setDetailOpen(true); }} formatCurrency={formatCurrency} />
                    </div>
                  );
                })}

                {dayAppts.length === 0 && (
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", color: "#c8c6bc", fontSize: 12, pointerEvents: "none" }}>
                    No appointments
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── WEEK VIEW ── */}
          {view === "week" && (
            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "flex", minWidth: 700 }}>
                {/* Time gutter */}
                <div style={{ width: 56, flexShrink: 0, borderRight: "1px solid #e2e0d8" }}>
                  <div style={{ height: 48, borderBottom: "1px solid #e2e0d8" }} />
                  {HOUR_SLOTS.map(slot => (
                    <div key={slot} style={{ height: 56, borderBottom: "1px solid #f0ede6", padding: "4px 6px", fontSize: 10, color: "#c8c6bc", textAlign: "right" }}>{formatTime(slot)}</div>
                  ))}
                </div>

                {/* 7 day columns */}
                {weekDays.map(day => {
                  const dayItems = weekAppts.filter(a => a.date === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
                  const isToday  = day === todayStr();
                  return (
                    <div key={day} style={{ flex: 1, borderRight: "1px solid #e2e0d8", position: "relative", minWidth: 90 }}>
                      <div style={{ height: 48, borderBottom: "1px solid #e2e0d8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: isToday ? "#eff6ff" : "transparent" }}>
                        <div style={{ fontSize: 10, color: isToday ? "#2563eb" : "#9a9a8e", fontWeight: 600 }}>
                          {new Date(day + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase()}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: isToday ? "#2563eb" : "#141410" }}>
                          {new Date(day + "T00:00:00").getDate()}
                        </div>
                      </div>

                      {HOUR_SLOTS.map(slot => (
                        <div key={slot} style={{ height: 56, borderBottom: "1px solid #f0ede6" }} />
                      ))}

                      {dayItems.map(appt => {
                        const [sh, sm] = appt.start_time.split(":").map(Number);
                        const startOffset = (sh - 7) * 60 + sm;
                        const top    = 48 + (startOffset / 60) * 56;
                        const height = Math.max((appt.duration / 60) * 56 - 3, 20);
                        return (
                          <div key={appt.id} style={{ position: "absolute", top, left: 2, right: 2, height, zIndex: 1 }}>
                            <ApptPill appt={appt} onClick={() => { setSelected(appt); setDetailOpen(true); }} formatCurrency={formatCurrency} />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {view === "list" && (
            fetching ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", color: "#9a9a8e", fontSize: 13, gap: 10 }}>
                <div style={{ width: 18, height: 18, border: "2px solid #e2e0d8", borderTopColor: "#141410", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                Loading…<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            ) : listAppts.length === 0 ? (
              <div style={{ padding: "4rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>No appointments found.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Client", "Service", "Staff", "Date & Time", "Duration", "Price", "Status", "Payment", "Actions"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "0.6rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listAppts.map(appt => {
                    const scfg = STATUS_CFG[appt.status];
                    const pcfg = PAYMENT_CFG[appt.payment_status];
                    return (
                      <tr key={appt.id} style={{ borderBottom: "1px solid #e2e0d8", cursor: "pointer" }}
                        onClick={() => { setSelected(appt); setDetailOpen(true); }}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}>
                        <td style={{ padding: "0.85rem 1.25rem" }}>
                          <div style={{ fontWeight: 500 }}>{appt.client_name}</div>
                          {appt.client_phone && <div style={{ fontSize: 11, color: "#9a9a8e" }}>{appt.client_phone}</div>}
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 600, color: appt.type === "walk_in" ? "#4a4a40" : "#2563eb", background: appt.type === "walk_in" ? "#f5f4f0" : "#eff6ff", border: `1px solid ${appt.type === "walk_in" ? "#e2e0d8" : "#bfdbfe"}`, borderRadius: 100, padding: "1px 5px", marginTop: 3 }}>
                            {appt.type === "walk_in" ? "Walk-in" : "Booked"}
                          </span>
                        </td>
                        <td style={{ padding: "0.85rem 1.25rem", color: "#141410" }}>{appt.service_name}</td>
                        <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40" }}>{appt.staff_name ?? "—"}</td>
                        <td style={{ padding: "0.85rem 1.25rem", whiteSpace: "nowrap" }}>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{formatDateLabel(appt.date)}</div>
                          <div style={{ fontSize: 11, color: "#9a9a8e" }}>{formatTime(appt.start_time)} – {formatTime(appt.end_time)}</div>
                        </td>
                        <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40" }}>{appt.duration}m</td>
                        <td style={{ padding: "0.85rem 1.25rem", fontWeight: 600 }}>{formatCurrency(appt.price)}</td>
                        <td style={{ padding: "0.85rem 1.25rem" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: scfg.bg, border: `1px solid ${scfg.border}`, borderRadius: 100, fontSize: 11, fontWeight: 500, color: scfg.color }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: scfg.dot }} />{scfg.label}
                          </span>
                        </td>
                        <td style={{ padding: "0.85rem 1.25rem" }}>
                          <span style={{ display: "inline-flex", padding: "2px 8px", background: pcfg.bg, border: `1px solid ${pcfg.border}`, borderRadius: 100, fontSize: 11, fontWeight: 500, color: pcfg.color }}>{pcfg.label}</span>
                        </td>
                        <td style={{ padding: "0.85rem 1.25rem" }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => { setFormMode("edit"); setEditTarget(appt); setFormOpen(true); }} style={{ padding: "5px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
                            <button onClick={() => handleDelete(appt)} style={{ padding: "5px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}
        </div>
      </main>
    </>
  );
}