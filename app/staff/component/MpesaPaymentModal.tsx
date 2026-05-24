// app/staff/component/MpesaPaymentModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";

interface MpesaPaymentModalProps {
  adminId:        string;
  orderId:        string | null;     // null if order not created yet
  orderNumber:    string;
  exactAmount:    number;            // sale total
  currency:       string;
  onSuccess:      (receipt: string, amountPaid: number, mode: PaymentMode) => void;
  onClose:        () => void;
}

// How the customer is paying
type PaymentMode =
  | "mpesa_full"        // full amount via STK push
  | "cash_full"         // full amount cash
  | "cash_and_mpesa";   // split: part cash + part mpesa

export default function MpesaPaymentModal({
  adminId, orderId, orderNumber, exactAmount, currency, onSuccess, onClose,
}: MpesaPaymentModalProps) {

  const [mode,           setMode]           = useState<PaymentMode>("mpesa_full");
  const [customerPhone,  setCustomerPhone]  = useState("");
  const [mpesaAmount,    setMpesaAmount]    = useState(String(exactAmount));
  const [cashAmount,     setCashAmount]     = useState("0");
  const [sending,        setSending]        = useState(false);
  const [polling,        setPolling]        = useState(false);
  const [checkoutId,     setCheckoutId]     = useState<string | null>(null);
  const [error,          setError]          = useState("");
  const [step,           setStep]           = useState<"form" | "waiting" | "done">("form");
  const [receipt,        setReceipt]        = useState<string | null>(null);
  const [countdown,      setCountdown]      = useState(60); // seconds before STK times out

  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recompute mpesa amount when mode/cash changes
  useEffect(() => {
    if (mode === "mpesa_full")     setMpesaAmount(String(exactAmount));
    if (mode === "cash_full")      setMpesaAmount("0");
    if (mode === "cash_and_mpesa") {
      const cash = parseFloat(cashAmount) || 0;
      const remaining = Math.max(0, exactAmount - cash);
      setMpesaAmount(String(remaining));
    }
  }, [mode, cashAmount, exactAmount]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (pollRef.current)      clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const mpesaNum   = parseFloat(mpesaAmount) || 0;
  const cashNum    = parseFloat(cashAmount)  || 0;
  const totalCover = mpesaNum + (mode === "cash_and_mpesa" ? cashNum : mode === "cash_full" ? exactAmount : 0);
  const change     = mode === "cash_full" ? Math.max(0, cashNum - exactAmount) : 0;

  // ── Cash-only — no STK needed ──────────────────────────────────────────
  const handleCashOnly = () => {
    const paid = parseFloat(cashAmount) || exactAmount;
    onSuccess("CASH", paid, "cash_full");
  };

  // ── Initiate STK Push ──────────────────────────────────────────────────
  const handleSendStk = async () => {
    setError("");
    if (!customerPhone.trim()) { setError("Enter customer phone number"); return; }
    if (mpesaNum <= 0)         { setError("M-Pesa amount must be greater than 0"); return; }

    setSending(true);
    try {
      const res = await fetch("/api/mpesa/stk-push", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_id:          adminId,
          order_id:          orderId,
          customer_phone:    customerPhone,
          amount:            mpesaNum,
          account_reference: orderNumber,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to send STK push");
        setSending(false);
        return;
      }

      setCheckoutId(data.checkoutRequestId);
      setStep("waiting");
      startPolling(data.checkoutRequestId);
      startCountdown();

    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // ── Poll for payment status ────────────────────────────────────────────
  const startPolling = (cid: string) => {
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/mpesa/status?checkout_request_id=${cid}`);
        const data = await res.json();

        if (data.status === "completed") {
          stopPolling();
          setReceipt(data.mpesaReceipt ?? "MPESA");
          setStep("done");
          onSuccess(data.mpesaReceipt ?? "MPESA", mpesaNum, mode);
        }

        if (data.status === "failed") {
          stopPolling();
          setError(data.resultDesc ?? "Payment was cancelled or failed. Try again.");
          setStep("form");
        }
      } catch { /* silent — keep polling */ }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollRef.current)      { clearInterval(pollRef.current);      pollRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setPolling(false);
  };

  const startCountdown = () => {
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          stopPolling();
          setError("Payment timed out. Customer did not complete M-Pesa prompt.");
          setStep("form");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleCancel = () => {
    stopPolling();
    setStep("form");
    setError("Payment cancelled.");
  };

  // ── Styles ──────────────────────────────────────────────────────────────
  const s = {
    overlay: {
      position: "fixed" as const, inset: 0,
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    },
    modal: {
      background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420,
      boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
      fontFamily: "'DM Sans', sans-serif", overflow: "hidden",
    },
    header: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "1.25rem 1.5rem", borderBottom: "1px solid #f0ede8",
    },
    body:   { padding: "1.5rem" },
    label:  { fontSize: 11, fontWeight: 600, color: "#4a4a40", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 5, display: "block" },
    input:  { width: "100%", border: "1px solid #e2e0d8", borderRadius: 8, padding: "9px 12px", fontSize: 14, fontFamily: "inherit", outline: "none", color: "#141410" },
    modeBtn: (active: boolean) => ({
      flex: 1, padding: "10px 8px", border: `1.5px solid ${active ? "#141410" : "#e2e0d8"}`,
      background: active ? "#141410" : "#fff", color: active ? "#fff" : "#4a4a40",
      borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500,
      fontFamily: "inherit", transition: "all 0.15s", textAlign: "center" as const,
    }),
    primaryBtn: (disabled = false) => ({
      width: "100%", padding: "11px", background: disabled ? "#9a9a8e" : "#16a34a",
      color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
      transition: "background 0.15s", marginTop: 4,
    }),
    cashBtn: {
      width: "100%", padding: "11px", background: "#141410",
      color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 600,
      cursor: "pointer", fontFamily: "inherit", marginTop: 4,
    },
  };

  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={s.modal}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#141410" }}>
              {step === "waiting" ? "Waiting for Payment…" : step === "done" ? "Payment Received ✓" : "Collect Payment"}
            </div>
            <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2 }}>
              {orderNumber} · {currency} {exactAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </div>
          </div>
          {step !== "waiting" && (
            <button onClick={onClose} style={{ background: "#f5f4f0", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 16, color: "#4a4a40", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          )}
        </div>

        <div style={s.body}>

          {/* ── WAITING SCREEN ── */}
          {step === "waiting" && (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              {/* Animated M-Pesa spinner */}
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#f0fdf4", border: "2px solid #16a34a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", position: "relative" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2"/>
                  <path d="M12 18h.01"/>
                </svg>
                {/* Spinning ring */}
                <div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#16a34a", animation: "spin 1s linear infinite" }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>

              <div style={{ fontSize: 15, fontWeight: 600, color: "#141410", marginBottom: 6 }}>
                STK Push Sent
              </div>
              <div style={{ fontSize: 13, color: "#4a4a40", lineHeight: 1.6, marginBottom: 4 }}>
                Ask the customer to check their phone<br />
                and enter their M-Pesa PIN to pay
              </div>
              <div style={{ fontSize: 12, color: "#9a9a8e", marginBottom: "1.5rem" }}>
                <strong style={{ color: "#141410" }}>{currency} {mpesaNum.toLocaleString()}</strong> → Till {" "}
                <strong style={{ color: "#141410" }}>auto</strong>
              </div>

              {/* Countdown */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: countdown <= 15 ? "#fef2f2" : "#f5f4f0", border: `1px solid ${countdown <= 15 ? "#fecaca" : "#e2e0d8"}`, borderRadius: 100, padding: "6px 14px", fontSize: 13, color: countdown <= 15 ? "#dc2626" : "#4a4a40", marginBottom: "1.5rem" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                Expires in {countdown}s
              </div>

              <button onClick={handleCancel} style={{ width: "100%", padding: "10px", background: "none", border: "1px solid #e2e0d8", borderRadius: 9, fontSize: 13, color: "#4a4a40", cursor: "pointer", fontFamily: "inherit" }}>
                Cancel & try again
              </button>
            </div>
          )}

          {/* ── DONE SCREEN ── */}
          {step === "done" && (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#f0fdf4", border: "2px solid #16a34a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#141410", marginBottom: 6 }}>Payment Confirmed!</div>
              <div style={{ fontSize: 13, color: "#4a4a40", marginBottom: 16 }}>
                Receipt: <strong>{receipt}</strong>
              </div>
              <button onClick={onClose} style={s.cashBtn}>Done</button>
            </div>
          )}

          {/* ── FORM ── */}
          {step === "form" && (
            <>
              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#991b1b", marginBottom: "1rem", display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span>⚠</span><span>{error}</span>
                </div>
              )}

              {/* Amount due */}
              <div style={{ background: "#f5f4f0", borderRadius: 10, padding: "12px 16px", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#4a4a40" }}>Amount Due</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#141410" }}>
                  {currency} {exactAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Payment mode selector */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={s.label}>Payment Method</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {([
                    { id: "mpesa_full",    label: "M-Pesa"      },
                    { id: "cash_full",     label: "Cash"        },
                    { id: "cash_and_mpesa", label: "Cash + M-Pesa" },
                  ] as { id: PaymentMode; label: string }[]).map(opt => (
                    <button key={opt.id} onClick={() => { setMode(opt.id); setError(""); }} style={s.modeBtn(mode === opt.id)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── M-Pesa full ── */}
              {mode === "mpesa_full" && (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={s.label}>Customer M-Pesa Phone</label>
                    <input style={s.input} type="tel" placeholder="07XX XXX XXX" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                    <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 4 }}>STK push will be sent to this number</div>
                  </div>
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#166534", marginBottom: "1rem" }}>
                    Customer will receive a prompt to pay <strong>{currency} {exactAmount.toLocaleString()}</strong> to the store till
                  </div>
                  <button onClick={handleSendStk} disabled={sending} style={s.primaryBtn(sending)}>
                    {sending ? "Sending STK Push…" : `Send M-Pesa Request — ${currency} ${exactAmount.toLocaleString()}`}
                  </button>
                </>
              )}

              {/* ── Cash full ── */}
              {mode === "cash_full" && (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={s.label}>Cash Received</label>
                    <input style={s.input} type="number" min="0" placeholder={String(exactAmount)} value={cashAmount} onChange={e => setCashAmount(e.target.value)} />
                  </div>
                  {cashNum > 0 && cashNum >= exactAmount && (
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#166534", marginBottom: "1rem" }}>
                      Change to give: <strong>{currency} {change.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</strong>
                    </div>
                  )}
                  {cashNum > 0 && cashNum < exactAmount && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#991b1b", marginBottom: "1rem" }}>
                      Short by: <strong>{currency} {(exactAmount - cashNum).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</strong>
                    </div>
                  )}
                  <button onClick={handleCashOnly} disabled={cashNum < exactAmount} style={s.primaryBtn(cashNum < exactAmount)}>
                    {cashNum <= 0 ? `Confirm Cash — ${currency} ${exactAmount.toLocaleString()}` : cashNum < exactAmount ? "Amount short" : `Confirm Cash — Change ${currency} ${change.toLocaleString()}`}
                  </button>
                </>
              )}

              {/* ── Cash + M-Pesa split ── */}
              {mode === "cash_and_mpesa" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div>
                      <label style={s.label}>Cash Amount</label>
                      <input style={s.input} type="number" min="0" placeholder="0" value={cashAmount} onChange={e => setCashAmount(e.target.value)} />
                    </div>
                    <div>
                      <label style={s.label}>M-Pesa Amount</label>
                      <input style={{ ...s.input, background: "#f5f4f0", color: "#4a4a40" }} readOnly value={mpesaAmount} />
                    </div>
                  </div>
                  {mpesaNum > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={s.label}>Customer M-Pesa Phone</label>
                      <input style={s.input} type="tel" placeholder="07XX XXX XXX" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                    </div>
                  )}
                  <div style={{ background: "#f5f4f0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#4a4a40", marginBottom: "1rem" }}>
                    Cash: <strong>{currency} {cashNum.toLocaleString()}</strong> + M-Pesa: <strong>{currency} {mpesaNum.toLocaleString()}</strong> = <strong>{currency} {(cashNum + mpesaNum).toLocaleString()}</strong>
                    {cashNum + mpesaNum < exactAmount && <span style={{ color: "#dc2626" }}> (short by {currency} {(exactAmount - cashNum - mpesaNum).toLocaleString()})</span>}
                  </div>
                  <button
                    onClick={mpesaNum > 0 ? handleSendStk : handleCashOnly}
                    disabled={sending || (cashNum + mpesaNum < exactAmount)}
                    style={s.primaryBtn(sending || cashNum + mpesaNum < exactAmount)}
                  >
                    {sending ? "Sending STK Push…" : mpesaNum > 0 ? `Send M-Pesa for ${currency} ${mpesaNum.toLocaleString()}` : `Confirm Cash Only`}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}