import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import Overview from "./admin/Overview";
import Products from "./admin/Products";
import Suppliers from "./admin/Suppliers";
import Staff from "./admin/Staff";
import Orders from "./admin/Orders";
import Reports from "./admin/Reports";
import Settings from "./admin/Settings";
import Discounts from "./admin/Discounts";
import { SettingsIcon } from "../components/Icons";
import UpdateBanner from "../components/UpdateBanner";
import Subscription from "./admin/Subscription";

/* ───────────────── ICONS ───────────────── */

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SubscriptionIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <path d="M1 10h22" />
  </svg>
);

/* ───── NEW SVG ICONS REPLACING EMOJIS ───── */

const CloudIcon = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0f9d7e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
    <path d="M8 17h12" />
  </svg>
);

const BoltIcon = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f5b942" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const TeamIcon = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#4f8cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CheckIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0f9d7e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CloseIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SyncIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0114.13-3.36L23 10" />
    <path d="M20.49 15a9 9 0 01-14.13 3.36L1 14" />
  </svg>
);

const SuccessIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0f9d7e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ErrorIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ff5c5c" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const HexagonIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="7 2 17 2 22 12 17 22 7 22 2 12" />
  </svg>
);

/* ───────────────── ADS ───────────────── */

const ADS = [
  {
    badge: "POStore Web",
    icon: <CloudIcon />,
    tagline: "Your store, always online",
    title: "Sync to Cloud",
    desc: "Sign in once and all your offline data syncs online. Access your dashboard from any device, any browser.",
    checks: ["Offline-first app", "Sync when connected", "Access any device"],
    cta: "Sign In to Sync →",
  },
  {
    badge: "No Setup",
    icon: <BoltIcon />,
    tagline: "Zero installs, zero updates",
    title: "Works Everywhere",
    desc: "The web app runs on phones, tablets, and laptops. No downloads, no version mismatches — just open and go.",
    checks: ["Mobile-friendly interface", "Auto-updates silently", "Share with your team instantly"],
    cta: "Open Web App →",
  },
  {
    badge: "Real-time",
    icon: <TeamIcon />,
    tagline: "Your whole team, one view",
    title: "Collaborate Live",
    desc: "Multiple staff members can log in simultaneously. Orders, products, and reports stay in sync for everyone.",
    checks: ["Live order updates", "Multi-location support", "Per-staff activity logs"],
    cta: "Invite Your Team →",
  },
];

/* ───────────────── NAV ICONS ───────────────── */

const OverviewIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 13h8V3H3zM13 21h8v-6h-8zM13 3v8h8V3zM3 21h8v-6H3z"/>
  </svg>
);

const OrdersIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="16" rx="2"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const ProductsIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
  </svg>
);

const StaffIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
  </svg>
);

const ReportsIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const DiscountsIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="7.5" cy="7.5" r="1.5"/>
    <circle cx="16.5" cy="16.5" r="1.5"/>
    <line x1="18" y1="6" x2="6" y2="18"/>
  </svg>
);

function AdCarousel() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % ADS.length);
        setFading(false);
      }, 350);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const goTo = (idx) => {
    setFading(true);
    setTimeout(() => { setCurrent(idx); setFading(false); }, 350);
  };

  if (!visible) return null;
  const ad = ADS[current];

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.65)", zIndex: 50,
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        width: 580, borderRadius: 14, overflow: "hidden",
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        background: "#111", border: "1px solid #2a2a2a",
        position: "relative",
        opacity: fading ? 0 : 1, transition: "opacity 0.35s ease",
      }}>
        <button onClick={() => setVisible(false)} style={{
          position: "absolute", top: 10, right: 14, background: "none",
          border: "none", color: "#555", fontSize: 18, cursor: "pointer", zIndex: 10,
        }}> <CloseIcon /></button>

        <div style={{ display: "flex", minHeight: 260 }}>
          <div style={{
            width: 200, flexShrink: 0, background: "#1a1a1a",
            borderRight: "1px solid #2a2a2a",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "2rem 1.25rem", gap: 12,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "3px 10px",
              borderRadius: 6, background: "rgba(15,157,126,0.15)",
              color: "#0f9d7e", letterSpacing: "0.05em",
            }}>{ad.badge}</span>
            <div style={{ fontSize: 40 }}>{ad.icon}</div>
            <p style={{ fontSize: 12, color: "#666", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
              {ad.tagline}
            </p>
          </div>

          <div style={{ flex: 1, padding: "1.75rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>{ad.title}</p>
              <p style={{ fontSize: 13, color: "#888", lineHeight: 1.7, margin: "0 0 16px" }}>{ad.desc}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ad.checks.map((c) => (
                  <div key={c} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#ccc" }}>
                    <span style={{ color: "#0f9d7e", fontWeight: 700, fontSize: 15 }}><CheckIcon /></span> {c}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1.5rem" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {ADS.map((_, i) => (
                  <div key={i} onClick={() => goTo(i)} style={{
                    width: i === current ? 20 : 8, height: 8, borderRadius: 4,
                    background: i === current ? "#0f9d7e" : "#333",
                    cursor: "pointer", transition: "all 0.3s ease",
                  }} />
                ))}
              </div>
              <button style={{
                background: "#0f9d7e", color: "#fff", border: "none",
                borderRadius: 8, padding: "10px 20px", fontSize: 13,
                fontWeight: 600, cursor: "pointer",
              }}>{ad.cta}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard({ user, onLogout }) {
  const [syncStatus, setSyncStatus] = useState("idle");
  const [lastSync, setLastSync] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("postore-theme") || "dark"
  );
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("postore-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setTheme(t => t === "dark" ? "light" : "dark");
      setTimeout(() => setAnimating(false), 800);
    }, 100);
  };

  const handleSync = async () => {
    setSyncStatus("syncing");
    try {
      const result = await window.electronAPI.startSync();
      if (result.success) {
        setLastSync(new Date().toLocaleTimeString());
        setSyncStatus("success");
      } else {
        setSyncStatus("error");
      }
    } catch {
      setSyncStatus("error");
    }
    setTimeout(() => setSyncStatus("idle"), 3000);
  };

  useEffect(() => {
    handleSync();
  }, []);

  // ── Nav items — Subscription added before Settings ──
  const navItems = [
  { to: "/admin/overview", label: "Overview", svgIcon: OverviewIcon },
  { to: "/admin/orders", label: "Orders", svgIcon: OrdersIcon },
  { to: "/admin/products", label: "Products", svgIcon: ProductsIcon },
  { to: "/admin/suppliers", label: "Suppliers", svgIcon: ProductsIcon },
  { to: "/admin/staff", label: "Staff", svgIcon: StaffIcon },
  { to: "/admin/reports", label: "Reports", svgIcon: ReportsIcon },
  { to: "/admin/discounts", label: "Discounts", svgIcon: DiscountsIcon },
  { to: "/admin/subscription", label: "Subscription", svgIcon: SubscriptionIcon },
  { to: "/admin/settings", label: "Settings", svgIcon: SettingsIcon },
];

  return (
    <div className="app-layout">
      <UpdateBanner />
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo"><HexagonIcon /></span>
          <div>
            <div className="sidebar-brand">POStore</div>
            <div className="sidebar-role">Admin</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-item-active" : ""}`
              }
            >
              <span className="nav-icon">
                {item.svgIcon ? <item.svgIcon size={16} /> : item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sync-status">
            <button
              className={`sync-btn sync-${syncStatus}`}
              onClick={handleSync}
              disabled={syncStatus === "syncing"}
            >
              {syncStatus === "syncing" && <><SyncIcon /> Syncing...</>}
              {syncStatus === "success" && <><SuccessIcon /> Synced</>}
              {syncStatus === "error" && <><ErrorIcon /> Failed</>}
              {syncStatus === "idle" && <><SyncIcon /> Sync</>}
            </button>
            {lastSync && <span className="sync-time">{lastSync}</span>}
          </div>
          <div className="user-info">
            <div className="user-avatar">{user.name[0].toUpperCase()}</div>
            <div className="user-details">
              <div className="user-name">{user.name}</div>
              <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)}>Sign out</button>
            </div>
          </div>

          <button
            className={`sky-toggle ${theme === "light" ? "sky-toggle--light" : "sky-toggle--dark"} ${animating ? "sky-toggle--animating" : ""}`}
            onClick={toggleTheme}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            style={{ marginTop: "12px", width: "100%" }}
          >
            <span className="sky-toggle__arc">
              <span className="sky-toggle__celestial">
                {theme === "light" ? <SunIcon /> : <MoonIcon />}
              </span>
            </span>
            <span className="sky-toggle__label">
              {theme === "light" ? "Light" : "Dark"}
            </span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <AdCarousel />
        <Routes>
          <Route path="overview"      element={<Overview />} />
          <Route path="orders"        element={<Orders />} />
          <Route path="products"      element={<Products />} />
          <Route path="suppliers"     element={<Suppliers />} />
          <Route path="staff"         element={<Staff />} />
          <Route path="reports"       element={<Reports />} />
          <Route path="subscription"  element={<Subscription user={user}/>} />
          <Route path="discounts"     element={<Discounts />} />
          <Route path="settings"      element={<Settings user={user} onLogout={onLogout} />} />
          <Route path="*"             element={<Navigate to="overview" replace />} />
        </Routes>
      </main>

      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Sign Out</h2>
            <p style={{ textAlign: "center", marginBottom: "20px", color: "#666" }}>
              Are you sure you want to sign out?
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}