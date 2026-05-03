"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

interface AdminInfo {
  id:         string;
  full_name:  string;
  store_name: string | null;
  domain:     string | null;
}

function getStoredStaff(): StoredStaff | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("user") ?? "null"); }
  catch { return null; }
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

/* ─── Icons ─────────────────────────────────────────────────── */
// eslint-disable-next-line react/display-name
const Ic = (d: string) => () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const GridIcon = Ic("M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z");
const SaleIcon = Ic("M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0");
const BoxIcon  = Ic("M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12");
const HistIcon = Ic("M12 8v4l3 3M3.05 11a9 9 0 1 0 .5-3M3 4v4h4");
const SettIcon  = Ic("M12 20a8 8 0 100-16 8 8 0 000 16zM12 14a2 2 0 100-4 2 2 0 000 4zM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41");
function IcoOut() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }

const NAV = [
  { icon: GridIcon, label: "Dashboard"    },
  { icon: SaleIcon, label: "Record Sale"  },
  { icon: BoxIcon,  label: "Products"     },
  { icon: HistIcon, label: "Sales History"},
  { icon: SettIcon,  label: "Settings"     },
];

/* ─── Props ─────────────────────────────────────────────────── */
interface SidebarProps {
  activeTab:    string;
  setActiveTab: (tab: string) => void;
  cartCount?:   number;
}

/* ─── CSS ────────────────────────────────────────────────────── */
const sidebarCss = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&display=swap');

  .sidebar {
    grid-row: 1 / 3;
    background: #141410;
    color: #fff;
    display: flex; flex-direction: column;
    position: sticky; top: 0;
    height: 100vh; overflow-y: auto;
    width: 220px; flex-shrink: 0;
  }

  /* ── TOP: Store / Admin brand ── */
  .sb-brand {
    display: flex; align-items: center; gap: 10px;
    padding: 0 1.25rem; height: 60px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
  }
  .sb-brand-mark {
    width: 30px; height: 30px; border-radius: 7px;
    background: #2563eb;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0;
    font-family: 'DM Sans', sans-serif;
  }
  .sb-brand-name {
    font-size: 14px; font-weight: 500; color: #fff;
    font-family: 'DM Sans', sans-serif;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sb-brand-domain {
    font-size: 10px; color: rgba(255,255,255,0.3);
    font-family: 'DM Sans', sans-serif;
    margin-top: 1px;
  }
  .sb-skel {
    height: 11px; border-radius: 4px;
    background: rgba(255,255,255,0.1);
    animation: sbPulse 1.4s ease-in-out infinite;
  }
  @keyframes sbPulse { 0%,100%{opacity:1} 50%{opacity:.3} }

  /* ── Nav ── */
  .sb-section {
    padding: 1.2rem 1rem 0.4rem;
    font-size: 10px; font-weight: 500;
    letter-spacing: 1.5px; text-transform: uppercase;
    color: rgba(255,255,255,0.28);
    font-family: 'DM Sans', sans-serif;
  }
  .sb-nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 0.6rem 1rem; margin: 1px 0.5rem;
    border-radius: 7px; font-size: 13px;
    color: rgba(255,255,255,0.55); cursor: pointer;
    text-decoration: none; transition: background 0.15s, color 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .sb-nav-item:hover  { background: rgba(255,255,255,0.07); color: #fff; }
  .sb-nav-item.active { background: rgba(37,99,235,0.25); color: #93c5fd; font-weight: 500; }
  .sb-nav-item svg    { flex-shrink: 0; opacity: 0.75; }
  .sb-nav-item.active svg { opacity: 1; }
  .sb-cart-badge {
    margin-left: auto; background: #2563eb; color: #fff;
    font-size: 10px; font-weight: 600;
    padding: 1px 7px; border-radius: 100px;
    font-family: 'DM Sans', sans-serif;
  }

  /* ── BOTTOM: Cashier info ── */
  .sb-footer {
    margin-top: auto; padding: 1rem;
    border-top: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
  }
  .sb-cashier {
    display: flex; align-items: center; gap: 10px;
    padding: 0.6rem 0.75rem;
    background: rgba(255,255,255,0.06);
    border-radius: 9px; margin-bottom: 8px;
  }
  .sb-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: #2563eb;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0;
    font-family: 'DM Sans', sans-serif;
  }
  .sb-name { font-size: 13px; font-weight: 500; color: #fff; font-family: 'DM Sans', sans-serif; }
  .sb-role { font-size: 11px; color: rgba(255,255,255,0.35); font-family: 'DM Sans', sans-serif; display: flex; align-items: center; gap: 4px; margin-top: 1px; }
  .sb-active-dot { width: 5px; height: 5px; border-radius: 50%; background: #16a34a; display: inline-block; }
  .sb-logout {
    width: 100%; padding: 7px; background: none;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 7px; font-family: 'DM Sans', sans-serif;
    font-size: 12px; color: rgba(255,255,255,0.38);
    cursor: pointer; display: flex; align-items: center;
    justify-content: center; gap: 6px;
    transition: border-color 0.15s, color 0.15s;
  }
  .sb-logout:hover { border-color: #ef4444; color: #ef4444; }

  @media (max-width: 700px) { .sidebar { display: none; } }
`;

/* ─────────────────────────────────────────
   SIDEBAR COMPONENT
───────────────────────────────────────── */
export default function Sidebar({ activeTab, setActiveTab, cartCount = 0 }: SidebarProps) {
  const staff  = getStoredStaff();

  const [admin,        setAdmin]        = useState<AdminInfo | null>(null);
  const [adminLoading, setAdminLoading]   = useState(true);
  const [showConfirm,  setShowConfirm]    = useState(false);

  /* ── Fetch admin/store info ── */
  useEffect(() => {
    if (!staff?.id) return;
    fetch(`/api/staff/admin?staff_id=${staff.id}`)
      .then(r => r.json())
      .then((data: AdminInfo) => { if (data?.id) setAdmin(data); })
      .catch(() => {})
      .finally(() => setAdminLoading(false));
  }, [staff?.id]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("read_notifs");
    window.location.href = "https://pos.upendoapps.com?logout=true";
  };

  if (!staff) return null;

  const initials   = getInitials(staff.full_name);
  const storeName  = admin?.store_name ?? admin?.full_name ?? "POStore";
  const storeMark  = storeName[0].toUpperCase();
  const shiftRole  = staff.shift_role
    ? staff.shift_role.charAt(0).toUpperCase() + staff.shift_role.slice(1)
    : "Cashier";

  return (
    <>
      <style>{sidebarCss}</style>
      <aside className="sidebar">

        {/* ── TOP: Admin / Store brand ── */}
        <div className="sb-brand">
          {adminLoading ? (
            <>
              <div className="sb-brand-mark" style={{ background: "rgba(255,255,255,0.1)", color: "transparent" }}>__</div>
              <div style={{ flex: 1 }}>
                <div className="sb-skel" style={{ width: "70%" }} />
                <div className="sb-skel" style={{ width: "45%", marginTop: 5 }} />
              </div>
            </>
          ) : (
            <>
              <div className="sb-brand-mark">{storeMark}</div>
              <div style={{ overflow: "hidden" }}>
                <div className="sb-brand-name">{storeName}</div>
                {admin?.domain && <div className="sb-brand-domain">{admin.domain}</div>}
              </div>
            </>
          )}
        </div>

        {/* ── Nav ── */}
        <div className="sb-section">Staff Menu</div>
        {NAV.map(({ icon: Icon, label }) => (
          <a key={label}
            className={`sb-nav-item ${activeTab === label ? "active" : ""}`}
            onClick={e => { e.preventDefault(); setActiveTab(label); }}
            href="#">
            <Icon />
            {label}
            {label === "Record Sale" && cartCount > 0 && (
              <span className="sb-cart-badge">{cartCount}</span>
            )}
          </a>
        ))}

        {/* ── BOTTOM: Cashier info + logout ── */}
        <div className="sb-footer">
          <div className="sb-cashier">
            <div className="sb-avatar">{initials}</div>
            <div>
              <div className="sb-name">{staff.full_name}</div>
              <div className="sb-role">
                <span className="sb-active-dot" />
                {shiftRole} · {staff.status === "active" ? "On Shift" : "Inactive"}
              </div>
            </div>
          </div>
          <button className="sb-logout" onClick={() => setShowConfirm(true)}>
            <IcoOut /> Sign out
          </button>
        </div>

        {/* ── Logout confirm modal ── */}
        {showConfirm && (
          <>
            <div
              onClick={() => setShowConfirm(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, backdropFilter: "blur(2px)" }}
            />
            <div style={{
              position: "fixed", top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
              background: "#1c1c18", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14, padding: "1.75rem", width: "100%", maxWidth: 360,
              zIndex: 1001, boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {/* Icon */}
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                <IcoOut />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 6 }}>
                Sign out?
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                You&apos;ll be signed out of your shift. Any unsaved cart items will be lost.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{ flex: 1, padding: "9px 0", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                >
                  Stay on shift
                </button>
                <button
                  onClick={handleLogout}
                  style={{ flex: 1, padding: "9px 0", background: "#ef4444", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#dc2626")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#ef4444")}
                >
                  Yes, sign out
                </button>
              </div>
            </div>
          </>
        )}

      </aside>
    </>
  );
}