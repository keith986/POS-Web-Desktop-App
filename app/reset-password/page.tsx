"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  .strength { display: flex; gap: 4px; margin-top: 8px; }
  .strength-bar { flex: 1; height: 4px; border-radius: 2px; background: #EAE1CC; transition: background 0.2s; }
  .strength-label { font-size: 11.5px; color: var(--ink-soft); margin-top: 6px; font-weight: 600; }
  .btn {
    width: 100%; padding: 16px 0; background: var(--teal); color: var(--cream); border: none;
    border-radius: 14px; font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 15px;
    cursor: pointer; margin-top: 6px; box-shadow: 0 5px 0 var(--teal-deep); transition: transform .1s;
  }
  .btn:hover:not(:disabled) { transform: translateY(2px); box-shadow: 0 3px 0 var(--teal-deep); }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .success-box { background: rgba(23,93,90,0.10); border: 1px solid rgba(23,93,90,0.3); color: var(--teal-deep); border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; }
  .error-box { background: rgba(232,91,63,0.10); border: 1px solid rgba(232,91,63,0.35); color: var(--coral); border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .invalid-box { text-align: center; padding: 1rem 0; }
  .back-link { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink-soft); text-decoration: none; margin-top: 1.6rem; justify-content: center; transition: color 0.15s; }
  .back-link:hover { color: var(--teal); }
  .input-wrap { position: relative; }
  .input-wrap input { padding-right: 44px; }
  .eye-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--ink-soft); padding: 2px; display: flex; align-items: center; transition: color 0.15s; }
  .eye-btn:hover { color: var(--teal); }
`;

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "",        color: "#EAE1CC" },
    { label: "Weak",    color: "#E85B3F" },
    { label: "Fair",    color: "#F4B93D" },
    { label: "Good",    color: "#0F413F" },
    { label: "Strong",  color: "#175D5A" },
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
    <div style={{ textAlign: "center", padding: "2rem", color: "#6E655A", fontSize: 13 }}>
      Validating reset link…
    </div>
  );

  return (
    <div className="card">
      <div className="icon-wrap" style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 22 }}>P</div>

      {!tokenValid ? (
        <div className="invalid-box">
          <div style={{ fontSize: 32, marginBottom: 12, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E85B3F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#175D5A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
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
          <div key={i} className="strength-bar" style={{ background: i <= strength.score ? strength.color : "#EAE1CC" }} />
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
        <Suspense fallback={<div style={{ fontSize: 13, color: "#6E655A" }}>Loading…</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </>
  );
}