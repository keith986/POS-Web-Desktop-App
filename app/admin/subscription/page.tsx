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
  { id: "monthly",   label: "Monthly",   price: 1500,  months: 1,  desc: "Billed every month"     },
  { id: "quarterly", label: "Quarterly", price: 4000,  months: 3,  desc: "Billed every 3 months", badge: "Popular", saving: "Save Ksh 500"   },
  { id: "yearly",    label: "Yearly",    price: 14000, months: 12, desc: "Billed once a year",     saving: "Save Ksh 4,000" },
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
  if (days === null || days <= 0) return "#dc2626";
  if (days > 14) return "#16a34a";
  if (days > 7)  return "#ea580c";
  return "#dc2626";
}

function planLabel(plan: PlanPeriod | null): string {
  return PLANS.find(p => p.id === plan)?.label ?? plan ?? "—";
}

/** Try every key your app might store the user ID under */
function resolveAdminId(): string | null {
  const keys = ["admin_id", "userId", "user_id", "adminId", "id"];
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    if (/^[0-9a-f-]{8,}$/i.test(raw.trim())) return raw.trim();
    try {
      const p = JSON.parse(raw);
      const id = p?.id ?? p?.admin_id ?? p?.userId ?? p?.user_id;
      if (typeof id === "string" && id.length > 4) return id;
    } catch { /* not JSON */ }
  }
  return null;
}

// ─────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────
function StatusBadge({ status, daysLeft }: { status: SubStatus; daysLeft: number | null }) {
  const cfg = {
    active:  { bg: "#dcfce7", color: "#16a34a", dot: "#16a34a", label: daysLeft !== null ? `Active · ${daysLeft}d left` : "Active" },
    expired: { bg: "#fee2e2", color: "#dc2626", dot: "#dc2626", label: "Expired"         },
    due:     { bg: "#ffedd5", color: "#ea580c", dot: "#ea580c", label: "Payment Due"     },
    none:    { bg: "#f3f4f6", color: "#6b7280", dot: "#9ca3af", label: "No Subscription" },
  }[status];

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: cfg.bg, borderRadius: 100, padding: "5px 13px", fontSize: 12, fontWeight: 600, color: cfg.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function PaymentRow({ p }: { p: Payment }) {
  const s = {
    success: { color: "#16a34a", bg: "#dcfce7", label: "Paid"    },
    failed:  { color: "#dc2626", bg: "#fee2e2", label: "Failed"  },
    pending: { color: "#ea580c", bg: "#ffedd5", label: "Pending" },
  }[p.status];

  return (
    <tr
      style={{ borderBottom: "1px solid #f3f4f6", transition: "background 0.1s" }}
      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#f9fafb"}
      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
    >
      <td style={{ padding: "13px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{formatDate(p.date)}</div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, textTransform: "capitalize" }}>{p.period}</div>
      </td>
      <td style={{ padding: "13px 16px" }}>
        <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>
          {p.mpesaReceipt ?? (p.checkoutRequestId ? `···${p.checkoutRequestId.slice(-6)}` : "—")}
        </span>
      </td>
      <td style={{ padding: "13px 16px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Ksh {p.amount.toLocaleString()}</span>
      </td>
      <td style={{ padding: "13px 16px" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, padding: "3px 10px", borderRadius: 100 }}>
          {s.label}
        </span>
      </td>
    </tr>
  );
}

function Spinner({ size = 16, color = "#ea580c" }: { size?: number; color?: string }) {
  return (
    <span style={{ width: size, height: size, border: `2px solid #e5e7eb`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block", flexShrink: 0 }} />
  );
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────
export default function SubscriptionPage() {
  const router = useRouter();

  const [adminId,      setAdminId]      = useState<string | null | undefined>(undefined); // undefined = not yet resolved
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

  /* ── Step 1: resolve admin_id on mount ── */
  useEffect(() => {
    const id = resolveAdminId();
    if (id) { setAdminId(id); return; }

    // Fall back to /api/auth/me (cookie-based session)
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const id = data?.id ?? data?.admin_id ?? data?.userId ?? data?.user_id;
        setAdminId(typeof id === "string" ? id : null);
      })
      .catch(() => setAdminId(null));
  }, []);

  /* ── Step 2: fetch subscription once we have adminId ── */
  const fetchSub = useCallback(async (id: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/subscription/status?admin_id=${id}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? `Server error ${res.status}`);
      }
      const data = await res.json() as SubscriptionData;
      setSub(data);
      if (data.plan && PLANS.find(p => p.id === data.plan)) {
        setSelectedPlan(data.plan);
      }
    } catch (e) {
      setFetchError((e as Error).message);
      setSub(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminId === undefined) return; // still resolving
    if (adminId === null) {
      setLoading(false);
      setFetchError("Could not determine your account. Please log out and log in again.");
      return;
    }
    fetchSub(adminId);
  }, [adminId, fetchSub]);

  /* ── Pay handler ── */
  async function handlePay() {
    if (!adminId) { setMsg({ type: "error", text: "Session expired. Please log in again." }); return; }
    const cleaned = phone.replace(/\s/g, "");
    if (cleaned.length < 9) {
      setMsg({ type: "error", text: "Enter a valid M-Pesa number (e.g. 0712 345 678)" });
      return;
    }
    setPaying(true); setMsg(null);
    try {
      const plan = PLANS.find(p => p.id === selectedPlan)!;
      const res  = await fetch("/api/subscription/mpesa/stk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned, amount: plan.price, period: selectedPlan, admin_id: adminId }),
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
          if (adminId) fetchSub(adminId);
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

  /* ── Derived values ── */
  const activePlan    = PLANS.find(p => p.id === selectedPlan)!;
  const isCurrentPlan = sub?.plan === selectedPlan && sub?.status === "active";

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: "#111827" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input::placeholder { color: #9ca3af; }
        input:focus { outline: none; border-color: #ea580c !important; box-shadow: 0 0 0 3px rgba(234,88,12,0.1); }
      `}</style>

      {/* ── Page header — matches Staff page style ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "#111827" }}>Subscription</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>
            {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        {sub?.status === "active" && (
          <span style={{ fontSize: 12, fontWeight: 600, background: "#dcfce7", color: "#16a34a", padding: "6px 14px", borderRadius: 8 }}>
            {planLabel(sub.plan)} Plan
          </span>
        )}
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 860, margin: "0 auto" }}>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "80px 32px", textAlign: "center" }}>
            <Spinner size={28} />
            <p style={{ color: "#6b7280", fontSize: 14, margin: "14px 0 0" }}>Loading subscription…</p>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && fetchError && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: "#dc2626", fontSize: 14, fontWeight: 500, margin: "0 0 16px" }}>{fetchError}</p>
            {adminId && (
              <button
                onClick={() => fetchSub(adminId)}
                style={{ padding: "9px 22px", background: "#ea580c", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* ── Main content ── */}
        {!loading && !fetchError && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Status card */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Current Status</div>
                  <StatusBadge status={sub?.status ?? "none"} daysLeft={sub?.daysLeft ?? null} />
                  {sub?.plan && (
                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
                      Plan: <span style={{ color: "#ea580c", fontWeight: 600 }}>{planLabel(sub.plan)}</span>
                      {sub.amount != null && <span style={{ marginLeft: 6, color: "#374151" }}>· Ksh {Number(sub.amount).toLocaleString()}</span>}
                    </div>
                  )}
                </div>
                {sub?.paidUntil && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                      {sub.status === "expired" ? "Expired On" : "Valid Until"}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: daysLeftColor(sub.daysLeft) }}>
                      {formatDate(sub.paidUntil)}
                    </div>
                  </div>
                )}
              </div>

              {sub?.status === "active" && sub.daysLeft !== null && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Subscription period</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: daysLeftColor(sub.daysLeft) }}>{sub.daysLeft} days remaining</span>
                  </div>
                  <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3, transition: "width 0.6s ease",
                      background: daysLeftColor(sub.daysLeft),
                      width: `${Math.min(100, Math.max(2, (sub.daysLeft / ((PLANS.find(p => p.id === sub.plan)?.months ?? 1) * 30)) * 100))}%`,
                    }} />
                  </div>
                </div>
              )}

              {(sub?.status === "expired" || sub?.status === "due") && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, fontSize: 13, color: "#ea580c" }}>
                  ⚠️ Your access is restricted. Renew your subscription to continue using POStore.
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 2, background: "#f3f4f6", borderRadius: 10, padding: 4 }}>
              {(["renew", "history"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: "8px 16px",
                  background: tab === t ? "#fff" : "transparent",
                  border: tab === t ? "1px solid #e5e7eb" : "1px solid transparent",
                  borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600,
                  color: tab === t ? "#111827" : "#6b7280",
                  fontFamily: "inherit", transition: "all 0.15s",
                  boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}>
                  {t === "renew" ? "💳  Renew / Pay" : `🧾  Payment History${sub?.payments?.length ? ` (${sub.payments.length})` : ""}`}
                </button>
              ))}
            </div>

            {/* RENEW TAB */}
            {tab === "renew" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Plan selector */}
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px" }}>
                  <h3 style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {sub?.status === "active" ? "Extend / Change Plan" : "Choose a Plan"}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {PLANS.map(plan => {
                      const isCurrent  = sub?.plan === plan.id && sub?.status === "active";
                      const isSelected = selectedPlan === plan.id;
                      return (
                        <button key={plan.id} onClick={() => setSelectedPlan(plan.id)} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "14px 16px",
                          background: isSelected ? "#fff7ed" : "#fff",
                          border: `1.5px solid ${isSelected ? "#ea580c" : "#e5e7eb"}`,
                          borderRadius: 10, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", textAlign: "left",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${isSelected ? "#ea580c" : "#d1d5db"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ea580c" }} />}
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{plan.label}</span>
                                {plan.badge && <span style={{ fontSize: 10, fontWeight: 700, color: "#ea580c", background: "#fff7ed", border: "1px solid #fed7aa", padding: "2px 8px", borderRadius: 100, textTransform: "uppercase" }}>{plan.badge}</span>}
                                {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: 100, textTransform: "uppercase" }}>Current</span>}
                              </div>
                              <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                                <span style={{ fontSize: 12, color: "#6b7280" }}>{plan.desc}</span>
                                {plan.saving && <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 500 }}>{plan.saving}</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: isSelected ? "#ea580c" : "#111827" }}>Ksh {plan.price.toLocaleString()}</div>
                            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>≈ Ksh {Math.round(plan.price / plan.months).toLocaleString()}/mo</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* M-Pesa */}
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📱</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Pay via M-Pesa</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>STK Push — you will get a prompt on your phone</div>
                    </div>
                  </div>

                  <label style={{ fontSize: 12, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>M-Pesa Phone Number</label>
                  <input
                    type="tel" placeholder="e.g. 0712 345 678"
                    value={phone} onChange={e => setPhone(e.target.value)} disabled={stkSent}
                    style={{ width: "100%", background: stkSent ? "#f9fafb" : "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#111827", fontFamily: "inherit", marginBottom: 14, transition: "border-color 0.15s, box-shadow 0.15s" }}
                  />

                  <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#6b7280" }}>{activePlan.label} plan</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#ea580c" }}>Ksh {activePlan.price.toLocaleString()}</span>
                    </div>
                    {isCurrentPlan && sub?.paidUntil && (
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                        Will extend your subscription beyond {formatDate(sub.paidUntil)}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handlePay} disabled={paying || stkSent || !phone}
                    style={{ width: "100%", padding: "11px", background: paying || stkSent || !phone ? "#fed7aa" : "#ea580c", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#fff", cursor: paying || stkSent || !phone ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    {paying              ? <><Spinner size={14} color="#fff" />Sending STK Push…</>
                    : stkSent && polling  ? <><Spinner size={14} color="#fff" />Waiting for confirmation…</>
                    : stkSent            ? "✅ Payment Sent"
                    : "📱 Pay with M-Pesa"}
                  </button>

                  {stkSent && !polling && (
                    <button onClick={() => { setStkSent(false); setMsg(null); }} style={{ width: "100%", marginTop: 8, padding: "9px", background: "transparent", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, color: "#6b7280", cursor: "pointer", fontFamily: "inherit" }}>
                      Try again
                    </button>
                  )}
                </div>

                {msg && (
                  <div style={{ padding: "12px 16px", borderRadius: 8, background: msg.type === "success" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msg.type === "success" ? "#bbf7d0" : "#fecaca"}`, fontSize: 13, color: msg.type === "success" ? "#16a34a" : "#dc2626", display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ flexShrink: 0 }}>{msg.type === "success" ? "✅" : "❌"}</span>
                    {msg.text}
                  </div>
                )}
              </div>
            )}

            {/* HISTORY TAB */}
            {tab === "history" && (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      {["Date", "Receipt / Ref", "Amount", "Status"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sub?.payments?.length ? sub.payments.map(p => <PaymentRow key={p.id} p={p} />) : (
                      <tr>
                        <td colSpan={4} style={{ padding: "56px 32px", textAlign: "center" }}>
                          <div style={{ fontSize: 28, marginBottom: 10 }}>🧾</div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>No payments yet</div>
                          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Your payment history will appear here</div>
                          <button onClick={() => setTab("renew")} style={{ marginTop: 16, padding: "8px 20px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, fontSize: 13, color: "#ea580c", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                            Make your first payment →
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {!!sub?.payments?.length && (
                  <div style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", fontSize: 12, color: "#9ca3af" }}>
                    Showing {sub.payments.length} transaction{sub.payments.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}