// app/staff/component/MpesaPaymentModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";

interface MpesaPaymentModalProps {
  adminId:        string;
  orderId:        string | null;
  orderNumber:    string;
  exactAmount:    number;
  currency:       string;
  onSuccess:      (receipt: string, amountPaid: number, mode: PaymentMode) => void;
  onClose:        () => void;
}

export type PaymentMode =
  | "mpesa_full"
  | "cash_full"
  | "cash_and_mpesa";

export default function MpesaPaymentModal({
  adminId, orderId, orderNumber, exactAmount, currency, onSuccess, onClose,
}: MpesaPaymentModalProps) {

  const [mode,          setMode]          = useState<PaymentMode>("mpesa_full");
  const [customerPhone, setCustomerPhone] = useState("");
  const [mpesaAmount,   setMpesaAmount]   = useState(String(exactAmount));
  const [cashAmount,    setCashAmount]    = useState("");
  const [sending,       setSending]       = useState(false);
  const [error,         setError]         = useState("");
  const [step,          setStep]          = useState<"form" | "waiting" | "done">("form");
  const [receipt,       setReceipt]       = useState<string | null>(null);
  const [manualReceipt, setManualReceipt] = useState("");
  const [countdown,     setCountdown]     = useState(60);
  const [adminTill,     setAdminTill]     = useState<string | null>(null);

  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch admin's till number once on mount for display purposes
  useEffect(() => {
    fetch(`/api/settings?admin_id=${adminId}`)
      .then(r => r.json())
      .then(d => { if (d.mpesa_till) setAdminTill(d.mpesa_till); })
      .catch(() => {});
  }, [adminId]);

  // Recompute M-Pesa amount when mode or cash changes
  useEffect(() => {
    if (mode === "mpesa_full")     setMpesaAmount(String(exactAmount));
    if (mode === "cash_full")      setMpesaAmount("0");
    if (mode === "cash_and_mpesa") {
      const cash      = parseFloat(cashAmount) || 0;
      const remaining = Math.max(0, exactAmount - cash);
      setMpesaAmount(String(remaining));
    }
  }, [mode, cashAmount, exactAmount]);

  // Cleanup intervals on unmount
  useEffect(() => () => {
    if (pollRef.current)      clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const mpesaNum = parseFloat(mpesaAmount) || 0;
  const cashNum  = parseFloat(cashAmount)  || 0;
  const change   = mode === "cash_full" ? Math.max(0, cashNum - exactAmount) : 0;

  // ── Cash-only confirm ────────────────────────────────────────────────
  const handleCashOnly = () => {
    const paid = cashNum > 0 ? cashNum : exactAmount;
    onSuccess("CASH", paid, "cash_full");
  };

  // ── Initiate STK Push ────────────────────────────────────────────────
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
          phone:             customerPhone,   // matches unified route field name
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

      setStep("waiting");
      startPolling(data.checkoutRequestId);
      startCountdown();

    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleMarkPaid = () => {
    const paidAmount = mode === "cash_and_mpesa" ? Math.max(exactAmount, cashNum + mpesaNum) : exactAmount;
    const receiptLabel = manualReceipt.trim() || "MPESA";
    onSuccess(receiptLabel, paidAmount, mode);
  };

  // ── Poll for payment confirmation ────────────────────────────────────
  const startPolling = (cid: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/mpesa/status?checkout_request_id=${cid}`);
        const data = await res.json();

        if (data.status === "completed") {
          stopAll();
          setReceipt(data.mpesaReceipt ?? "MPESA");
          setStep("done");
          onSuccess(data.mpesaReceipt ?? "MPESA", mpesaNum, mode);
        }
        if (data.status === "failed") {
          stopAll();
          setError(data.resultDesc ?? "Payment was cancelled or failed. Try again.");
          setStep("form");
        }
      } catch { /* keep polling silently */ }
    }, 3000);
  };

  const startCountdown = () => {
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          stopAll();
          setError("Payment timed out — customer did not respond to M-Pesa prompt.");
          setStep("form");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const stopAll = () => {
    if (pollRef.current)      { clearInterval(pollRef.current);      pollRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  };

  const handleCancel = () => {
    stopAll();
    setStep("form");
    setError("Payment cancelled.");
  };

  // ── Styles ────────────────────────────────────────────────────────────
  const input: React.CSSProperties = {
    width: "100%", border: "1px solid #e2e0d8", borderRadius: 8,
    padding: "9px 12px", fontSize: 14, fontFamily: "inherit",
    outline: "none", color: "#141410", background: "#fff",
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "#4a4a40",
    textTransform: "uppercase", letterSpacing: "0.5px",
    marginBottom: 5, display: "block",
  };
  const modeBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "10px 6px",
    border: `1.5px solid ${active ? "#141410" : "#e2e0d8"}`,
    background: active ? "#141410" : "#fff",
    color: active ? "#fff" : "#4a4a40",
    borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500,
    fontFamily: "inherit", transition: "all 0.15s", textAlign: "center",
  });
  const primaryBtn = (disabled = false, green = true): React.CSSProperties => ({
    width: "100%", padding: "11px",
    background: disabled ? "#c8c6bc" : green ? "#16a34a" : "#141410",
    color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
    transition: "background 0.15s", marginTop: 4,
  });

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={e => { if (e.target === e.currentTarget && step !== "waiting") onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, boxShadow: "0 24px 60px rgba(0,0,0,0.18)", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f0ede8" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#141410" }}>
              {step === "waiting" ? "Waiting for Payment…" : step === "done" ? "Payment Confirmed ✓" : "Collect Payment"}
            </div>
            <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2 }}>
              {orderNumber} · {currency} {exactAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </div>
          </div>
          {step !== "waiting" && (
            <button onClick={onClose} style={{ background: "#f5f4f0", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 18, color: "#4a4a40", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
          )}
        </div>

        <div style={{ padding: "1.5rem" }}>

          {/* ── WAITING ── */}
          {step === "waiting" && (
            <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#f0fdf4", border: "2px solid #16a34a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", position: "relative" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>
                </svg>
                <div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#16a34a", animation: "spin 1s linear infinite" }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#141410", marginBottom: 6 }}>STK Push Sent</div>
              <div style={{ fontSize: 13, color: "#4a4a40", lineHeight: 1.6, marginBottom: 6 }}>
                Ask the customer to check their phone<br />and enter their M-Pesa PIN
              </div>
              {/* Show till number so staff can confirm */}
              <div style={{ fontSize: 12, color: "#9a9a8e", marginBottom: "1.25rem" }}>
                <strong style={{ color: "#141410" }}>{currency} {mpesaNum.toLocaleString()}</strong>
                {adminTill && <> → Till <strong style={{ color: "#16a34a" }}>{adminTill}</strong></>}
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: countdown <= 15 ? "#fef2f2" : "#f5f4f0", border: `1px solid ${countdown <= 15 ? "#fecaca" : "#e2e0d8"}`, borderRadius: 100, padding: "6px 14px", fontSize: 13, color: countdown <= 15 ? "#dc2626" : "#4a4a40", marginBottom: "1.25rem" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                Expires in {countdown}s
              </div>
              <button onClick={handleCancel} style={{ width: "100%", padding: "10px", background: "none", border: "1px solid #e2e0d8", borderRadius: 9, fontSize: 13, color: "#4a4a40", cursor: "pointer", fontFamily: "inherit" }}>
                Cancel & try again
              </button>
              <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: 12, background: "#f5f4f0", border: "1px solid #d1fae5" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#166534", marginBottom: 8 }}>Already received the M-Pesa payment?</div>
                <input
                  style={input}
                  type="text"
                  placeholder="Receipt number (optional)"
                  value={manualReceipt}
                  onChange={e => setManualReceipt(e.target.value)}
                />
                <button
                  onClick={handleMarkPaid}
                  disabled={mpesaNum <= 0}
                  style={{ ...primaryBtn(mpesaNum <= 0), marginTop: 10 }}
                >
                  Mark as paid and confirm payout
                </button>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#f0fdf4", border: "2px solid #16a34a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#141410", marginBottom: 6 }}>Payment Confirmed!</div>
              <div style={{ fontSize: 13, color: "#4a4a40", marginBottom: 6 }}>
                Receipt: <strong style={{ fontFamily: "monospace", color: "#16a34a" }}>{receipt}</strong>
              </div>
              {adminTill && (
                <div style={{ fontSize: 12, color: "#9a9a8e", marginBottom: "1.25rem" }}>
                  Paid to till <strong>{adminTill}</strong>
                </div>
              )}
              <button onClick={onClose} style={{ width: "100%", padding: "11px", background: "#141410", color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Done
              </button>
            </div>
          )}

          {/* ── FORM ── */}
          {step === "form" && (
            <>
              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#991b1b", marginBottom: "1rem", display: "flex", gap: 8 }}>
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

              {/* Till badge — reassure staff money goes to right place */}
              {adminTill && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", marginBottom: "1.25rem", fontSize: 12, color: "#166534" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  M-Pesa payments go directly to till <strong>{adminTill}</strong>
                </div>
              )}

              {/* Mode selector */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={lbl}>Payment Method</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {([
                    { id: "mpesa_full",     label: "M-Pesa"       },
                    { id: "cash_full",      label: "Cash"          },
                    { id: "cash_and_mpesa", label: "M-Pesa + Cash"    },
                  ] as { id: PaymentMode; label: string }[]).map(opt => (
                    <button key={opt.id} onClick={() => { setMode(opt.id); setError(""); setCashAmount(""); }} style={modeBtn(mode === opt.id)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── M-Pesa full ── */}
              {mode === "mpesa_full" && (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={lbl}>Customer M-Pesa Phone</label>
                    <input style={input} type="tel" placeholder="07XX XXX XXX" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                    <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 4 }}>STK push will be sent to this number</div>
                  </div>
                  <button onClick={handleSendStk} disabled={sending} style={primaryBtn(sending)}>
                    {sending ? "Sending…" : `Send M-Pesa Request · ${currency} ${exactAmount.toLocaleString()}`}
                  </button>

                  <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: 12, background: "#f5f4f0", border: "1px solid #d1fae5" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#166534", marginBottom: 8 }}>Customer already paid via M-Pesa?</div>
                    <input
                      style={input}
                      type="text"
                      placeholder="Receipt number (optional)"
                      value={manualReceipt}
                      onChange={e => setManualReceipt(e.target.value)}
                    />
                    <button
                      onClick={handleMarkPaid}
                      disabled={mpesaNum <= 0}
                      style={{ ...primaryBtn(mpesaNum <= 0), marginTop: 10 }}
                    >
                      Mark as paid and confirm payout
                    </button>
                  </div>
                </>
              )}

              {/* ── Cash full ── */}
              {mode === "cash_full" && (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={lbl}>Cash Received</label>
                    <input style={input} type="number" min="0" placeholder={`${exactAmount}`} value={cashAmount} onChange={e => setCashAmount(e.target.value)} />
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
                  <button onClick={handleCashOnly} disabled={cashNum > 0 && cashNum < exactAmount} style={primaryBtn(cashNum > 0 && cashNum < exactAmount, false)}>
                    {cashNum <= 0
                      ? `Confirm Cash · ${currency} ${exactAmount.toLocaleString()}`
                      : cashNum < exactAmount
                      ? "Amount short"
                      : `Confirm · Change ${currency} ${change.toLocaleString()}`}
                  </button>
                </>
              )}

              {/* ── Split ── */}
              {mode === "cash_and_mpesa" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div>
                      <label style={lbl}>Cash Amount</label>
                      <input style={input} type="number" min="0" placeholder="0" value={cashAmount} onChange={e => setCashAmount(e.target.value)} />
                    </div>
                    <div>
                      <label style={lbl}>M-Pesa Amount</label>
                      <input style={{ ...input, background: "#f5f4f0", color: "#4a4a40" }} readOnly value={mpesaAmount} />
                    </div>
                  </div>
                  {mpesaNum > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={lbl}>Customer M-Pesa Phone</label>
                      <input style={input} type="tel" placeholder="07XX XXX XXX" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                    </div>
                  )}
                  <div style={{ background: "#f5f4f0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#4a4a40", marginBottom: "1rem" }}>
                    Cash <strong>{currency} {cashNum.toLocaleString()}</strong> + M-Pesa <strong>{currency} {mpesaNum.toLocaleString()}</strong> = <strong>{currency} {(cashNum + mpesaNum).toLocaleString()}</strong>
                    {cashNum + mpesaNum < exactAmount && (
                      <span style={{ color: "#dc2626" }}> · short {currency} {(exactAmount - cashNum - mpesaNum).toLocaleString()}</span>
                    )}
                  </div>
                  <button
                    onClick={mpesaNum > 0 ? handleSendStk : handleCashOnly}
                    disabled={sending || (cashNum + mpesaNum < exactAmount)}
                    style={primaryBtn(sending || cashNum + mpesaNum < exactAmount)}
                  >
                    {sending
                      ? "Sending…"
                      : mpesaNum > 0
                      ? `Send M-Pesa · ${currency} ${mpesaNum.toLocaleString()}`
                      : "Confirm Cash Only"}
                  </button>

                  {mpesaNum > 0 && (
                    <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: 12, background: "#f5f4f0", border: "1px solid #d1fae5" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#166534", marginBottom: 8 }}>Customer already paid via M-Pesa?</div>
                      <input
                        style={input}
                        type="text"
                        placeholder="Receipt number (optional)"
                        value={manualReceipt}
                        onChange={e => setManualReceipt(e.target.value)}
                      />
                      <button
                        onClick={handleMarkPaid}
                        disabled={cashNum + mpesaNum < exactAmount}
                        style={{ ...primaryBtn(cashNum + mpesaNum < exactAmount), marginTop: 10 }}
                      >
                        Mark as paid and confirm payout
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}