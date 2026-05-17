"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────
// TYPES  (mirrors Staff page's StoredUser)
// ─────────────────────────────────────────
interface StoredUser {
  id:         string;
  full_name:  string;
  email:      string;
  role:       string;
  store_name: string | null;
}

type PlanPeriod = "monthly" | "quarterly" | "yearly";
type SubStatus  = "active" | "expired" | "due" | "none";

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
  plan:      PlanPeriod | null;
  amount:    number | null;
  payments:  Payment[];
  daysLeft:  number | null;
}

// ─────────────────────────────────────────
// EXACT same helper as Staff page
// ─────────────────────────────────────────
function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─────────────────────────────────────────
// PLAN CONFIG
// ─────────────────────────────────────────
const PLANS: {
  id: PlanPeriod; label: string; price: number;
  months: number; badge?: string; saving?: string; desc: string;
}[] = [
  { id: "monthly",   label: "Monthly",   price: 1500,  months: 1,  desc: "Billed every month"     },
  { id: "quarterly", label: "Quarterly", price: 4000,  months: 3,  desc: "Billed every 3 months", badge: "Popular", saving: "Save Ksh 500"   },
  { id: "yearly",    label: "Yearly",    price: 14000, months: 12, desc: "Billed once a year",     saving: "Save Ksh 4,000" },
];

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return "—"; }
}

function daysColor(days: number | null): string {
  if (days === null || days <= 0) return "#dc2626";
  if (days > 14) return "#16a34a";
  if (days > 7)  return "#d97706";
  return "#dc2626";
}

function planLabel(plan: PlanPeriod | null) {
  return PLANS.find(p => p.id === plan)?.label ?? plan ?? "—";
}

// ─────────────────────────────────────────
// SMALL COMPONENTS  (same style tokens as Staff page)
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: cfg.bg, borderRadius: 100, padding: "5px 13px", fontSize: 12, fontWeight: 500, color: cfg.color }}>
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
      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"}
      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}
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
        <span style={{ fontSize: 13, fontWeight: 500, color: "#141410" }}>Ksh {p.amount.toLocaleString()}</span>
      </td>
      <td style={{ padding: "0.85rem 1.25rem" }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: s.color, background: s.bg, padding: "3px 10px", borderRadius: 100 }}>
          {s.label}
        </span>
      </td>
    </tr>
  );
}

function BtnSpinner() {
  return <span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block", flexShrink: 0 }} />;
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────
export default function SubscriptionPage() {
  const router = useRouter();

  // ── same pattern as Staff page ──
  const [adminUser] = useState<StoredUser | null>(getStoredUser);

  const [sub,          setSub]          = useState<SubscriptionData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanPeriod>("monthly");
  const [phone,        setPhone]        = useState("");
  const [paying,       setPaying]       = useState(false);
  const [stkSent,      setStkSent]      = useState(false);
  const [polling,      setPolling]      = useState(false);
  const [msg,          setMsg]          = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tab,          setTab]          = useState<"renew" | "history">("renew");

  // ── fetch sub — same fetch pattern as Staff page ──
  const fetchSub = useCallback(async () => {
    if (!adminUser?.id) return;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/subscription/status?admin_id=${adminUser.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setSub(data);
      if (data.plan && PLANS.find(p => p.id === data.plan)) {
        setSelectedPlan(data.plan);
      }
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

  // ── M-Pesa pay ──
  async function handlePay() {
    if (!adminUser?.id) return;
    const cleaned = phone.replace(/\s/g, "");
    if (cleaned.length < 9) {
      setMsg({ type: "error", text: "Enter a valid M-Pesa number (e.g. 0712 345 678)" });
      return;
    }
    setPaying(true); setMsg(null);
    try {
      const plan = PLANS.find(p => p.id === selectedPlan)!;
      const res  = await fetch("/api/subscription/mpesa/stk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone: cleaned, amount: plan.price, period: selectedPlan, admin_id: adminUser.id }),
      });
      const data = await res.json();
      if (data.success) {
        setStkSent(true);
        setMsg({ type: "success", text: "STK Push sent! Check your phone and enter your M-Pesa PIN." });
        pollConfirmation(data.checkoutRequestId);
      } else {
        setMsg({ type: "error", text: data.error ?? "Failed to initiate payment." });
      }
    } catch {
      setMsg({ type: "error", text: "Network error. Please try again." });
    }
    setPaying(false);
  }

  function pollConfirmation(checkoutRequestId: string) {
    setPolling(true);
    let attempts = 0;
    const iv = setInterval(async () => {
      attempts++;
      try {
        const res  = await fetch(`/api/subscription/mpesa/query?id=${checkoutRequestId}`);
        const data = await res.json();
        if (data.paid) {
          clearInterval(iv); setPolling(false); setStkSent(false);
          setMsg({ type: "success", text: `Payment confirmed!${data.receipt ? ` Receipt: ${data.receipt}` : ""} Redirecting…` });
          fetchSub();
          setTimeout(() => router.push("/admin/dashboard"), 3000);
          return;
        }
        if (data.failed) {
          clearInterval(iv); setPolling(false); setStkSent(false);
          setMsg({ type: "error", text: data.reason ?? "Payment not completed. Try again." });
        }
      } catch { /* silent */ }
      if (attempts >= 24) {
        clearInterval(iv); setPolling(false);
        setMsg({ type: "error", text: "Payment not confirmed yet. If you paid, it will reflect shortly." });
      }
    }, 5000);
  }

  const activePlan    = PLANS.find(p => p.id === selectedPlan)!;
  const isCurrentPlan = sub?.plan === selectedPlan && sub?.status === "active";

  const dater = new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).format(new Date());

  // ── shared style tokens (same as Staff page) ──
  const cardStyle: React.CSSProperties = {
    background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden",
  };
  const thStyle: React.CSSProperties = {
    textAlign: "left", padding: "0.6rem 1.25rem",
    fontSize: 11, fontWeight: 500, letterSpacing: "0.5px",
    textTransform: "uppercase", color: "#9a9a8e",
    borderBottom: "1px solid #e2e0d8", background: "#f5f4f0",
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #9a9a8e; }
        input:focus { outline: none; border-color: #141410 !important; }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Header — matches Staff page exactly ── */}
      <header className="header">
        <div className="header-title">Subscription</div>
        <div className="header-date">{dater}</div>
        {sub?.status === "active" && (
          <span style={{ fontSize: 12, fontWeight: 500, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", padding: "6px 14px", borderRadius: 7 }}>
            {planLabel(sub.plan)} Plan
          </span>
        )}
      </header>

      <main className="main">

        {/* ── Loading ── */}
        {loading && (
          <div style={{ ...cardStyle, overflow: "visible" }}>
            <Spinner />
          </div>
        )}

        {/* ── Error ── */}
        {!loading && fetchError && (
          <div style={{ ...cardStyle, padding: "3rem", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#dc2626", marginBottom: 16 }}>{fetchError}</div>
            {adminUser?.id && (
              <button onClick={fetchSub} style={{ padding: "8px 20px", background: "#141410", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                Retry
              </button>
            )}
          </div>
        )}

        {/* ── Main content ── */}
        {!loading && !fetchError && (
          <>
            {/* Status card */}
            <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "1.25rem 1.5rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Current Status</div>
                  <StatusBadge status={sub?.status ?? "none"} daysLeft={sub?.daysLeft ?? null} />
                  {sub?.plan && (
                    <div style={{ fontSize: 13, color: "#4a4a40", marginTop: 8 }}>
                      Plan: <strong style={{ color: "#141410" }}>{planLabel(sub.plan)}</strong>
                      {sub.amount != null && <span style={{ marginLeft: 6, color: "#9a9a8e" }}>· Ksh {Number(sub.amount).toLocaleString()}</span>}
                    </div>
                  )}
                </div>
                {sub?.paidUntil && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                      {sub.status === "expired" ? "Expired On" : "Valid Until"}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: daysColor(sub.daysLeft) }}>
                      {formatDate(sub.paidUntil)}
                    </div>
                  </div>
                )}
              </div>

              {sub?.status === "active" && sub.daysLeft !== null && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#9a9a8e" }}>Subscription period</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: daysColor(sub.daysLeft) }}>{sub.daysLeft} days remaining</span>
                  </div>
                  <div style={{ height: 5, background: "#f5f4f0", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      background: daysColor(sub.daysLeft),
                      width: `${Math.min(100, Math.max(2, (sub.daysLeft / ((PLANS.find(p => p.id === sub.plan)?.months ?? 1) * 30)) * 100))}%`,
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>
              )}

              {(sub?.status === "expired" || sub?.status === "due") && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 13, color: "#d97706" }}>
                  ⚠️ Your access is restricted. Renew your subscription to continue using POStore.
                </div>
              )}
            </div>

            {/* Tabs — same pill style as Staff toolbar */}
            <div style={{ display: "flex", gap: 4, background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 10, padding: 4 }}>
              {(["renew", "history"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: "8px 16px",
                  background: tab === t ? "#fff" : "transparent",
                  border: tab === t ? "1px solid #c8c6bc" : "1px solid transparent",
                  borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 500,
                  color: tab === t ? "#141410" : "#9a9a8e",
                  fontFamily: "inherit", transition: "all 0.15s",
                  boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                }}>
                  {t === "renew" ? "💳  Renew / Pay" : `🧾  Payment History${sub?.payments?.length ? ` (${sub.payments.length})` : ""}`}
                </button>
              ))}
            </div>

            {/* ══ RENEW TAB ══ */}
            {tab === "renew" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Plan selector */}
                <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "1.25rem 1.5rem" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>
                    {sub?.status === "active" ? "Extend / Change Plan" : "Choose a Plan"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {PLANS.map(plan => {
                      const isCurrent  = sub?.plan === plan.id && sub?.status === "active";
                      const isSelected = selectedPlan === plan.id;
                      return (
                        <button key={plan.id} onClick={() => setSelectedPlan(plan.id)} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "13px 16px",
                          background: isSelected ? "#fafaf8" : "#fff",
                          border: `1.5px solid ${isSelected ? "#141410" : "#e2e0d8"}`,
                          borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                          transition: "all 0.15s", textAlign: "left",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 17, height: 17, borderRadius: "50%", border: `2px solid ${isSelected ? "#141410" : "#c8c6bc"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#141410" }} />}
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 13, fontWeight: 500, color: "#141410" }}>{plan.label}</span>
                                {plan.badge && (
                                  <span style={{ fontSize: 10, fontWeight: 500, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                    {plan.badge}
                                  </span>
                                )}
                                {isCurrent && (
                                  <span style={{ fontSize: 10, fontWeight: 500, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                    Current
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                                <span style={{ fontSize: 12, color: "#9a9a8e" }}>{plan.desc}</span>
                                {plan.saving && <span style={{ fontSize: 12, color: "#16a34a" }}>{plan.saving}</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "#141410" }}>Ksh {plan.price.toLocaleString()}</div>
                            <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 2 }}>≈ Ksh {Math.round(plan.price / plan.months).toLocaleString()}/mo</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* M-Pesa form */}
                <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📱</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#141410" }}>Pay via M-Pesa</div>
                      <div style={{ fontSize: 12, color: "#9a9a8e" }}>STK Push — you will get a prompt on your phone</div>
                    </div>
                  </div>

                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#4a4a40", marginBottom: 5 }}>
                    M-Pesa Phone Number
                  </label>
                  <input
                    type="tel" placeholder="e.g. 0712 345 678"
                    value={phone} onChange={e => setPhone(e.target.value)} disabled={stkSent}
                    style={{ width: "100%", background: stkSent ? "#f5f4f0" : "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "#141410", fontFamily: "inherit", marginBottom: 14, transition: "border-color 0.15s" }}
                  />

                  {/* Order summary */}
                  <div style={{ background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#4a4a40" }}>{activePlan.label} plan</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#141410" }}>Ksh {activePlan.price.toLocaleString()}</span>
                    </div>
                    {isCurrentPlan && sub?.paidUntil && (
                      <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 4 }}>
                        Will extend your subscription beyond {formatDate(sub.paidUntil)}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handlePay}
                    disabled={paying || stkSent || !phone}
                    style={{
                      width: "100%", padding: "10px",
                      background: paying || stkSent || !phone ? "#9a9a8e" : "#141410",
                      border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#fff",
                      cursor: paying || stkSent || !phone ? "not-allowed" : "pointer",
                      fontFamily: "inherit", transition: "background 0.15s",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    {paying              ? <><BtnSpinner />Sending STK Push…</>
                    : stkSent && polling  ? <><BtnSpinner />Waiting for confirmation…</>
                    : stkSent            ? "✅ Payment Sent"
                    : "📱 Pay with M-Pesa"}
                  </button>

                  {stkSent && !polling && (
                    <button onClick={() => { setStkSent(false); setMsg(null); }} style={{ width: "100%", marginTop: 8, padding: "9px", background: "#fff", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, color: "#4a4a40", cursor: "pointer", fontFamily: "inherit" }}>
                      Try again
                    </button>
                  )}
                </div>

                {msg && (
                  <div style={{
                    padding: "12px 16px", borderRadius: 8,
                    background: msg.type === "success" ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${msg.type === "success" ? "#bbf7d0" : "#fecaca"}`,
                    fontSize: 13, color: msg.type === "success" ? "#16a34a" : "#dc2626",
                    display: "flex", alignItems: "flex-start", gap: 8,
                  }}>
                    <span style={{ flexShrink: 0 }}>{msg.type === "success" ? "✅" : "❌"}</span>
                    {msg.text}
                  </div>
                )}
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
                    {sub?.payments?.length ? sub.payments.map(p => <PaymentRow key={p.id} p={p} />) : (
                      <tr>
                        <td colSpan={4} style={{ padding: "3rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>
                          <div style={{ fontSize: 28, marginBottom: 10 }}>🧾</div>
                          No payments yet. Your history will appear here.
                          <div style={{ marginTop: 14 }}>
                            <button onClick={() => setTab("renew")} style={{ padding: "7px 18px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 7, fontSize: 12, color: "#141410", cursor: "pointer", fontFamily: "inherit" }}>
                              Make your first payment →
                            </button>
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