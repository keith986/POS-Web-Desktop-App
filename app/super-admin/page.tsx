"use client";

import React, { useCallback, useEffect, useRef, useState, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/* ─── Types ── */
type TabKey = "overview" | "users" | "staff" | "orders" | "logs" | "billing" | "settings" | "support";

interface OverviewStats {
  userCount: number;
  staffCount: number;
  adminCount: number;
  orderCount: number;
  activeUsers: number;
  pendingUsers: number;
  activeStaff: number;
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
  yearOrders: number;
  todayTransactions: number;
  weekTransactions: number;
  monthTransactions: number;
  yearTransactions: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  totalRevenue: number;
  totalDomains: number;
  activeDomains: number;
  totalVisits: number;
  totalClicks: number;
  sneakyBilling?: Array<{ store_name?: string; domain?: string; failed_transactions?: number; last_attempt?: string }>;
  recentLogs?: Array<{ type?: string; title?: string; message?: string; created_at?: string }>;
}

interface SupportConversation {
  admin_id:      string;
  full_name:     string;
  email:         string;
  last_message:  string;
  time:          string;
  message_count: number;
  unread_count?:  number;
  role?: string;
}
interface SupportMessage {
  id:     string;
  sender: "admin" | "super_admin";
  message: string;
  time:   string;
}

type TagProps = {
  children: ReactNode;
};

interface Admin {
  id: string | number;
  full_name?: string;
  email?: string;
  store_name?: string;
  pos_type?: string;
  plan?: string;
  domain?: string;
  created_at?: string;
  is_super_admin?: number | string;
  account_status?: string;
  subdomain_status?: string;
}

interface Billing {
  plan?: string;
  status?: string;
  amount?: number;
  renewal_date?: string;
  expiry_date?: string;
  next_billing_date?: string;
}

interface AdminDetailPanelProps {
  admin: Admin | null;
  billing?: Billing | null;
  onClose: () => void;
  onMessage?: (id: string) => void;
  onReset?: (id: string, action: string) => void;
  onToggle?: (id: string, active: boolean, force: boolean) => void;
  onGrant?: (email: string) => void;
  onRevoke?: (email: string) => void;
  onRenew?: (id: string) => void;
  onLifetime?: (id: string) => void;
  onCancelLifetime?: (id: string) => void;
}

interface CopyableIdProps {
  value: string | number | null | undefined;
  display: string;
}

interface RowProps {
  label: string;
  value?: ReactNode;
  accent?: string;
}

interface SectionCardProps {
  title?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

interface StatusPillProps {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}

interface ThemeTokens {
  label: string;
  swatch: string;
  "--bg": string; "--card": string; "--border": string;
  "--ink": string; "--muted": string; "--subtle": string;
  "--accent": string; "--accent-text": string;
  "--sidebar": string; "--nav-hover": string;
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview",  label: "Overview",  icon: <IcoOverview /> },
  { key: "users",     label: "Users",     icon: <IcoUsers />    },
  { key: "staff",     label: "Staff",     icon: <IcoStaff />    },
  { key: "orders",    label: "Orders",    icon: <IcoOrders />   },
  { key: "logs",      label: "Logs",      icon: <IcoLogs />     },
  { key: "billing",   label: "Billing",   icon: <IcoBilling />  },
  { key: "settings",  label: "Settings",  icon: <IcoSettings /> },
  { key: "support",   label: "Support",   icon: <IcoSupport />  },
];

/* ─── Icons ── */
function IcoOverview()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function IcoUsers()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>; }
function IcoStaff()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function IcoOrders()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>; }
function IcoLogs()      { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>; }
function IcoBilling()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }
function IcoSettings()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }
function IcoSupport()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>; }
function IcoRefresh()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>; }
function IcoSearch()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>; }
function IcoChevronL()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>; }
function IcoChevronR()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>; }
function IcoSend()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>; }
function IcoBell()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>; }

/* ─── Helpers ── */
function shortId(id?: unknown) {
  const s = String(id ?? "");
  if (!s || s === "undefined") return "—";
  if (s.length <= 12) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function fmtDate(d?: unknown) {
  if (!d) return "—";
  try { return new Date(String(d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return "—"; }
}
function fmtDateTime(d?: unknown) {
  if (!d) return "—";
  try { return new Date(String(d)).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}
function extractArray(body: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  if (body && typeof body === "object") {
    const arr = Object.values(body as object).find(Array.isArray);
    return arr ?? null;
  }
  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

/* ─── Avatar ── */
const AVATAR_PALETTE = [
  { bg: "#dbeafe", fg: "#2563eb" }, { bg: "#f5f3ff", fg: "#7c3aed" }, { bg: "#fce7f3", fg: "#db2777" },
  { bg: "#fef3c7", fg: "#b45309" }, { bg: "#dcfce7", fg: "#16a34a" }, { bg: "#e0f2fe", fg: "#0891b2" },
  { bg: "#ffe4e6", fg: "#e11d48" }, { bg: "#ede9fe", fg: "#6d28d9" },
];
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const { bg, fg } = AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: bg, color: fg, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700,
    }}>
      {initials(name)}
    </div>
  );
}

/* ─── Row actions dropdown ── */
function ActionsMenu({ items }: { items: { label: string; onClick: () => void; danger?: boolean; accent?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="sa-icon-btn"
        style={{ width: 32, height: 32, borderRadius: 8 }}
        aria-label="Row actions"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 41, minWidth: 170,
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10,
            boxShadow: "0 10px 28px rgba(0,0,0,0.14)", padding: 5, display: "flex", flexDirection: "column", gap: 2,
          }}>
            {items.map((it, i) => (
              <button
                key={i}
                onClick={() => { setOpen(false); it.onClick(); }}
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 7, border: "none",
                  background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 500,
                  color: it.danger ? "#dc2626" : it.accent ? "#16a34a" : "var(--ink)",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--subtle)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Donut ring ── */
function Donut({ pct, color, size = 78, thickness = 10, label }: { pct: number; color: string; size?: number; thickness?: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  const deg = clamped * 3.6;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <div style={{ width: size, height: size, borderRadius: "50%", background: `conic-gradient(${color} 0deg ${deg}deg, var(--subtle) ${deg}deg 360deg)` }} />
        <div style={{
          position: "absolute", inset: thickness, borderRadius: "50%", background: "var(--card)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: size * 0.21, fontWeight: 700, color: "var(--ink)" }}>{Math.round(clamped)}%</span>
        </div>
      </div>
      {label && <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 500, textAlign: "center" }}>{label}</div>}
    </div>
  );
}

/* ─── Status badge ── */
function Badge({ label, type = "neutral" }: { label: string; type?: "ok" | "warn" | "err" | "neutral" | "info" }) {
  const cfg = {
    ok:      { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
    warn:    { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
    err:     { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
    info:    { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
    neutral: { bg: "#f5f4f0", color: "#4a4a40", border: "#e2e0d8" },
  }[type];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 100, fontSize: 11, fontWeight: 500, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color }} />
      {label}
    </span>
  );
}

function statusBadge(val: unknown) {
  const s = String(val ?? "").toLowerCase();
  if (["active", "completed", "paid", "success"].includes(s))   return <Badge label={String(val)} type="ok" />;
  if (["pending", "processing"].includes(s))                     return <Badge label={String(val)} type="warn" />;
  if (["inactive", "cancelled", "failed", "expired"].includes(s)) return <Badge label={String(val)} type="err" />;
  return <Badge label={String(val)} type="neutral" />;
}

/* ─── Generic table (logs/orders fallback) ── */
function GenericTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return (
    <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No records found.</div>
  );
  const keys = Object.keys(data[0]).slice(0, 8);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {keys.map(k => (
              <th key={k} style={{ textAlign: "left", padding: "0.75rem 1.25rem", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--muted)", borderBottom: "1px solid var(--border)", background: "var(--subtle)", whiteSpace: "nowrap" }}>
                {k.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--subtle)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ""; }}>
              {keys.map(k => (
                <td key={k} style={{ padding: "0.85rem 1.25rem", color: "var(--ink)", whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {["status", "payment_status", "subdomain_status"].includes(k)
                    ? statusBadge(row[k])
                    : String(row[k] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Spinner ── */
function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", color: "#9a9a8e", fontSize: 13, gap: 10 }}>
      <div style={{ width: 18, height: 18, border: "2px solid #e2e0d8", borderTopColor: "#141410", borderRadius: "50%", animation: "sa-spin 0.7s linear infinite" }} />
      {label}
      <style>{`@keyframes sa-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─── Pagination ── */
function Pagination({ page, total, onChange, perPage, onPerPageChange, totalItems }: {
  page: number; total: number; onChange: (p: number) => void;
  perPage?: number; onPerPageChange?: (n: number) => void; totalItems?: number;
}) {
  const pages = Array.from({ length: Math.min(total, 7) }, (_, i) => {
    if (total <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= total - 3) return total - 6 + i;
    return page - 3 + i;
  });
  const rangeStart = totalItems && perPage ? (totalItems === 0 ? 0 : (page - 1) * perPage + 1) : null;
  const rangeEnd = totalItems && perPage ? Math.min(page * perPage, totalItems) : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0.85rem 1.25rem", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
      {perPage !== undefined && onPerPageChange && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)" }}>
          Rows per page
          <select
            value={perPage}
            onChange={e => onPerPageChange(Number(e.target.value))}
            style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--card)", color: "var(--ink)", fontFamily: "inherit", fontSize: 12 }}
          >
            {[10, 12, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}
      {rangeStart !== null && (
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{rangeStart}-{rangeEnd} of {totalItems}</span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} style={{ width: 30, height: 30, border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === 1 ? 0.4 : 1 }}><IcoChevronL /></button>
        {pages.map(p => (
          <button key={p} onClick={() => onChange(p)} style={{ width: 30, height: 30, border: `1px solid ${p === page ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, background: p === page ? "var(--accent)" : "var(--card)", color: p === page ? "var(--accent-text)" : "var(--ink)", cursor: "pointer", fontSize: 12.5, fontWeight: p === page ? 700 : 500, fontFamily: "inherit" }}>{p}</button>
        ))}
        {total > 7 && page < total - 3 && <span style={{ color: "var(--muted)", fontSize: 12 }}>…</span>}
        {total > 7 && page < total - 3 && (
          <button onClick={() => onChange(total)} style={{ width: 30, height: 30, border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", color: "var(--ink)", cursor: "pointer", fontSize: 12.5, fontFamily: "inherit" }}>{total}</button>
        )}
        <button onClick={() => onChange(Math.min(total, page + 1))} disabled={page === total} style={{ width: 30, height: 30, border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === total ? 0.4 : 1 }}><IcoChevronR /></button>
      </div>
    </div>
  );
}

/*_________ sidebar view _________*/


function initials(name = "") {
  return name.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "—";
}

function daysUntil(d?: unknown): number | null {
  if (!d) return null;
  const diff = Math.ceil((new Date(String(d)).getTime() - Date.now()) / 86400000);
  return Number.isFinite(diff) ? diff : null;
}

/* ─── Copy-to-clipboard ID chip ─── */

function CopyableId({ value, display } : CopyableIdProps) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value ?? ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <button
      onClick={copy}
      title="Click to copy full ID"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer",
        background: "transparent", padding: 0, fontFamily: "monospace", fontSize: 13, fontWeight: 600,
        color: copied ? "#16a34a" : "#141410",
      }}
    >
      {copied ? "Copied!" : display}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {copied
          ? <polyline points="20 6 9 17 4 12" />
          : <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></>
        }
      </svg>
    </button>
  );
}
 
function Tag({ children } : TagProps) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "5px 11px",
      borderRadius: 100, fontSize: 11.5, fontWeight: 500,
      background: "#fff", color: "#4a4a40", border: "1px solid #e2e0d8",
    }}>
      {children}
    </span>
  );
}

function StatusPill({ active, activeLabel = "Active", inactiveLabel = "Inactive" } : StatusPillProps) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 100,
      fontSize: 11.5, fontWeight: 600,
      background: active ? "#f0fdf4" : "#fef2f2",
      color: active ? "#16a34a" : "#dc2626",
      border: `1px solid ${active ? "#bbf7d0" : "#fecaca"}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#16a34a" : "#dc2626" }} />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
 
function Row({ label, value, accent } : RowProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #f0efe9" }}>
      <span style={{ fontSize: 12.5, color: "#9a9a8e" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: accent || "#141410", textAlign: "right" }}>{value ?? "—"}</span>
    </div>
  );
}
 
function SectionCard({ title, children, style } : SectionCardProps) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e0d8", borderRadius: 16, padding: "1rem 1.15rem",
      boxShadow: "0 1px 2px rgba(20,20,16,0.03)", ...style,
    }}>
      {title && <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", marginBottom: 6 }}>{title}</div>}
      {children}
    </div>
  );
}

export function AdminDetailPanel({
  admin, billing, onClose, onMessage, onReset, onToggle,
  onGrant, onRevoke, onRenew, onLifetime, onCancelLifetime,
}: AdminDetailPanelProps) {
  const [tab, setTab] = useState("profile");
  const open = Boolean(admin);
 
  const isSuper = admin ? Number(admin.is_super_admin) === 1 : false;
  const rawStatus = admin ? String(admin.account_status ?? admin.subdomain_status ?? "") : "";
  const isActive = admin ? rawStatus !== "inactive" && rawStatus !== "failed" : true;
 
  const remaining = billing?.next_billing_date ? daysUntil(billing.next_billing_date) : null;
  const isLifetime = billing?.plan === "lifetime";
 
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(15,15,15,0.4)", backdropFilter: "blur(2px)",
          zIndex: 998, opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />
 
      <aside style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: 420, maxWidth: "92vw",
        background: "#f5f4f0", zIndex: 999,
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(.4,0,.2,1)",
        display: "flex", flexDirection: "column", boxShadow: "-12px 0 32px rgba(0,0,0,0.08)",
      }}>
        {admin && (
          <>
            <div style={{ padding: "1.25rem 1.25rem 0", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={onClose} aria-label="Close panel" style={{
                width: 32, height: 32, borderRadius: 10, border: "1px solid #e2e0d8",
                background: "#fff", color: "#4a4a40", cursor: "pointer", fontSize: 14,
              }}>✕</button>
            </div>
 
            <div style={{ overflowY: "auto", flex: 1, padding: "0.5rem 1.25rem 1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Identity card — flat, no gradient banner */}
                <div style={{
                  background: "#fff", borderRadius: 20, padding: "1.25rem 1.15rem",
                  border: "1px solid #e2e0d8", boxShadow: "0 8px 20px rgba(20,20,16,0.06)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: "50%", flexShrink: 0,
                      background: "#141410", display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 18, fontWeight: 600,
                    }}>
                      {initials(String(admin.full_name ?? admin.email ?? "?"))}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16.5, fontWeight: 700, color: "#141410", lineHeight: 1.2 }}>{admin.full_name ?? "—"}</div>
                      <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{admin.email ?? "—"}</div>
                    </div>
                  </div>
 
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                    {isSuper && <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 100, padding: "5px 11px" }}>★ SUPER ADMIN</span>}
                    <StatusPill active={isActive} />
                    {isLifetime && <span style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 100, padding: "5px 11px" }}>♾ Lifetime</span>}
                  </div>
 
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    <Tag>{admin.store_name ?? "No store"}</Tag>
                    {admin.pos_type && <Tag>{String(admin.pos_type)}</Tag>}
                    {admin.domain && <Tag>{admin.domain}.upendoapps.com</Tag>}
                  </div>
 
                  <button
                    onClick={() => onMessage?.(String(admin.id))}
                    style={{
                      width: "100%", marginTop: 16, padding: "12px", borderRadius: 13, border: "none",
                      background: "#141410", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(20,20,16,0.18)",
                    }}
                  >
                    Message admin
                  </button>
                </div>
 
                {/* Tab switcher */}
                <div style={{ display: "flex", background: "#e9e7df", borderRadius: 12, padding: 4, gap: 4 }}>
                  {[["profile", "Profile"], ["billing", "Billing"]].map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)} style={{
                      flex: 1, padding: "8px", borderRadius: 9, border: "none", cursor: "pointer",
                      fontSize: 12.5, fontWeight: 600, fontFamily: "inherit",
                      background: tab === key ? "#fff" : "transparent",
                      color: tab === key ? "#141410" : "#8a8a7e",
                      boxShadow: tab === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      transition: "all 0.15s",
                    }}>{label}</button>
                  ))}
                </div>
 
                {tab === "profile" ? (
                  <>
                    <SectionCard title="Account">
                      <Row label="Admin ID" value={<CopyableId value={admin.id} display={String(admin.id ?? "").slice(0, 8) + "…"} />} />
                      <Row label="Joined" value={fmtDate(admin.created_at)} />
                      <Row label="Role" value={isSuper ? "Super admin" : "Admin"} />
                    </SectionCard>
 
                    <SectionCard title="Store">
                      <Row label="Store name" value={admin.store_name} />
                      <Row label="Domain" value={admin.domain ? `${admin.domain}.upendoapps.com` : "—"} />
                      <Row label="POS type" value={admin.pos_type} />
                    </SectionCard>
 
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <button onClick={() => onReset?.(String(admin.id), "reset_user_password")} style={secondaryBtn}>Reset password</button>
                      {isSuper ? (
                        <button onClick={() => onRevoke?.(String(admin.email))} style={{ ...secondaryBtn, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>Revoke superadmin</button>
                      ) : (
                        <button onClick={() => onGrant?.(String(admin.email))} style={{ ...secondaryBtn, borderColor: "#bbf7d0", background: "#f0fdf4", color: "#16a34a" }}>Grant superadmin</button>
                      )}
                      <button
                        onClick={() => onToggle?.(String(admin.id), !isActive, false)}
                        style={{
                          ...secondaryBtn,
                          borderColor: isActive ? "#fecaca" : "#bbf7d0",
                          background: isActive ? "#fef2f2" : "#f0fdf4",
                          color: isActive ? "#991b1b" : "#166534",
                        }}
                      >
                        {isActive ? "Deactivate account" : "Activate account"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <SectionCard>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px" }}>Current plan</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: "#141410", marginTop: 2, textTransform: "capitalize" }}>{billing?.plan ?? "starter"}</div>
                        </div>
                        <StatusPill active={billing?.status === "active" || billing?.status === "paid"} activeLabel="Paid" inactiveLabel={billing?.status ?? "Unknown"} />
                      </div>
                    </SectionCard>
 
                    <SectionCard title="Billing details">
                      <Row label="Amount" value={billing?.amount != null ? `KES ${Number(billing.amount).toLocaleString()}` : "—"} />
                      <Row label="Last renewed" value={fmtDate(billing?.renewal_date)} />
                      <Row
                        label="Next billing"
                        value={isLifetime ? "Never (lifetime)" : fmtDate(billing?.expiry_date ?? billing?.next_billing_date)}
                        accent={!isLifetime && remaining != null && remaining <= 3 ? "#dc2626" : undefined}
                      />
                      {!isLifetime && remaining != null && (
                        <Row
                          label="Time left"
                          value={remaining < 0 ? `Overdue ${Math.abs(remaining)}d` : `${remaining} day${remaining === 1 ? "" : "s"}`}
                          accent={remaining <= 3 ? "#dc2626" : remaining <= 14 ? "#d97706" : "#16a34a"}
                        />
                      )}
                      <Row label="Payment method" value="M-Pesa" />
                    </SectionCard>
 
                    {!billing && (
                      <div style={{ fontSize: 12, color: "#9a9a8e", textAlign: "center", padding: "0.5rem 0" }}>
                        No billing record found for this admin.
                      </div>
                    )}
 
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <button onClick={() => onRenew?.(String(admin.id))} style={secondaryBtn}>Renew subscription</button>
                      {isLifetime ? (
                        <button onClick={() => onCancelLifetime?.(String(admin.id))} style={{ ...secondaryBtn, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>
                          Cancel lifetime subscription
                        </button>
                      ) : (
                        <button onClick={() => onLifetime?.(String(admin.id))} style={{ ...secondaryBtn, borderColor: "#ddd6fe", background: "#f5f3ff", color: "#6d28d9" }}>
                          Upgrade to lifetime
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

const secondaryBtn: React.CSSProperties = {
  width: "100%", padding: "11px", borderRadius: 12, cursor: "pointer",
  border: "1px solid #e2e0d8", background: "#fff", color: "#141410",
  fontSize: 13, fontWeight: 500, textAlign: "left",
};

/*Admin System Theme*/
type ThemeKey = "cream" | "midnight" | "ocean" | "sunset" | "forest";

export const THEMES: Record<ThemeKey, ThemeTokens> = {
  cream: { label: "Cream", swatch: "#f5f4f0", "--bg": "#f5f4f0", "--card": "#ffffff", "--border": "#e2e0d8", "--ink": "#141410", "--muted": "#9a9a8e", "--subtle": "#f0efe9", "--accent": "#141410", "--accent-text": "#ffffff", "--sidebar": "#ffffff", "--nav-hover": "#f5f4f0" },
  midnight: { label: "Midnight", swatch: "#18181f", "--bg": "#121218", "--card": "#1c1c24", "--border": "#2c2c36", "--ink": "#f2f2f5", "--muted": "#8b8b98", "--subtle": "#242430", "--accent": "#f2f2f5", "--accent-text": "#121218", "--sidebar": "#1c1c24", "--nav-hover": "#252530" },
  ocean: { label: "Ocean", swatch: "#0e7490", "--bg": "#f0f9fb", "--card": "#ffffff", "--border": "#cfe8ee", "--ink": "#0c2b33", "--muted": "#5c8992", "--subtle": "#e3f4f7", "--accent": "#0e7490", "--accent-text": "#ffffff", "--sidebar": "#ffffff", "--nav-hover": "#e3f4f7" },
  sunset: { label: "Sunset", swatch: "#c2410c", "--bg": "#fdf4ee", "--card": "#ffffff", "--border": "#f0dcca", "--ink": "#3a2416", "--muted": "#9c7a63", "--subtle": "#faece1", "--accent": "#c2410c", "--accent-text": "#ffffff", "--sidebar": "#ffffff", "--nav-hover": "#faece1" },
  forest: { label: "Forest", swatch: "#166534", "--bg": "#f2f7f3", "--card": "#ffffff", "--border": "#d7e6da", "--ink": "#173321", "--muted": "#6c8574", "--subtle": "#e6f0e8", "--accent": "#166534", "--accent-text": "#ffffff", "--sidebar": "#ffffff", "--nav-hover": "#e6f0e8" },
};

interface ThemeContextValue {
  themeKey: ThemeKey;
  setThemeKey: (key: ThemeKey) => void;
}

const ThemeCtx = createContext<ThemeContextValue>({ themeKey: "cream", setThemeKey: () => {} });

export const useTheme = () => useContext(ThemeCtx);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeKey;
}

export function ThemeProvider({ children, defaultTheme = "cream" }: ThemeProviderProps) {
  const [themeKey, setThemeKey] = useState<ThemeKey>(defaultTheme);
  const tokens = THEMES[themeKey] ?? THEMES.cream;
  const cssVars = Object.fromEntries(
    Object.entries(tokens).filter(([k]) => k.startsWith("--"))
  ) as React.CSSProperties;

  return (
    <ThemeCtx.Provider value={{ themeKey, setThemeKey }}>
      <div style={{ ...cssVars, minHeight: "100vh" }}>{children}</div>
    </ThemeCtx.Provider>
  );
}

export function ThemeSwitcher() {
  const { themeKey, setThemeKey } = useTheme();
  const [open, setOpen] = useState(false);
  const current = THEMES[themeKey];

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
          background: "var(--card)", color: "var(--ink)", border: "1px solid var(--border)",
          borderRadius: 7, fontFamily: "inherit", fontSize: 13, cursor: "pointer",
        }}
      >
        <span style={{ width: 14, height: 14, borderRadius: "50%", background: current.swatch, border: "1px solid rgba(0,0,0,0.1)" }} />
        {current.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 41,
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 6, minWidth: 160,
          }}>
            {(Object.entries(THEMES) as [ThemeKey, ThemeTokens][]).map(([key, t]) => (
              <button
                key={key}
                onClick={() => { setThemeKey(key); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px",
                  border: "none", borderRadius: 7, background: key === themeKey ? "var(--subtle)" : "transparent",
                  color: "var(--ink)", fontFamily: "inherit", fontSize: 13, cursor: "pointer", textAlign: "left",
                }}
              >
                <span style={{ width: 14, height: 14, borderRadius: "50%", background: t.swatch, border: "1px solid rgba(0,0,0,0.1)" }} />
                {t.label}
                {key === themeKey && <span style={{ marginLeft: "auto", fontSize: 11 }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab,  setActiveTab]  = useState<TabKey>("overview");
  const [loading,    setLoading]    = useState(false);
  const [data,       setData]       = useState<Record<string, unknown>[]>([]);
  const [stats,      setStats]      = useState<OverviewStats | null>(null);
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [perPage,    setPerPage]    = useState(10);
  const [notice,     setNotice]     = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [superCurrentPassword, setSuperCurrentPassword] = useState("");
  const [superNewPassword,     setSuperNewPassword]     = useState("");
  const [superConfirmPassword, setSuperConfirmPassword] = useState("");

  /* ── Support ── */
  const [conversations,    setConversations]    = useState<SupportConversation[]>([]);
  const [selectedAdminId,  setSelectedAdminId]  = useState<string | null>(null);
  const [messages,         setMessages]         = useState<SupportMessage[]>([]);
  const [supportText,      setSupportText]      = useState("");
  const [supportLoading,   setSupportLoading]   = useState(false);
  const [admins,           setAdmins]           = useState<Record<string, unknown>[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<"renew" | "lifetime" | "reset_password" | "create_admin" | "create_staff" | "grant_superadmin" | "remove_superadmin" | "create_superadmin" | null>(null);
  const [modalTargetId, setModalTargetId] = useState<string | null>(null);
  const [modalAction, setModalAction] = useState<string | null>(null);
  const [modalInput, setModalInput] = useState<string>("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [panelAdmin, setPanelAdmin] = useState<Admin | null>(null);
  const [currentUser, setCurrentUser] = useState<{ full_name?: string; email?: string } | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  /* ── Auth guard ── */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || !user.is_super_admin) router.push("/login");
    else {
      setCurrentUser(user);
      try {
        const savedPic = localStorage.getItem("sa_profile_picture");
        if (savedPic) setProfilePicture(savedPic);
      } catch { /* storage unavailable */ }
    }
  }, [router]);

  /* ── Profile picture upload ── */
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      flash("Please choose an image file", "error");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      flash("Image must be under 3MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setProfilePicture(result);
      try { localStorage.setItem("sa_profile_picture", result); } catch { /* storage unavailable */ }
      flash("Profile picture updated", "success");
    };
    reader.onerror = () => flash("Could not read that image", "error");
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* ── Fetch section ── */
  const fetchSection = useCallback(async (section: string) => {
    if (section === "support") return;
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const res  = await fetch(`/api/admin/super?section=${encodeURIComponent(section)}`, {
        headers: { Authorization: `Bearer ${user?.id}` },
      });
      const body = await res.json();
      if (section === "overview") { setStats((body as OverviewStats) || null); setData([]); }
      else { setData(extractArray(body) ?? []); setStats(null); }
    } catch {
      setData([]); setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "support") fetchSection(activeTab);
  }, [activeTab, fetchSection]);

  const flash = (text: string, type: "success" | "error" | "info" = "info") => {
    setNotice({ text, type });
    window.setTimeout(() => setNotice(null), 4500);
  };

  const runAdminAction = async (action: string, userId?: string, extra?: Record<string, unknown>) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const body = { action, userId, ...extra };
      const res = await fetch("/api/admin/super", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.id}` },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.success) {
        flash(result.message ?? "Done", "success");
        if (activeTab !== "support") fetchSection(activeTab);
        if (action === "change_super_password") {
          setSuperCurrentPassword("");
          setSuperNewPassword("");
          setSuperConfirmPassword("");
        }
        return true;
      }
      flash(result.error ?? "Operation failed", "error");
      return false;
    } catch {
      flash("Server error", "error");
      return false;
    }
  };

  const openRenewModal = (adminId: string) => {
    setModalKind("renew"); setModalTargetId(adminId); setModalInput(new Date().toISOString().slice(0,10)); setModalOpen(true);
  };

  const openLifetimeModal = (adminId: string) => {
    setModalKind("lifetime"); setModalTargetId(adminId); setModalOpen(true);
  };

  const messageAdmin = (adminId: string) => {
    setSelectedAdminId(adminId);
    setActiveTab("support");
    setPanelAdmin(null);
  };

  const openResetModal = (targetId: string, action: string) => {
    setModalKind("reset_password"); setModalTargetId(targetId); setModalAction(action); setModalInput(""); setModalOpen(true);
  };

  const handleModalConfirm = async () => {
    if (!modalKind || !modalTargetId) return setModalOpen(false);
    if (modalKind === "renew") {
      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(modalInput)) {
        flash("Invalid date format. Use YYYY-MM-DD", "error");
        return;
      }
      await runAdminAction("renew_billing", modalTargetId, { next_billing_date: modalInput });
    } else if (modalKind === "lifetime") {
      await runAdminAction("set_lifetime", modalTargetId);
    } else if (modalKind === "reset_password") {
      if (!modalInput) { flash("Please enter a new password", "error"); return; }
      await runAdminAction(modalAction || "reset_user_password", modalTargetId, { new_password: modalInput });
    }
    setModalOpen(false); setModalKind(null); setModalTargetId(null); setModalAction(null); setModalInput("");
  };

  const toggleAccount = async (targetId: string, wantsActive: boolean, isStaff = false) => {
    const ok = await runAdminAction(wantsActive ? (isStaff ? "activate_staff" : "activate_user") : (isStaff ? "deactivate_staff" : "deactivate_user"), targetId);
    if (ok) {
      const nextStatus = wantsActive ? "active" : "inactive";
      setPanelAdmin(prev => (prev && String(prev.id) === targetId)
        ? { ...prev, account_status: nextStatus, subdomain_status: nextStatus, status: nextStatus }
        : prev);
    }
  };

  const openCreateAdminModal = () => {
    setModalKind("create_admin");
    setFormData({ full_name: "", email: "", password: "", store_name: "", domain: "", pos_type: "retail" });
    setModalOpen(true);
  };

const openCreateStaffModal = async () => {
  setModalKind("create_staff");
  setFormData({ full_name: "", email: "", password: "", admin_id: "" });
  if (admins.length === 0) {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const res = await fetch("/api/admin/super?section=users", {
        headers: { Authorization: `Bearer ${user?.id}` },
      });
      const body = await res.json();
      const list =
        isObject(body) && "success" in body && Array.isArray((body as { data?: unknown }).data)
          ? (body as { data: Record<string, unknown>[] }).data
          : extractArray(body) ?? [];
      setAdmins(list);
    } catch {
      console.error("Failed to load admins");
    }
  }
  setModalOpen(true);
};

  const openGrantSuperadminModal = (email: string) => {
    setModalKind("grant_superadmin");
    setFormData({ email });
    setModalOpen(true);
  };

  const openRemoveSuperadminModal = (email: string) => {
    setModalKind("remove_superadmin");
    setFormData({ email });
    setModalOpen(true);
  };

  const openCreateSuperadminModal = () => {
    setModalKind("create_superadmin");
    setFormData({ full_name: "", email: "", password: "", store_name: "", domain: "", pos_type: "retail", is_super_admin: "true" });
    setModalOpen(true);
  };

  const handleFormChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateAdmin = async () => {
    const { full_name, email, password, store_name, domain, pos_type } = formData;
    if (!full_name || !email || !password || !store_name || !domain) {
      flash("All fields are required", "error");
      return;
    }
    if (password.length < 6) {
      flash("Password must be at least 6 characters", "error");
      return;
    }
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const res = await fetch("/api/admin/super", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.id}` },
      body: JSON.stringify({
        action: "create_admin",
        full_name, email, password, store_name, domain, pos_type: pos_type || "retail"
      }),
    });
    const result = await res.json();
    if (result.success) {
      flash(result.message ?? "Admin created successfully", "success");
      fetchSection("users");
      setModalOpen(false);
      setFormData({});
    } else {
      flash(result.error ?? "Failed to create admin", "error");
    }
  };

  const handleCreateStaff = async () => {
    const { full_name, email, password, admin_id } = formData;
    if (!full_name || !email || !password || !admin_id) {
      flash("All fields are required", "error");
      return;
    }
    if (password.length < 6) {
      flash("Password must be at least 6 characters", "error");
      return;
    }
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const res = await fetch("/api/admin/super", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.id}` },
      body: JSON.stringify({
        action: "create_staff",
        full_name, email, password, admin_id
      }),
    });
    const result = await res.json();
    if (result.success) {
      flash(result.message ?? "Staff member created successfully", "success");
      fetchSection("staff");
      setModalOpen(false);
      setFormData({});
    } else {
      flash(result.error ?? "Failed to create staff", "error");
    }
  };

  const handleGrantSuperadmin = async () => {
    const { email } = formData;
    if (!email) {
      flash("Email is required", "error");
      return;
    }
    const ok = await runAdminAction("add_super_admin", undefined, { email });
    if (ok) {
      setPanelAdmin(prev => (prev && String(prev.email) === email) ? { ...prev, is_super_admin: 1 } : prev);
    }
    setModalOpen(false);
    setFormData({});
  };

  const handleRemoveSuperadmin = async () => {
    const { email } = formData;
    if (!email) {
      flash("Email is required", "error");
      return;
    }
    const ok = await runAdminAction("remove_super_admin", undefined, { email });
    if (ok) {
      setPanelAdmin(prev => (prev && String(prev.email) === email) ? { ...prev, is_super_admin: 0 } : prev);
    }
    setModalOpen(false);
    setFormData({});
  };

  const handleCreateSuperadmin = async () => {
    const { full_name, email, password, store_name, domain, pos_type } = formData;
    if (!full_name || !email || !password || !store_name || !domain) {
      flash("All fields are required", "error");
      return;
    }
    if (password.length < 6) {
      flash("Password must be at least 6 characters", "error");
      return;
    }
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const res = await fetch("/api/admin/super", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.id}` },
      body: JSON.stringify({
        action: "create_admin",
        full_name, email, password, store_name, domain, pos_type: pos_type || "retail"
      }),
    });
    const result = await res.json();
    if (result.success) {
      // Now grant superadmin privileges
      const grantRes = await fetch("/api/admin/super", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.id}` },
        body: JSON.stringify({
          action: "add_super_admin",
          email
        }),
      });
      const grantResult = await grantRes.json();
      if (grantResult.success) {
        flash("Superadmin created successfully", "success");
        fetchSection("users");
        setModalOpen(false);
        setFormData({});
      }
    } else {
      flash(result.error ?? "Failed to create superadmin", "error");
    }
  };

  /* ── Support loaders ── */
  const loadConversations = useCallback(async () => {
    setSupportLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const res  = await fetch("/api/support?super_admin=1", { headers: { Authorization: `Bearer ${user?.id}` } });
      const body = await res.json();
      const convs = Array.isArray(body)
        ? body as SupportConversation[]
        : isObject(body)
          ? parseArray<SupportConversation>(body.conversations)
          : [];
      setConversations(convs);
      if (selectedAdminId === null && convs.length > 0) {
        setSelectedAdminId(convs[0].admin_id);
      }
    } catch { setConversations([]); }
    finally  { setSupportLoading(false); }
  }, [selectedAdminId]);

  const loadMessages = useCallback(async (adminId: string) => {
    setSupportLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const res  = await fetch(`/api/support?admin_id=${encodeURIComponent(adminId)}`, { headers: { Authorization: `Bearer ${user?.id}` } });
      const body = await res.json();
      const msgs = Array.isArray(body)
        ? body as SupportMessage[]
        : isObject(body)
          ? parseArray<SupportMessage>(body.messages)
          : [];
      setMessages(msgs);
    } catch { setMessages([]); }
    finally  { setSupportLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === "support") loadConversations(); }, [activeTab, loadConversations]);
  useEffect(() => { if (selectedAdminId) loadMessages(selectedAdminId); }, [selectedAdminId, loadMessages]);

  /* ── Filtered + paginated ── */
  const filtered   = data.filter(r => !search || Object.values(r).some(v => String(v ?? "").toLowerCase().includes(search.toLowerCase())));
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated  = filtered.slice((page - 1) * perPage, page * perPage);

  const changeTab = (t: TabKey) => { setActiveTab(t); setSearch(""); setPage(1); };

  /* ── Send support reply ── */
  const sendReply = async () => {
    if (!selectedAdminId || !supportText.trim()) return;
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const res  = await fetch("/api/support", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.id}` },
        body:    JSON.stringify({ admin_id: selectedAdminId, sender: "super_admin", message: supportText.trim(), title: "Support Reply" }),
      });
      const body = await res.json();
      if (body.success) {
        setSupportText("");
        flash("Reply sent", "success");
        await loadMessages(selectedAdminId);
        await loadConversations();
        return;
      }
      flash(body.error || "Could not send reply", "error");
    } catch {
      flash("Could not send reply", "error");
    }
  };

  /* ── Shared table header style ── */
  const TH: React.CSSProperties = { textAlign: "left", padding: "0.6rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--muted)", borderBottom: "1px solid var(--border)", background: "var(--subtle)" };
  const TD: React.CSSProperties = { padding: "0.8rem 1.25rem", fontSize: 13, color: "var(--ink)" };
  const rowHover: { onMouseEnter: (e: React.MouseEvent<HTMLTableRowElement>) => void; onMouseLeave: (e: React.MouseEvent<HTMLTableRowElement>) => void } = {
    onMouseEnter: (e: React.MouseEvent<HTMLTableRowElement>) => { e.currentTarget.style.background = "#fafaf8"; },
    onMouseLeave: (e: React.MouseEvent<HTMLTableRowElement>) => { e.currentTarget.style.background = ""; }
  };

  const dater = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
  const revBars: [string, number][] = [
    ["Today", Number(stats?.todayRevenue || 0)],
    ["Week", Number(stats?.weekRevenue || 0)],
    ["Month", Number(stats?.monthRevenue || 0)],
    ["Year", Number(stats?.yearRevenue || 0)],
  ];
  const revMax = Math.max(1, ...revBars.map(([, v]) => v));
  const pct = (n?: number, d?: number) => (d && d > 0 ? (Number(n || 0) / d) * 100 : 0);
  const staffActivePct  = pct(stats?.activeStaff,  stats?.staffCount);
  const adminActivePct  = pct(stats?.activeUsers,  stats?.adminCount);
  const domainActivePct = pct(stats?.activeDomains, stats?.totalDomains);

  return (
    <>
     <ThemeProvider>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
        .sa-shell { display: flex; min-height: 100vh; background: var(--bg); }
        .sa-sidebar { background: #16213e; border-right: none; width: 260px; flex-shrink: 0; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; }
        .sa-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .sa-header { background: var(--card); border-bottom: 1px solid var(--border); padding: 0 2rem; height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; position: sticky; top: 0; z-index: 10; }
        .sa-main { flex: 1; padding: 1.75rem 2rem 2.5rem; display: flex; flex-direction: column; gap: 1.25rem; }

        /* Profile header */
        .sa-profile-header { padding: 2.1rem 1.25rem 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .sa-avatar-wrap { position: relative; width: 84px; height: 84px; border-radius: 50%; cursor: pointer; margin-bottom: 0.9rem; flex-shrink: 0; }
        .sa-avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.15); display: block; }
        .sa-avatar-fallback { width: 100%; height: 100%; border-radius: 50%; background: rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 26px; font-weight: 700; border: 3px solid rgba(255,255,255,0.15); box-sizing: border-box; }
        .sa-avatar-edit { position: absolute; bottom: 0; right: 0; width: 27px; height: 27px; border-radius: 50%; background: #f59e0b; display: flex; align-items: center; justify-content: center; border: 2px solid #16213e; }
        .sa-profile-name { font-size: 15px; font-weight: 700; color: #fff; letter-spacing: 0.2px; }
        .sa-profile-email { font-size: 11.5px; color: rgba(255,255,255,0.55); margin-top: 3px; word-break: break-all; }

        /* Nav */
        .sa-nav { padding: 1rem 0.85rem; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; }
        .sa-nav-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 14px; border: none; background: transparent; border-radius: 10px; font-family: inherit; font-size: 13.5px; font-weight: 500; cursor: pointer; color: rgba(255,255,255,0.62); transition: all 0.15s; text-align: left; position: relative; }
        .sa-nav-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .sa-nav-btn.active { background: rgba(255,255,255,0.13); color: #fff; box-shadow: inset 3px 0 0 #f59e0b; }
        .sa-nav-badge { margin-left: auto; font-size: 10px; font-weight: 700; background: #f59e0b; color: #16213e; border-radius: 100px; padding: 1px 7px; }

        /* Sidebar footer */
        .sa-sidebar-footer { padding: 0.9rem 1rem 1.35rem; border-top: 1px solid rgba(255,255,255,0.08); }
        .sa-signout-btn { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 10px; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; background: transparent; color: rgba(255,255,255,0.6); font-family: inherit; font-size: 12px; cursor: pointer; transition: all 0.15s; }
        .sa-signout-btn:hover { color: #fca5a5; border-color: rgba(252,165,165,0.4); background: rgba(252,165,165,0.08); }
        .sa-card, .sa-stat { background: var(--card); border: 1px solid var(--border); border-radius: 16px; }
        .sa-card { box-shadow: 0 2px 10px rgba(20,20,16,0.03); }
        .sa-stat { padding: 1.15rem 1.3rem; box-shadow: 0 2px 10px rgba(20,20,16,0.03); transition: transform 0.15s, box-shadow 0.15s; }
        .sa-stat:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(20,20,16,0.06); }
        .sa-card { overflow: hidden; }
        .sa-toolbar { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .sa-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; background: var(--subtle); border: 1px solid var(--border); border-radius: 10px; padding: 0 10px; }
        .sa-search input { flex: 1; border: none; background: transparent; font-family: inherit; font-size: 13px; color: var(--ink); outline: none; padding: 8px 0; }
        .sa-refresh-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: var(--card); color: var(--ink); border: 1px solid var(--border); border-radius: 9px; font-family: inherit; font-size: 13px; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
        .sa-refresh-btn:hover { background: var(--subtle); }
        .sa-icon-btn { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--border); background: var(--card); color: var(--muted); cursor: pointer; transition: all 0.15s; position: relative; flex-shrink: 0; }
        .sa-icon-btn:hover { background: var(--subtle); color: var(--ink); }
        .sa-hero { border-radius: 18px; padding: 1.4rem 1.5rem; position: relative; overflow: hidden; color: #fff; box-shadow: 0 10px 26px -10px rgba(16,120,90,0.45); }
        @keyframes sa-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="sa-shell">

        {/* ── SIDEBAR ── */}
        <aside className="sa-sidebar">
          {/* Profile header */}
          <div className="sa-profile-header">
            <input
              ref={profilePicInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              style={{ display: "none" }}
            />
            <div
              className="sa-avatar-wrap"
              onClick={() => profilePicInputRef.current?.click()}
              title="Click to change profile picture"
            >
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="sa-avatar-img" />
              ) : (
                <div className="sa-avatar-fallback">
                  {initials(String(currentUser?.full_name || currentUser?.email || "SA"))}
                </div>
              )}
              <div className="sa-avatar-edit">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>
            <div className="sa-profile-name">{currentUser?.full_name || "Super Admin"}</div>
            <div className="sa-profile-email">{currentUser?.email || "—"}</div>
          </div>

          {/* Nav items */}
          <nav className="sa-nav">
            {TABS.map(t => (
              <button key={t.key} className={`sa-nav-btn ${activeTab === t.key ? "active" : ""}`} onClick={() => changeTab(t.key)}>
                {t.icon}
                {t.label}
                {t.key === "support" && conversations.length > 0 ? (() => {
                  const totalUnread = conversations.reduce((s, c) => s + (Number(c.unread_count || 0)), 0);
                  return (
                    <span className="sa-nav-badge">
                      {totalUnread > 0 ? totalUnread : conversations.length}
                    </span>
                  );
                })() : null}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="sa-sidebar-footer">
            <button
              onClick={() => { localStorage.removeItem("user"); router.push("/login"); }}
              className="sa-signout-btn"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign out
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div className="sa-content">

          {/* Header */}
          <header className="sa-header">
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.3px" }}>
                  {TABS.find(t => t.key === activeTab)?.label}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{dater}</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Super admin badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 100, padding: "5px 12px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", letterSpacing: "0.3px" }}>SUPER ADMIN</span>
              </div>

              <button
                onClick={() => activeTab === "support" ? loadConversations() : fetchSection(activeTab)}
                className="sa-icon-btn"
                title="Refresh"
              >
                <IcoRefresh />
              </button>

              <button className="sa-icon-btn" title="Notifications">
                <IcoBell />
                {Array.isArray(stats?.recentLogs) && stats!.recentLogs!.length > 0 && (
                  <span style={{ position: "absolute", top: 6, right: 7, width: 7, height: 7, borderRadius: "50%", background: "#dc2626", border: "2px solid var(--card)" }} />
                )}
              </button>

              <ThemeSwitcher />

              <div style={{ width: 1, height: 26, background: "var(--border)", margin: "0 2px" }} />

              <div
                title={currentUser?.full_name || currentUser?.email || "Super Admin"}
                style={{
                  width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", color: "var(--accent-text)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, flexShrink: 0,
                }}
              >
                {initials(String(currentUser?.full_name || currentUser?.email || "SA"))}
              </div>

              <button
                onClick={() => { localStorage.removeItem("user"); router.push("/login"); }}
                className="sa-refresh-btn"
                style={{ borderColor: "#fecaca", color: "#dc2626" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Logout
              </button>
            </div>
          </header>

          <main className="sa-main">
            {notice && (
              <div style={{ padding: "0.9rem 1rem", borderRadius: 10, border: `1px solid ${notice.type === "error" ? "#fecaca" : notice.type === "success" ? "#bbf7d0" : "#c7d2fe"}`, background: notice.type === "error" ? "#fef2f2" : notice.type === "success" ? "#f0fdf4" : "#eff6ff", color: notice.type === "error" ? "#991b1b" : notice.type === "success" ? "#166534" : "#1d4ed8", marginBottom: "1rem" }}>
                {notice.text}
              </div>
            )}

            {/* ══ OVERVIEW ══ */}
            {activeTab === "overview" && !loading && stats && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", height: "calc(100vh - 140px)", minHeight: 540 }}>

                {/* Billing alert strip */}
                {Array.isArray(stats.sneakyBilling) && stats.sneakyBilling.length > 0 && (
                  <button
                    onClick={() => changeTab("billing")}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "0.65rem 1rem", borderRadius: 12,
                      background: "#fef2f2", border: "1px solid #fecaca", cursor: "pointer", fontFamily: "inherit", textAlign: "left", flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span style={{ fontSize: 12.5, color: "#991b1b", fontWeight: 600 }}>{stats.sneakyBilling.length} store{stats.sneakyBilling.length !== 1 ? "s" : ""} with suspicious billing activity</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "#991b1b", fontWeight: 700 }}>View billing →</span>
                  </button>
                )}

                {/* Quick Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.85rem", flexShrink: 0 }}>
                  {[
                    { label: "Staff", value: stats.staffCount, sub: `${stats.activeStaff ?? 0} active`, bg: "#eff6ff", fg: "#2563eb", icon: <IcoStaff /> },
                    { label: "Admins", value: stats.adminCount, sub: `${stats.activeUsers ?? 0} active`, bg: "#f5f3ff", fg: "#7c3aed", icon: <IcoUsers /> },
                    { label: "Domains", value: stats.totalDomains, sub: `${stats.activeDomains ?? 0} active`, bg: "#fffbeb", fg: "#d97706", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20z"/></svg> },
                    { label: "Orders", value: stats.orderCount, sub: `${stats.todayOrders ?? 0} today`, bg: "#fdf2f8", fg: "#db2777", icon: <IcoOrders /> },
                  ].map(s => (
                    <div className="sa-stat" key={s.label}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>{s.label}</div>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: s.bg, color: s.fg, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</div>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: "var(--ink)" }}>{s.value ?? "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Chart row — fills remaining height */}
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "0.85rem", flex: 1, minHeight: 0 }}>

                  {/* Revenue chart */}
                  <div className="sa-hero" style={{ background: "linear-gradient(135deg, #10b981 0%, #0f766e 100%)", display: "flex", flexDirection: "column" }}>
                    <div style={{ position: "absolute", top: -40, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                    <div style={{ position: "absolute", bottom: -60, right: 60, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", flexShrink: 0 }}>
                      <div>
                        <div style={{ fontSize: 12, opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 600 }}>Total Revenue</div>
                        <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6, letterSpacing: "-0.5px" }}>KES {Number(stats.totalRevenue || 0).toLocaleString()}</div>
                        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>{stats.orderCount ?? 0} orders across {stats.totalDomains ?? 0} stores</div>
                      </div>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 24, marginTop: 16, alignItems: "flex-end", flex: 1, position: "relative" }}>
                      {revBars.map(([label, val]) => (
                        <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1, height: "100%", justifyContent: "flex-end" }}>
                          <span style={{ fontSize: 11, opacity: 0.9, fontWeight: 600 }}>{val > 0 ? Number(val).toLocaleString() : ""}</span>
                          <div style={{ width: "100%", maxWidth: 46, height: `${Math.max(4, (val / revMax) * 100)}%`, borderRadius: "8px 8px 3px 3px", background: "rgba(255,255,255,0.92)" }} />
                          <div style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 500 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Account health donuts */}
                  <div className="sa-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", flexShrink: 0 }}>Account Health</div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-around", minHeight: 0 }}>
                      <Donut pct={staffActivePct} color="#2563eb" label="Staff active" />
                      <Donut pct={adminActivePct} color="#7c3aed" label="Admins active" />
                      <Donut pct={domainActivePct} color="#d97706" label="Domains active" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, flexShrink: 0 }}>
                      <div style={{ background: "var(--subtle)", borderRadius: 10, padding: "0.6rem 0.8rem" }}>
                        <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Orders today</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{stats.todayOrders ?? 0}</div>
                      </div>
                      <div style={{ background: "var(--subtle)", borderRadius: 10, padding: "0.6rem 0.8rem" }}>
                        <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Orders this week</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{stats.weekOrders ?? 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "overview" && loading && <Spinner label="Loading overview…" />}

            {/* ══ USERS ══ */}
            {activeTab === "users" && (
              <div className="sa-card">
                <div className="sa-toolbar">
                  <div className="sa-search"><IcoSearch /><input placeholder="Search users…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
                  <button onClick={openCreateAdminModal} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: "none", background: "var(--accent)", color: "var(--accent-text)", cursor: "pointer", fontWeight: 600, fontSize: 12.5 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New Admin
                  </button>
                  <button onClick={openCreateSuperadminModal} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", cursor: "pointer", fontWeight: 600, fontSize: 12.5 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New Superadmin
                  </button>
                  <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>{filtered.length} user{filtered.length !== 1 ? "s" : ""}</span>
                </div>
                {loading ? <Spinner label="Loading users…" /> : (
                  <>
                    <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead><tr>
                        {["User", "Store", "Plan", "Status", "Joined"].map(h => <th key={h} style={TH}>{h}</th>)}
                        <th style={{ ...TH, textAlign: "right" }}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {paginated.length === 0
                          ? <tr><td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No users found.</td></tr>
                          : paginated.map((r, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid var(--border)" }} {...rowHover}>
                              <td style={TD}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <Avatar name={String(r.full_name ?? r.email ?? "?")} />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>{String(r.full_name ?? "—")}</span>
                                      {Number(r.is_super_admin) === 1 && <span style={{ fontSize: 9.5, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 100, padding: "1px 6px" }}>SA</span>}
                                    </div>
                                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{String(r.email ?? "—")}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={TD}>{String(r.store_name ?? "—")}</td>
                              <td style={TD}>
                                {r.plan ? <Badge label={String(r.plan).charAt(0).toUpperCase() + String(r.plan).slice(1)} type="info" /> : <span style={{ color: "var(--muted)" }}>—</span>}
                              </td>
                              <td style={TD}>{statusBadge(r.status ?? r.subdomain_status)}</td>
                              <td style={{ ...TD, color: "var(--muted)" }}>{fmtDate(r.created_at)}</td>
                              <td style={{ ...TD, textAlign: "right" }}>
                                <ActionsMenu items={[
                                  { label: "View profile", onClick: () => setPanelAdmin(r as unknown as Admin) },
                                  { label: "Message admin", onClick: () => messageAdmin(String(r.id)) },
                                  { label: "Reset password", onClick: () => openResetModal(String(r.id), "reset_user_password") },
                                  Number(r.is_super_admin) == 1
                                    ? { label: "Revoke superadmin", onClick: () => openRemoveSuperadminModal(String(r.email)), danger: true }
                                    : { label: "Grant superadmin", onClick: () => openGrantSuperadminModal(String(r.email)), accent: true },
                                ]} />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    </div>
                    <Pagination page={page} total={totalPages} onChange={setPage} perPage={perPage} onPerPageChange={n => { setPerPage(n); setPage(1); }} totalItems={filtered.length} />
                  </>
                )}
              </div>
            )}

            {/* ══ STAFF ══ */}
            {activeTab === "staff" && (
              <div className="sa-card">
                <div className="sa-toolbar">
                  <div className="sa-search"><IcoSearch /><input placeholder="Search staff…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
                  <button onClick={openCreateStaffModal} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: "none", background: "var(--accent)", color: "var(--accent-text)", cursor: "pointer", fontWeight: 600, fontSize: 12.5 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New Staff
                  </button>
                  <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>{filtered.length} staff member{filtered.length !== 1 ? "s" : ""}</span>
                </div>
                {loading ? <Spinner label="Loading staff…" /> : (
                  <>
                    <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead><tr>
                        {["User", "Store", "Role", "Status", "Joined"].map(h => <th key={h} style={TH}>{h}</th>)}
                        <th style={{ ...TH, textAlign: "right" }}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {paginated.length === 0
                          ? <tr><td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No staff found.</td></tr>
                          : paginated.map((r, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid var(--border)" }} {...rowHover}>
                              <td style={TD}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <Avatar name={String(r.full_name ?? r.email ?? "?")} />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, color: "var(--ink)" }}>{String(r.full_name ?? "—")}</div>
                                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{String(r.email ?? "—")}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={TD}>{String(r.store_name ?? r.admin_id ?? "—")}</td>
                              <td style={TD}><Badge label={String(r.shift_role ?? r.role ?? "staff")} type="neutral" /></td>
                              <td style={TD}>{statusBadge(r.status)}</td>
                              <td style={{ ...TD, color: "var(--muted)" }}>{fmtDate(r.created_at)}</td>
                              <td style={{ ...TD, textAlign: "right" }}>
                                <ActionsMenu items={[
                                  { label: "View profile", onClick: () => setPanelAdmin(r as unknown as Admin) },
                                  { label: "Message staff", onClick: () => messageAdmin(String(r.id)) },
                                  { label: "Reset password", onClick: () => openResetModal(String(r.id), "reset_staff_password") },
                                  {
                                    label: String(r.status) !== "active" ? "Activate" : "Deactivate",
                                    onClick: () => toggleAccount(String(r.id), String(r.status) !== "active", true),
                                    danger: String(r.status) === "active",
                                    accent: String(r.status) !== "active",
                                  },
                                ]} />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    </div>
                    <Pagination page={page} total={totalPages} onChange={setPage} perPage={perPage} onPerPageChange={n => { setPerPage(n); setPage(1); }} totalItems={filtered.length} />
                  </>
                )}
              </div>
            )}

            {/* ══ ORDERS ══ */}
            {activeTab === "orders" && (
              <div className="sa-card">
                <div className="sa-toolbar">
                  <div className="sa-search"><IcoSearch /><input placeholder="Search orders…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
                  <span style={{ fontSize: 12, color: "#9a9a8e", marginLeft: "auto" }}>{filtered.length} order{filtered.length !== 1 ? "s" : ""}</span>
                </div>
                {loading ? <Spinner label="Loading orders…" /> : (
                  <>
                    <GenericTable data={paginated} />
                    <Pagination page={page} total={totalPages} onChange={setPage} perPage={perPage} onPerPageChange={n => { setPerPage(n); setPage(1); }} totalItems={filtered.length} />
                  </>
                )}
              </div>
            )}

            {/* ══ LOGS ══ */}
            {activeTab === "logs" && (
              <div className="sa-card">
                <div className="sa-toolbar">
                  <div className="sa-search"><IcoSearch /><input placeholder="Search logs…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
                  <span style={{ fontSize: 12, color: "#9a9a8e", marginLeft: "auto" }}>{filtered.length} log{filtered.length !== 1 ? "s" : ""}</span>
                </div>
                {loading ? <Spinner label="Loading logs…" /> : (
                  <>
                    <GenericTable data={paginated} />
                    <Pagination page={page} total={totalPages} onChange={setPage} perPage={perPage} onPerPageChange={n => { setPerPage(n); setPage(1); }} totalItems={filtered.length} />
                  </>
                )}
              </div>
            )}

            {/* ══ BILLING ══ */}
            {activeTab === "billing" && (
              <div className="sa-card">
                <div className="sa-toolbar">
                  <div className="sa-search"><IcoSearch /><input placeholder="Search billing…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
                  <span style={{ fontSize: 12, color: "#9a9a8e", marginLeft: "auto" }}>{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</span>
                </div>
                {loading ? <Spinner label="Loading billing…" /> : (
                  <>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead><tr>
                        {["Admin ID", "Store", "Domain", "Plan", "Amount", "Status", "Renewed", "Expires", "Updated", "Actions"].map(h => <th key={h} style={TH}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {paginated.length === 0
                          ? <tr><td colSpan={10} style={{ padding: "3rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>No billing records.</td></tr>
                          : paginated.map((r, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #e2e0d8" }} {...rowHover}>
                              <td style={{ ...TD, fontFamily: "monospace", fontSize: 11, color: "#9a9a8e" }}>{shortId(r.admin_id ?? r.id)}</td>
                              <td style={{ ...TD, fontWeight: 500, color: "#141410" }}>{String(r.store_name ?? "—")}</td>
                              <td style={{ ...TD, color: "#9a9a8e" }}>{String(r.domain ?? "—")}</td>
                              <td style={TD}><Badge label={String(r.plan ?? "—")} type="info" /></td>
                              <td style={{ ...TD, fontWeight: 600, color: "#141410" }}>KES {Number(r.amount || 0).toLocaleString()}</td>
                              <td style={TD}>{statusBadge(r.status)}</td>
                              <td style={{ ...TD, color: "#9a9a8e", fontSize: 12 }}>{fmtDate(r.renewal_date)}</td>
                              <td style={{ ...TD, color: "#9a9a8e", fontSize: 12 }}>{fmtDate(r.expiry_date)}</td>
                              <td style={{ ...TD, color: "#9a9a8e", fontSize: 12 }}>{fmtDateTime(r.updated_at)}</td>
                              <td style={{ ...TD, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button onClick={() => openRenewModal(String(r.admin_id ?? r.id))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #c8c6cb", background: "#fff", color: "#141410", cursor: "pointer", fontSize: 11 }}>Renew</button>
                                <button onClick={() => openLifetimeModal(String(r.admin_id ?? r.id))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #c8c6cb", background: "#f8fafc", color: "#0f172a", cursor: "pointer", fontSize: 11 }}>Lifetime</button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    <Pagination page={page} total={totalPages} onChange={setPage} perPage={perPage} onPerPageChange={n => { setPerPage(n); setPage(1); }} totalItems={filtered.length} />
                  </>
                )}
              </div>
            )}

            {/* ══ SETTINGS ══ */}
            {activeTab === "settings" && (
              <div className="sa-card" style={{ padding: "1.5rem" }}>
                {loading ? <Spinner label="Loading settings…" /> : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                      {data.length === 0
                        ? <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "2rem", color: "#9a9a8e", fontSize: 13 }}>No settings data.</div>
                        : data.map((r, i) => (
                          Object.entries(r).map(([k, v]) => (
                            <div key={`${i}-${k}`}>
                              <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>{k.replace(/_/g, " ")}</div>
                              <div style={{ fontSize: 14, fontWeight: 500, color: "#141410" }}>{String(v ?? "—")}</div>
                            </div>
                          ))
                        ))}
                    </div>
                    <div style={{ marginTop: "2rem", padding: "1.5rem", border: "1px solid #e2e0d8", borderRadius: 16, background: "#ffffff" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: "1rem" }}>Change Super Admin Password</div>
                      <div style={{ display: "grid", gap: "1rem", maxWidth: 520 }}>
 
                        <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#7a7a74" }}>
                          Current password
                          <input type="password" value={superCurrentPassword} onChange={e => setSuperCurrentPassword(e.target.value)} style={{ padding: "0.85rem 1rem", borderRadius: 12, border: "1px solid #d9d6ce", outline: "none", width: "100%" }} />
                        </label>
                        <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#7a7a74" }}>
                          New password
                          <input type="password" value={superNewPassword} onChange={e => setSuperNewPassword(e.target.value)} style={{ padding: "0.85rem 1rem", borderRadius: 12, border: "1px solid #d9d6ce", outline: "none", width: "100%" }} />
                        </label>
                        <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#7a7a74" }}>
                          Confirm new password
                          <input type="password" value={superConfirmPassword} onChange={e => setSuperConfirmPassword(e.target.value)} style={{ padding: "0.85rem 1rem", borderRadius: 12, border: "1px solid #d9d6ce", outline: "none", width: "100%" }} />
                        </label>
                        <button onClick={async () => {
                          if (!superCurrentPassword || !superNewPassword || !superConfirmPassword) {
                            flash("Please fill all password fields", "error");
                            return;
                          }
                          if (superNewPassword !== superConfirmPassword) {
                            flash("New passwords do not match", "error");
                            return;
                          }
                          await runAdminAction("change_super_password", undefined, {
                            current_password: superCurrentPassword,
                            new_password: superNewPassword,
                          });
                        }} style={{ width: "fit-content", padding: "0.85rem 1.25rem", borderRadius: 12, border: "none", background: "#141410", color: "#fff", cursor: "pointer" }}>Update password</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══ SUPPORT ══ */}
            {activeTab === "support" && (
              <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1rem", height: "calc(100vh - 180px)", minHeight: 500 }}>

                {/* Conversation list */}
                <div className="sa-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Conversations</div>
                    <span style={{ fontSize: 11, color: "#9a9a8e" }}>{conversations.length} active</span>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {supportLoading && !selectedAdminId ? (
                      <Spinner label="Loading…" />
                    ) : conversations.length > 0 ? (
                      conversations.map(c => (
                        <button
                          key={c.admin_id}
                          onClick={() => setSelectedAdminId(c.admin_id)}
                          style={{
                            display: "block", width: "100%", textAlign: "left",
                            padding: "0.9rem 1.25rem", borderBottom: "1px solid #e2e0d8",
                            border: "none",
                            background: selectedAdminId === c.admin_id ? "#f5f4f0" : "transparent",
                            cursor: "pointer", transition: "background 0.1s",
                            borderLeft: selectedAdminId === c.admin_id ? "3px solid #141410" : "3px solid transparent",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "#141410" }}>{c.full_name}</div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              {c.unread_count ? <div style={{ background: "#ef4444", color: "#fff", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{c.unread_count}</div> : null}
                              <div style={{ fontSize: 10, color: "#9a9a8e" }}>{c.message_count} msg</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: "#9a9a8e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.last_message}</div>
                          <div style={{ fontSize: 10, color: "#c8c6bc", marginTop: 3 }}>{c.email}</div>
                        </button>
                      ))
                    ) : selectedAdminId ? (
                      <button
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "0.9rem 1.25rem", borderBottom: "1px solid #e2e0d8",
                          border: "none", background: "#f5f4f0",
                          cursor: "default", transition: "background 0.1s",
                          borderLeft: "3px solid #141410",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#141410" }}>{selectedAdminId}</div>
                          <div style={{ fontSize: 10, color: "#9a9a8e" }}>{messages.length} msg</div>
                        </div>
                        <div style={{ fontSize: 12, color: "#9a9a8e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{messages[0]?.message ?? "Conversation loaded"}</div>
                      </button>
                    ) : (
                      <div style={{ padding: "2rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>No conversations yet.</div>
                    )}
                  </div>
                </div>

                {/* Message thread */}
                <div className="sa-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e0d8", flexShrink: 0 }}>
                    {selectedAdminId
                      ? (() => {
                          const conv = conversations.find(c => c.admin_id === selectedAdminId);
                          return (
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#141410", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                                {(conv?.full_name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: "#141410" }}>{conv?.full_name ?? selectedAdminId}</div>
                                <div style={{ fontSize: 11, color: "#9a9a8e" }}>{conv?.role ? conv.role.toUpperCase() : "ADMIN"} · {conv?.email}</div>
                              </div>
                              </div>
                          );
                        })()
                      : <div style={{ fontSize: 13, color: "#9a9a8e" }}>Select a conversation to view messages</div>}
                  </div>

                  {/* Messages */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: 10, background: "#fafaf8" }}>
                    {!selectedAdminId
                      ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9a9a8e", fontSize: 13 }}>Choose a conversation from the left</div>
                      : supportLoading
                        ? <Spinner label="Loading messages…" />
                        : messages.length === 0
                          ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9a9a8e", fontSize: 13 }}>No messages yet.</div>
                          : messages.map(m => (
                            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.sender === "super_admin" ? "flex-end" : "flex-start", gap: 4 }}>
                              <div style={{ fontSize: 10, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.4px", paddingLeft: m.sender === "admin" ? 4 : 0, paddingRight: m.sender === "super_admin" ? 4 : 0 }}>
                                {m.sender === "admin" ? "Admin" : "You"}
                              </div>
                              <div style={{
                                maxWidth: "72%", padding: "10px 14px", borderRadius: 12,
                                background: m.sender === "super_admin" ? "#141410" : "#fff",
                                color:      m.sender === "super_admin" ? "#fff"     : "#141410",
                                border:     m.sender === "super_admin" ? "none"     : "1px solid #e2e0d8",
                                fontSize: 13, lineHeight: 1.6,
                                borderBottomRightRadius: m.sender === "super_admin" ? 4 : 12,
                                borderBottomLeftRadius:  m.sender === "super_admin" ? 12 : 4,
                              }}>
                                {m.message}
                              </div>
                              <div style={{ fontSize: 10, color: "#c8c6bc" }}>{m.time}</div>
                            </div>
                          ))}
                  </div>

                  {/* Reply box */}
                  <div style={{ padding: "0.85rem 1.25rem", borderTop: "1px solid #e2e0d8", display: "flex", gap: 8, background: "#fff", flexShrink: 0 }}>
                    <input
                      value={supportText}
                      onChange={e => setSupportText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                      placeholder={selectedAdminId ? "Write a reply… (Enter to send)" : "Select a conversation first"}
                      disabled={!selectedAdminId}
                      style={{ flex: 1, border: "1px solid #c8c6bc", background: "#f5f4f0", borderRadius: 8, padding: "9px 12px", fontFamily: "inherit", fontSize: 13, color: "#141410", outline: "none", resize: "none" }}
                    />
                    <button
                      onClick={sendReply}
                      disabled={!selectedAdminId || !supportText.trim()}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: selectedAdminId && supportText.trim() ? "#141410" : "#9a9a8e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: selectedAdminId && supportText.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", flexShrink: 0, transition: "background 0.15s" }}
                    >
                      <IcoSend /> Send
                    </button>
                  </div>
                </div>
              </div>
            )}

          </main>

          {/* ── GLOBAL MODAL (accessible from all tabs) ── */}
          {modalOpen && (
            <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,15,15,0.45)', zIndex: 9999 }}>
              <div style={{ width: 520, maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    {modalKind === 'renew' && 'Renew billing'}
                    {modalKind === 'lifetime' && 'Set lifetime'}
                    {modalKind === 'reset_password' && 'Reset password'}
                    {modalKind === 'create_admin' && 'Create New Admin'}
                    {modalKind === 'create_staff' && 'Create New Staff'}
                    {modalKind === 'grant_superadmin' && 'Grant Superadmin'}
                  </div>
                  <button onClick={() => setModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ marginTop: 12 }}>
                  {modalKind === 'renew' && (
                    <label style={{ display: 'block', fontSize: 13, color: '#6b6b66' }}>
                      Next billing date
                      <input type="date" value={modalInput} onChange={(e) => setModalInput(e.target.value)} style={{ width: '100%', padding: '8px 10px', marginTop: 8, borderRadius: 8, border: '1px solid #e5e4df' }} />
                    </label>
                  )}
                  {modalKind === 'lifetime' && (
                    <div style={{ fontSize: 13, color: '#6b6b66', marginTop: 8 }}>Are you sure you want to set this account to a lifetime subscription? This action cannot be undone from the UI.</div>
                  )}
                  {modalKind === 'reset_password' && (
                    <label style={{ display: 'block', fontSize: 13, color: '#6b6b66' }}>
                      New password
                      <input type="password" value={modalInput} onChange={(e) => setModalInput(e.target.value)} style={{ width: '100%', padding: '8px 10px', marginTop: 8, borderRadius: 8, border: '1px solid #e5e4df' }} />
                    </label>
                  )}
                  {modalKind === 'create_admin' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <label style={{ display: 'block', fontSize: 13, color: '#6b6b66' }}>
                        Full Name
                        <input type="text" value={formData.full_name || ''} onChange={(e) => handleFormChange('full_name', e.target.value)} placeholder="John Doe" style={{ width: '100%', padding: '8px 10px', marginTop: 4, borderRadius: 8, border: '1px solid #e5e4df' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: 13, color: '#6b6b66' }}>
                        Email
                        <input type="email" value={formData.email || ''} onChange={(e) => handleFormChange('email', e.target.value)} placeholder="admin@store.com" style={{ width: '100%', padding: '8px 10px', marginTop: 4, borderRadius: 8, border: '1px solid #e5e4df' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: 13, color: '#6b6b66' }}>
                        Password
                        <input type="password" value={formData.password || ''} onChange={(e) => handleFormChange('password', e.target.value)} placeholder="min 6 characters" style={{ width: '100%', padding: '8px 10px', marginTop: 4, borderRadius: 8, border: '1px solid #e5e4df' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: 13, color: '#6b6b66' }}>
                        Store Name
                        <input type="text" value={formData.store_name || ''} onChange={(e) => handleFormChange('store_name', e.target.value)} placeholder="John's Store" style={{ width: '100%', padding: '8px 10px', marginTop: 4, borderRadius: 8, border: '1px solid #e5e4df' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: 13, color: '#6b6b66' }}>
                        Store Domain
                        <input type="text" value={formData.domain || ''} onChange={(e) => handleFormChange('domain', e.target.value.toLowerCase())} placeholder="johns-store" style={{ width: '100%', padding: '8px 10px', marginTop: 4, borderRadius: 8, border: '1px solid #e5e4df' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: 13, color: '#6b6b66' }}>
                        POS Type
                        <select value={formData.pos_type || 'retail'} onChange={(e) => handleFormChange('pos_type', e.target.value)} style={{ width: '100%', padding: '8px 10px', marginTop: 4, borderRadius: 8, border: '1px solid #e5e4df' }}>
                          <option value="retail">Retail</option>
                          <option value="restaurant">Restaurant</option>
                          <option value="salon">Salon</option>
                          <option value="wholesale">Wholesale</option>
                          <option value="pharmacy">Pharmacy</option>
                        </select>
                      </label>
                    </div>
                  )}
                  {modalKind === 'create_staff' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <label style={{ display: 'block', fontSize: 13, color: '#6b6b66' }}>
                        Full Name
                        <input type="text" value={formData.full_name || ''} onChange={(e) => handleFormChange('full_name', e.target.value)} placeholder="Jane Doe" style={{ width: '100%', padding: '8px 10px', marginTop: 4, borderRadius: 8, border: '1px solid #e5e4df' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: 13, color: '#6b6b66' }}>
                        Email
                        <input type="email" value={formData.email || ''} onChange={(e) => handleFormChange('email', e.target.value)} placeholder="staff@store.com" style={{ width: '100%', padding: '8px 10px', marginTop: 4, borderRadius: 8, border: '1px solid #e5e4df' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: 13, color: '#6b6b66' }}>
                        Password
                        <input type="password" value={formData.password || ''} onChange={(e) => handleFormChange('password', e.target.value)} placeholder="min 6 characters" style={{ width: '100%', padding: '8px 10px', marginTop: 4, borderRadius: 8, border: '1px solid #e5e4df' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: 13, color: '#6b6b66' }}>
                        Select Admin
                        <select value={formData.admin_id || ''} onChange={(e) => handleFormChange('admin_id', e.target.value)} style={{ width: '100%', padding: '8px 10px', marginTop: 4, borderRadius: 8, border: '1px solid #e5e4df', fontSize: 13 }}>
                          <option value="">Choose an admin...</option>
                          {admins.map((admin) => (
                            <option key={String(admin.id)} value={String(admin.id)}>{String(admin.full_name || admin.email)} - {String(admin.store_name || 'N/A')}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                  {modalKind === 'grant_superadmin' && (
                    <div style={{ fontSize: 13, color: '#6b6b66', marginTop: 8 }}>
                      <p>Grant superadmin privileges to:</p>
                      <div style={{ background: '#f5f4f0', padding: 8, borderRadius: 6, marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}>{formData.email}</div>
                      <p style={{ marginTop: 8 }}>They will be able to manage all other admins and staff.</p>
                    </div>
                  )}
                  {modalKind === 'remove_superadmin' && (
                    <div style={{ fontSize: 13, color: '#6b6b66', marginTop: 8 }}>
                      <p>Remove superadmin privileges from:</p>
                      <div style={{ background: '#fef2f2', padding: 8, borderRadius: 6, marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}>{formData.email}</div>
                      <p style={{ marginTop: 8, color: '#991b1b', fontWeight: 500 }}>This user will lose all administrative capabilities.</p>
                    </div>
                  )}
                  {modalKind === 'create_superadmin' && (
                    <div style={{ fontSize: 13, color: '#6b6b66', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 500, color: '#141410', display: 'block', marginBottom: 3 }}>Full Name *</label>
                        <input type="text" placeholder="Full name" value={formData.full_name || ''} onChange={e => handleFormChange('full_name', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e0d8', fontSize: 12, boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 500, color: '#141410', display: 'block', marginBottom: 3 }}>Email *</label>
                        <input type="email" placeholder="Email" value={formData.email || ''} onChange={e => handleFormChange('email', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e0d8', fontSize: 12, boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 500, color: '#141410', display: 'block', marginBottom: 3 }}>Password *</label>
                        <input type="password" placeholder="Password" value={formData.password || ''} onChange={e => handleFormChange('password', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e0d8', fontSize: 12, boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 500, color: '#141410', display: 'block', marginBottom: 3 }}>Store Name *</label>
                        <input type="text" placeholder="Store name" value={formData.store_name || ''} onChange={e => handleFormChange('store_name', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e0d8', fontSize: 12, boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 500, color: '#141410', display: 'block', marginBottom: 3 }}>Domain *</label>
                        <input type="text" placeholder="Domain" value={formData.domain || ''} onChange={e => handleFormChange('domain', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e0d8', fontSize: 12, boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 500, color: '#141410', display: 'block', marginBottom: 3 }}>POS Type</label>
                        <select value={formData.pos_type || 'retail'} onChange={e => handleFormChange('pos_type', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e0d8', fontSize: 12, boxSizing: 'border-box' }}>
                          <option value="retail">Retail</option>
                          <option value="restaurant">Restaurant</option>
                          <option value="pharmacy">Pharmacy</option>
                          <option value="salon">Salon</option>
                          <option value="clinic">Clinic</option>
                        </select>
                      </div>
                      <p style={{ marginTop: 8, fontSize: 11, color: '#9a9a8e', fontStyle: 'italic' }}>This admin will be created with superadmin privileges.</p>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                  <button onClick={() => setModalOpen(false)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e0d8', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={
                    modalKind === 'create_admin' ? handleCreateAdmin :
                    modalKind === 'create_staff' ? handleCreateStaff :
                    modalKind === 'grant_superadmin' ? handleGrantSuperadmin :
                    modalKind === 'remove_superadmin' ? handleRemoveSuperadmin :
                    modalKind === 'create_superadmin' ? handleCreateSuperadmin :
                    handleModalConfirm
                  } style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: modalKind === 'remove_superadmin' ? '#991b1b' : '#141410', color: '#fff', cursor: 'pointer' }}>
                    {modalKind === 'create_admin' || modalKind === 'create_staff' || modalKind === 'create_superadmin' ? 'Create' : modalKind === 'remove_superadmin' ? 'Remove' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <AdminDetailPanel admin={panelAdmin} onClose={() => setPanelAdmin(null)} onMessage={messageAdmin} onReset={openResetModal} onToggle={toggleAccount} onGrant={openGrantSuperadminModal} onRevoke={openRemoveSuperadminModal} />

        </div>
      </div>
    </ThemeProvider>
    </>
  );
} 