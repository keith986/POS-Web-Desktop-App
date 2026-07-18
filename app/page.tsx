"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  .page-wrap {
    width: 100%; max-width: 960px; min-height: 580px;
    display: grid; grid-template-columns: 0.9fr 1fr;
    border-radius: 22px; overflow: hidden;
    box-shadow: 0 40px 80px -26px rgba(15,20,18,0.45);
  }

  /* ---------- LEFT: painted signboard ---------- */
  .left {
    position: relative; background: var(--teal);
    padding: 2.8rem 2.6rem; display: flex; flex-direction: column; justify-content: space-between;
    overflow: hidden;
  }
  .left::after {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 25% 15%, rgba(255,255,255,0.10), transparent 45%);
  }
  .logo-row { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 0; }
  .logo-mark {
    width: 52px; height: 52px; border-radius: 50%; background: var(--yellow);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Baloo 2', sans-serif; font-weight: 800; font-size: 24px; color: var(--teal-deep);
    box-shadow: 0 6px 0 rgba(15,65,63,0.35);
  }
  .logo-name {
    font-family: 'Baloo 2', sans-serif; font-weight: 800; font-size: 15px; letter-spacing: 1px;
    color: var(--cream); margin-top: 14px; text-transform: uppercase;
  }
  .logo-tag { font-size: 12px; color: rgba(251,247,238,0.65); margin-top: 3px; }

  .hero { position: relative; z-index: 1; margin-top: 1.4rem; }
  .hero-title {
    font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 38px; line-height: 1.08; color: var(--yellow);
  }
  .hero-body { font-size: 14px; color: rgba(251,247,238,0.78); line-height: 1.7; margin-top: 14px; max-width: 280px; }

  .stats { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 10px; margin-top: 1.8rem; }
  .stat {
    background: rgba(251,247,238,0.12); color: var(--cream); font-size: 12px; font-weight: 600;
    padding: 8px 14px; border-radius: 999px;
  }

  .folio {
    position: relative; z-index: 1; align-self: flex-start; margin-top: 1.6rem;
    background: var(--coral); color: var(--cream); font-family: 'Baloo 2', sans-serif; font-weight: 700;
    font-size: 12.5px; padding: 10px 18px; border-radius: 999px; transform: rotate(-4deg);
    box-shadow: 0 6px 0 rgba(0,0,0,0.15); display: inline-block;
  }

  /* ---------- RIGHT: plain cream page ---------- */
  .right {
    background: var(--cream); padding: 3rem 3.2rem;
    display: flex; flex-direction: column; justify-content: center;
  }
  .form-card { width: 100%; }
  .form-eyebrow {
    font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 12px; letter-spacing: 1.5px;
    text-transform: uppercase; color: var(--coral);
  }
  .form-title { font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 28px; margin-top: 8px; }
  .form-sub { font-size: 13.5px; color: var(--ink-soft); margin-top: 8px; margin-bottom: 2rem; line-height: 1.5; }

  .field { margin-bottom: 20px; }
  .field-meta { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
  .field label { font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; font-weight: 600; color: var(--ink); }
  .field-meta label { margin-bottom: 0; }
  .field input {
    width: 100%; border: none; background: #F1EADA; outline: none; border-radius: 12px;
    font-family: 'IBM Plex Sans', sans-serif; font-size: 14.5px; color: var(--ink);
    padding: 14px 16px; transition: box-shadow .15s;
  }
  .field input::placeholder { color: #A79A85; }
  .field input:focus { box-shadow: 0 0 0 2.5px var(--teal); }
  .forgot { font-size: 12px; color: var(--coral); font-weight: 600; text-decoration: none; }
  .forgot:hover { text-decoration: underline; }

  .btn-primary {
    display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
    margin-top: 0.6rem; padding: 16px 0;
    background: var(--teal); border: none; color: var(--cream);
    font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 15px;
    cursor: pointer; border-radius: 14px; box-shadow: 0 5px 0 var(--teal-deep);
    transition: transform .1s;
  }
  .btn-primary:hover:not(:disabled) { transform: translateY(2px); box-shadow: 0 3px 0 var(--teal-deep); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .divider { display: none; }
  .footer-link { text-align: center; margin-top: 1.6rem; font-size: 13px; color: var(--ink-soft); }
  .footer-link a { color: var(--teal); font-weight: 700; text-decoration: none; }
  .footer-link a:hover { text-decoration: underline; }

  .error-box { background: rgba(232,91,63,0.10); border: 1px solid rgba(232,91,63,0.35); color: var(--coral); border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; font-family: 'IBM Plex Sans', sans-serif; }
  .warn-box { background: rgba(244,185,61,0.16); border: 1px solid rgba(244,185,61,0.5); color: #6B4F1E; border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-bottom: 16px; line-height: 1.6; }
  .warn-box a { color: var(--coral); font-weight: 600; text-decoration: underline; cursor: pointer; }

  .splash { position: fixed; inset: 0; background: var(--teal); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; z-index: 50; }
  .splash-logo { width: 52px; height: 52px; border-radius: 50%; background: var(--yellow); display: flex; align-items: center; justify-content: center; color: var(--teal-deep); font-family: 'Baloo 2', sans-serif; font-size: 22px; font-weight: 800; }
  .splash-text { font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; letter-spacing: 1px; color: var(--cream); text-transform: uppercase; }
  .splash-spinner { width: 20px; height: 20px; border: 2px solid rgba(251,247,238,0.25); border-top-color: var(--yellow); border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 760px) {
    .page-wrap { grid-template-columns: 1fr; border-radius: 16px; }
    .left { display: none; }
    .right { padding: 2.2rem 1.6rem; }
  }
`;

const ROLE_REDIRECT: Record<string, string> = {
  admin:  "/admin/dashboard",
  staff:  "/staff/dashboard",
  client: "/client/dashboard",
};

function getStoredUser() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("user") ?? "null"); }
  catch { 
    localStorage.removeItem("user");
    localStorage.removeItem("read_notifs");
     return null; }
}

function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("user");
  localStorage.removeItem("read_notifs");
}

export default function LoginPage() {
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [error,       setError]       = useState("");
  const [warnMsg,     setWarnMsg]     = useState("");
  const [loading,     setLoading]     = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

   /* ── On mount: handle URL flags + auto-login ── */

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    
    if (params.get("logout") === "true") {
      clearSession();
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (params.get("unpaid") === "true") {
      clearSession();
      setWarnMsg("Your account is not yet active. Complete payment to access your dashboard.");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (params.get("unauthorized") === "true") {
      clearSession();
      setError("Session expired or access denied. Please sign in again.");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    

    /* Auto-login if valid session exists */
    const user = getStoredUser();
    if (!user?.id || !user?.role || !ROLE_REDIRECT[user.role]) return;

    setRedirecting(true);

    /* Verify session with server before redirecting */
    fetch("/api/auth/verify-session", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ user_id: user.id, role: user.role }),
    })
      .then(r => r.json())
      .then(data => {
        if (!data.valid) {
          clearSession();
          setRedirecting(false);
          setError("Session expired. Please sign in again.");
          return;
        }
        if (data.payment_status !== "active") {
          clearSession();
          setRedirecting(false);
          setWarnMsg("Your account is not active. Complete payment to continue.");
          return;
        }
        doRedirect(user);
      })
      .catch(() => doRedirect(user)); // network error — allow through
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Redirect helper ── */
const doRedirect = (user: Record<string, string>) => {
  setRedirecting(true);

  // Super admin goes to super admin dashboard
  if (user.is_super_admin) {
    router.replace("/super-admin");
    return;
  }

  if (user.role === "admin" && user.domain) {
    const encoded = encodeURIComponent(JSON.stringify(user));
    window.location.href = `https://${user.domain}.upendoapps.com?session=${encoded}`;
    return;
  }

  if (user.role === "staff" && user.admin_id) {
    fetch(`/api/admin-domain?admin_id=${user.admin_id}`)
      .then(r => r.json())
      .then(d => {
        if (d.domain) {
          const updated = { ...user, domain: d.domain };
          const encoded = encodeURIComponent(JSON.stringify(updated));
          window.location.href = `https://${d.domain}.upendoapps.com/staff/dashboard?session=${encoded}`;
        } else {
          router.replace(ROLE_REDIRECT[user.role] ?? "/");
        }
      })
      .catch(() => router.replace(ROLE_REDIRECT[user.role] ?? "/"));
    return;
  }

  router.replace(ROLE_REDIRECT[user.role] ?? "/");
};

  /* ── Login submit ── */
 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setError(""); setWarnMsg("");
  if (!email || !password) return setError("Please fill in all fields.");
  setLoading(true);

  try {
    const res  = await fetch("/api/auth/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (data.error) { setError(data.error); setLoading(false); return; }

    if (res.status === 402 || data.requiresPayment || data.user?.payment_status === "unpaid") {
      setWarnMsg("Your account isn't active yet. Please complete payment to access your store.");
      setLoading(false);
      return;
    }

    // ── Super admin shortcut ──
    if (data.user?.is_super_admin) {
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/super-admin");
      return;
    }

    if (data.user?.role === "admin") {
      if (!data.user?.pos_type) {
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/onboarding");
        return;
      }
    }

    localStorage.setItem("user", JSON.stringify(data.user));
    doRedirect(data.user);

  } catch {
    setError("Something went wrong. Please try again.");
    setLoading(false);
  }
};

  if (redirecting) return (
    <>
      <style>{css}</style>
      <div className="splash">
        <div className="splash-logo">P</div>
        <div className="splash-spinner" />
        <p className="splash-text">Signing you in…</p>
      </div>
    </>
  );

  return (
    <>
      <style>{css}</style>
      <div className="page-wrap">

        {/* LEFT */}
        <div className="left">
          <div className="logo-row">
            <div className="logo-mark">P</div>
            <span className="logo-name">Postore</span>
            <span className="logo-tag">Point of sale for the modern duka</span>
          </div>
          <div className="hero">
            <h1 className="hero-title">Sell smarter,<br />grow faster.</h1>
            <p className="hero-body">Complete POS for modern retailers. Manage inventory, process payments, and track every transaction in real time.</p>
          </div>
          <div>
            <div className="stats">
              <span className="stat">Inventory</span>
              <span className="stat">M-Pesa payouts</span>
              <span className="stat">Multi-branch</span>
            </div>
            <div className="folio">Open Daily 24/7</div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="right">
          <div className="form-card">
            <p className="form-eyebrow">Welcome back</p>
            <h2 className="form-title">Sign in to Postore</h2>
            <p className="form-sub">Enter your credentials to access your dashboard.</p>

            {error && <div className="error-box"><span>⚠</span><span>{error}</span></div>}

            {warnMsg && (
              <div className="warn-box">
                {warnMsg}{" "}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Email address</label>
                <input type="email" placeholder="you@yourstore.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="field">
  <div className="field-meta">
    <label>Password</label>
    <Link href="/forgot-password" className="forgot">Forgot password?</Link>
  </div>
  <div style={{ position: "relative" }}>
    <input
      type={showPassword ? "text" : "password"}
      placeholder="Enter your password"
      value={password}
      onChange={e => setPassword(e.target.value)}
      autoComplete="current-password"
      style={{ paddingRight: "38px" }}
    />
    <button
      type="button"
      onClick={() => setShowPassword(v => !v)}
      style={{
        position: "absolute", right: "2px", top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", cursor: "pointer", padding: "2px",
        color: "var(--ink-soft)", display: "flex", alignItems: "center",
      }}
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? (
        // Eye-off icon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        // Eye icon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  </div>
</div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="divider" />
            <p className="footer-link">Don&apos;t have an account? <Link href="/signup">Open an account</Link></p>
          </div>
        </div>
        
      </div>
    </>
  );
} 
