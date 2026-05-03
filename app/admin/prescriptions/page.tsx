"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/app/_lib/StoreContext";

/* ── Types ── */
interface PrescriptionItem {
  drug_name:  string;
  dosage:     string;
  frequency:  string;
  duration:   string;
  quantity:   number;
  notes:      string;
}

interface Prescription {
  id:               string;
  rx_number:        string;
  patient_name:     string;
  patient_phone:    string | null;
  patient_dob:      string | null;
  patient_id_no:    string | null;
  doctor_name:      string;
  doctor_reg_no:    string | null;
  hospital:         string | null;
  items:            PrescriptionItem[];
  status:           "pending" | "verified" | "dispensed" | "partial" | "cancelled" | "expired";
  payment_status:   "unpaid" | "partial" | "paid";
  total_amount:     number;
  amount_paid:      number;
  insurance_name:   string | null;
  insurance_no:     string | null;
  insurance_amount: number;
  issued_date:      string;
  expiry_date:      string | null;
  dispensed_date:   string | null;
  notes:            string | null;
  admin_id:         string;
  created_at:       string;
}

interface PrescriptionForm {
  patient_name:     string;
  patient_phone:    string;
  patient_dob:      string;
  patient_id_no:    string;
  doctor_name:      string;
  doctor_reg_no:    string;
  hospital:         string;
  items:            PrescriptionItem[];
  payment_status:   "unpaid" | "partial" | "paid";
  total_amount:     string;
  amount_paid:      string;
  insurance_name:   string;
  insurance_no:     string;
  insurance_amount: string;
  issued_date:      string;
  expiry_date:      string;
  notes:            string;
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
const STATUS_CFG: Record<Prescription["status"], { bg: string; color: string; border: string; dot: string; label: string }> = {
  pending:   { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", dot: "#2563eb", label: "Pending"   },
  verified:  { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", dot: "#16a34a", label: "Verified"  },
  dispensed: { bg: "#f5f4f0", color: "#4a4a40", border: "#e2e0d8", dot: "#4a4a40", label: "Dispensed" },
  partial:   { bg: "#fffbeb", color: "#d97706", border: "#fde68a", dot: "#d97706", label: "Partial"   },
  cancelled: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", dot: "#dc2626", label: "Cancelled" },
  expired:   { bg: "#fdf4ff", color: "#9333ea", border: "#e9d5ff", dot: "#9333ea", label: "Expired"   },
};

const PAYMENT_CFG: Record<Prescription["payment_status"], { bg: string; color: string; border: string; label: string }> = {
  unpaid:  { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "Unpaid"  },
  partial: { bg: "#fffbeb", color: "#d97706", border: "#fde68a", label: "Partial" },
  paid:    { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", label: "Paid"    },
};

const FREQUENCIES = ["Once daily", "Twice daily", "Three times daily", "Four times daily", "Every 6 hours", "Every 8 hours", "Every 12 hours", "As needed", "Weekly", "Monthly"];
const DURATIONS   = ["1 day", "3 days", "5 days", "7 days", "10 days", "14 days", "21 days", "1 month", "2 months", "3 months", "6 months", "Ongoing"];

type RxStatus = Prescription["status"];

/* ── Helpers ── */
function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isExpired(expiry: string | null): boolean {
  if (!expiry) return false;
  return new Date(expiry) < new Date();
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultExpiry(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 10);
}

/* ── Shared styles ── */
const fieldStyle: React.CSSProperties = {
  width: "100%", background: "#f5f4f0", border: "1px solid #c8c6bc",
  borderRadius: 8, padding: "9px 12px", color: "#141410",
  fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px",
  textTransform: "uppercase", color: "#4a4a40", marginBottom: 5,
};
const sectionStyle: React.CSSProperties = {
  background: "#f5f4f0", borderRadius: 10, padding: "1rem",
  display: "flex", flexDirection: "column", gap: "0.85rem",
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "#4a4a40",
  textTransform: "uppercase", letterSpacing: "0.5px",
};

/* ── SVG Icons ── */
function IconPlus()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function IconSearch()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function IconList()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>; }
function IconEdit()    { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function IconTrash()   { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>; }
function IconWarning() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function IconPill()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20H4a2 2 0 01-2-2V6a2 2 0 012-2h16a2 2 0 012 2v6.5"/><path d="M16 19h6"/><path d="M19 16v6"/></svg>; }
function IconUser()    { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function IconDoc()     { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>; }
function IconPhone()   { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.7A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>; }
function IconClock()   { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function IconShield()  { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function IconHash()    { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>; }

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
function DetailPanel({ rx, onClose, onEdit, onDelete, onUpdateStatus, formatCurrency }: {
  rx:             Prescription;
  onClose:        () => void;
  onEdit:         () => void;
  onDelete:       () => void;
  onUpdateStatus: (s: RxStatus) => void;
  formatCurrency: (n: number) => string;
}) {
  const scfg    = STATUS_CFG[rx.status];
  const pcfg    = PAYMENT_CFG[rx.payment_status];
  const expired = isExpired(rx.expiry_date);

  const nextStatuses: RxStatus[] =
    rx.status === "pending"   ? ["verified", "cancelled"] :
    rx.status === "verified"  ? ["dispensed", "partial", "cancelled"] :
    rx.status === "partial"   ? ["dispensed", "cancelled"] : [];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 460, background: "#fff", zIndex: 901, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", animation: "panelIn 0.25s ease" }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        <div style={{ height: 4, background: scfg.dot }} />

        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#9a9a8e", letterSpacing: "0.5px" }}>Rx</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#141410" }}>{rx.rx_number}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#141410" }}>{rx.patient_name}</div>
            <div style={{ marginTop: 5, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: scfg.bg, border: `1px solid ${scfg.border}`, borderRadius: 100, fontSize: 10, fontWeight: 600, color: scfg.color }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: scfg.dot }} />{scfg.label}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: pcfg.bg, border: `1px solid ${pcfg.border}`, borderRadius: 100, fontSize: 10, fontWeight: 600, color: pcfg.color }}>
                {pcfg.label}
              </span>
              {expired && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 100, fontSize: 10, fontWeight: 600, color: "#dc2626" }}>
                  Expired
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Patient + Doctor */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            <div style={{ background: "#f5f4f0", borderRadius: 8, padding: "0.7rem 0.85rem", gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 10, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Patient</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#141410" }}>{rx.patient_name}</div>
              {rx.patient_phone && <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}><IconPhone />{rx.patient_phone}</div>}
              {rx.patient_dob   && <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2 }}>DOB: {formatDate(rx.patient_dob)}</div>}
              {rx.patient_id_no && <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}><IconHash />ID: {rx.patient_id_no}</div>}
            </div>
            {[
              { label: "Doctor",      value: rx.doctor_name,                   icon: <IconUser /> },
              { label: "Reg. No",     value: rx.doctor_reg_no ?? "—",          icon: <IconHash /> },
              { label: "Hospital",    value: rx.hospital       ?? "—",          icon: <IconDoc />  },
              { label: "Issued",      value: formatDate(rx.issued_date),        icon: <IconClock /> },
              { label: "Expiry",      value: formatDate(rx.expiry_date),        icon: <IconClock /> },
              { label: "Dispensed",   value: formatDate(rx.dispensed_date),     icon: <IconClock /> },
            ].map(row => (
              <div key={row.label} style={{ background: "#f5f4f0", borderRadius: 8, padding: "0.65rem 0.85rem" }}>
                <div style={{ fontSize: 10, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>{row.icon}{row.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: row.label === "Expiry" && expired ? "#dc2626" : "#141410" }}>{row.value}</div>
              </div>
            ))}
          </div>

          {/* Drug items */}
          <div>
            <div style={{ fontSize: 10, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, fontWeight: 600 }}>Prescribed Drugs ({rx.items.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rx.items.map((item, i) => (
                <div key={i} style={{ background: "#f5f4f0", borderRadius: 8, padding: "0.7rem 0.85rem", borderLeft: "3px solid #2563eb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#141410" }}>{item.drug_name}</div>
                    <span style={{ fontSize: 11, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 100, padding: "1px 7px", fontWeight: 600 }}>Qty: {item.quantity}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#4a4a40", marginTop: 3 }}>{item.dosage} · {item.frequency}</div>
                  <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 2 }}>Duration: {item.duration}</div>
                  {item.notes && <div style={{ fontSize: 11, color: "#d97706", marginTop: 2, fontStyle: "italic" }}>{item.notes}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Insurance */}
          {rx.insurance_name && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "0.75rem 0.85rem" }}>
              <div style={{ fontSize: 10, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><IconShield />Insurance</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#141410" }}>{rx.insurance_name}</div>
              {rx.insurance_no && <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2 }}>Policy: {rx.insurance_no}</div>}
              <div style={{ fontSize: 13, fontWeight: 600, color: "#2563eb", marginTop: 4 }}>Covers: {formatCurrency(rx.insurance_amount)}</div>
            </div>
          )}

          {/* Payment summary */}
          <div style={{ background: "#f5f4f0", borderRadius: 8, padding: "0.75rem 0.85rem", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 10, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Payment</div>
            {[
              { label: "Total",     value: formatCurrency(rx.total_amount),                           color: "#141410" },
              { label: "Insurance", value: formatCurrency(rx.insurance_amount),                       color: "#2563eb" },
              { label: "Paid",      value: formatCurrency(rx.amount_paid),                            color: "#16a34a" },
              { label: "Balance",   value: formatCurrency(rx.total_amount - rx.insurance_amount - rx.amount_paid), color: rx.total_amount - rx.insurance_amount - rx.amount_paid > 0 ? "#dc2626" : "#16a34a" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#9a9a8e" }}>{r.label}</span>
                <strong style={{ color: r.color }}>{r.value}</strong>
              </div>
            ))}
          </div>

          {/* Notes */}
          {rx.notes && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "0.75rem 0.85rem" }}>
              <div style={{ fontSize: 10, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.5 }}>{rx.notes}</div>
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
                    <button key={s} onClick={() => onUpdateStatus(s)}
                      style={{ padding: "7px 14px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, fontSize: 12, fontWeight: 500, color: c.color, cursor: "pointer", fontFamily: "inherit" }}>
                      → {c.label}
                    </button>
                  );
                })}
              </div>
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

/* ── Drug Item Row (inside form) ── */
function DrugItemRow({ item, index, onChange, onRemove }: {
  item:     PrescriptionItem;
  index:    number;
  onChange: (i: number, field: keyof PrescriptionItem, value: string | number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #c8c6bc", borderRadius: 8, padding: "0.85rem", display: "flex", flexDirection: "column", gap: "0.65rem", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40" }}>Drug #{index + 1}</span>
        <button onClick={() => onRemove(index)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", display: "flex", alignItems: "center", padding: 2 }}><IconTrash /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Drug Name *</label>
          <input style={fieldStyle} placeholder="e.g. Amoxicillin 500mg" value={item.drug_name}
            onChange={e => onChange(index, "drug_name", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Dosage</label>
          <input style={fieldStyle} placeholder="e.g. 1 tablet" value={item.dosage}
            onChange={e => onChange(index, "dosage", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Qty</label>
          <input style={fieldStyle} type="number" min="1" placeholder="0" value={item.quantity}
            onChange={e => onChange(index, "quantity", Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Frequency</label>
          <select style={fieldStyle} value={item.frequency} onChange={e => onChange(index, "frequency", e.target.value)}>
            <option value="">Select…</option>
            {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Duration</label>
          <select style={fieldStyle} value={item.duration} onChange={e => onChange(index, "duration", e.target.value)}>
            <option value="">Select…</option>
            {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Drug Notes</label>
          <input style={fieldStyle} placeholder="e.g. Take with food" value={item.notes}
            onChange={e => onChange(index, "notes", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

/* ── Form Panel ── */
function PrescriptionFormPanel({ open, onClose, mode, rx, onSave, saving }: {
  open:    boolean;
  onClose: () => void;
  mode:    "add" | "edit";
  rx?:     Prescription | null;
  onSave:  (form: PrescriptionForm) => void;
  saving:  boolean;
}) {
  const blankItem: PrescriptionItem = { drug_name: "", dosage: "", frequency: "", duration: "", quantity: 1, notes: "" };
  const blank: PrescriptionForm = {
    patient_name: "", patient_phone: "", patient_dob: "", patient_id_no: "",
    doctor_name: "", doctor_reg_no: "", hospital: "",
    items: [{ ...blankItem }],
    payment_status: "unpaid", total_amount: "", amount_paid: "0",
    insurance_name: "", insurance_no: "", insurance_amount: "0",
    issued_date: todayStr(), expiry_date: defaultExpiry(), notes: "",
  };
  const [form, setForm] = useState<PrescriptionForm>(blank);
  const prevOpen = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) {
      setForm(mode === "edit" && rx ? {
        patient_name:     rx.patient_name,
        patient_phone:    rx.patient_phone    ?? "",
        patient_dob:      rx.patient_dob      ?? "",
        patient_id_no:    rx.patient_id_no    ?? "",
        doctor_name:      rx.doctor_name,
        doctor_reg_no:    rx.doctor_reg_no    ?? "",
        hospital:         rx.hospital         ?? "",
        items:            rx.items.length ? rx.items : [{ ...blankItem }],
        payment_status:   rx.payment_status,
        total_amount:     String(rx.total_amount),
        amount_paid:      String(rx.amount_paid),
        insurance_name:   rx.insurance_name   ?? "",
        insurance_no:     rx.insurance_no     ?? "",
        insurance_amount: String(rx.insurance_amount),
        issued_date:      rx.issued_date,
        expiry_date:      rx.expiry_date       ?? "",
        notes:            rx.notes             ?? "",
      } : blank);
    }
    prevOpen.current = open;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const set = (key: keyof PrescriptionForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const updateItem = (i: number, field: keyof PrescriptionItem, value: string | number) => {
    setForm(f => {
      const items = [...f.items];
      items[i] = { ...items[i], [field]: value };
      return { ...f, items };
    });
  };

  const addItem    = () => setForm(f => ({ ...f, items: [...f.items, { ...blankItem }] }));
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const canSave = !!form.patient_name && !!form.doctor_name && form.items.some(it => it.drug_name);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 560, background: "#fff", zIndex: 901, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", animation: "panelIn 0.25s ease" }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{mode === "add" ? "New Prescription" : "Edit Prescription"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>

          {/* Patient */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Patient</div>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input style={fieldStyle} placeholder="e.g. Grace Njeri" value={form.patient_name} onChange={set("patient_name")} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={fieldStyle} type="tel" placeholder="+254 7xx xxx xxx" value={form.patient_phone} onChange={set("patient_phone")} />
              </div>
              <div>
                <label style={labelStyle}>Date of Birth</label>
                <input style={fieldStyle} type="date" value={form.patient_dob} onChange={set("patient_dob")} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>ID / Passport No.</label>
              <input style={fieldStyle} placeholder="e.g. 12345678" value={form.patient_id_no} onChange={set("patient_id_no")} />
            </div>
          </div>

          {/* Doctor */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Prescribing Doctor</div>
            <div>
              <label style={labelStyle}>Doctor Name *</label>
              <input style={fieldStyle} placeholder="e.g. Dr. James Kamau" value={form.doctor_name} onChange={set("doctor_name")} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Registration No.</label>
                <input style={fieldStyle} placeholder="e.g. MD/12345" value={form.doctor_reg_no} onChange={set("doctor_reg_no")} />
              </div>
              <div>
                <label style={labelStyle}>Hospital / Clinic</label>
                <input style={fieldStyle} placeholder="e.g. Nairobi Hospital" value={form.hospital} onChange={set("hospital")} />
              </div>
            </div>
          </div>

          {/* Drugs */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={sectionTitleStyle}>Prescribed Drugs *</div>
              <button onClick={addItem}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "#141410", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
                <IconPlus /> Add Drug
              </button>
            </div>
            {form.items.map((item, i) => (
              <DrugItemRow key={i} item={item} index={i} onChange={updateItem} onRemove={removeItem} />
            ))}
          </div>

          {/* Validity */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Validity</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Issued Date *</label>
                <input style={fieldStyle} type="date" value={form.issued_date} onChange={set("issued_date")} />
              </div>
              <div>
                <label style={labelStyle}>Expiry Date</label>
                <input style={fieldStyle} type="date" value={form.expiry_date} onChange={set("expiry_date")} />
              </div>
            </div>
          </div>

          {/* Insurance */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Insurance <span style={{ fontWeight: 400, color: "#9a9a8e" }}>(optional)</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Insurance Provider</label>
                <input style={fieldStyle} placeholder="e.g. AAR, Jubilee" value={form.insurance_name} onChange={set("insurance_name")} />
              </div>
              <div>
                <label style={labelStyle}>Policy / Member No.</label>
                <input style={fieldStyle} placeholder="e.g. AAR/12345" value={form.insurance_no} onChange={set("insurance_no")} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Insurance Cover Amount</label>
              <input style={fieldStyle} type="number" min="0" step="0.01" placeholder="0.00" value={form.insurance_amount} onChange={set("insurance_amount")} />
            </div>
          </div>

          {/* Payment */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Payment</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Total Amount</label>
                <input style={fieldStyle} type="number" min="0" step="0.01" placeholder="0.00" value={form.total_amount} onChange={set("total_amount")} />
              </div>
              <div>
                <label style={labelStyle}>Amount Paid</label>
                <input style={fieldStyle} type="number" min="0" step="0.01" placeholder="0.00" value={form.amount_paid} onChange={set("amount_paid")} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Payment Status</label>
              <select style={fieldStyle} value={form.payment_status} onChange={set("payment_status")}>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...fieldStyle, resize: "vertical", minHeight: 72, lineHeight: 1.5 } as React.CSSProperties}
              placeholder="Any additional notes…" value={form.notes} onChange={set("notes")} />
          </div>
        </div>

        <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #e2e0d8", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !canSave}
            style={{ padding: "9px 20px", background: saving || !canSave ? "#9a9a8e" : "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving || !canSave ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "Saving…" : mode === "add" ? "Save Prescription" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function AdminPrescriptionsPage() {
  const adminUser = getStoredUser();
  const { formatCurrency, config } = useStore();

  const [rxList,       setRxList]       = useState<Prescription[]>([]);
  const [fetching,     setFetching]     = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RxStatus>("all");
  const [payFilter,    setPayFilter]    = useState<"all" | Prescription["payment_status"]>("all");
  const [selected,     setSelected]     = useState<Prescription | null>(null);
  const [detailOpen,   setDetailOpen]   = useState(false);
  const [formOpen,     setFormOpen]     = useState(false);
  const [formMode,     setFormMode]     = useState<"add" | "edit">("add");
  const [editTarget,   setEditTarget]   = useState<Prescription | null>(null);
  const [toast,        setToast]        = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirm,      setConfirm]      = useState({ open: false, title: "", message: "", danger: false, onConfirm: () => {} });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  /* ── Fetch ── */
  const fetchRx = useCallback(async () => {
    if (!adminUser?.id) return;
    setFetching(true);
    try {
      const res  = await fetch(`/api/prescriptions?admin_id=${adminUser.id}`);
      const data = await res.json();
      const parsed = (Array.isArray(data) ? data : []).map((r: Prescription) => ({
        ...r,
        items: typeof r.items === "string" ? JSON.parse(r.items) : r.items ?? [],
      }));
      setRxList(parsed);
    } catch { showToast("Failed to load prescriptions", "error"); }
    finally  { setFetching(false); }
  }, [adminUser?.id]);

  useEffect(() => { fetchRx(); }, [fetchRx]);

  /* ── Save ── */
  const handleSave = async (form: PrescriptionForm) => {
    if (!adminUser?.id) return;
    setSaving(true);
    try {
      const isAdd  = formMode === "add";
      const url    = isAdd ? "/api/prescriptions" : `/api/prescriptions/${editTarget?.id}`;
      const method = isAdd ? "POST" : "PUT";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          total_amount:     Number(form.total_amount)     || 0,
          amount_paid:      Number(form.amount_paid)      || 0,
          insurance_amount: Number(form.insurance_amount) || 0,
          expiry_date:      form.expiry_date  || null,
          patient_dob:      form.patient_dob  || null,
          admin_id: adminUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(isAdd ? "Prescription saved" : "Prescription updated");
      setFormOpen(false);
      fetchRx();
    } catch (err) {
      showToast((err as Error).message || "Failed to save", "error");
    } finally { setSaving(false); }
  };

  /* ── Update status ── */
  const handleUpdateStatus = async (rx: Prescription, status: RxStatus) => {
    try {
      const res = await fetch(`/api/prescriptions/${rx.id}/status`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, admin_id: adminUser?.id }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(`Marked as ${STATUS_CFG[status].label}`);
      setDetailOpen(false);
      fetchRx();
    } catch { showToast("Failed to update status", "error"); }
  };

  /* ── Delete ── */
  const handleDelete = (rx: Prescription) => {
    setConfirm({
      open: true, danger: true,
      title: "Delete Prescription",
      message: `Delete Rx ${rx.rx_number} for ${rx.patient_name}? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/prescriptions/${rx.id}?admin_id=${adminUser?.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed");
          showToast("Prescription deleted");
          setDetailOpen(false);
          fetchRx();
        } catch { showToast("Failed to delete", "error"); }
      },
    });
  };

  /* ── Filtered ── */
  const filtered = rxList.filter(r => {
    const matchSearch = !search ||
      r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      r.rx_number.toLowerCase().includes(search.toLowerCase()) ||
      r.doctor_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status         === statusFilter;
    const matchPay    = payFilter    === "all" || r.payment_status === payFilter;
    return matchSearch && matchStatus && matchPay;
  });

  /* ── Stats ── */
  const todayRx = rxList.filter(r => r.created_at?.slice(0, 10) === todayStr());
  const stats = {
    today:     todayRx.length,
    pending:   rxList.filter(r => r.status === "pending").length,
    dispensed: rxList.filter(r => r.status === "dispensed").length,
    expired:   rxList.filter(r => isExpired(r.expiry_date)).length,
    revenue:   rxList.filter(r => r.payment_status === "paid").reduce((s, r) => s + r.total_amount, 0),
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
          rx={selected}
          onClose={() => setDetailOpen(false)}
          onEdit={() => { setFormMode("edit"); setEditTarget(selected); setDetailOpen(false); setFormOpen(true); }}
          onDelete={() => { setDetailOpen(false); handleDelete(selected); }}
          onUpdateStatus={s => handleUpdateStatus(selected, s)}
          formatCurrency={formatCurrency}
        />
      )}

      <PrescriptionFormPanel
        open={formOpen} onClose={() => setFormOpen(false)}
        mode={formMode} rx={editTarget}
        onSave={handleSave} saving={saving}
      />

      {/* Header */}
      <header className="header">
        <div className="header-title">Prescriptions</div>
        <div className="header-date">{dater}</div>
        <button onClick={() => { setFormMode("add"); setEditTarget(null); setFormOpen(true); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#141410", color: "#fff", border: "none", borderRadius: 7, fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <IconPlus /> New Prescription
        </button>
      </header>

      <main className="main">

        {/* Stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
          {[
            { label: "Today",     value: stats.today,                    color: "#141410" },
            { label: "Pending",   value: stats.pending,                  color: "#2563eb" },
            { label: "Dispensed", value: stats.dispensed,                color: "#16a34a" },
            { label: "Expired",   value: stats.expired,                  color: "#dc2626" },
            { label: "Revenue",   value: formatCurrency(stats.revenue),  color: "#141410" },
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
            <div style={{ position: "relative", minWidth: 220, flex: 1, maxWidth: 320 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9a9a8e", display: "flex" }}><IconSearch /></span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by patient, Rx no., doctor…"
                style={{ ...fieldStyle, paddingLeft: 32, fontSize: 13 }} />
            </div>

            <div style={{ flex: 1 }} />

            {/* Status filter */}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | RxStatus)}
              style={{ padding: "6px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 7, fontFamily: "inherit", fontSize: 12, color: "#4a4a40", cursor: "pointer", outline: "none" }}>
              <option value="all">All statuses</option>
              {(Object.keys(STATUS_CFG) as RxStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_CFG[s].label}</option>
              ))}
            </select>

            {/* Payment filter */}
            <div style={{ display: "flex", gap: 5 }}>
              {([{ v: "all", label: "All" }, { v: "unpaid", label: "Unpaid" }, { v: "partial", label: "Partial" }, { v: "paid", label: "Paid" }] as const).map(({ v, label }) => (
                <button key={v} onClick={() => setPayFilter(v)}
                  style={{ padding: "5px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: payFilter === v ? "#141410" : "#f5f4f0", color: payFilter === v ? "#fff" : "#4a4a40", border: payFilter === v ? "1px solid #141410" : "1px solid #c8c6bc", transition: "all 0.15s" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          {fetching ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", color: "#9a9a8e", fontSize: 13, gap: 10 }}>
              <div style={{ width: 18, height: 18, border: "2px solid #e2e0d8", borderTopColor: "#141410", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              Loading…<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "4rem", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, background: "#f5f4f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", color: "#c8c6bc" }}><IconPill /></div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#9a9a8e", marginBottom: 6 }}>No prescriptions found</div>
              <div style={{ fontSize: 12, color: "#c8c6bc" }}>{search ? `No results for "${search}"` : "Create your first prescription to get started"}</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Rx No.", "Patient", "Doctor / Hospital", "Drugs", "Issued", "Expiry", "Amount", "Status", "Payment", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.6rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const scfg    = STATUS_CFG[r.status];
                  const pcfg    = PAYMENT_CFG[r.payment_status];
                  const expired = isExpired(r.expiry_date);
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #e2e0d8", cursor: "pointer", opacity: expired ? 0.75 : 1 }}
                      onClick={() => { setSelected(r); setDetailOpen(true); }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ fontWeight: 700, color: "#2563eb", fontSize: 12 }}>{r.rx_number}</div>
                        <div style={{ fontSize: 10, color: "#9a9a8e", marginTop: 2 }}>{formatDate(r.created_at?.slice(0,10))}</div>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ fontWeight: 500 }}>{r.patient_name}</div>
                        {r.patient_phone && <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 2 }}>{r.patient_phone}</div>}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ color: "#141410" }}>{r.doctor_name}</div>
                        {r.hospital && <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 2 }}>{r.hospital}</div>}
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {r.items.slice(0, 2).map((item, i) => (
                            <span key={i} style={{ fontSize: 11, color: "#4a4a40" }}>• {item.drug_name}</span>
                          ))}
                          {r.items.length > 2 && <span style={{ fontSize: 10, color: "#9a9a8e" }}>+{r.items.length - 2} more</span>}
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40", whiteSpace: "nowrap", fontSize: 12 }}>{formatDate(r.issued_date)}</td>
                      <td style={{ padding: "0.85rem 1.25rem", whiteSpace: "nowrap", fontSize: 12 }}>
                        <span style={{ color: expired ? "#dc2626" : "#4a4a40", fontWeight: expired ? 600 : 400 }}>{formatDate(r.expiry_date)}</span>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", fontWeight: 600 }}>{formatCurrency(r.total_amount)}</td>
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
                          <button onClick={() => { setFormMode("edit"); setEditTarget(r); setFormOpen(true); }}
                            style={{ padding: "5px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                            <IconEdit /> Edit
                          </button>
                          <button onClick={() => handleDelete(r)}
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