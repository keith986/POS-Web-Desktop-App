"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --bg: #f5f4f0; --surface: #ffffff; --ink: #141410; --ink2: #4a4a40; --muted: #9a9a8e; --border: #e2e0d8; --border2: #c8c6bc; --accent: #d4522a; }
  html, body { height: 100%; }
  body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--ink); }
  body::before { content: ''; position: fixed; inset: 0; background-image: linear-gradient(rgba(0,0,0,0.032) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.032) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; z-index: 0; }
  .page-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; position: relative; z-index: 1; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 380px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
  .icon-wrap { width: 48px; height: 48px; border-radius: 12px; background: #fff4f0; border: 1px solid #fde8d8; display: flex; align-items: center; justify-content: center; color: var(--accent); margin-bottom: 1.25rem; }
  h1 { font-size: 20px; font-weight: 600; color: var(--ink); margin-bottom: 6px; }
  p.sub { font-size: 13px; color: var(--muted); line-height: 1.6; margin-bottom: 1.5rem; }
  .field { margin-bottom: 14px; }
  .field label { display: block; font-size: 11px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; color: var(--ink2); margin-bottom: 5px; }
  .field input { width: 100%; background: var(--surface); border: 1px solid var(--border2); border-radius: 8px; padding: 9px 12px; color: var(--ink); font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
  .field input:focus { border-color: var(--ink); box-shadow: 0 0 0 3px rgba(20,20,16,0.07); }
  .field input::placeholder { color: var(--muted); }
  .strength { display: flex; gap: 4px; margin-top: 6px; }
  .strength-bar { flex: 1; height: 3px; border-radius: 2px; background: var(--border); transition: background 0.2s; }
  .strength-label { font-size: 11px; color: var(--muted); margin-top: 4px; }
  .btn { width: 100%; padding: 10px; background: var(--ink); color: #fff; border: none; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 4px; transition: background 0.15s, transform 0.1s; }
  .btn:hover { background: #2a2a22; transform: translateY(-1px); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .success-box { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; border-radius: 8px; padding: 12px; font-size: 13px; margin-bottom: 14px; display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; }
  .error-box { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 8px; padding: 9px 12px; font-size: 13px; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
  .invalid-box { text-align: center; padding: 1rem 0; }
  .back-link { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); text-decoration: none; margin-top: 1.25rem; justify-content: center; transition: color 0.15s; }
  .back-link:hover { color: var(--ink); }
  .input-wrap { position: relative; }
  .input-wrap input { padding-right: 38px; }
  .eye-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--muted); padding: 2px; display: flex; align-items: center; transition: color 0.15s; }
  .eye-btn:hover { color: var(--ink); }
`;

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "",        color: "#e2e0d8" },
    { label: "Weak",    color: "#dc2626" },
    { label: "Fair",    color: "#d97706" },
    { label: "Good",    color: "#2563eb" },
    { label: "Strong",  color: "#16a34a" },
  ];
  return { score, ...map[score] };
}

// 1. Add eye icons as SVG components near the top of the file
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

function ResetForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token");

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState("");
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  const strength = getStrength(password);

  useEffect(() => {
    if (!token) { setValidating(false); return; }
    fetch(`/api/reset-password?token=${token}`)
      .then(r => r.json())
      .then(d => { setTokenValid(d.valid); setValidating(false); })
      .catch(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords do not match.");
    if (strength.score < 2)   return setError("Please choose a stronger password.");
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
      setTimeout(() => router.push("/"), 3000);
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (validating) return (
    <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)", fontSize: 13 }}>
      Validating reset link…
    </div>
  );

  return (
    <div className="card">
      <div className="icon-wrap">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>

      {!tokenValid ? (
        <div className="invalid-box">
          <div style={{ fontSize: 32, marginBottom: 12, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h1 style={{ marginBottom: 8 }}>Link expired</h1>
          <p className="sub">This reset link is invalid or has expired. Please request a new one.</p>
          <Link href="/forgot-password" className="btn" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "1rem" }}>
            Request new link
          </Link>
        </div>
      ) : success ? (
        <>
          <div className="success-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Password updated! Redirecting you to sign in…</span>
          </div>
        </>
      ) : (
        <>
          <h1>Set new password</h1>
          <p className="sub">Choose a strong password for your account.</p>

          {error && <div className="error-box"><span>⚠</span> {error}</div>}

          <form onSubmit={handleSubmit}>
<div className="field">
  <label>New password</label>
  <div className="input-wrap">
    <input
      type={showPassword ? "text" : "password"}
      placeholder="Enter new password"
      value={password}
      onChange={e => setPassword(e.target.value)}
      autoComplete="new-password"
    />
    <button type="button" className="eye-btn" onClick={() => setShowPassword(p => !p)}>
      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  </div>
  {password && (
    <>
      <div className="strength">
        {[1,2,3,4].map(i => (
          <div key={i} className="strength-bar" style={{ background: i <= strength.score ? strength.color : "#e2e0d8" }} />
        ))}
      </div>
      <div className="strength-label" style={{ color: strength.color }}>{strength.label}</div>
    </>
  )}
</div>

<div className="field">
  <label>Confirm password</label>
  <div className="input-wrap">
    <input
      type={showConfirm ? "text" : "password"}
      placeholder="Confirm new password"
      value={confirm}
      onChange={e => setConfirm(e.target.value)}
      autoComplete="new-password"
    />
    <button type="button" className="eye-btn" onClick={() => setShowConfirm(p => !p)}>
      {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  </div>
</div>
            <button className="btn" disabled={loading || !password || !confirm}>
              {loading ? "Updating…" : "Update password →"}
            </button>
          </form>
        </>
      )}

      <Link href="/" className="back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to sign in
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <style>{css}</style>
      <div className="page-wrap">
        <Suspense fallback={<div style={{ fontSize: 13, color: "#9a9a8e" }}>Loading…</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </>
  );
}