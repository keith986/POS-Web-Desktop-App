"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
interface StoredUser {
  id:         string;
  full_name:  string;
  email:      string;
  role:       string;
  store_name: string | null;
  pos_type?:  string;
  plan?:      string;
}

type SubStatus = "active" | "expired" | "due" | "none";

interface Payment {
  id:                string;
  date:              string;
  amount:            number;
  status:            "success" | "failed" | "pending";
  period:            string;
  checkoutRequestId?: string;
  mpesaReceipt?:     string;
}

interface SubscriptionData {
  status:    SubStatus;
  paidUntil: string | null;
  plan:      string | null;
  amount:    number | null;
  payments:  Payment[];
  daysLeft:  number | null;
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return "—";
  }
}

function daysColor(days: number | null): string {
  if (days === null || days <= 0) return "#dc2626";
  if (days > 14) return "#16a34a";
  if (days > 7)  return "#d97706";
  return "#dc2626";
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Plan → approximate days (used for progress bar)
const PLAN_DAYS: Record<string, number> = {
  starter:    30,
  pro:        30,
  enterprise: 30,
  monthly:    30,
  quarterly:  90,
  yearly:     365,
};

// ─────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", color: "#9a9a8e", fontSize: 13, gap: 10 }}>
      <div style={{ width: 18, height: 18, border: "2px solid #e2e0d8", borderTopColor: "#141410", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      Loading subscription…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function StatusBadge({ status, daysLeft }: { status: SubStatus; daysLeft: number | null }) {
  const cfg = {
    active:  { bg: "#f0fdf4", color: "#16a34a", dot: "#16a34a", label: daysLeft !== null ? `Active · ${daysLeft}d left` : "Active" },
    expired: { bg: "#fef2f2", color: "#dc2626", dot: "#dc2626", label: "Expired"         },
    due:     { bg: "#fffbeb", color: "#d97706", dot: "#d97706", label: "Payment Due"     },
    none:    { bg: "#f5f4f0", color: "#9a9a8e", dot: "#c8c6bc", label: "No Subscription" },
  }[status];

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: cfg.bg, borderRadius: 100, padding: "5px 13px",
      fontSize: 12, fontWeight: 500, color: cfg.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function PaymentRow({ p }: { p: Payment }) {
  const s = {
    success: { color: "#16a34a", bg: "#f0fdf4", label: "Paid"    },
    failed:  { color: "#dc2626", bg: "#fef2f2", label: "Failed"  },
    pending: { color: "#d97706", bg: "#fffbeb", label: "Pending" },
  }[p.status];

  return (
    <tr
      style={{ borderBottom: "1px solid #e2e0d8" }}
      onMouseEnter={e => ((e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8")}
      onMouseLeave={e => ((e.currentTarget as HTMLTableRowElement).style.background = "")}
    >
      <td style={{ padding: "0.85rem 1.25rem" }}>
        <div style={{ fontWeight: 500, color: "#141410", fontSize: 13 }}>{formatDate(p.date)}</div>
        <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 1, textTransform: "capitalize" }}>{p.period}</div>
      </td>
      <td style={{ padding: "0.85rem 1.25rem" }}>
        <span style={{ fontSize: 12, color: "#4a4a40", fontFamily: "monospace" }}>
          {p.mpesaReceipt ?? (p.checkoutRequestId ? `···${p.checkoutRequestId.slice(-6)}` : "—")}
        </span>
      </td>
      <td style={{ padding: "0.85rem 1.25rem" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#141410" }}>
          Ksh {p.amount.toLocaleString()}
        </span>
      </td>
      <td style={{ padding: "0.85rem 1.25rem" }}>
        <span style={{
          fontSize: 11, fontWeight: 500,
          color: s.color, background: s.bg,
          padding: "3px 10px", borderRadius: 100,
        }}>
          {s.label}
        </span>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────
export default function SubscriptionPage() {
  // ✅ FIX: lazy initializer with explicit type — avoids SSR mismatch
  const [adminUser] = useState<StoredUser | null>(() => getStoredUser());

  const [sub,        setSub]        = useState<SubscriptionData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tab,        setTab]        = useState<"overview" | "history">("overview");

  const fetchSub = useCallback(async () => {
    if (!adminUser?.id) return;
    setLoading(true);
    setFetchError(null);
    try {
      const res  = await fetch(`/api/subscription/status?admin_id=${adminUser.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setSub(data as SubscriptionData);
    } catch (e) {
      setFetchError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [adminUser?.id]);

  useEffect(() => {
    if (adminUser?.id) {
      fetchSub();
    } else {
      setLoading(false);
      setFetchError("Could not load your account. Please log out and log in again.");
    }
  }, [adminUser?.id, fetchSub]);

  const dater = new Intl.DateTimeFormat("en-US", {
    month: "long", day: "numeric", year: "numeric",
  }).format(new Date());

  // Shared style tokens
  const cardStyle: React.CSSProperties = {
    background: "#fff", border: "1px solid #e2e0d8",
    borderRadius: 12, overflow: "hidden",
  };
  const thStyle: React.CSSProperties = {
    textAlign: "left", padding: "0.6rem 1.25rem",
    fontSize: 11, fontWeight: 500, letterSpacing: "0.5px",
    textTransform: "uppercase", color: "#9a9a8e",
    borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap",
  };

  // ✅ FIX: use PLAN_DAYS keyed by plan name, not billing period string
  const planDays = PLAN_DAYS[sub?.plan?.toLowerCase() ?? ""] ?? 30;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <header className="header">
        <div className="header-title">Subscription</div>
        <div className="header-date">{dater}</div>
        <Link
          href="/payment"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 14px", background: "#141410", color: "#fff",
            border: "none", borderRadius: 7, fontFamily: "inherit",
            fontSize: 13, fontWeight: 500, textDecoration: "none",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" />
          </svg>
          {sub?.status === "active" ? "Renew / Upgrade" : "Subscribe Now"}
        </Link>
      </header>

      <main className="main">

        {/* Loading */}
        {loading && (
          <div style={{ ...cardStyle, overflow: "visible" }}><Spinner /></div>
        )}

        {/* Error */}
        {!loading && fetchError && (
          <div style={{ ...cardStyle, padding: "3rem", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#dc2626", marginBottom: 16 }}>{fetchError}</div>
            {adminUser?.id && (
              <button
                onClick={fetchSub}
                style={{ padding: "8px 20px", background: "#141410", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Main content */}
        {!loading && !fetchError && (
          <>
            {/* Stat strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
              {[
                {
                  label: "Status",
                  value: <StatusBadge status={sub?.status ?? "none"} daysLeft={sub?.daysLeft ?? null} />,
                  sub:   sub?.paidUntil
                    ? (sub.status === "expired" ? `Expired ${formatDate(sub.paidUntil)}` : `Until ${formatDate(sub.paidUntil)}`)
                    : "No active plan",
                },
                {
                  label: "Current Plan",
                  value: <span style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.5px" }}>{sub?.plan ? capitalize(sub.plan) : "—"}</span>,
                  sub:   sub?.amount != null ? `Ksh ${Number(sub.amount).toLocaleString()} paid` : "No payments yet",
                },
                {
                  label: "Days Remaining",
                  value: <span style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.5px", color: daysColor(sub?.daysLeft ?? null) }}>{sub?.daysLeft ?? 0}</span>,
                  sub:   sub?.status === "active" ? "Days until expiry" : "Subscription inactive",
                },
              ].map(s => (
                <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "1.1rem 1.25rem" }}>
                  <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>{s.label}</div>
                  <div style={{ marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#9a9a8e" }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 10, padding: 4 }}>
              {(["overview", "history"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: "8px 16px",
                    background: tab === t ? "#fff" : "transparent",
                    border: tab === t ? "1px solid #c8c6bc" : "1px solid transparent",
                    borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 500,
                    color: tab === t ? "#141410" : "#9a9a8e",
                    fontFamily: "inherit", transition: "all 0.15s",
                    boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  {t === "overview" ? "Overview" : `Payment History${sub?.payments?.length ? ` (${sub.payments.length})` : ""}`}
                </button>
              ))}
            </div>

            {/* ══ OVERVIEW TAB ══ */}
            {tab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Subscription detail card */}
                <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "1.25rem 1.5rem" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>
                    Subscription Details
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem 2rem" }}>
                    {[
                      { label: "Plan",         value: sub?.plan   ? capitalize(sub.plan)   : "—" },
                      { label: "Status",       value: sub?.status ? capitalize(sub.status) : "—" },
                      { label: "Valid Until",  value: sub?.paidUntil ? formatDate(sub.paidUntil) : "—" },
                      { label: "Last Amount",  value: sub?.amount != null ? `Ksh ${Number(sub.amount).toLocaleString()}` : "—" },
                    ].map(row => (
                      <div key={row.label}>
                        <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>{row.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#141410" }}>{row.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar — active only */}
                  {sub?.status === "active" && sub.daysLeft !== null && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: "#9a9a8e" }}>Subscription period</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: daysColor(sub.daysLeft) }}>
                          {sub.daysLeft} days remaining
                        </span>
                      </div>
                      <div style={{ height: 5, background: "#f5f4f0", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 3,
                          background: daysColor(sub.daysLeft),
                          // ✅ FIX: use planDays (keyed by plan name) not planMonths * 30
                          width: `${Math.min(100, Math.max(2, (sub.daysLeft / planDays) * 100))}%`,
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Warning / expired banner */}
                {(sub?.status === "expired" || sub?.status === "due" || sub?.status === "none") && (
                  <div style={{ padding: "14px 18px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* ✅ FIX: fillRule and clipRule (camelCase) instead of fill-rule / clip-rule */}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#d97706", flexShrink: 0 }}>
                        <path fillRule="evenodd" clipRule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v5a1 1 0 1 0 2 0V8Zm-1 7a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H12Z" />
                      </svg>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#92400e" }}>
                          {sub?.status === "none" ? "No active subscription" : "Your subscription has expired"}
                        </div>
                        <div style={{ fontSize: 12, color: "#a16207", marginTop: 2 }}>
                          Subscribe to unlock full access to POStore features.
                        </div>
                      </div>
                    </div>
                    <Link href="/payment" style={{ flexShrink: 0, padding: "7px 16px", background: "#141410", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
                      Subscribe →
                    </Link>
                  </div>
                )}

                {/* Expiring soon banner — active, ≤ 7 days */}
                {sub?.status === "active" && sub.daysLeft !== null && sub.daysLeft <= 7 && (
                  <div style={{ padding: "14px 18px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18 }}>🔔</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#991b1b" }}>Expiring soon</div>
                        <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 2 }}>
                          Your subscription expires in {sub.daysLeft} day{sub.daysLeft !== 1 ? "s" : ""}. Renew now to avoid interruption.
                        </div>
                      </div>
                    </div>
                    <Link href="/payment" style={{ flexShrink: 0, padding: "7px 16px", background: "#dc2626", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
                      Renew →
                    </Link>
                  </div>
                )}

                {/* Always-visible renew CTA */}
                <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#141410", marginBottom: 4 }}>
                      {sub?.status === "active" ? "Extend or upgrade your plan" : "Get started with a plan"}
                    </div>
                    <div style={{ fontSize: 12, color: "#9a9a8e" }}>
                      {sub?.status === "active"
                        ? "Monthly, Quarterly, and Yearly options available."
                        : "Choose from Monthly, Quarterly, or Yearly billing."}
                    </div>
                  </div>
                  <Link
                    href="/payment"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 7,
                      flexShrink: 0, padding: "9px 20px",
                      background: "#141410", color: "#fff",
                      borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" />
                    </svg>
                    {sub?.status === "active" ? "Renew / Upgrade" : "Subscribe Now"}
                  </Link>
                </div>

              </div>
            )}

            {/* ══ HISTORY TAB ══ */}
            {tab === "history" && (
              <div style={cardStyle}>
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
                        <td colSpan={4} style={{ padding: "3rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>
                          <div style={{ fontSize: 28, marginBottom: 10 }}>🧾</div>
                          No payments yet. Your history will appear here after you subscribe.
                          <div style={{ marginTop: 14 }}>
                            <Link href="/payment" style={{ padding: "7px 18px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 7, fontSize: 12, color: "#141410", textDecoration: "none" }}>
                              Subscribe now →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {!!sub?.payments?.length && (
                  <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid #e2e0d8", fontSize: 12, color: "#9a9a8e" }}>
                    Showing {sub.payments.length} transaction{sub.payments.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            )}

          </>
        )}
      </main>
    </>
  );
}