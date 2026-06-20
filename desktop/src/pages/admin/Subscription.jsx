import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return "—"; }
}

function daysColor(days) {
  if (days === null || days <= 0) return "#ef4444";
  if (days > 14) return "#22c55e";
  if (days > 7)  return "#f97316";
  return "#ef4444";
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

// ─────────────────────────────────────────
// PLAN MONTHS (for progress bar)
// ─────────────────────────────────────────
const PLAN_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };

// ─────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────
function StatusBadge({ status, daysLeft, plan }) {
  const isLifetime = String(plan).toLowerCase() === "lifetime";
  const cfg = {
    active:  { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.25)",  color: "#22c55e", label: isLifetime ? "Lifetime" : daysLeft != null ? `Active · ${daysLeft}d left` : "Active" },
    expired: { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.25)",  color: "#ef4444", label: "Expired"         },
    due:     { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.25)", color: "#f97316", label: "Payment Due"     },
    none:    { bg: "var(--surface-muted)", border: "var(--surface-border)", color: "var(--text-2)", label: "No Subscription" },
  }[status] ?? { bg: "var(--surface-muted)", border: "var(--surface-border)", color: "var(--text-2)", label: "Unknown" };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 100, padding: "4px 12px",
      fontSize: 11, fontWeight: 600, color: cfg.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────
// PAYMENT ROW
// ─────────────────────────────────────────
function PaymentRow({ p }) {
  const s = {
    success: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  label: "Paid"    },
    failed:  { color: "#ef4444", bg: "rgba(239,68,68,0.1)",  label: "Failed"  },
    pending: { color: "#f97316", bg: "rgba(249,115,22,0.1)", label: "Pending" },
  }[p.status] ?? { color: "var(--text-2)", bg: "var(--surface-muted)", label: p.status };

  return (
    <tr style={{ borderBottom: "1px solid var(--surface-border)" }}>
      <td style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{formatDate(p.date)}</div>
        <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2, textTransform: "capitalize" }}>{p.period}</div>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <span style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "monospace" }}>
          {p.mpesaReceipt ?? (p.checkoutRequestId ? `···${p.checkoutRequestId.slice(-6)}` : "—")}
        </span>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Ksh {Number(p.amount).toLocaleString()}</span>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, padding: "3px 10px", borderRadius: 100 }}>
          {s.label}
        </span>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--surface-border)",
      borderRadius: 12, padding: "1.1rem 1.25rem",
    }}>
      <div style={{ fontSize: 11, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ marginBottom: 4, color: accent ?? "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-3)" }}>{sub}</div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
export default function Subscription({ user }) {
  const [sub,          setSub]          = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [tab,          setTab]          = useState("overview"); // "overview" | "history"
  //const [isOnline,     setIsOnline]     = useState(navigator.onLine);
  const [isOnline, setIsOnline] = useState(() => {
  return typeof navigator !== "undefined"
    ? navigator.onLine
    : true;
  });
  const [lastSync,     setLastSync]     = useState(() => localStorage.getItem("sub_last_sync") ?? null);

useEffect(() => {
  if (!user?.id) {
    setLoading(false);
    setError("No logged in user found.");
  }
}, [user]);


  // Track online status
  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online",  up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // ── Load from cache first, then sync if online ──
  const loadCached = useCallback(() => {
    try {
      const cached = localStorage.getItem("sub_data");
      if (cached) {
        setSub(JSON.parse(cached)); 
        setLoading(false);
        return true;
      }
    } catch { /* corrupt cache */ }
    return false;
  }, []);

  /*
  const fetchFromServer = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Replace with your actual API base URL
      const API_BASE = import.meta.env?.VITE_API_URL ?? "https://detox.upendoapps.com";
      const res  = await fetch(`${API_BASE}/api/subscription/status?admin_id=${user.id}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      // Cache locally for offline use
      localStorage.setItem("sub_data", JSON.stringify(data));
      const now = new Date().toISOString();
      localStorage.setItem("sub_last_sync", now);
      setLastSync(now);
      setSub(data);
    } catch (e) {
      // Only show error if we have no cached data at all
      if (!sub) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, sub]);
 */

  const fetchFromServer = useCallback(async () => {
  // IMPORTANT FIX
  if (!user?.id) {
    setLoading(false);
    setError("User not found. Please log in again.");
    return;
  }

  try {
    const API_BASE =
      import.meta.env?.VITE_API_URL ??
      "https://detox.upendoapps.com";

    const res = await fetch(
      `${API_BASE}/api/subscription/status?admin_id=${user.id}`
    );

    if (!res.ok) {
      throw new Error(`Server error ${res.status}`);
    }

    const data = await res.json();

    localStorage.setItem("sub_data", JSON.stringify(data));

    const now = new Date().toISOString();

    localStorage.setItem("sub_last_sync", now);

    setLastSync(now);
    setSub(data);
  } catch (e) {
    setError(e.message || "Failed to load subscription");
  } finally {
    setLoading(false);
  }
  }, [user]);
  
  /*
  useEffect(() => {
    const hasCached = loadCached();
    if (!hasCached) setLoading(true);
    // Always try to sync if online
    if (navigator.onLine) fetchFromServer();
    else if (!hasCached) {
      setLoading(false);
      setError("You are offline. Connect to the internet to load your subscription.");
    }
  }, [loadCached, fetchFromServer]);
  */

useEffect(() => {
  // Wait until user is loaded
  if (!user) return;

  const hasCached = loadCached();

  if (!hasCached) {
    setLoading(true);
  }

  if (navigator.onLine) {
    fetchFromServer();
  } else if (!hasCached) {
    setLoading(false);
    setError(
      "You are offline. Connect to the internet to load your subscription."
    );
  }
}, [user, loadCached, fetchFromServer]);

  // Manual sync
  const handleSync = () => {
    if (!isOnline) return;
    setError(null);
    fetchFromServer();
  };

  const planMonths = PLAN_MONTHS[sub?.plan ?? ""] ?? 1;
  const dater      = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // ── Styles matching the desktop dark theme ──
  const card = {
    background: "var(--surface)",
    border: "1px solid var(--surface-border)",
    borderRadius: 12,
    padding: "1.25rem 1.5rem",
  };

  const thStyle = {
    textAlign: "left", padding: "10px 16px",
    fontSize: 11, fontWeight: 600, color: "var(--text-2)",
    textTransform: "uppercase", letterSpacing: "0.5px",
    borderBottom: "1px solid var(--surface-border)",
    background: "var(--surface-alt)",
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "'DM Sans', -apple-system, sans-serif", color: "var(--text)", maxWidth: 860, margin: "0 auto" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Header — matches Reports page layout ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>Subscription</h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: "4px 0 0" }}>{dater}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Online/offline indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "var(--surface-muted)", border: "1px solid var(--surface-border)", borderRadius: 8, fontSize: 12 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: isOnline ? "var(--green)" : "var(--red)" }} />
            <span style={{ color: isOnline ? "var(--green)" : "var(--red)", fontWeight: 500 }}>{isOnline ? "Online" : "Offline"}</span>
          </div>

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={!isOnline}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 8,
              background: isOnline ? "rgba(249,115,22,0.12)" : "var(--surface-muted)",
              border: `1px solid ${isOnline ? "rgba(249,115,22,0.3)" : "var(--surface-border)"}`,
              color: isOnline ? "#f97316" : "var(--text-2)",
              fontSize: 12, fontWeight: 600, cursor: isOnline ? "pointer" : "not-allowed",
              fontFamily: "inherit", transition: "all 0.15s",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Sync
          </button>

          {/* Renew button — opens browser/payment page */}
          <button
            onClick={() => {
              // Open payment page in system browser (Electron)
              const url = "https://detox.upendoapps.com/payment";
              if (window.electronAPI?.openExternal) {
                window.electronAPI.openExternal(url);
              } else {
                window.open(url, "_blank");
              }
            }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", background: "#f97316", border: "none",
              borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#ea580c"}
            onMouseLeave={e => e.currentTarget.style.background = "#f97316"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
            </svg>
            {sub?.status === "active" ? "Renew / Upgrade" : "Subscribe Now"}
          </button>
        </div>
      </div>

      {/* Last sync note */}
      {lastSync && (
        <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: "1rem" }}>
          Last synced: {new Date(lastSync).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          {!isOnline && <span style={{ marginLeft: 8, color: "#f97316" }}>· Showing cached data</span>}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", gap: 12, color: "var(--text-2)", fontSize: 14 }}>
          <div style={{ width: 20, height: 20, border: "2px solid var(--surface-border)", borderTop: "2px solid var(--yellow)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          Loading subscription…
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div style={{ ...card, textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>
            {isOnline ? 
            <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v5a1 1 0 1 0 2 0V8Zm-1 7a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H12Z" clipRule="evenodd"/>
            </svg>
            : 
            <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13.383 4.076a6.5 6.5 0 0 0-6.887 3.95A5 5 0 0 0 7 18h3v-4a2 2 0 0 1-1.414-3.414l2-2a2 2 0 0 1 2.828 0l2 2A2 2 0 0 1 14 14v4h4a4 4 0 0 0 .988-7.876 6.5 6.5 0 0 0-5.605-6.048Z"/>
            <path d="M12.707 9.293a1 1 0 0 0-1.414 0l-2 2a1 1 0 1 0 1.414 1.414l.293-.293V19a1 1 0 1 0 2 0v-6.586l.293.293a1 1 0 0 0 1.414-1.414l-2-2Z"/>
            </svg>
            }
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--red)", marginBottom: 8 }}>{error}</div>
          {isOnline && (
            <button onClick={handleSync} style={{ marginTop: 8, padding: "8px 20px", background: "var(--accent)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Try Again
            </button>
          )}
        </div>
      )}

      {/* ── Main content ── */}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Stat strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            <StatCard
              label="Status"
              value={<StatusBadge status={sub?.status ?? "none"} daysLeft={sub?.daysLeft ?? null} plan={sub?.plan} />}
              sub={sub?.plan === "lifetime"
                ? "Lifetime access"
                : sub?.paidUntil
                  ? (sub.status === "expired" ? `Expired ${formatDate(sub.paidUntil)}` : `Until ${formatDate(sub.paidUntil)}`)
                  : "No active plan"}
            />
            <StatCard
              label="Current Plan"
              value={<span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.5px" }}>{sub?.plan ? capitalize(sub.plan) : "—"}</span>}
              sub={sub?.amount != null ? `Ksh ${Number(sub.amount).toLocaleString()} paid` : "No payments yet"}
            />
            <StatCard
              label="Days Remaining"
              value={<span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.5px", color: sub?.plan === "lifetime" ? "#22c55e" : daysColor(sub?.daysLeft ?? null) }}>
                {sub?.plan === "lifetime" ? "Lifetime" : sub?.daysLeft ?? 0}
              </span>}
              sub={sub?.plan === "lifetime" ? "Unlimited access" : sub?.status === "active" ? "Days until expiry" : "Subscription inactive"}
              accent={sub?.plan === "lifetime" ? "#22c55e" : daysColor(sub?.daysLeft ?? null)}
            />
          </div>

          {/* Tabs — matches Reports page Today/Week/Month/All style */}
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { id: "overview", label: "Overview"        },
              { id: "history",  label: `History${sub?.payments?.length ? ` (${sub.payments.length})` : ""}` },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "7px 18px",
                background: tab === t.id ? "#f97316" : "var(--surface-muted)",
                border: `1px solid ${tab === t.id ? "#f97316" : "var(--surface-border)"}`,
                borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
                color: tab === t.id ? "#fff" : "var(--text-2)",
                fontFamily: "inherit", transition: "all 0.15s",
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ══ OVERVIEW TAB ══ */}
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Detail card */}
              <div style={card}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 }}>
                  Subscription Details
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem 2rem" }}>
                  {[
                    { label: "Plan",        value: sub?.plan ? capitalize(sub.plan) : "—"                                     },
                    { label: "Status",      value: sub?.status ? capitalize(sub.status) : "—"                                 },
                    { label: "Valid Until", value: sub?.paidUntil ? formatDate(sub.paidUntil) : "—"                           },
                    { label: "Last Amount", value: sub?.amount != null ? `Ksh ${Number(sub.amount).toLocaleString()}` : "—"   },
                  ].map(row => (
                    <div key={row.label}>
                      <div style={{ fontSize: 11, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5 }}>{row.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{row.value}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                {sub?.status === "active" && sub.daysLeft != null && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--text-2)" }}>Subscription period</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: daysColor(sub.daysLeft) }}>{sub.daysLeft} days remaining</span>
                    </div>
                    <div style={{ height: 5, background: "var(--surface-muted)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        background: daysColor(sub.daysLeft),
                        width: `${Math.min(100, Math.max(2, (sub.daysLeft / (planMonths * 30)) * 100))}%`,
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Offline notice */}
              {!isOnline && (
                <div style={{ padding: "12px 16px", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#f97316" }}>
                  <span>
                    <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13.383 4.076a6.5 6.5 0 0 0-6.887 3.95A5 5 0 0 0 7 18h3v-4a2 2 0 0 1-1.414-3.414l2-2a2 2 0 0 1 2.828 0l2 2A2 2 0 0 1 14 14v4h4a4 4 0 0 0 .988-7.876 6.5 6.5 0 0 0-5.605-6.048Z"/>
                    <path d="M12.707 9.293a1 1 0 0 0-1.414 0l-2 2a1 1 0 1 0 1.414 1.414l.293-.293V19a1 1 0 1 0 2 0v-6.586l.293.293a1 1 0 0 0 1.414-1.414l-2-2Z"/>
                    </svg>
                  </span>
                  <span>You are offline. Subscription data is from your last sync. Connect to the internet to refresh.</span>
                </div>
              )}

              {/* Expired / No sub warning */}
              {sub?.plan !== "lifetime" && (sub?.status === "expired" || sub?.status === "due" || sub?.status === "none") && (
                <div style={{ padding: "14px 18px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>
                      <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v5a1 1 0 1 0 2 0V8Zm-1 7a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H12Z" clipRule="evenodd"/>
                      </svg>
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red)" }}>
                        {sub?.status === "none" ? "No active subscription" : "Your subscription has expired"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
                        Subscribe to unlock full access to POStore features.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const url = "https://detox.upendoapps.com/payment";
                      if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
                      else window.open(url, "_blank");
                    }}
                    style={{ flexShrink: 0, padding: "7px 16px", background: "#f97316", border: "none", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Subscribe →
                  </button>
                </div>
              )}

              {/* Expiring soon */}
              {sub?.plan !== "lifetime" && sub?.status === "active" && sub.daysLeft != null && sub.daysLeft <= 7 && (
                <div style={{ padding: "14px 18px", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>
                    <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.133 12.632v-1.8a5.407 5.407 0 0 0-4.154-5.262.955.955 0 0 0 .021-.106V3.1a1 1 0 0 0-2 0v2.364a.933.933 0 0 0 .021.106 5.406 5.406 0 0 0-4.154 5.262v1.8C6.867 15.018 5 15.614 5 16.807 5 17.4 5 18 5.538 18h12.924C19 18 19 17.4 19 16.807c0-1.193-1.867-1.789-1.867-4.175Zm-13.267-.8a1 1 0 0 1-1-1 9.424 9.424 0 0 1 2.517-6.391A1.001 1.001 0 1 1 6.854 5.8a7.43 7.43 0 0 0-1.988 5.037 1 1 0 0 1-1 .995Zm16.268 0a1 1 0 0 1-1-1A7.431 7.431 0 0 0 17.146 5.8a1 1 0 0 1 1.471-1.354 9.424 9.424 0 0 1 2.517 6.391 1 1 0 0 1-1 .995ZM8.823 19a3.453 3.453 0 0 0 6.354 0H8.823Z"/>
                    </svg>
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f97316" }}>Expiring soon</div>
                      <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
                        Your subscription expires in {sub.daysLeft} day{sub.daysLeft !== 1 ? "s" : ""}. Renew to avoid interruption.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const url = "https://detox.upendoapps.com/payment";
                      if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
                      else window.open(url, "_blank");
                    }}
                    style={{ flexShrink: 0, padding: "7px 16px", background: "#f97316", border: "none", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Renew →
                  </button>
                </div>
              )}

              {/* CTA card */}
              <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                    {sub?.status === "active" ? "Extend or upgrade your plan" : "Get started with a plan"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                    Monthly, Quarterly, and Yearly options available. Payment via M-Pesa.
                  </div>
                </div>
                <button
                  onClick={() => {
                    const url = "https://detox.upendoapps.com/payment";
                    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
                    else window.open(url, "_blank");
                  }}
                  style={{
                    flexShrink: 0, display: "flex", alignItems: "center", gap: 7,
                    padding: "9px 20px", background: "#f97316", border: "none",
                    borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#ea580c"}
                  onMouseLeave={e => e.currentTarget.style.background = "#f97316"}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
                  </svg>
                  {sub?.status === "active" ? "Renew / Upgrade" : "Subscribe Now"}
                </button>
              </div>
            </div>
          )}

          {/* ══ HISTORY TAB ══ */}
          {tab === "history" && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--surface-border)", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Date", "Receipt / Ref", "Amount", "Status"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sub?.payments?.length ? (
                    sub.payments.map(p => <PaymentRow key={p.id} p={p} />)
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: "3rem", textAlign: "center", color: "var(--text-2)", fontSize: 13 }}>
                        <div style={{ fontSize: 28, marginBottom: 10 }}>🧾</div>
                        No payments found.
                        {!isOnline && <div style={{ marginTop: 6, fontSize: 12, color: "#f97316" }}>Connect to the internet to sync payment history.</div>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {!!sub?.payments?.length && (
                <div style={{ padding: "10px 16px", borderTop: "1px solid var(--surface-border)", fontSize: 12, color: "var(--text-2)" }}>
                  Showing {sub.payments.length} transaction{sub.payments.length !== 1 ? "s" : ""}
                  {!isOnline && <span style={{ marginLeft: 8, color: "#f97316" }}>· Cached</span>}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}