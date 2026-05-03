"use client";
import { useState } from "react";
import Link from "next/link";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #f5f4f0; --surface: #ffffff; --ink: #141410; --ink2: #4a4a40;
    --muted: #9a9a8e; --border: #e2e0d8; --border2: #c8c6bc; --accent: #d4522a;
  }
  html, body { height: 100%; }
  body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--ink); }
  body::before {
    content: ''; position: fixed; inset: 0;
    background-image: linear-gradient(rgba(0,0,0,0.032) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.032) 1px, transparent 1px);
    background-size: 40px 40px; pointer-events: none; z-index: 0;
  }
  .page-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 2rem 1rem; position: relative; z-index: 1;
  }
  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 380px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  }
  .icon-wrap {
    width: 48px; height: 48px; border-radius: 12px; background: #fff4f0;
    border: 1px solid #fde8d8; display: flex; align-items: center; justify-content: center;
    color: var(--accent); margin-bottom: 1.25rem;
  }
  h1 { font-size: 20px; font-weight: 600; color: var(--ink); margin-bottom: 6px; }
  p.sub { font-size: 13px; color: var(--muted); line-height: 1.6; margin-bottom: 1.5rem; }
  .field { margin-bottom: 14px; }
  .field label { display: block; font-size: 11px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; color: var(--ink2); margin-bottom: 5px; }
  .field input { width: 100%; background: var(--surface); border: 1px solid var(--border2); border-radius: 8px; padding: 9px 12px; color: var(--ink); font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
  .field input:focus { border-color: var(--ink); box-shadow: 0 0 0 3px rgba(20,20,16,0.07); }
  .field input::placeholder { color: var(--muted); }
  .btn { width: 100%; padding: 10px; background: var(--ink); color: #fff; border: none; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 4px; transition: background 0.15s, transform 0.1s; }
  .btn:hover { background: #2a2a22; transform: translateY(-1px); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .success-box { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; border-radius: 8px; padding: 12px; font-size: 13px; margin-bottom: 14px; display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; }
  .error-box { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 8px; padding: 9px 12px; font-size: 13px; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
  .back-link { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); text-decoration: none; margin-top: 1.25rem; justify-content: center; transition: color 0.15s; }
  .back-link:hover { color: var(--ink); }
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
          <div className="icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>

          <h1>Reset your password</h1>
          <p className="sub">Enter your email and we will send you a link to reset your password.</p>

          {success ? (
            <div className="success-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
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