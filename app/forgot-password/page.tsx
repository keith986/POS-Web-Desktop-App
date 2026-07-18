"use client";
import { useState } from "react";
import Link from "next/link";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --teal: #175D5A; --teal-deep: #0F413F; --yellow: #F4B93D;
    --cream: #FBF7EE; --ink: #231F1B; --ink-soft: #6E655A; --coral: #E85B3F;
  }
  html, body { height: 100%; }
  body {
    font-family: 'IBM Plex Sans', sans-serif; background: #E7DFCB; color: var(--ink);
    min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2.5rem 1rem;
  }
  .page-wrap { width: 100%; display: flex; align-items: center; justify-content: center; }
  .card {
    background: var(--cream); border-radius: 22px; padding: 3rem 2.8rem; width: 100%; max-width: 400px;
    box-shadow: 0 40px 80px -26px rgba(15,20,18,0.45);
  }
  .icon-wrap {
    width: 52px; height: 52px; border-radius: 50%; background: var(--yellow);
    display: flex; align-items: center; justify-content: center;
    color: var(--teal-deep); margin-bottom: 1.4rem; box-shadow: 0 6px 0 rgba(15,65,63,0.35);
  }
  h1 { font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 24px; color: var(--ink); margin-bottom: 8px; }
  p.sub { font-size: 13.5px; color: var(--ink-soft); line-height: 1.6; margin-bottom: 1.8rem; }
  .field { margin-bottom: 18px; }
  .field label { display: block; font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; font-weight: 600; color: var(--ink); margin-bottom: 8px; }
  .field input {
    width: 100%; border: none; background: #F1EADA; outline: none; border-radius: 12px;
    font-family: 'IBM Plex Sans', sans-serif; font-size: 14.5px; color: var(--ink);
    padding: 14px 16px; transition: box-shadow .15s;
  }
  .field input:focus { box-shadow: 0 0 0 2.5px var(--teal); }
  .field input::placeholder { color: #A79A85; }
  .btn {
    width: 100%; padding: 16px 0; background: var(--teal); color: var(--cream); border: none;
    border-radius: 14px; font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 15px;
    cursor: pointer; margin-top: 6px; box-shadow: 0 5px 0 var(--teal-deep); transition: transform .1s;
  }
  .btn:hover:not(:disabled) { transform: translateY(2px); box-shadow: 0 3px 0 var(--teal-deep); }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .success-box { background: rgba(23,93,90,0.10); border: 1px solid rgba(23,93,90,0.3); color: var(--teal-deep); border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; }
  .error-box { background: rgba(232,91,63,0.10); border: 1px solid rgba(232,91,63,0.35); color: var(--coral); border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .back-link { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink-soft); text-decoration: none; margin-top: 1.6rem; justify-content: center; transition: color 0.15s; }
  .back-link:hover { color: var(--teal); }
`;

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError("Please enter your email.");
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{css}</style>
      <div className="page-wrap">
        <div className="card">
          <div className="icon-wrap" style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 22 }}>P</div>

          <h1>Reset your password</h1>
          <p className="sub">Enter your email and we will send you a link to reset your password.</p>

          {success ? (
            <div className="success-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#175D5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Check your email! We have sent a password reset link to <strong>{email}</strong>. It expires in 1 hour.</span>
            </div>
          ) : (
            <>
              {error && <div className="error-box"><span>⚠</span> {error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>Email address</label>
                  <input type="email" placeholder="you@yourstore.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <button className="btn" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link →"}
                </button>
              </form>
            </>
          )}

          <Link href="/" className="back-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to sign in
          </Link>
        </div>
      </div>
    </>
  );
}