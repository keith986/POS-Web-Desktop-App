"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useStore } from "@/app/_lib/StoreContext";
import InventorySettingsCard from "@/app/admin/InventorySettingsCard";

/* ── Types ── */
interface StoreSettings {
  store_name:  string;
  domain:      string;
  email:       string;
  phone:       string;
  address:     string;
  currency:    string;
  timezone:    string;
}
interface TaxSettings {
  tax_enabled:    boolean;
  tax_rate:       string;
  tax_name:       string;
  tax_inclusive:  boolean;
  receipt_footer: string;
}
interface NotifSettings {
  notif_new_order:    boolean;
  notif_low_stock:    boolean;
  notif_daily_report: boolean;
  notif_staff_login:  boolean;
  notif_email:        string;
}
interface SecurityForm {
  currentPassword: string;
  newPassword:     string;
  confirmPassword: string;
}
interface ProfileForm {
  firstName: string;
  lastName:  string;
  email:     string;
  phone:     string;
}
interface StoredUser {
  id:         string;
  full_name:  string;
  email:      string;
  role:       string;
  store_name: string | null;
  domain:     string | null;
  phone:      string | null;
  address:    string | null;
}
interface ConfirmState {
  open:     boolean;
  title:    string;
  message:  string;
  danger:   boolean;
  onConfirm: () => void;
}

const TABS = ["Store", "Profile", "Tax & Billing", "Notifications", "Inventory", "Security", "Danger Zone"] as const;

/* ── Password strength calculator ── */
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "#e2e0d8" };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak",   color: "#dc2626" };
  if (score <= 2) return { score, label: "Fair",   color: "#d97706" };
  if (score <= 3) return { score, label: "Good",   color: "#2563eb" };
  return              { score, label: "Strong", color: "#16a34a" };
}
type Tab = typeof TABS[number];

/* ── Helpers ── */
function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
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
const sectionStyle: React.CSSProperties  = { display: "flex", flexDirection: "column", gap: "1.1rem" };
const rowStyle: React.CSSProperties      = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" };
const cardStyle: React.CSSProperties     = { background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden" };
const cardHeaderStyle: React.CSSProperties = { padding: "1rem 1.25rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between" };
const cardBodyStyle: React.CSSProperties = { padding: "1.25rem" };

/* ── SVG Icons ── */
function IconWarning() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function IconSave() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

function IconDanger() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

/* ─────────────────────────────────────────
   CONFIRM MODAL
───────────────────────────────────────── */
function ConfirmModal({ state, onCancel }: { state: ConfirmState; onCancel: () => void }) {
  if (!state.open) return null;
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 1000,
          animation: "fadeIn 0.15s ease",
        }}
      />
      {/* Dialog */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: "#fff",
        borderRadius: 14,
        padding: "1.75rem",
        width: "100%", maxWidth: 400,
        zIndex: 1001,
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        animation: "slideUp 0.2s ease",
      }}>
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: state.danger ? "#fef2f2" : "#f5f4f0",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, marginBottom: "1rem",
        }}>
          {state.danger ? <IconWarning /> : <IconSave />}
        </div>

        <div style={{ fontSize: 15, fontWeight: 600, color: "#141410", marginBottom: 8 }}>
          {state.title}
        </div>
        <div style={{ fontSize: 13, color: "#9a9a8e", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          {state.message}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 18px", background: "#fff",
              color: "#4a4a40", border: "1px solid #c8c6bc",
              borderRadius: 8, fontSize: 13, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { state.onConfirm(); onCancel(); }}
            style={{
              padding: "8px 18px",
              background: state.danger ? "#dc2626" : "#141410",
              color: "#fff", border: "none",
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {state.danger ? "Yes, proceed" : "Confirm"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translate(-50%,-46%)} to{opacity:1;transform:translate(-50%,-50%)} }
      `}</style>
    </>
  );
}

/* ── Toast ── */
function Toast({ msg, type = "success" }: { msg: string; type?: "success" | "error" }) {
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
      </span> {msg}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

/* ── Toggle ── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{ width: 44, height: 24, borderRadius: 100, background: checked ? "#141410" : "#e2e0d8", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

/* ── Save Button ── */
function SaveButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick} disabled={loading}
      style={{ padding: "9px 24px", background: loading ? "#9a9a8e" : "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#2a2a22"; }}
      onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#141410"; }}
    >
      {loading ? "Saving…" : "Save Changes"}
    </button>
  );
}

/* ── Spinner ── */
function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", color: "#9a9a8e", fontSize: 13, gap: 10 }}>
      <div style={{ width: 18, height: 18, border: "2px solid #e2e0d8", borderTopColor: "#141410", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      Loading settings…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Danger Row Component ── */
function DangerRow({
  title, desc, tables, btn, destructive = false, onConfirm,
}: {
  title:       string;
  desc:        string;
  tables:      string[];
  btn:         string;
  destructive?: boolean;
  onConfirm:   () => void;
}) {
  return (
    <div style={{ borderRadius: 8, border: "1px solid #fecaca", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "1rem", background: "#fff5f5", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: destructive ? "#dc2626" : "#141410", marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 12, color: "#9a9a8e", lineHeight: 1.5, marginBottom: 8 }}>{desc}</div>
          {/* Tables affected */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {tables.map(t => (
              <span key={t} style={{ fontSize: 10, fontFamily: "monospace", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "1px 6px", borderRadius: 4 }}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={onConfirm}
          style={{
            padding: "8px 16px", flexShrink: 0,
            background: destructive ? "#dc2626" : "#fff",
            color: destructive ? "#fff" : "#dc2626",
            border: destructive ? "none" : "1px solid #fecaca",
            borderRadius: 8, fontSize: 12, fontWeight: 500,
            cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
          }}
        >
          {btn}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function AdminSettingsPage() {
  const [activeTab,  setActiveTab]  = useState<Tab>("Store");
  const { refresh: refreshStore } = useStore();
  const [toast,      setToast]      = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [fetching,   setFetching]   = useState(true);
  const [inventoryMode, setInventoryMode] = useState<"auto" | "manual">("manual");

  /* ── Confirm modal state ── */
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false, title: "", message: "", danger: false, onConfirm: () => {},
  });

  const openConfirm = (title: string, message: string, danger: boolean, onConfirm: () => void) => {
    setConfirm({ open: true, title, message, danger, onConfirm });
  };
  const closeConfirm = () => setConfirm(c => ({ ...c, open: false }));

  const user = getStoredUser();

  /* ── Form state — store pre-filled from localStorage ── */
  const [store, setStore] = useState<StoreSettings>({
    store_name: user?.store_name ?? "",
    domain:     user?.domain     ?? "",
    email:      user?.email      ?? "",
    phone:      user?.phone      ?? "",
    address:    user?.address    ?? "",
    currency:   "KES",
    timezone:   "Africa/Nairobi",
  });
  const [tax, setTax] = useState<TaxSettings>({
    tax_enabled: true, tax_rate: "16", tax_name: "VAT", tax_inclusive: false, receipt_footer: "",
  });
  const [notif, setNotif] = useState<NotifSettings>({
    notif_new_order: true, notif_low_stock: true, notif_daily_report: false, notif_staff_login: false, notif_email: "",
  });
  const [profile, setProfile] = useState<ProfileForm>({
    firstName: "", lastName: "", email: "", phone: "",
  });
  const [security, setSecurity] = useState<SecurityForm>({
    currentPassword: "", newPassword: "", confirmPassword: "",
  });

  /* ── Toast helper ── */
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Fetch settings ── */
  const fetchSettings = useCallback(async () => {
    setFetching(true);
    try {
      const res  = await fetch(`/api/settings${user?.id ? `?admin_id=${user.id}` : ""}`);
      const data = await res.json();
      // Store info: prefer localStorage for user-specific fields, API for regional settings
      setStore({
        store_name: user?.store_name ?? data.store_name ?? "",
        domain:     user?.domain     ?? data.domain     ?? "",
        email:      user?.email      ?? data.email      ?? "",
        phone:      user?.phone      ?? data.phone      ?? "",
        address:    data.address     ?? user?.address   ?? "",
        currency:   data.currency    ?? "KES",
        timezone:   data.timezone    ?? "Africa/Nairobi",
      });
      setTax({ tax_enabled: !!data.tax_enabled, tax_rate: String(data.tax_rate ?? "16"), tax_name: data.tax_name ?? "VAT", tax_inclusive: !!data.tax_inclusive, receipt_footer: data.receipt_footer ?? "" });
      setInventoryMode(data.auto_deduct_inventory ? "auto" : "manual");
      setNotif({ notif_new_order: !!data.notif_new_order, notif_low_stock: !!data.notif_low_stock, notif_daily_report: !!data.notif_daily_report, notif_staff_login: !!data.notif_staff_login, notif_email: data.notif_email ?? "" });
      if (user) {
        const parts = user.full_name.split(" ");
        setProfile({ firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") ?? "", email: user.email ?? "", phone: "" });
      }
    } catch {
      showToast("Failed to load settings", "error");
    } finally {
      setFetching(false);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  /* ── Actual save actions (called after confirm) ── */
  const doSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
                  ...store, 
                  ...tax, 
                  ...notif, 
                  auto_deduct_inventory: inventoryMode === "auto" ? 1 : 0,
                  admin_id: user?.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Keep localStorage in sync with updated store fields
      const updatedUser = getStoredUser();
      if (updatedUser) {
        localStorage.setItem("user", JSON.stringify({
          ...updatedUser,
          store_name: store.store_name,
          domain:     store.domain,
          email:      store.email,
          phone:      store.phone,
          address:    store.address,
        }));
      }
      showToast("Settings saved successfully");
      refreshStore(); // update global currency/timezone context
    } catch (err) {
      showToast((err as Error).message || "Failed to save", "error");
    } finally { setSaving(false); }
  };

  const doSaveProfile = async () => {
    if (!user) return showToast("Not logged in", "error");
    setSaving(true);
    try {
      const res = await fetch("/api/settings/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: user.id, full_name: `${profile.firstName} ${profile.lastName}`.trim(), email: profile.email, phone: profile.phone }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem("user", JSON.stringify({ ...user, ...data.user }));
      showToast("Profile updated successfully");
    } catch (err) {
      showToast((err as Error).message || "Failed to update profile", "error");
    } finally { setSaving(false); }
  };

  const doChangePassword = async () => {
    if (!user) return showToast("Not logged in", "error");
    setSaving(true);
    try {
      const res = await fetch("/api/settings/password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: user.id, currentPassword: security.currentPassword, newPassword: security.newPassword }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("Password updated successfully");
      setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      showToast((err as Error).message || "Failed to update password", "error");
    } finally { setSaving(false); }
  };

  /* ── Confirm wrappers (open modal → then do action) ── */
  const handleSave = () =>
    openConfirm("Save Settings", "Are you sure you want to save these changes?", false, doSave);

  const handleSaveProfile = () =>
    openConfirm("Update Profile", "This will update your name, email and phone number.", false, doSaveProfile);

  const handleChangePassword = () => {
    if (!security.currentPassword || !security.newPassword) return showToast("Please fill in all password fields.", "error");
    if (security.newPassword !== security.confirmPassword) return showToast("New passwords do not match.", "error");
    if (security.newPassword.length < 8) return showToast("Password must be at least 8 characters.", "error");
    openConfirm("Change Password", "Are you sure you want to change your password? You will need to use the new password on your next login.", false, doChangePassword);
  };

  const initials = user
    ? user.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "—";

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <ConfirmModal state={confirm} onCancel={closeConfirm} />

      <header className="header">
        <div className="header-title">Settings</div>
        <div className="header-date">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date())}</div>
      </header>

      <main className="main">

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 2, background: "#fff", border: "1px solid #e2e0d8", borderRadius: 10, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: "7px 16px", border: "none", borderRadius: 7,
              fontFamily: "inherit", fontSize: 13, cursor: "pointer", transition: "all 0.15s",
              background: activeTab === t ? (t === "Danger Zone" ? "#dc2626" : "#141410") : "transparent",
              color: activeTab === t ? "#fff" : (t === "Danger Zone" ? "#dc2626" : "#9a9a8e"),
              fontWeight: activeTab === t ? 500 : 400,
            }}>
              {t}
            </button>
          ))}
        </div>

        {fetching ? <Spinner /> : (
          <>
            {/* ══ STORE ══ */}
            {activeTab === "Store" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}><span style={{ fontSize: 13, fontWeight: 500 }}>Store Information</span></div>
                  <div style={cardBodyStyle}>
                    <div style={sectionStyle}>
                      <div style={rowStyle}>
                        <div>
                          <label style={labelStyle}>Store Name</label>
                          <input style={fieldStyle} value={store.store_name} onChange={e => setStore(s => ({ ...s, store_name: e.target.value }))} />
                        </div>
                        <div>
                          <label style={labelStyle}>Domain</label>
                          <div style={{ display: "flex", alignItems: "stretch", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 8, overflow: "hidden" }}>
                            <input style={{ ...fieldStyle, border: "none", background: "transparent", flex: 1 }} value={store.domain} onChange={e => setStore(s => ({ ...s, domain: e.target.value }))} readOnly={true} />
                            <span style={{ padding: "0 12px", background: "#e2e0d8", fontSize: 12, fontWeight: 500, color: "#4a4a40", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>.upendoapps.com</span>
                          </div>
                        </div>
                      </div>
                      <div style={rowStyle}>
                        <div>
                          <label style={labelStyle}>Contact Email</label>
                          <input style={fieldStyle} type="email" value={store.email} onChange={e => setStore(s => ({ ...s, email: e.target.value }))} />
                        </div>
                        <div>
                          <label style={labelStyle}>Phone Number</label>
                          <input style={fieldStyle} value={store.phone} onChange={e => setStore(s => ({ ...s, phone: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Address</label>
                        <input style={fieldStyle} value={store.address} onChange={e => setStore(s => ({ ...s, address: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={cardHeaderStyle}><span style={{ fontSize: 13, fontWeight: 500 }}>Regional Settings</span></div>
                  <div style={cardBodyStyle}>
                    <div style={rowStyle}>
                      <div>
                        <label style={labelStyle}>Currency</label>
                        <select style={{ ...fieldStyle, cursor: "pointer" }} value={store.currency} onChange={e => setStore(s => ({ ...s, currency: e.target.value }))}>
                          <option value="KES">KES — Kenyan Shilling</option>
                          <option value="USD">USD — US Dollar</option>
                          <option value="EUR">EUR — Euro</option>
                          <option value="GBP">GBP — British Pound</option>
                          <option value="UGX">UGX — Ugandan Shilling</option>
                          <option value="TZS">TZS — Tanzanian Shilling</option>
                          <option value="NGN">NGN — Nigerian Naira</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Timezone</label>
                        <select style={{ ...fieldStyle, cursor: "pointer" }} value={store.timezone} onChange={e => setStore(s => ({ ...s, timezone: e.target.value }))}>
                          <option value="Africa/Nairobi">Africa/Nairobi (EAT +3)</option>
                          <option value="Africa/Lagos">Africa/Lagos (WAT +1)</option>
                          <option value="Africa/Cairo">Africa/Cairo (EET +2)</option>
                          <option value="Europe/London">Europe/London (GMT +0)</option>
                          <option value="America/New_York">America/New_York (EST -5)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <SaveButton onClick={handleSave} loading={saving} />
                </div>
              </div>
            )}

            {/* ══ PROFILE ══ */}
            {activeTab === "Profile" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}><span style={{ fontSize: 13, fontWeight: 500 }}>Admin Profile</span></div>
                  <div style={cardBodyStyle}>
                    <div style={sectionStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.5rem 0" }}>
                        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#141410", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 500, flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{user?.full_name ?? "Admin"}</div>
                          <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2 }}>{user?.role ?? "admin"} · {user?.email ?? ""}</div>
                        </div>
                      </div>
                      <div style={{ height: 1, background: "#e2e0d8" }} />
                      <div style={rowStyle}>
                        <div>
                          <label style={labelStyle}>First Name</label>
                          <input style={fieldStyle} value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} />
                        </div>
                        <div>
                          <label style={labelStyle}>Last Name</label>
                          <input style={fieldStyle} value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} />
                        </div>
                      </div>

                      <div>
                        <label style={labelStyle}>Role</label>
                        <input style={{ ...fieldStyle, background: "#e2e0d8", color: "#9a9a8e", cursor: "not-allowed" }} value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Admin"} readOnly />
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <SaveButton onClick={handleSaveProfile} loading={saving} />
                </div>
              </div>
            )}

            {/* ══ TAX & BILLING ══ */}
            {activeTab === "Tax & Billing" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Tax Configuration</span>
                    <Toggle checked={tax.tax_enabled} onChange={() => setTax(t => ({ ...t, tax_enabled: !t.tax_enabled }))} />
                  </div>
                  <div style={{ ...cardBodyStyle, opacity: tax.tax_enabled ? 1 : 0.4, pointerEvents: tax.tax_enabled ? "auto" : "none", transition: "opacity 0.2s" }}>
                    <div style={sectionStyle}>
                      <div style={rowStyle}>
                        <div>
                          <label style={labelStyle}>Tax Name</label>
                          <input style={fieldStyle} value={tax.tax_name} onChange={e => setTax(t => ({ ...t, tax_name: e.target.value }))} placeholder="e.g. VAT, GST" />
                        </div>
                        <div>
                          <label style={labelStyle}>Tax Rate (%)</label>
                          <input style={fieldStyle} type="number" min="0" max="100" value={tax.tax_rate} onChange={e => setTax(t => ({ ...t, tax_rate: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", background: "#f5f4f0", borderRadius: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>Tax Inclusive Pricing</div>
                          <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2 }}>Product prices already include tax</div>
                        </div>
                        <Toggle checked={tax.tax_inclusive} onChange={() => setTax(t => ({ ...t, tax_inclusive: !t.tax_inclusive }))} />
                      </div>
                      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "0.75rem 1rem", fontSize: 12, color: "#1e40af" }}>
                        <span style={{ display: "inline-flex", alignItems: "flex-start", gap: 7 }}>
          <span style={{ marginTop: 1, flexShrink: 0 }}><IconInfo /></span>
          <span>With {tax.tax_name || "tax"} at {tax.tax_rate || 0}%, a 100 {store.currency} item will show {(100 * (1 + Number(tax.tax_rate) / 100)).toFixed(2)} {store.currency} at checkout.</span>
        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}><span style={{ fontSize: 13, fontWeight: 500 }}>Receipt Settings</span></div>
                  <div style={cardBodyStyle}>
                    <div style={sectionStyle}>
                      <div>
                        <label style={labelStyle}>Receipt Footer Message</label>
                        <textarea style={{ ...fieldStyle, resize: "vertical", minHeight: 80 } as React.CSSProperties} value={tax.receipt_footer} onChange={e => setTax(t => ({ ...t, receipt_footer: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <SaveButton onClick={handleSave} loading={saving} />
                </div>
              </div>
            )}

            {/* ══ NOTIFICATIONS ══ */}
            {activeTab === "Notifications" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}><span style={{ fontSize: 13, fontWeight: 500 }}>Email Notifications</span></div>
                  <div style={cardBodyStyle}>
                    {[
                      { key: "notif_new_order",    label: "New Order",      desc: "Get notified whenever a new sale is recorded" },
                      { key: "notif_low_stock",    label: "Low Stock Alert", desc: "Alert when a product drops below 10 units" },
                      { key: "notif_daily_report", label: "Daily Summary",   desc: "Receive a daily sales report every morning" },
                      { key: "notif_staff_login",  label: "Staff Login",     desc: "Alert when a staff member signs in" },
                    ].map(({ key, label, desc }) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 0", borderBottom: "1px solid #e2e0d8" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
                          <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2 }}>{desc}</div>
                        </div>
                        <Toggle
                          checked={notif[key as keyof NotifSettings] as boolean}
                          onChange={() => setNotif(n => ({ ...n, [key]: !n[key as keyof NotifSettings] }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}><span style={{ fontSize: 13, fontWeight: 500 }}>Notification Email</span></div>
                  <div style={cardBodyStyle}>
                    <label style={labelStyle}>Send notifications to</label>
                    <input style={fieldStyle} type="email" value={notif.notif_email} onChange={e => setNotif(n => ({ ...n, notif_email: e.target.value }))} />
                    <p style={{ fontSize: 12, color: "#9a9a8e", marginTop: 6 }}>You can add multiple emails separated by commas.</p>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <SaveButton onClick={handleSave} loading={saving} />
                </div>
              </div>
            )}

             {/* ══ INVENTORY  ══ */}
            {activeTab === "Inventory" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <InventorySettingsCard
              inventoryMode={inventoryMode}
              setInventoryMode={setInventoryMode}
              />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <SaveButton onClick={handleSave} loading={saving} />
            </div>
            </div>
            )}

            {/* ══ SECURITY ══ */}
            {activeTab === "Security" && (() => {
              const strength = getPasswordStrength(security.newPassword);
              const confirmOk = security.confirmPassword.length > 0 && security.confirmPassword === security.newPassword;
              const confirmErr = security.confirmPassword.length > 0 && security.confirmPassword !== security.newPassword;
              return (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                {/* ── Change Password ── */}
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Change Password</span>
                    <span style={{ fontSize: 11, color: "#9a9a8e" }}>Stored as bcrypt hash in the database</span>
                  </div>
                  <div style={cardBodyStyle}>
                    <div style={sectionStyle}>

                      {/* Current password */}
                      <div>
                        <label style={labelStyle}>Current Password *</label>
                        <input
                          style={fieldStyle}
                          type="password"
                          placeholder="Enter your current password"
                          value={security.currentPassword}
                          onChange={e => setSecurity(s => ({ ...s, currentPassword: e.target.value }))}
                        />
                      </div>

                      {/* New password + strength meter */}
                      <div>
                        <label style={labelStyle}>New Password *</label>
                        <input
                          style={{
                            ...fieldStyle,
                            borderColor: security.newPassword
                              ? strength.color
                              : "#c8c6bc",
                          }}
                          type="password"
                          placeholder="Min. 8 characters"
                          value={security.newPassword}
                          onChange={e => setSecurity(s => ({ ...s, newPassword: e.target.value }))}
                        />
                        {/* Strength bar */}
                        {security.newPassword && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                              {[1,2,3,4,5].map(i => (
                                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength.score ? strength.color : "#e2e0d8", transition: "background 0.2s" }} />
                              ))}
                            </div>
                            <div style={{ fontSize: 11, color: strength.color, fontWeight: 500 }}>
                              {strength.label}
                              {strength.score < 3 && (
                                <span style={{ color: "#9a9a8e", fontWeight: 400 }}>
                                  {" — "}
                                  {!/[A-Z]/.test(security.newPassword) && "add uppercase · "}
                                  {!/[0-9]/.test(security.newPassword) && "add a number · "}
                                  {!/[^A-Za-z0-9]/.test(security.newPassword) && "add a symbol · "}
                                  {security.newPassword.length < 12 && "use 12+ chars"}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirm password */}
                      <div>
                        <label style={labelStyle}>Confirm New Password *</label>
                        <input
                          style={{
                            ...fieldStyle,
                            borderColor: confirmErr ? "#dc2626" : confirmOk ? "#16a34a" : "#c8c6bc",
                          }}
                          type="password"
                          placeholder="Repeat new password"
                          value={security.confirmPassword}
                          onChange={e => setSecurity(s => ({ ...s, confirmPassword: e.target.value }))}
                        />
                        {confirmErr && (
                          <p style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>Passwords do not match</p>
                        )}
                        {confirmOk && (
                          <p style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>✓ Passwords match</p>
                        )}
                      </div>

                      {/* Requirements checklist */}
                      <div style={{ background: "#f5f4f0", borderRadius: 8, padding: "0.75rem 1rem" }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "#4a4a40", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Requirements</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {[
                            { label: "At least 8 characters",          met: security.newPassword.length >= 8 },
                            { label: "At least one uppercase letter",   met: /[A-Z]/.test(security.newPassword) },
                            { label: "At least one number",             met: /[0-9]/.test(security.newPassword) },
                            { label: "At least one special character",  met: /[^A-Za-z0-9]/.test(security.newPassword) },
                          ].map(req => (
                            <div key={req.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                stroke={req.met ? "#16a34a" : "#c8c6bc"} strokeWidth="2.5" strokeLinecap="round">
                                {req.met
                                  ? <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                                  : <circle cx="12" cy="12" r="10"/>
                                }
                              </svg>
                              <span style={{ color: req.met ? "#16a34a" : "#9a9a8e" }}>{req.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          onClick={handleChangePassword}
                          disabled={saving || !confirmOk || strength.score < 2}
                          style={{
                            padding: "9px 20px",
                            background: saving || !confirmOk || strength.score < 2 ? "#9a9a8e" : "#141410",
                            color: "#fff", border: "none", borderRadius: 8,
                            fontSize: 13, fontWeight: 500,
                            cursor: saving || !confirmOk || strength.score < 2 ? "not-allowed" : "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {saving ? "Updating…" : "Update Password"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Account Info ── */}
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}><span style={{ fontSize: 13, fontWeight: 500 }}>Account Info</span></div>
                  <div style={cardBodyStyle}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {[
                        { label: "Admin ID",    value: user?.id ?? "—",         mono: true  },
                        { label: "Email",       value: user?.email ?? "—",      mono: false },
                        { label: "Role",        value: user?.role ?? "admin",   mono: false },
                        { label: "Store",       value: user?.store_name ?? "—", mono: false },
                      ].map(row => (
                        <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 0.85rem", background: "#f5f4f0", borderRadius: 8 }}>
                          <span style={{ fontSize: 12, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px" } as React.CSSProperties}>{row.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, fontFamily: row.mono ? "monospace" : "inherit", color: "#141410", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Sign Out All Devices ── */}
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Session</span>
                  </div>
                  <div style={cardBodyStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>Sign out of this session</div>
                        <div style={{ fontSize: 12, color: "#9a9a8e" }}>
                          Clears your localStorage session and redirects to login.
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          openConfirm(
                            "Sign Out",
                            "Are you sure you want to sign out? You will need to log in again.",
                            false,
                            () => {
                              localStorage.removeItem("user");
                              window.location.href = "/";
                            }
                          )
                        }
                        style={{ padding: "8px 16px", background: "#f5f4f0", color: "#141410", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", flexShrink: 0 }}
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>

              </div>
              );
            })()}

            {/* ══ DANGER ZONE ══ */}
            {activeTab === "Danger Zone" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                {/* Warning banner */}
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "0.85rem 1.1rem", display: "flex", alignItems: "flex-start", gap: 10, fontSize: 12, color: "#7f1d1d" }}>
                  <span style={{ marginTop: 1, flexShrink: 0 }}><IconDanger /></span>
                  <span>The actions below are <strong>permanent and irreversible</strong>. They operate directly on your database. Make sure you know what you&apos;re doing before proceeding.</span>
                </div>

                <div style={{ ...cardStyle, border: "1px solid #fecaca" }}>
                  <div style={{ ...cardHeaderStyle, background: "#fef2f2", borderBottom: "1px solid #fecaca" }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 6 }}><IconDanger /> Danger Zone</span>
                    <span style={{ fontSize: 12, color: "#dc2626" }}>These actions write directly to the database</span>
                  </div>
                  <div style={cardBodyStyle}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                      {/* ── Clear All Sales ── */}
                      <DangerRow
                        title="Clear All Sales Data"
                        desc="Permanently DELETE all rows from the orders table scoped to your store. Stock movements from sales are also cleared. Customer order counts are reset to 0."
                        tables={["orders", "stock_movements (sale type)"]}
                        btn="Clear Sales Data"
                        onConfirm={() =>
                          openConfirm(
                            "Clear All Sales Data",
                            "This will permanently delete every order and sale record from your database. Customer totals will be reset. This CANNOT be undone.",
                            true,
                            async () => {
                              if (!user?.id) return showToast("Not logged in", "error");
                              try {
                                const res = await fetch(`/api/admin/clear-sales?admin_id=${user.id}`, { method: "DELETE" });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error);
                                showToast(`Cleared ${data.deleted} sales records`);
                              } catch (err) {
                                showToast((err as Error).message || "Failed to clear sales", "error");
                              }
                            }
                          )
                        }
                      />

                      {/* ── Reset Inventory ── */}
                      <DangerRow
                        title="Reset Inventory"
                        desc="Sets stock = 0 for every product in your catalogue. Product names, prices and SKUs are preserved. All stock_movements history is wiped."
                        tables={["products.stock → 0", "stock_movements"]}
                        btn="Reset Inventory"
                        onConfirm={() =>
                          openConfirm(
                            "Reset Inventory",
                            "This will set stock to 0 for every product and delete all stock movement history. Products themselves are preserved. Are you sure?",
                            true,
                            async () => {
                              if (!user?.id) return showToast("Not logged in", "error");
                              try {
                                const res = await fetch(`/api/admin/reset-inventory?admin_id=${user.id}`, { method: "DELETE" });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error);
                                showToast(`Reset ${data.updated} products to 0 stock`);
                              } catch (err) {
                                showToast((err as Error).message || "Failed to reset inventory", "error");
                              }
                            }
                          )
                        }
                      />

                      {/* ── Delete All Customers ── */}
                      <DangerRow
                        title="Delete All Customers"
                        desc="Permanently removes every customer record from your store. Orders are preserved but will show no linked customer."
                        tables={["customers"]}
                        btn="Delete Customers"
                        onConfirm={() =>
                          openConfirm(
                            "Delete All Customers",
                            "This will permanently delete every customer record. This cannot be undone. Orders will be preserved but unlinked.",
                            true,
                            async () => {
                              if (!user?.id) return showToast("Not logged in", "error");
                              try {
                                const res = await fetch(`/api/admin/clear-customers?admin_id=${user.id}`, { method: "DELETE" });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error);
                                showToast(`Deleted ${data.deleted} customer records`);
                              } catch (err) {
                                showToast((err as Error).message || "Failed to delete customers", "error");
                              }
                            }
                          )
                        }
                      />

                      {/* ── Delete Store Account ── */}
                      <DangerRow
                        title="Delete Store Account"
                        desc="Nuclear option — deletes your admin account and ALL associated data: products, orders, staff, customers, settings, and stock history."
                        tables={["users", "staff", "products", "orders", "customers", "stock_movements", "settings"]}
                        btn="Delete Store"
                        destructive
                        onConfirm={() =>
                          openConfirm(
                            "Delete Store Account",
                            "This will permanently delete your admin account and every piece of data associated with it. You will be signed out immediately. THIS CANNOT BE UNDONE.",
                            true,
                            async () => {
                              if (!user?.id) return showToast("Not logged in", "error");
                              try {
                                const res = await fetch(`/api/admin/delete-store?admin_id=${user.id}`, { method: "DELETE" });
                                if (!res.ok) throw new Error("Failed");
                                localStorage.removeItem("user");
                                localStorage.removeItem("read_notifs");
                                showToast("Store deleted. Redirecting…");
                                setTimeout(() => { window.location.href = "https://pos.upendoapps.com";}, 1500);
                              } catch (err) {
                                showToast((err as Error).message || "Failed to delete store", "error");
                              }
                            }
                          )
                        }
                      />

                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}