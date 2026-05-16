"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
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
  subStatus?: string;
}

// ─────────────────────────────────────────
// PLAN CONFIG
// ─────────────────────────────────────────
const PLANS: {
  id: PlanPeriod; label: string; price: number;
  months: number; badge?: string; saving?: string; desc: string;
}[] = [
  { id: "monthly",   label: "Monthly",   price: 1500,  months: 1,  desc: "Billed every month"      },
  { id: "quarterly", label: "Quarterly", price: 4000,  months: 3,  desc: "Billed every 3 months",  badge: "Popular", saving: "Save Ksh 500"   },
  { id: "yearly",    label: "Yearly",    price: 14000, months: 12, desc: "Billed once a year",      saving: "Save Ksh 4,000" },
];

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function daysLeftColor(days: number | null): string {
  if (days === null || days <= 0) return "#ef4444";
  if (days > 14) return "#22c55e";
  if (days > 7)  return "#f97316";
  return "#ef4444";
}

function planLabel(plan: PlanPeriod | null): string {
  return PLANS.find(p => p.id === plan)?.label ?? plan ?? "—";
}

// ─────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────
function StatusPill({ status, daysLeft }: { status: SubStatus; daysLeft: number | null }) {
  const cfg = {
    active:  { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.25)",  color: "#22c55e", label: daysLeft !== null ? `Active · ${daysLeft}d left` : "Active" },
    expired: { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.25)",  color: "#ef4444", label: "Expired"       },
    due:     { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.25)", color: "#f97316", label: "Payment Due"   },
    none:    { bg: "rgba(255,255,255,0.06)",border: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", label: "No Subscription" },
  }[status];

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

function PaymentRow({ p }: { p: Payment }) {
  const s = {
    success: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.2)",  label: "Paid"    },
    failed:  { color: "#ef4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.2)",  label: "Failed"  },
    pending: { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.2)", label: "Pending" },
  }[p.status];

  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto",
        alignItems: "center", gap: 12,
        padding: "0.75rem 1rem",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10, transition: "background 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{formatDate(p.date)}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2, textTransform: "capitalize" }}>{p.period}</div>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {p.mpesaReceipt
          ? <span style={{ color: "rgba(255,255,255,0.55)" }}>{p.mpesaReceipt}</span>
          : p.checkoutRequestId
          ? `···${p.checkoutRequestId.slice(-6)}`
          : "—"}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
        Ksh {p.amount.toLocaleString()}
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, color: s.color,
        background: s.bg, border: `1px solid ${s.border}`,
        padding: "3px 9px", borderRadius: 100,
        textTransform: "uppercase", letterSpacing: "0.3px",
      }}>
        {s.label}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 14, height: 14,
      border: "2px solid rgba(255,255,255,0.25)",
      borderTop: "2px solid #fff",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
      display: "inline-block",
    }} />
  );
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────
export default function SubscriptionPage() {
  const router = useRouter();

  const [adminId,      setAdminId]      = useState<string | null>(null);
  const [sub,          setSub]          = useState<SubscriptionData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanPeriod>("monthly");
  const [phone,        setPhone]        = useState("");
  const [paying,       setPaying]       = useState(false);
  const [stkSent,      setStkSent]      = useState(false);
  const [polling,      setPolling]      = useState(false);
  const [msg,          setMsg]          = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tab,          setTab]          = useState<"renew" | "history">("renew");

  /* ── Read admin_id from localStorage (same pattern as your other pages) ── */
  useEffect(() => {
    const stored = localStorage.getItem("admin_id") ?? localStorage.getItem("userId");
    setAdminId(stored);
  }, []);

  const fetchSub = useCallback(async (id: string) => {
    try {
      const res  = await fetch(`/api/subscription/status?admin_id=${id}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSub(data);
      if (data.plan && PLANS.find(p => p.id === data.plan)) {
        setSelectedPlan(data.plan);
      }
    } catch {
      setSub(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminId) fetchSub(adminId);
  }, [adminId, fetchSub]);

  async function handlePay() {
    if (!adminId) { setMsg({ type: "error", text: "Session expired. Please log in again." }); return; }
    if (!phone || phone.replace(/\s/g, "").length < 9) {
      setMsg({ type: "error", text: "Enter a valid M-Pesa number (e.g. 0712 345 678)" });
      return;
    }

    setPaying(true);
    setMsg(null);

    try {
      const plan = PLANS.find(p => p.id === selectedPlan)!;

      const res = await fetch("/api/subscription/mpesa/stk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          phone:    phone.replace(/\s/g, ""),
          amount:   plan.price,
          period:   selectedPlan,
          admin_id: adminId,
        }),
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
          clearInterval(iv);
          setPolling(false);
          setStkSent(false);
          setMsg({ type: "success", text: `Payment confirmed!${data.receipt ? ` Receipt: ${data.receipt}` : ""} Redirecting…` });
          if (adminId) fetchSub(adminId);
          setTimeout(() => router.push("/admin/dashboard"), 3000);
          return;
        }

        if (data.failed) {
          clearInterval(iv);
          setPolling(false);
          setStkSent(false);
          setMsg({ type: "error", text: data.reason ?? "Payment was not completed. Please try again." });
          return;
        }
      } catch { /* silent */ }

      if (attempts >= 24) {
        clearInterval(iv);
        setPolling(false);
        setMsg({ type: "error", text: "Payment not confirmed yet. If you paid, it will reflect shortly." });
      }
    }, 5000);
  }

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#111108", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 34, height: 34, border: "2px solid rgba(255,255,255,0.08)", borderTop: "2px solid #f97316", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1rem" }} />
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Loading subscription…</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  const activePlan    = PLANS.find(p => p.id === selectedPlan)!;
  const isCurrentPlan = sub?.plan === selectedPlan && sub?.status === "active";

  return (
    <div style={{ minHeight: "100vh", background: "#111108", fontFamily: "'DM Sans', sans-serif", padding: "2rem", color: "#fff" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "2rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round">
              <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>Subscription</h1>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0, marginTop: 2 }}>Manage your POStore plan &amp; billing</p>
          </div>
        </div>

        {/* ── Status Card ── */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Current Status</div>
              <StatusPill status={sub?.status ?? "none"} daysLeft={sub?.daysLeft ?? null} />
              {sub?.plan && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
                  Plan: <span style={{ color: "#f97316", fontWeight: 600 }}>{planLabel(sub.plan)}</span>
                  {sub.amount != null && (
                    <span style={{ marginLeft: 6 }}>· Ksh {Number(sub.amount).toLocaleString()}</span>
                  )}
                </div>
              )}
            </div>
            {sub?.paidUntil && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                  {sub.status === "expired" ? "Expired On" : "Valid Until"}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: daysLeftColor(sub.daysLeft) }}>
                  {formatDate(sub.paidUntil)}
                </div>
              </div>
            )}
          </div>

          {sub?.status === "active" && sub.daysLeft !== null && (
            <div style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Subscription period</span>
                <span style={{ fontSize: 10, color: daysLeftColor(sub.daysLeft) }}>{sub.daysLeft} days remaining</span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  width: `${Math.min(100, Math.max(2,
                    (sub.daysLeft / ((PLANS.find(p => p.id === sub.plan)?.months ?? 1) * 30)) * 100
                  ))}%`,
                  background: daysLeftColor(sub.daysLeft),
                  transition: "width 0.6s ease",
                }} />
              </div>
            </div>
          )}

          {(sub?.status === "expired" || sub?.status === "due") && (
            <div style={{ marginTop: "0.85rem", padding: "0.6rem 0.85rem", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 8, fontSize: 12, color: "#f97316" }}>
              ⚠️ Your access is restricted. Renew your subscription to continue using POStore.
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: "1.25rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 4 }}>
          {(["renew", "history"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "0.55rem",
              background: tab === t ? "rgba(255,255,255,0.1)" : "transparent",
              border: `1px solid ${tab === t ? "rgba(255,255,255,0.12)" : "transparent"}`,
              borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600,
              color: tab === t ? "#fff" : "rgba(255,255,255,0.4)",
              fontFamily: "inherit", transition: "all 0.15s",
            }}>
              {t === "renew"
                ? "💳  Renew / Pay"
                : `🧾  History${sub?.payments?.length ? ` (${sub.payments.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* ══════ RENEW TAB ══════ */}
        {tab === "renew" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Plan selector */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "1.25rem" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.85rem" }}>
                {sub?.status === "active" ? "Extend / Change Plan" : "Choose a Plan"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PLANS.map(plan => {
                  const isCurrent = sub?.plan === plan.id && sub?.status === "active";
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <button key={plan.id} onClick={() => setSelectedPlan(plan.id)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.9rem 1rem",
                      background: isSelected ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.03)",
                      border: `1.5px solid ${isSelected ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 10, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", textAlign: "left",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${isSelected ? "#f97316" : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {isSelected && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#f97316" }} />}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{plan.label}</span>
                            {plan.badge && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: "#f97316", background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", padding: "2px 7px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                {plan.badge}
                              </span>
                            )}
                            {isCurrent && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", padding: "2px 7px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                Current
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{plan.desc}</span>
                            {plan.saving && <span style={{ fontSize: 10, color: "#22c55e" }}>{plan.saving}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: isSelected ? "#f97316" : "#fff" }}>
                          Ksh {plan.price.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
                          ≈ Ksh {Math.round(plan.price / plan.months).toLocaleString()}/mo
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* M-Pesa form */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 14 }}>📱</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Pay via M-Pesa</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>STK Push — you will get a prompt on your phone</div>
                </div>
              </div>

              <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>
                M-Pesa Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 0712 345 678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                disabled={stkSent}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, padding: "0.7rem 1rem", fontSize: 14, color: "#fff", fontFamily: "inherit", outline: "none", marginBottom: "0.85rem" }}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = "rgba(249,115,22,0.5)"}
                onBlur={e  => (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"}
              />

              {/* Summary */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "0.75rem 0.85rem", marginBottom: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isCurrentPlan && sub?.paidUntil ? 4 : 0 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{activePlan.label} plan</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#f97316" }}>Ksh {activePlan.price.toLocaleString()}</span>
                </div>
                {isCurrentPlan && sub?.paidUntil && (
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                    Will extend your subscription beyond {formatDate(sub.paidUntil)}
                  </div>
                )}
              </div>

              <button
                onClick={handlePay}
                disabled={paying || stkSent || !phone}
                style={{
                  width: "100%", padding: "0.8rem",
                  background: paying || stkSent ? "rgba(249,115,22,0.4)" : "#f97316",
                  border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#fff",
                  cursor: paying || stkSent ? "not-allowed" : "pointer",
                  fontFamily: "inherit", transition: "background 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
                onMouseEnter={e => { if (!paying && !stkSent && phone) (e.currentTarget as HTMLButtonElement).style.background = "#ea6c0a"; }}
                onMouseLeave={e => { if (!paying && !stkSent) (e.currentTarget as HTMLButtonElement).style.background = paying || stkSent ? "rgba(249,115,22,0.4)" : "#f97316"; }}
              >
                {paying          ? <><Spinner /> Sending STK Push…</>
                : stkSent && polling ? <><Spinner /> Waiting for confirmation…</>
                : stkSent        ? "✅ Payment Sent"
                : "📱 Pay with M-Pesa"}
              </button>

              {stkSent && !polling && (
                <button
                  onClick={() => { setStkSent(false); setMsg(null); }}
                  style={{ width: "100%", marginTop: 8, padding: "0.6rem", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, fontSize: 12, color: "rgba(255,255,255,0.4)", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Try again
                </button>
              )}
            </div>

            {msg && (
              <div style={{
                padding: "0.75rem 1rem", borderRadius: 10,
                background: msg.type === "success" ? "rgba(34,197,94,0.1)"  : "rgba(239,68,68,0.1)",
                border: `1px solid ${msg.type === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                fontSize: 13, color: msg.type === "success" ? "#22c55e" : "#ef4444",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span>{msg.type === "success" ? "✅" : "❌"}</span>{msg.text}
              </div>
            )}
          </div>
        )}

        {/* ══════ HISTORY TAB ══════ */}
        {tab === "history" && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, padding: "0 1rem 0.6rem", marginBottom: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {["Date", "Receipt / Ref", "Amount", "Status"].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</div>
              ))}
            </div>
            {sub?.payments?.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sub.payments.map(p => <PaymentRow key={p.id} p={p} />)}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <div style={{ fontSize: 32, marginBottom: "0.75rem" }}>🧾</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>No payments yet</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>Your payment history will appear here</div>
                <button
                  onClick={() => setTab("renew")}
                  style={{ marginTop: "1rem", padding: "0.55rem 1.25rem", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 8, fontSize: 12, color: "#f97316", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                >
                  Make your first payment →
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}