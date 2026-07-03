"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
    <div style={{ padding: "3rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>No records found.</div>
  );
  const keys = Object.keys(data[0]).slice(0, 8);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {keys.map(k => (
              <th key={k} style={{ textAlign: "left", padding: "0.6rem 1rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap" }}>
                {k.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #e2e0d8" }}
              onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ""; }}>
              {keys.map(k => (
                <td key={k} style={{ padding: "0.75rem 1rem", color: "#4a4a40", whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
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
function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  const pages = Array.from({ length: Math.min(total, 7) }, (_, i) => {
    if (total <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= total - 3) return total - 6 + i;
    return page - 3 + i;
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.75rem 1.25rem", borderTop: "1px solid #e2e0d8" }}>
      <span style={{ fontSize: 12, color: "#9a9a8e", marginRight: "auto" }}>Page {page} of {total}</span>
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} style={{ width: 28, height: 28, border: "1px solid #e2e0d8", borderRadius: 6, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === 1 ? 0.4 : 1 }}><IcoChevronL /></button>
      {pages.map(p => (
        <button key={p} onClick={() => onChange(p)} style={{ width: 28, height: 28, border: `1px solid ${p === page ? "#141410" : "#e2e0d8"}`, borderRadius: 6, background: p === page ? "#141410" : "#fff", color: p === page ? "#fff" : "#141410", cursor: "pointer", fontSize: 12, fontWeight: p === page ? 600 : 400, fontFamily: "inherit" }}>{p}</button>
      ))}
      <button onClick={() => onChange(Math.min(total, page + 1))} disabled={page === total} style={{ width: 28, height: 28, border: "1px solid #e2e0d8", borderRadius: 6, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: page === total ? 0.4 : 1 }}><IcoChevronR /></button>
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
  const PER_PAGE = 12;
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

  /* ── Auth guard ── */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || !user.is_super_admin) router.push("/login");
  }, [router]);

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
    await runAdminAction(wantsActive ? (isStaff ? "activate_staff" : "activate_user") : (isStaff ? "deactivate_staff" : "deactivate_user"), targetId);
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
    await runAdminAction("add_super_admin", undefined, { email });
    setModalOpen(false);
    setFormData({});
  };

  const handleRemoveSuperadmin = async () => {
    const { email } = formData;
    if (!email) {
      flash("Email is required", "error");
      return;
    }
    await runAdminAction("remove_super_admin", undefined, { email });
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
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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
  const TH: React.CSSProperties = { textAlign: "left", padding: "0.6rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap" };
  const TD: React.CSSProperties = { padding: "0.8rem 1.25rem", fontSize: 13, color: "#4a4a40" };
  const rowHover: { onMouseEnter: (e: React.MouseEvent<HTMLTableRowElement>) => void; onMouseLeave: (e: React.MouseEvent<HTMLTableRowElement>) => void } = {
    onMouseEnter: (e: React.MouseEvent<HTMLTableRowElement>) => { e.currentTarget.style.background = "#fafaf8"; },
    onMouseLeave: (e: React.MouseEvent<HTMLTableRowElement>) => { e.currentTarget.style.background = ""; }
  };

  const dater = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'DM Sans', sans-serif; }
        .sa-shell { display: flex; min-height: 100vh; background: #f5f4f0; }
        .sa-sidebar { width: 220px; background: #fff; border-right: 1px solid #e2e0d8; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
        .sa-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .sa-header { background: #fff; border-bottom: 1px solid #e2e0d8; padding: 0 2rem; height: 58px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; position: sticky; top: 0; z-index: 10; }
        .sa-main { flex: 1; padding: 1.75rem 2rem; display: flex; flex-direction: column; gap: 1.25rem; }
        .sa-nav-btn { display: flex; align-items: center; gap: 9px; width: 100%; padding: 9px 14px; border: none; background: transparent; border-radius: 8px; font-family: inherit; font-size: 13; cursor: pointer; color: #4a4a40; transition: all 0.15s; text-align: left; }
        .sa-nav-btn:hover { background: #f5f4f0; color: #141410; }
        .sa-nav-btn.active { background: #141410; color: #fff; font-weight: 500; }
        .sa-nav-btn.active svg { color: #fff; }
        .sa-card { background: #fff; border: 1px solid #e2e0d8; border-radius: 12px; overflow: hidden; }
        .sa-stat { background: #fff; border: 1px solid #e2e0d8; border-radius: 12px; padding: 1.1rem 1.25rem; }
        .sa-toolbar { padding: 1rem 1.25rem; border-bottom: 1px solid #e2e0d8; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .sa-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; background: #f5f4f0; border: 1px solid #c8c6bc; border-radius: 8px; padding: 0 10px; }
        .sa-search input { flex: 1; border: none; background: transparent; font-family: inherit; font-size: 13px; color: #141410; outline: none; padding: 7px 0; }
        .sa-refresh-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: #fff; color: #141410; border: 1px solid #c8c6bc; border-radius: 7px; font-family: inherit; font-size: 13px; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
        .sa-refresh-btn:hover { background: #f5f4f0; }
        @keyframes sa-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="sa-shell">

        {/* ── SIDEBAR ── */}
        <aside className="sa-sidebar">
          {/* Logo area */}
          <div style={{ padding: "1.25rem 1rem 1rem", borderBottom: "1px solid #e2e0d8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, background: "#141410", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#141410" }}>Super Admin</div>
                <div style={{ fontSize: 11, color: "#9a9a8e" }}>POStore Control</div>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav style={{ padding: "0.75rem 0.75rem", flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.6px", textTransform: "uppercase", color: "#9a9a8e", padding: "0 6px", marginBottom: 6 }}>Navigation</div>
            {TABS.map(t => (
              <button key={t.key} className={`sa-nav-btn ${activeTab === t.key ? "active" : ""}`} onClick={() => changeTab(t.key)}>
                {t.icon}
                {t.label}
                {t.key === "support" && conversations.length > 0 && (() => {
                  const totalUnread = conversations.reduce((s, c) => s + (Number(c.unread_count || 0)), 0);
                  return (
                    <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, background: activeTab === "support" ? "rgba(255,255,255,0.25)" : "#dc2626", color: "#fff", borderRadius: 100, padding: "1px 7px" }}>
                      {totalUnread > 0 ? totalUnread : conversations.length}
                    </span>
                  );
                })()}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #e2e0d8" }}>
            <button
              onClick={() => { localStorage.removeItem("user"); router.push("/login"); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", border: "1px solid #e2e0d8", borderRadius: 8, background: "#fff", color: "#9a9a8e", fontFamily: "inherit", fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#fecaca"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#9a9a8e"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e0d8"; }}
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
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#141410" }}>
                  {TABS.find(t => t.key === activeTab)?.label}
                </div>
                <div style={{ fontSize: 11, color: "#9a9a8e" }}>{dater}</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Super admin badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 100, padding: "4px 12px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#dc2626" }}>SUPER ADMIN</span>
              </div>

              <button
                onClick={() => activeTab === "support" ? loadConversations() : fetchSection(activeTab)}
                className="sa-refresh-btn"
              >
                <IcoRefresh /> Refresh
              </button>

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
              <>
                {/* Quick Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.8rem" }}>
                  <div className="sa-stat">
                    <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Staff</div>
                    <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px", color: "#141410" }}>{stats.staffCount ?? "—"}</div>
                    <div style={{ fontSize: 11, color: "#c8c6bc", marginTop: 6 }}>{stats.activeStaff ?? 0} active</div>
                  </div>
                  <div className="sa-stat">
                    <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Admins</div>
                    <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px", color: "#141410" }}>{stats.adminCount ?? "—"}</div>
                    <div style={{ fontSize: 11, color: "#c8c6bc", marginTop: 6 }}>{stats.activeUsers ?? 0} active</div>
                  </div>
                  <div className="sa-stat">
                    <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Domains</div>
                    <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px", color: "#141410" }}>{stats.totalDomains ?? "—"}</div>
                    <div style={{ fontSize: 11, color: "#c8c6bc", marginTop: 6 }}>{stats.activeDomains ?? 0} active</div>
                  </div>
                </div>

                {/* TRANSACTIONS SECTION */}
                <div className="sa-card" style={{ padding: "1.25rem" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: "1rem", color: "#141410" }}>Transactions</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
                    <div style={{ background: "#f5f4f0", borderRadius: 12, padding: "1rem" }}>
                      <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Today</div>
                      <div style={{ fontSize: 18, color: "#141410", marginTop: 6 }}>KES {Number(stats.todayRevenue || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ background: "#f5f4f0", borderRadius: 12, padding: "1rem" }}>
                      <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>This Week</div>
                      <div style={{ fontSize: 18, color: "#141410", marginTop: 6 }}>KES {Number(stats.weekRevenue || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ background: "#f5f4f0", borderRadius: 12, padding: "1rem" }}>
                      <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>This Month</div>
                      <div style={{ fontSize: 18, color: "#141410", marginTop: 6 }}>KES {Number(stats.monthRevenue || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ background: "#f5f4f0", borderRadius: 12, padding: "1rem" }}>
                      <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>This Year</div>
                      <div style={{ fontSize: 18, color: "#141410", marginTop: 6 }}>KES {Number(stats.yearRevenue || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* ORDERS SECTION */}
                <div className="sa-card" style={{ padding: "1.25rem" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: "1rem", color: "#141410" }}>Orders</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
                    <div style={{ background: "#f5f4f0", borderRadius: 12, padding: "1rem" }}>
                      <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Today</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: "#141410" }}>{stats.todayOrders ?? 0}</div>
                    </div>
                    <div style={{ background: "#f5f4f0", borderRadius: 12, padding: "1rem" }}>
                      <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>This Week</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: "#141410" }}>{stats.weekOrders ?? 0}</div>
                    </div>
                    <div style={{ background: "#f5f4f0", borderRadius: 12, padding: "1rem" }}>
                      <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>This Month</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: "#141410" }}>{stats.monthOrders ?? 0}</div>
                    </div>
                    <div style={{ background: "#f5f4f0", borderRadius: 12, padding: "1rem" }}>
                      <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Overall</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: "#141410" }}>{stats.orderCount ?? 0}</div>
                    </div>
                  </div>
                </div>

                {/* SNEAKY BILLING SECTION */}
                {Array.isArray(stats.sneakyBilling) && stats.sneakyBilling.length > 0 && (
                  <div className="sa-card">
                    <div style={{ padding: "1.25rem", borderBottom: "1px solid #e2e0d8" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#dc2626" }}>Billing Alert</div>
                      <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 4 }}>Accounts with suspicious payment patterns</div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead><tr>
                        {["Store", "Domain", "Failed Transactions", "Last Attempt"].map(h => <th key={h} style={TH}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {(stats.sneakyBilling as Array<Record<string, unknown>>).slice(0, 5).map((r, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #e2e0d8" }} {...rowHover}>
                            <td style={{ ...TD, fontWeight: 500 }}>{String(r.store_name ?? "—")}</td>
                            <td style={{ ...TD, color: "#9a9a8e" }}>{String(r.domain ?? "—")}</td>
                            <td style={{ ...TD, fontWeight: 600, color: "#dc2626" }}>{Number(r.failed_transactions ?? 0)}</td>
                            <td style={{ ...TD, color: "#9a9a8e" }}>{fmtDateTime(r.last_attempt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* RECENT LOGS SECTION */}
                {Array.isArray(stats.recentLogs) && stats.recentLogs.length > 0 && (
                  <div className="sa-card">
                    <div style={{ padding: "1.25rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#141410" }}>Recent Activity</div>
                        <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 4 }}>Last 5 log entries</div>
                      </div>
                      <button onClick={() => changeTab("logs")} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e0d8", background: "#fff", color: "#141410", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>View All Logs</button>
                    </div>
                    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {(stats.recentLogs as Array<Record<string, unknown>>).map((log, i) => (
                        <div key={i} style={{ display: "flex", gap: "0.75rem", padding: "0.75rem", borderRadius: 8, background: "#f5f4f0" }}>
                          <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 500, minWidth: 60 }}>{String(log.type ?? "—")}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "#141410" }}>{String(log.title ?? "—")}</div>
                            <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2 }}>{String(log.message ?? "").slice(0, 100)}{String(log.message ?? "").length > 100 ? "…" : ""}</div>
                          </div>
                          <div style={{ fontSize: 11, color: "#c8c6bc", whiteSpace: "nowrap" }}>{fmtDateTime(log.created_at)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {activeTab === "overview" && loading && <Spinner label="Loading overview…" />}

            {/* ══ USERS ══ */}
            {activeTab === "users" && (
              <div className="sa-card">
                <div className="sa-toolbar">
                  <div className="sa-search"><IcoSearch /><input placeholder="Search users…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
                  <button onClick={openCreateAdminModal} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e0d8", background: "#141410", color: "#fff", cursor: "pointer", fontWeight: 500, fontSize: 12 }}>+ New Admin</button>
                  <button onClick={openCreateSuperadminModal} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e0d8", background: "#991b1b", color: "#fff", cursor: "pointer", fontWeight: 500, fontSize: 12 }}>+ New Superadmin</button>
                  <span style={{ fontSize: 12, color: "#9a9a8e", marginLeft: "auto" }}>{filtered.length} user{filtered.length !== 1 ? "s" : ""}</span>
                </div>
                {loading ? <Spinner label="Loading users…" /> : (
                  <>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead><tr>
                        {["ID", "Name", "Email", "Store", "Plan", "Status", "Joined"].map(h => <th key={h} style={TH}>{h}</th>)}
                        <th style={TH}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {paginated.length === 0
                          ? <tr><td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>No users found.</td></tr>
                          : paginated.map((r, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #e2e0d8" }} {...rowHover}>
                              <td style={{ ...TD, fontFamily: "monospace", fontSize: 11, color: "#9a9a8e" }}>{shortId(r.id)}</td>
                              <td style={{ ...TD, fontWeight: 500, color: "#141410" }}>{String(r.full_name ?? "—")}</td>
                              <td style={{ ...TD, color: "#9a9a8e" }}>{String(r.email ?? "—")}</td>
                              <td style={TD}>{String(r.store_name ?? "—")}</td>
                              <td style={TD}>
                                {r.plan ? <Badge label={String(r.plan).charAt(0).toUpperCase() + String(r.plan).slice(1)} type="info" /> : <span style={{ color: "#c8c6bc" }}>—</span>}
                              </td>
                              <td style={TD}>{statusBadge(r.status ?? r.subdomain_status)}</td>
                              <td style={{ ...TD, color: "#9a9a8e" }}>{fmtDate(r.created_at)}</td>
                              <td style={{ ...TD, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button onClick={() => messageAdmin(String(r.id))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e0d8", background: "#fff", color: "#141410", cursor: "pointer" }}>Message</button>
                                <button onClick={() => openResetModal(String(r.id), "reset_user_password")} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e0d8", background: "#fff", color: "#141410", cursor: "pointer" }}>Reset</button>
                                {Number(r.is_super_admin) === 1 ? (
                                <button
                                 onClick={() => openRemoveSuperadminModal(String(r.email))}
                                 style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", cursor: "pointer", fontWeight: 500 }}
                                >
                                 Revoke SA
                    </button>
                  ) : (
                 <button
                  onClick={() => openGrantSuperadminModal(String(r.email))}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a", cursor: "pointer", fontWeight: 500 }}
                   >
                   Grant SA
                 </button>
                )}
                                <button onClick={() => toggleAccount(String(r.id), String(r.subdomain_status) !== "active", false)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e0d8", background: String(r.subdomain_status) !== "active" ? "#dcfce7" : "#fef2f2", color: String(r.subdomain_status) !== "active" ? "#166534" : "#991b1b", cursor: "pointer" }}>
                                  {String(r.subdomain_status) !== "active" ? "Activate" : "Deactivate"}
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    <Pagination page={page} total={totalPages} onChange={setPage} />
                  </>
                )}
              </div>
            )}

            {/* ══ STAFF ══ */}
            {activeTab === "staff" && (
              <div className="sa-card">
                <div className="sa-toolbar">
                  <div className="sa-search"><IcoSearch /><input placeholder="Search staff…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
                  <button onClick={openCreateStaffModal} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e0d8", background: "#141410", color: "#fff", cursor: "pointer", fontWeight: 500, fontSize: 12 }}>+ New Staff</button>
                  <span style={{ fontSize: 12, color: "#9a9a8e", marginLeft: "auto" }}>{filtered.length} staff member{filtered.length !== 1 ? "s" : ""}</span>
                </div>
                {loading ? <Spinner label="Loading staff…" /> : (
                  <>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead><tr>
                        {["ID", "Name", "Email", "Store", "Role", "Status", "Joined"].map(h => <th key={h} style={TH}>{h}</th>)}
                        <th style={TH}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {paginated.length === 0
                          ? <tr><td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>No staff found.</td></tr>
                          : paginated.map((r, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #e2e0d8" }} {...rowHover}>
                              <td style={{ ...TD, fontFamily: "monospace", fontSize: 11, color: "#9a9a8e" }}>{shortId(r.id)}</td>
                              <td style={{ ...TD, fontWeight: 500, color: "#141410" }}>{String(r.full_name ?? "—")}</td>
                              <td style={{ ...TD, color: "#9a9a8e" }}>{String(r.email ?? "—")}</td>
                              <td style={TD}>{String(r.store_name ?? r.admin_id ?? "—")}</td>
                              <td style={TD}><Badge label={String(r.shift_role ?? r.role ?? "staff")} type="neutral" /></td>
                              <td style={TD}>{statusBadge(r.status)}</td>
                              <td style={{ ...TD, color: "#9a9a8e" }}>{fmtDate(r.created_at)}</td>
                              <td style={{ ...TD, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button onClick={() => messageAdmin(String(r.id))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e0d8", background: "#fff", color: "#141410", cursor: "pointer" }}>Message</button>
                                <button onClick={() => openResetModal(String(r.id), "reset_staff_password")} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e0d8", background: "#fff", color: "#141410", cursor: "pointer" }}>Reset</button>
                                <button onClick={() => toggleAccount(String(r.id), String(r.status) !== "active", true)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e0d8", background: String(r.status) !== "active" ? "#dcfce7" : "#fef2f2", color: String(r.status) !== "active" ? "#166534" : "#991b1b", cursor: "pointer" }}>
                                  {String(r.status) !== "active" ? "Activate" : "Deactivate"}
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    <Pagination page={page} total={totalPages} onChange={setPage} />
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
                    <Pagination page={page} total={totalPages} onChange={setPage} />
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
                    <Pagination page={page} total={totalPages} onChange={setPage} />
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
                    <Pagination page={page} total={totalPages} onChange={setPage} />
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
        </div>
      </div>
    </>
  );
} 