"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PlanId,
  PosType,
  POS_PRICES,
  getPrice,
} from "@/app/_lib/pricing"; // adjust import path to match your project

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
interface StoredUser {
  id:         string;
  full_name:  string;
  email:      string;
  role:       string;
  store_name: string | null;
  pos_type?:  PosType;
  plan?:      PlanId;
}

type PlanPeriod = "monthly" | "quarterly" | "yearly";
type SubStatus  = "active" | "expired" | "due" | "none";

interface Payment {
  id:                 string;
  date:               string;
  amount:             number;
  status:             "success" | "failed" | "pending";
  period:             string;
  checkoutRequestId?: string;
  mpesaReceipt?:      string;
}

interface SubscriptionData {
  status:    SubStatus;
  paidUntil: string | null;
  plan:      PlanPeriod | null;
  planTier:  PlanId | null;
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
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return "—"; }
}

function daysColor(days: number | null): string {
  if (days === null || days <= 0) return "var(--color-text-danger)";
  if (days > 14) return "var(--color-text-success)";
  if (days > 7)  return "var(--color-text-warning)";
  return "var(--color-text-danger)";
}

function fmt(n: number) {
  return "Ksh " + Number(n).toLocaleString();
}

// ─────────────────────────────────────────
// PERIOD CONFIG
// ─────────────────────────────────────────
const POS_TYPE_LABELS: Record<PosType, string> = {
  retail:     "Retail store",
  restaurant: "Restaurant",
  salon:      "Salon",
  wholesale:  "Wholesale",
  pharmacy:   "Pharmacy",
};

const PERIODS: {
  id:      PlanPeriod;
  planKey: PlanId;
  label:   string;
  desc:    string;
  badge?:  string;
  saving?: string;
  months:  number;
}[] = [
  { id: "monthly",   planKey: "starter",    label: "Monthly",   desc: "Billed every month",    months: 1  },
  { id: "quarterly", planKey: "pro",        label: "Quarterly", desc: "Billed every 3 months", badge: "Popular", saving: "Save Ksh 500",   months: 3  },
  { id: "yearly",    planKey: "enterprise", label: "Yearly",    desc: "Billed once a year",    saving: "Save Ksh 4,000", months: 12 },
];

function getPeriodPrice(posType: PosType, periodId: PlanPeriod): number {
  const period = PERIODS.find(p => p.id === periodId);
  if (!period) return 0;
  return getPrice(posType, period.planKey);
}

// ─────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────
function IconCreditCard({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconReceipt({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconPhone({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function IconWarning({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconSpinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" style={{ animation: "spin 0.7s linear infinite" }}>
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity={0.25} />
      <path d="M21 12a9 9 0 00-9-9" />
    </svg>
  );
}

// ─────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────
function StatusBadge({ status, daysLeft }: { status: SubStatus; daysLeft: number | null }) {
  const cfg = {
    active:  { bg: "var(--color-background-success)", color: "var(--color-text-success)", dot: "var(--color-text-success)", label: daysLeft !== null ? `Active · ${daysLeft}d left` : "Active" },
    expired: { bg: "var(--color-background-danger)",  color: "var(--color-text-danger)",  dot: "var(--color-text-danger)",  label: "Expired"        },
    due:     { bg: "var(--color-background-warning)", color: "var(--color-text-warning)", dot: "var(--color-text-warning)", label: "Payment Due"    },
    none:    { bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)", dot: "var(--color-border-secondary)", label: "No Subscription" },
  }[status];

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: cfg.bg, borderRadius: 100, padding: "5px 13px", fontSize: 12, fontWeight: 500, color: cfg.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function PaymentRow({ p }: { p: Payment }) {
  const s = {
    success: { color: "var(--color-text-success)", bg: "var(--color-background-success)", label: "Paid"    },
    failed:  { color: "var(--color-text-danger)",  bg: "var(--color-background-danger)",  label: "Failed"  },
    pending: { color: "var(--color-text-warning)", bg: "var(--color-background-warning)", label: "Pending" },
  }[p.status];

  return (
    <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      <td style={{ padding: "0.85rem 1.25rem" }}>
        <div style={{ fontWeight: 500, color: "var(--color-text-primary)", fontSize: 13 }}>{formatDate(p.date)}</div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 1, textTransform: "capitalize" }}>{p.period}</div>
      </td>
      <td style={{ padding: "0.85rem 1.25rem" }}>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>
          {p.mpesaReceipt ?? (p.checkoutRequestId ? `···${p.checkoutRequestId.slice(-6)}` : "—")}
        </span>
      </td>
      <td style={{ padding: "0.85rem 1.25rem" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{fmt(p.amount)}</span>
      </td>
      <td style={{ padding: "0.85rem 1.25rem" }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: s.color, background: s.bg, padding: "3px 10px", borderRadius: 100 }}>
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
  const router = useRouter();

  const [adminUser]    = useState<StoredUser | null>(getStoredUser);
  const [sub,          setSub]          = useState<SubscriptionData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanPeriod>("monthly");
  const [posType,      setPosType]      = useState<PosType>("retail");
  const [phone,        setPhone]        = useState("");
  const [paying,       setPaying]       = useState(false);
  const [stkSent,      setStkSent]      = useState(false);
  const [polling,      setPolling]      = useState(false);
  const [msg,          setMsg]          = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tab,          setTab]          = useState<"renew" | "history">("renew");

  // Set pos type from stored user on mount
  useEffect(() => {
    if (adminUser?.pos_type && POS_TYPE_LABELS[adminUser.pos_type]) {
      setPosType(adminUser.pos_type);
    }
  }, [adminUser?.pos_type]);

  const fetchSub = useCallback(async () => {
    if (!adminUser?.id) return;
    setLoading(true);
    setFetchError(null);
    try {
      const res  = await fetch(`/api/subscription/status?admin_id=${adminUser.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setSub(data);
      if (data.plan && PERIODS.find(p => p.id === data.plan)) {
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

  async function handlePay() {
    if (!adminUser?.id) return;
    const cleaned = phone.replace(/\s/g, "");
    if (cleaned.length < 9) {
      setMsg({ type: "error", text: "Enter a valid M-Pesa number (e.g. 0712 345 678)" });
      return;
    }
    setPaying(true); setMsg(null);
    try {
      const price = getPeriodPrice(posType, selectedPlan);
      const res   = await fetch("/api/subscription/mpesa/stk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone: cleaned, amount: price, period: selectedPlan, admin_id: adminUser.id }),
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

  const activePeriod  = PERIODS.find(p => p.id === selectedPlan)!;
  const activePrice   = getPeriodPrice(posType, selectedPlan);
  const isCurrentPlan = sub?.plan === selectedPlan && sub?.status === "active";

  const dater = new Intl.DateTimeFormat("en-US", {
    month: "long", day: "numeric", year: "numeric",
  }).format(new Date());

  // ── Shared style tokens ──
  const card: React.CSSProperties = {
    background: "var(--color-background-primary)",
    border: "0.5px solid var(--color-border-tertiary)",
    borderRadius: "var(--border-radius-lg)",
    padding: "1.25rem 1.5rem",
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12,
  };
  const thStyle: React.CSSProperties = {
    textAlign: "left", padding: "0.6rem 1.25rem",
    fontSize: 11, fontWeight: 500, letterSpacing: "0.5px",
    textTransform: "uppercase", color: "var(--color-text-secondary)",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    background: "var(--color-background-secondary)",
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: var(--color-text-secondary); }
        input:focus { outline: none; border-color: var(--color-border-primary) !important; }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Header ── */}
      <header className="header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div className="header-title">Subscription</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="header-date">{dater}</div>
          {sub?.status === "active" && (
            <span style={{ fontSize: 12, fontWeight: 500, background: "var(--color-background-success)", color: "var(--color-text-success)", border: "0.5px solid var(--color-border-success)", padding: "5px 13px", borderRadius: 100 }}>
              {activePeriod.label} Plan
            </span>
          )}
        </div>
      </header>

      <main className="main">

        {/* ── Loading ── */}
        {loading && (
          <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", color: "var(--color-text-secondary)", fontSize: 13, gap: 10 }}>
            <IconSpinner size={18} />
            Loading subscription…
          </div>
        )}

        {/* ── Fetch error ── */}
        {!loading && fetchError && (
          <div style={{ ...card, padding: "3rem", textAlign: "center" }}>
            <IconWarning size={32} />
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-danger)", margin: "12px 0 16px" }}>{fetchError}</div>
            {adminUser?.id && (
              <button onClick={fetchSub} style={{ padding: "8px 20px", background: "var(--color-text-primary)", border: "none", borderRadius: 8, color: "var(--color-background-primary)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                Retry
              </button>
            )}
          </div>
        )}

        {/* ── Main content ── */}
        {!loading && !fetchError && (
          <>
            {/* Status card */}
            <div style={card}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={sectionLabel}>Current status</div>
                  <StatusBadge status={sub?.status ?? "none"} daysLeft={sub?.daysLeft ?? null} />
                  {sub?.plan && (
                    <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 8 }}>
                      Plan: <strong style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{sub.plan}</strong>
                      {sub.amount != null && <span style={{ marginLeft: 6 }}>· {fmt(Number(sub.amount))}</span>}
                    </div>
                  )}
                </div>
                {sub?.paidUntil && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                      {sub.status === "expired" ? "Expired on" : "Valid until"}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 500, color: daysColor(sub.daysLeft) }}>
                      {formatDate(sub.paidUntil)}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress bar (active only) */}
              {sub?.status === "active" && sub.daysLeft !== null && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Subscription period</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: daysColor(sub.daysLeft) }}>{sub.daysLeft} days remaining</span>
                  </div>
                  <div style={{ height: 5, background: "var(--color-background-secondary)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      background: daysColor(sub.daysLeft),
                      width: `${Math.min(100, Math.max(2, (sub.daysLeft / ((PERIODS.find(p => p.id === sub.plan)?.months ?? 1) * 30)) * 100))}%`,
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>
              )}

              {/* Warning bar */}
              {(sub?.status === "expired" || sub?.status === "due") && (
                <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--color-background-warning)", border: "0.5px solid var(--color-border-warning)", borderRadius: 8, fontSize: 13, color: "var(--color-text-warning)", display: "flex", alignItems: "center", gap: 10 }}>
                  <IconWarning size={16} />
                  Your access is restricted. Renew your subscription to continue using POStore.
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
              {(["renew", "history"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "11px 16px",
                  background: tab === t ? "var(--color-background-secondary)" : "transparent",
                  border: "none",
                  borderBottom: tab === t ? "2px solid var(--color-text-primary)" : "2px solid transparent",
                  cursor: "pointer", fontSize: 13, fontWeight: 500,
                  color: tab === t ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  fontFamily: "inherit", transition: "all 0.15s",
                }}>
                  {t === "renew" ? <IconCreditCard size={15} /> : <IconReceipt size={15} />}
                  {t === "renew" ? "Renew / Pay" : `Payment History${sub?.payments?.length ? ` (${sub.payments.length})` : ""}`}
                </button>
              ))}
            </div>

            {/* ══ RENEW TAB ══ */}
            {tab === "renew" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* POS type selector */}
                <div style={card}>
                  <div style={sectionLabel}>Your business type</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(Object.entries(POS_TYPE_LABELS) as [PosType, string][]).map(([key, label]) => (
                      <button key={key} onClick={() => setPosType(key)} style={{
                        padding: "5px 13px", borderRadius: 100,
                        border: "0.5px solid",
                        borderColor: posType === key ? "var(--color-border-primary)" : "var(--color-border-tertiary)",
                        background: posType === key ? "var(--color-background-primary)" : "var(--color-background-secondary)",
                        color: posType === key ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                        fontWeight: posType === key ? 500 : 400,
                        fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                      }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plan chooser */}
                <div style={card}>
                  <div style={sectionLabel}>
                    {sub?.status === "active" ? "Extend / change plan" : "Choose a plan"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {PERIODS.map(period => {
                      const price    = getPeriodPrice(posType, period.id);
                      const perMonth = Math.round(price / period.months);
                      const isCur    = sub?.plan === period.id && sub?.status === "active";
                      const isSel    = selectedPlan === period.id;
                      return (
                        <button key={period.id} onClick={() => setSelectedPlan(period.id)} style={{
                          display: "flex", alignItems: "center",
                          padding: "14px 16px",
                          background: isSel ? "var(--color-background-secondary)" : "var(--color-background-primary)",
                          border: `${isSel ? "1.5px" : "0.5px"} solid ${isSel ? "var(--color-border-primary)" : "var(--color-border-tertiary)"}`,
                          borderRadius: "var(--border-radius-lg)", cursor: "pointer",
                          fontFamily: "inherit", transition: "all 0.15s", textAlign: "left", gap: 14,
                        }}>
                          {/* Radio */}
                          <div style={{ width: 17, height: 17, borderRadius: "50%", border: `2px solid ${isSel ? "var(--color-border-primary)" : "var(--color-border-secondary)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {isSel && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-text-primary)" }} />}
                          </div>
                          {/* Labels */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{period.label}</span>
                              {period.badge && (
                                <span style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-warning)", background: "var(--color-background-warning)", border: "0.5px solid var(--color-border-warning)", padding: "2px 8px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                  {period.badge}
                                </span>
                              )}
                              {isCur && (
                                <span style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-success)", background: "var(--color-background-success)", border: "0.5px solid var(--color-border-success)", padding: "2px 8px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                  Current
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{period.desc}</span>
                              {period.saving && <span style={{ fontSize: 12, color: "var(--color-text-success)" }}>{period.saving}</span>}
                            </div>
                          </div>
                          {/* Price */}
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>{fmt(price)}</div>
                            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>≈ {fmt(perMonth)}/mo</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* M-Pesa form */}
                <div style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "var(--border-radius-md)", background: "var(--color-background-success)", border: "0.5px solid var(--color-border-success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <IconPhone size={20} color="var(--color-text-success)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Pay via M-Pesa</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>STK Push — you will get a prompt on your phone</div>
                    </div>
                  </div>

                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: 5 }}>
                    M-Pesa phone number
                  </label>
                  <input
                    type="tel" placeholder="e.g. 0712 345 678"
                    value={phone} onChange={e => setPhone(e.target.value)} disabled={stkSent}
                    style={{ width: "100%", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "var(--color-text-primary)", fontFamily: "inherit", marginBottom: 14, transition: "border-color 0.15s" }}
                  />

                  {/* Order summary */}
                  <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: "12px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{activePeriod.label} plan</span>
                    <span style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>{fmt(activePrice)}</span>
                  </div>
                  {isCurrentPlan && sub?.paidUntil && (
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 14 }}>
                      Will extend your subscription beyond {formatDate(sub.paidUntil)}
                    </div>
                  )}

                  <button
                    onClick={handlePay}
                    disabled={paying || stkSent || !phone}
                    style={{
                      width: "100%", padding: "10px",
                      background: paying || stkSent || !phone ? "var(--color-background-secondary)" : "var(--color-text-primary)",
                      border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500,
                      color: paying || stkSent || !phone ? "var(--color-text-secondary)" : "var(--color-background-primary)",
                      cursor: paying || stkSent || !phone ? "not-allowed" : "pointer",
                      fontFamily: "inherit", transition: "all 0.15s",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    {paying ? (
                      <><IconSpinner size={14} /> Sending STK Push…</>
                    ) : stkSent && polling ? (
                      <><IconSpinner size={14} /> Waiting for confirmation…</>
                    ) : stkSent ? (
                      <><IconCheck size={15} /> Payment sent</>
                    ) : (
                      <><IconPhone size={15} /> Pay with M-Pesa</>
                    )}
                  </button>

                  {stkSent && !polling && (
                    <button onClick={() => { setStkSent(false); setMsg(null); }} style={{ width: "100%", marginTop: 8, padding: "9px", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
                      Try again
                    </button>
                  )}
                </div>

                {/* Feedback message */}
                {msg && (
                  <div style={{
                    padding: "12px 16px", borderRadius: 8,
                    background: msg.type === "success" ? "var(--color-background-success)" : "var(--color-background-danger)",
                    border: `0.5px solid ${msg.type === "success" ? "var(--color-border-success)" : "var(--color-border-danger)"}`,
                    fontSize: 13, color: msg.type === "success" ? "var(--color-text-success)" : "var(--color-text-danger)",
                    display: "flex", alignItems: "flex-start", gap: 8,
                  }}>
                    {msg.type === "success" ? <IconCheck size={15} /> : <IconWarning size={15} />}
                    {msg.text}
                  </div>
                )}
              </div>
            )}

            {/* ══ HISTORY TAB ══ */}
            {tab === "history" && (
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
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
                        <td colSpan={4} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                            <IconReceipt size={32} />
                            No payments yet. Your history will appear here.
                            <button onClick={() => setTab("renew")} style={{ padding: "7px 18px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 7, fontSize: 12, color: "var(--color-text-primary)", cursor: "pointer", fontFamily: "inherit" }}>
                              Make your first payment
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {!!sub?.payments?.length && (
                  <div style={{ padding: "0.75rem 1.25rem", borderTop: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-secondary)" }}>
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