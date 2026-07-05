"use client";

import { useState, useEffect } from "react";
//import { useRouter } from "next/navigation";
import LogoutModal from "@/app/staff/component/Logoutmodal";
import { THEMES, useStaffTheme } from "@/app/staff/component/theme";

/* ─── Types ─────────────────────────────────────────────────── */
interface StoredStaff {
  id:         string;
  full_name:  string;
  email:      string;
  role:       string;
  admin_id:   string;
  shift_role: string | null;
  status:     "active" | "inactive";
}

interface StoreSettings {
  tax_enabled:   boolean;
  tax_rate:      number;
  tax_name:      string;
  tax_inclusive: boolean;
  currency:      string;
}

interface AdminStore {
  id:         string;
  full_name:  string;
  store_name: string | null;
  domain:     string | null;
  pos_type:   string | null;
}

interface StaffSettingsTabProps {
  staff:          StoredStaff;
  settings:       StoreSettings;
  formatCurrency: (n: number, currency?: string) => string;
}

/* ─── Helpers ─────────────────────────────────────────────────── */
function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

/* ─── Icons ─────────────────────────────────────────────────── */
function IcoUser()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function IcoStore()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function IcoShield()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function IcoReceipt() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>; }
function IcoClock()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function IcoLogout()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function IcoCheck()   { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function IcoKey()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>; }
function IcoPalette() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a1 1 0 01-1-1v-1a2 2 0 00-2-2H8a2 2 0 01-2-2 2 2 0 00-2-2H3a1 1 0 01-1-1 10 10 0 1110 10z"/><circle cx="6.5" cy="11.5" r="1.5"/><circle cx="9.5" cy="7.5" r="1.5"/><circle cx="14.5" cy="7.5" r="1.5"/><circle cx="17.5" cy="11.5" r="1.5"/></svg>; }

const css = `
  /* ── Bento grid ──
     12-column grid; each block claims a span. Below 880px every
     block collapses to full width and stacks in document order. */
  .sett-page {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    grid-auto-rows: min-content;
    gap: 1rem;
  }
  .sett-b-7  { grid-column: span 7; }
  .sett-b-5  { grid-column: span 5; }
  .sett-b-4  { grid-column: span 4; }
  .sett-b-8  { grid-column: span 8; }
  .sett-b-12 { grid-column: span 12; }

  @media (max-width: 880px) {
    .sett-b-7, .sett-b-5, .sett-b-4, .sett-b-8, .sett-b-12 { grid-column: span 12; }
  }

  /* Block */
  .sett-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    display: flex; flex-direction: column;
  }
  .sett-card-hd {
    display: flex; align-items: center; gap: 10px;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }
  .sett-card-icon {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .sett-card-title { font-size: 13px; font-weight: 600; color: var(--ink); }
  .sett-card-sub   { font-size: 11px; color: var(--muted); margin-top: 1px; }
  .sett-card-body  { padding: 1.1rem 1.25rem; flex: 1; display: flex; flex-direction: column; }

  /* Fact tiles — the "block" replacement for the old label/value rows */
  .sett-fact-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .sett-fact {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.65rem 0.75rem;
    display: flex; flex-direction: column; gap: 4px;
    min-width: 0;
  }
  .sett-fact-full { grid-column: 1 / -1; }
  .sett-fact-label {
    font-size: 10px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase;
    color: var(--muted);
  }
  .sett-fact-val {
    font-size: 13px; font-weight: 500; color: var(--ink);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .sett-row-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 100px;
    font-size: 11px; font-weight: 600; width: fit-content;
  }

  /* Avatar section */
  .sett-profile-hero {
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 1rem;
  }
  .sett-avatar-lg {
    width: 52px; height: 52px; border-radius: 50%;
    background: #eff6ff; border: 2px solid #bfdbfe;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px; font-weight: 700; color: #2563eb;
    flex-shrink: 0;
  }
  .sett-profile-name  { font-size: 15px; font-weight: 600; color: var(--ink); }
  .sett-profile-email { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .sett-profile-role  {
    display: inline-flex; align-items: center; gap: 5px;
    margin-top: 5px; padding: 2px 8px; border-radius: 100px;
    font-size: 10px; font-weight: 600;
    background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;
  }
  .sett-active-dot { width: 5px; height: 5px; border-radius: 50%; background: #16a34a; }

  /* Change password form */
  .sett-form { display: flex; flex-direction: column; gap: 0.85rem; flex: 1; }
  .sett-label { font-size: 11px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; color: var(--ink2); display: block; margin-bottom: 5px; }
  .sett-input {
    width: 100%; background: var(--bg); border: 1px solid var(--border2);
    border-radius: 8px; padding: 9px 12px; color: var(--ink);
    font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }
  .sett-input:focus { border-color: var(--ink); box-shadow: 0 0 0 3px rgba(20,20,16,0.07); }
  .sett-save-btn {
    padding: 9px 20px; background: var(--ink); color: var(--surface);
    border: none; border-radius: 8px; font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 500; cursor: pointer; align-self: flex-start;
    display: flex; align-items: center; gap: 6px;
    transition: background 0.15s, transform 0.1s;
  }
  .sett-save-btn:hover  { opacity: 0.85; }
  .sett-save-btn:active { transform: scale(0.98); }
  .sett-save-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* Success flash */
  .sett-success {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 12px; border-radius: 8px;
    background: #f0fdf4; border: 1px solid #bbf7d0;
    color: #16a34a; font-size: 12px; font-weight: 500;
  }

  /* Danger zone */
  .sett-danger-btn {
    width: 100%; padding: 11px;
    background: #fef2f2; border: 1px solid #fecaca;
    border-radius: 9px; font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 500; color: #dc2626;
    cursor: pointer; display: flex; align-items: center;
    justify-content: center; gap: 8px;
    transition: background 0.15s, border-color 0.15s;
  }
  .sett-danger-btn:hover { background: #fee2e2; border-color: #fca5a5; }

  /* Store skeleton */
  .sett-skel { height: 13px; border-radius: 4px; background: #ece9e1; animation: settPulse 1.4s ease-in-out infinite; }
  @keyframes settPulse { 0%,100%{opacity:1} 50%{opacity:.4} }

  /* Theme picker */
  .sett-theme-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
    gap: 10px;
  }
  .sett-theme-opt {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 12px 8px; border-radius: 10px;
    border: 1px solid var(--border2); background: var(--bg);
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: border-color 0.15s, transform 0.1s, background 0.15s;
  }
  .sett-theme-opt:hover { transform: translateY(-1px); }
  .sett-theme-opt.active { border-color: var(--accent); background: var(--accent-bg); }
  .sett-theme-swatch {
    width: 32px; height: 32px; border-radius: 50%;
    border: 1px solid rgba(0,0,0,0.12);
    box-shadow: inset 0 0 0 3px rgba(255,255,255,0.35);
    display: flex; align-items: center; justify-content: center;
  }
  .sett-theme-name {
    font-size: 11.5px; font-weight: 500; color: var(--ink);
    display: flex; align-items: center; gap: 4px;
  }
`;

/* ─────────────────────────────────────────
   COMPONENT
───────────────────────────────────────── */
export default function StaffSettingsTab({ staff, settings }: StaffSettingsTabProps) {
  //const router = useRouter();

  const { theme, setTheme } = useStaffTheme();

  const [adminStore,    setAdminStore]    = useState<AdminStore | null>(null);
  const [storeLoading,  setStoreLoading]  = useState(true);
  const [showLogout,    setShowLogout]    = useState(false);

  /* Password change state */
  const [currentPwd,    setCurrentPwd]    = useState("");
  const [newPwd,        setNewPwd]        = useState("");
  const [confirmPwd,    setConfirmPwd]    = useState("");
  const [pwdSaving,     setPwdSaving]     = useState(false);
  const [pwdSuccess,    setPwdSuccess]    = useState(false);
  const [pwdError,      setPwdError]      = useState("");

  /* Shift clock */
  const [shiftTime,     setShiftTime]     = useState("");

  /* ── Fetch admin store info ── */
  useEffect(() => {
    if (!staff?.id) return;
    fetch(`/api/staff/admin?staff_id=${staff.id}`)
      .then(r => r.json())
      .then((data: AdminStore) => { if (data?.id) setAdminStore(data); })
      .catch(() => {})
      .finally(() => setStoreLoading(false));
  }, [staff.id]);

  /* ── Live shift clock ── */
  useEffect(() => {
    const tick = () => setShiftTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ── Change password ── */
  const handleChangePassword = async () => {
    setPwdError("");
    if (!currentPwd || !newPwd || !confirmPwd)
      return setPwdError("All password fields are required.");
    if (newPwd.length < 6)
      return setPwdError("New password must be at least 6 characters.");
    if (newPwd !== confirmPwd)
      return setPwdError("New passwords do not match.");

    setPwdSaving(true);
    try {
      const res = await fetch(`/api/staff/${staff.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      setPwdSuccess(true);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      setTimeout(() => setPwdSuccess(false), 4000);
    } catch (err) {
      setPwdError((err as Error).message);
    } finally {
      setPwdSaving(false);
    }
  };

  const initials  = getInitials(staff.full_name);
  const shiftRole = staff.shift_role
    ? staff.shift_role.charAt(0).toUpperCase() + staff.shift_role.slice(1)
    : "Cashier";
  const storeName = adminStore?.store_name ?? adminStore?.full_name ?? "—";

  return (
    <>
      <style>{css}</style>
      <LogoutModal open={showLogout} onCancel={() => setShowLogout(false)} />

      <div className="sett-page">

        {/* ── My Profile ── */}
        <div className="sett-card sett-b-7">
          <div className="sett-card-hd">
            <div className="sett-card-icon" style={{ background: "#eff6ff", color: "#2563eb" }}><IcoUser /></div>
            <div>
              <div className="sett-card-title">My Profile</div>
              <div className="sett-card-sub">Your account details</div>
            </div>
          </div>
          <div className="sett-card-body">
            <div className="sett-profile-hero">
              <div className="sett-avatar-lg">{initials}</div>
              <div>
                <div className="sett-profile-name">{staff.full_name}</div>
                <div className="sett-profile-email">{staff.email}</div>
                <div className="sett-profile-role">
                  <span className="sett-active-dot" />
                  {shiftRole} · {staff.status === "active" ? "Active" : "Inactive"}
                </div>
              </div>
            </div>

            <div className="sett-fact-grid">
              <div className="sett-fact">
                <span className="sett-fact-label">Full Name</span>
                <span className="sett-fact-val">{staff.full_name}</span>
              </div>
              <div className="sett-fact">
                <span className="sett-fact-label">Email</span>
                <span className="sett-fact-val">{staff.email}</span>
              </div>
              <div className="sett-fact">
                <span className="sett-fact-label">Role</span>
                <span className="sett-fact-val">{shiftRole}</span>
              </div>
              <div className="sett-fact">
                <span className="sett-fact-label">Status</span>
                <span className="sett-row-badge" style={{ background: staff.status === "active" ? "#f0fdf4" : "#f5f4f0", color: staff.status === "active" ? "#16a34a" : "#9a9a8e", border: `1px solid ${staff.status === "active" ? "#bbf7d0" : "#e2e0d8"}` }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: staff.status === "active" ? "#16a34a" : "#9a9a8e", display: "inline-block" }} />
                  {staff.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Appearance / Theme ── */}
        <div className="sett-card sett-b-5">
          <div className="sett-card-hd">
            <div className="sett-card-icon" style={{ background: "#fdf4ff", color: "#9333ea" }}><IcoPalette /></div>
            <div>
              <div className="sett-card-title">Appearance</div>
              <div className="sett-card-sub">Saved to this device</div>
            </div>
          </div>
          <div className="sett-card-body">
            <div className="sett-theme-grid">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  className={`sett-theme-opt ${theme === t.id ? "active" : ""}`}
                  onClick={() => setTheme(t.id)}
                  title={t.label}
                >
                  <div className="sett-theme-swatch" style={{ background: t.swatch }}>
                    {theme === t.id && (
                      <span style={{ color: "#fff", filter: "drop-shadow(0 0 1.5px rgba(0,0,0,0.7))" }}>
                        <IcoCheck />
                      </span>
                    )}
                  </div>
                  <span className="sett-theme-name">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Store Info ── */}
        <div className="sett-card sett-b-4">
          <div className="sett-card-hd">
            <div className="sett-card-icon" style={{ background: "#f5f4f0", color: "#4a4a40" }}><IcoStore /></div>
            <div>
              <div className="sett-card-title">Store Information</div>
              <div className="sett-card-sub">Managed by admin</div>
            </div>
          </div>
          <div className="sett-card-body">
            {storeLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="sett-skel" style={{ width: "60%" }} />
                <div className="sett-skel" style={{ width: "40%" }} />
                <div className="sett-skel" style={{ width: "50%" }} />
              </div>
            ) : (
              <div className="sett-fact-grid">
                <div className="sett-fact sett-fact-full">
                  <span className="sett-fact-label">Store Name</span>
                  <span className="sett-fact-val">{storeName}</span>
                </div>
                <div className="sett-fact">
                  <span className="sett-fact-label">Domain</span>
                  <span className="sett-fact-val">{adminStore?.domain ?? "—"}</span>
                </div>
                <div className="sett-fact">
                  <span className="sett-fact-label">POS Type</span>
                  <span className="sett-fact-val" style={{ textTransform: "capitalize" }}>{adminStore?.pos_type ?? "—"}</span>
                </div>
                <div className="sett-fact sett-fact-full">
                  <span className="sett-fact-label">Admin</span>
                  <span className="sett-fact-val">{adminStore?.full_name ?? "—"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Tax & Currency ── */}
        <div className="sett-card sett-b-4">
          <div className="sett-card-hd">
            <div className="sett-card-icon" style={{ background: "#fffbeb", color: "#d97706" }}><IcoReceipt /></div>
            <div>
              <div className="sett-card-title">Tax & Currency</div>
              <div className="sett-card-sub">Applied to all sales</div>
            </div>
          </div>
          <div className="sett-card-body">
            <div className="sett-fact-grid">
              <div className="sett-fact">
                <span className="sett-fact-label">Currency</span>
                <span className="sett-fact-val">{settings.currency}</span>
              </div>
              <div className="sett-fact">
                <span className="sett-fact-label">Tax</span>
                <span className="sett-row-badge" style={{ background: settings.tax_enabled ? "#f0fdf4" : "#f5f4f0", color: settings.tax_enabled ? "#16a34a" : "#9a9a8e", border: `1px solid ${settings.tax_enabled ? "#bbf7d0" : "#e2e0d8"}` }}>
                  {settings.tax_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="sett-fact">
                <span className="sett-fact-label">Tax Name</span>
                <span className="sett-fact-val">{settings.tax_name}</span>
              </div>
              <div className="sett-fact">
                <span className="sett-fact-label">Tax Rate</span>
                <span className="sett-fact-val">{settings.tax_rate}%</span>
              </div>
              <div className="sett-fact sett-fact-full">
                <span className="sett-fact-label">Tax Inclusive</span>
                <span className="sett-row-badge" style={{ background: settings.tax_inclusive ? "#eff6ff" : "#f5f4f0", color: settings.tax_inclusive ? "#2563eb" : "#9a9a8e", border: `1px solid ${settings.tax_inclusive ? "#bfdbfe" : "#e2e0d8"}` }}>
                  {settings.tax_inclusive ? "Yes — prices include tax" : "No — tax added on top"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Shift Status ── */}
        <div className="sett-card sett-b-4">
          <div className="sett-card-hd">
            <div className="sett-card-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}><IcoClock /></div>
            <div>
              <div className="sett-card-title">Shift Status</div>
              <div className="sett-card-sub">Current session</div>
            </div>
          </div>
          <div className="sett-card-body">
            <div className="sett-fact-grid">
              <div className="sett-fact sett-fact-full">
                <span className="sett-fact-label">Shift Status</span>
                <span className="sett-row-badge" style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                  <span className="sett-active-dot" /> Active
                </span>
              </div>
              <div className="sett-fact">
                <span className="sett-fact-label">Current Time</span>
                <span className="sett-fact-val" style={{ fontVariantNumeric: "tabular-nums" }}>{shiftTime}</span>
              </div>
              <div className="sett-fact">
                <span className="sett-fact-label">Logged in as</span>
                <span className="sett-fact-val">{staff.full_name}</span>
              </div>
              <div className="sett-fact sett-fact-full">
                <span className="sett-fact-label">Staff ID</span>
                <span className="sett-fact-val" style={{ fontFamily: "monospace" }}>{staff.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Change Password ── */}
        <div className="sett-card sett-b-8">
          <div className="sett-card-hd">
            <div className="sett-card-icon" style={{ background: "#fdf4ff", color: "#9333ea" }}><IcoKey /></div>
            <div>
              <div className="sett-card-title">Change Password</div>
              <div className="sett-card-sub">Update your login password</div>
            </div>
          </div>
          <div className="sett-card-body">
            <div className="sett-form">
              <div>
                <label className="sett-label">Current Password</label>
                <input className="sett-input" type="password" placeholder="Enter current password"
                  value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} />
              </div>
              <div>
                <label className="sett-label">New Password</label>
                <input className="sett-input" type="password" placeholder="Min. 6 characters"
                  value={newPwd} onChange={e => setNewPwd(e.target.value)} />
              </div>
              <div>
                <label className="sett-label">Confirm New Password</label>
                <input className="sett-input" type="password" placeholder="Repeat new password"
                  value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
              </div>

              {pwdError && (
                <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 12 }}>
                  {pwdError}
                </div>
              )}

              {pwdSuccess && (
                <div className="sett-success">
                  <IcoCheck /> Password updated successfully.
                </div>
              )}

              <button className="sett-save-btn" onClick={handleChangePassword} disabled={pwdSaving}>
                {pwdSaving ? "Updating…" : <><IcoKey /> Update Password</>}
              </button>
            </div>
          </div>
        </div>

        {/* ── Security / Sign Out ── */}
        <div className="sett-card sett-b-4">
          <div className="sett-card-hd">
            <div className="sett-card-icon" style={{ background: "#fef2f2", color: "#dc2626" }}><IcoShield /></div>
            <div>
              <div className="sett-card-title">Security</div>
              <div className="sett-card-sub">End your session</div>
            </div>
          </div>
          <div className="sett-card-body">
            <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: "1rem", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.75rem 0.9rem", flex: 1 }}>
              Signing out ends your current shift session. Make sure all sales are completed and the cart is cleared first.
            </div>
            <button className="sett-danger-btn" onClick={() => setShowLogout(true)}>
              <IcoLogout /> Sign out of my account
            </button>
          </div>
        </div>

      </div>
    </>  
  );
}
