import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import Overview from "./admin/Overview";
import Products from "./admin/Products";
import Staff from "./admin/Staff";
import Orders from "./admin/Orders";
import Reports from "./admin/Reports";
import Settings from "./admin/Settings";
import Discounts from "./admin/Discounts";
import Returns from "./admin/Returns";
import { SettingsIcon } from "../components/Icons";
import UpdateBanner from "../components/UpdateBanner";

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const ADS = [
  {
    badge: "POStore Web",
    icon: "☁️",
    tagline: "Your store, always online",
    title: "Sync to Cloud",
    desc: "Sign in once and all your offline data syncs online. Access your dashboard from any device, any browser.",
    checks: ["Offline-first app", "Sync when connected", "Access any device"],
    cta: "Sign In to Sync →",
  },
  {
    badge: "No Setup",
    icon: "⚡",
    tagline: "Zero installs, zero updates",
    title: "Works Everywhere",
    desc: "The web app runs on phones, tablets, and laptops. No downloads, no version mismatches — just open and go.",
    checks: ["Mobile-friendly interface", "Auto-updates silently", "Share with your team instantly"],
    cta: "Open Web App →",
  },
  {
    badge: "Real-time",
    icon: "👥",
    tagline: "Your whole team, one view",
    title: "Collaborate Live",
    desc: "Multiple staff members can log in simultaneously. Orders, products, and reports stay in sync for everyone.",
    checks: ["Live order updates", "Multi-location support", "Per-staff activity logs"],
    cta: "Invite Your Team →",
  },
];

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
        {/* Close */}
        <button onClick={() => setVisible(false)} style={{
          position: "absolute", top: 10, right: 14, background: "none",
          border: "none", color: "#555", fontSize: 18, cursor: "pointer", zIndex: 10,
        }}>✕</button>

        <div style={{ display: "flex", minHeight: 260 }}>

          {/* LEFT panel */}
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

          {/* RIGHT panel */}
          <div style={{ flex: 1, padding: "1.75rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>{ad.title}</p>
              <p style={{ fontSize: 13, color: "#888", lineHeight: 1.7, margin: "0 0 16px" }}>{ad.desc}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ad.checks.map((c) => (
                  <div key={c} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#ccc" }}>
                    <span style={{ color: "#0f9d7e", fontWeight: 700, fontSize: 15 }}>✓</span> {c}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1.5rem" }}>
              {/* Dots */}
              <div style={{ display: "flex", gap: 6 }}>
                {ADS.map((_, i) => (
                  <div key={i} onClick={() => goTo(i)} style={{
                    width: i === current ? 20 : 8, height: 8, borderRadius: 4,
                    background: i === current ? "#0f9d7e" : "#333",
                    cursor: "pointer", transition: "all 0.3s ease",
                  }} />
                ))}
              </div>
              {/* CTA */}
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

  const navItems = [
    { to: "/admin/overview", label: "Overview", icon: "◈" },
    { to: "/admin/orders", label: "Orders", icon: "◫" },
    { to: "/admin/products", label: "Products", icon: "◧" },
    { to: "/admin/staff", label: "Staff", icon: "◉" },
    { to: "/admin/reports", label: "Reports", icon: "◎" },
    { to: "/admin/discounts", label: "Discounts", icon: "◉" },
    { to: "/admin/returns", label: "Returns", icon: "◎" },
    { to: "/admin/settings", label: "Settings", icon: null, svgIcon: SettingsIcon },
  ];

  return (
    <div className="app-layout">
      <UpdateBanner />
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">⬡</span>
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
              {syncStatus === "syncing" ? "⟳ Syncing..." :
               syncStatus === "success" ? "✓ Synced" :
               syncStatus === "error" ? "✗ Failed" : "⟳ Sync"}
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

          {/* Sky arc toggle */}
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
          <Route path="overview" element={<Overview />} />
          <Route path="orders" element={<Orders />} />
          <Route path="products" element={<Products />} />
          <Route path="staff" element={<Staff />} />
          <Route path="reports" element={<Reports />} />
          <Route path="discounts" element={<Discounts />} />
          <Route path="returns" element={<Returns />} />
          <Route path="settings" element={<Settings user={user} onLogout={onLogout} />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Routes>
      </main>

      {/* Logout Confirmation Modal */}
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
