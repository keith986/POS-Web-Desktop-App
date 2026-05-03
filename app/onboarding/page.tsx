"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/* ── POS Type Definitions ── */
const POS_TYPES = [
  {
    id:       "retail",
    label:    "Retail Store",
    icon:     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
    desc:     "Products, inventory, orders & customers. Perfect for shops, boutiques and general stores.",
    features: ["Product catalogue", "Stock management", "Customer loyalty", "Sales analytics"],
    accent:   "#2563eb",
    bg:       "#eff6ff",
    border:   "#bfdbfe",
  },
  {
    id:       "restaurant",
    label:    "Restaurant / Food",
    icon:     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zM21 22v-7"/></svg>,
    desc:     "Menu management, table orders and kitchen flow. Built for cafes, restaurants and food stalls.",
    features: ["Menu & categories", "Table management", "Kitchen orders", "Daily specials"],
    accent:   "#d97706",
    bg:       "#fffbeb",
    border:   "#fde68a",
  },
  {
    id:       "salon",
    label:    "Salon / Service",
    icon:     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/></svg>,
    desc:     "Appointments, services and staff scheduling. Ideal for salons, spas and service businesses.",
    features: ["Appointments", "Service catalogue", "Staff rotas", "Client history"],
    accent:   "#7c3aed",
    bg:       "#f5f3ff",
    border:   "#ddd6fe",
  },
  {
    id:       "wholesale",
    label:    "Wholesale",
    icon:     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    desc:     "Bulk orders, supplier management and tiered pricing for distributors and wholesalers.",
    features: ["Bulk ordering", "Supplier records", "Price tiers", "Purchase orders"],
    accent:   "#16a34a",
    bg:       "#f0fdf4",
    border:   "#bbf7d0",
  },
  {
    id:       "pharmacy",
    label:    "Pharmacy / Medicine",
    icon:     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 4.5a6 6 0 000 12h3a6 6 0 000-12h-3z"/><line x1="7.5" y1="10.5" x2="16.5" y2="10.5"/><line x1="12" y1="6" x2="12" y2="15"/></svg>,
    desc:     "Drug inventory, prescriptions, expiry tracking and patient records for pharmacies and clinics.",
    features: ["Drug catalogue", "Prescriptions", "Expiry tracking", "Patient records"],
    accent:   "#0891b2",
    bg:       "#ecfeff",
    border:   "#a5f3fc",
  },
] as const;

type PosTypeId = typeof POS_TYPES[number]["id"];

interface StoredUser {
  id:        string;
  full_name: string;
  email:     string;
  role:      string;
  store_name: string | null;
  pos_type?: PosTypeId;
}

function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function OnboardingPage() {
  const router = useRouter();
  const [selected,  setSelected]  = useState<PosTypeId | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [user,      setUser]      = useState<StoredUser | null>(null);

  /* Guard — must be logged in and not already onboarded */
  useEffect(() => {
    const u = getStoredUser();
    if (!u) { router.push("/"); return; }
    if (u.pos_type) { router.push("/admin/dashboard"); return; }
    setUser(u);
  }, [router]);

  const handleContinue = async () => {
    if (!selected || !user) return;
    setSaving(true);
    setError(null);
    try {
      const res  = await fetch("/api/onboarding", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ admin_id: user.id, pos_type: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      /* Persist pos_type into localStorage */
      localStorage.setItem("user", JSON.stringify({ ...user, pos_type: selected }));
      router.push("/admin/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f4f0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem 1rem",
      fontFamily: "'DM Sans', sans-serif",
    }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem", maxWidth: 520 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "#141410", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: "1.25rem" }}>
          {user.store_name?.charAt(0).toUpperCase() ?? "P"}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#141410", margin: "0 0 0.5rem", letterSpacing: "-0.5px" }}>
          Welcome, {user.full_name.split(" ")[0]}!
        </h1>
        <p style={{ fontSize: 15, color: "#9a9a8e", margin: 0, lineHeight: 1.6 }}>
          What kind of business are you running?<br />
          Your dashboard will be customised for your needs.
        </p>
      </div>

      {/* POS type grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1rem",
        width: "100%",
        maxWidth: 680,
        marginBottom: "1.5rem",
      }}>
        {POS_TYPES.map(type => {
          const isSelected = selected === type.id;
          return (
            <button
              key={type.id}
              onClick={() => setSelected(type.id)}
              style={{
                background: isSelected ? type.bg : "#fff",
                border: `2px solid ${isSelected ? type.accent : "#e2e0d8"}`,
                borderRadius: 14,
                padding: "1.5rem",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
                position: "relative",
                boxShadow: isSelected ? `0 0 0 3px ${type.accent}22` : "none",
              }}
              onMouseEnter={e => {
                if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = type.accent;
              }}
              onMouseLeave={e => {
                if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e0d8";
              }}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <div style={{
                  position: "absolute", top: 14, right: 14,
                  width: 22, height: 22, borderRadius: "50%",
                  background: type.accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}

              {/* Icon */}
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: type.bg,
                border: `1px solid ${type.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: type.accent,
                marginBottom: "0.75rem",
                }}>
                {type.icon}
              </div>

              {/* Title */}
              <div style={{ fontSize: 15, fontWeight: 600, color: "#141410", marginBottom: 6 }}>
                {type.label}
              </div>

              {/* Description */}
              <div style={{ fontSize: 12, color: "#9a9a8e", lineHeight: 1.5, marginBottom: "0.85rem" }}>
                {type.desc}
              </div>

              {/* Feature pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {type.features.map(f => (
                  <span key={f} style={{
                    fontSize: 10, fontWeight: 500,
                    background: isSelected ? `${type.accent}18` : "#f5f4f0",
                    color: isSelected ? type.accent : "#4a4a40",
                    padding: "2px 8px", borderRadius: 100,
                    border: `1px solid ${isSelected ? `${type.accent}30` : "#e2e0d8"}`,
                    transition: "all 0.15s",
                  }}>
                    {f}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div style={{ fontSize: 13, color: "#dc2626", marginBottom: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.75rem 1rem" }}>
          {error}
        </div>
      )}

      {/* Continue button */}
      <button
        onClick={handleContinue}
        disabled={!selected || saving}
        style={{
          padding: "12px 40px",
          background: selected && !saving ? "#141410" : "#c8c6bc",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          cursor: selected && !saving ? "pointer" : "not-allowed",
          fontFamily: "inherit",
          transition: "background 0.15s",
          minWidth: 200,
        }}
      >
        {saving ? "Setting up your store…" : selected ? `Continue with ${POS_TYPES.find(t => t.id === selected)?.label}` : "Select a POS type to continue"}
      </button>

      <p style={{ fontSize: 12, color: "#c8c6bc", marginTop: "1rem" }}>
        You can change this later in Settings
      </p>

      <style>{`
        @media (max-width: 860px) {
          div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 560px) {
          div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}