"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=Courier+Prime:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --cover: #3B2220; --cover2: #2C1917; --gold: #BE9A52;
    --paper: #FAF6EC; --rule-blue: #B9CBD6; --rule-red: #B23B34;
    --ink: #241C13; --ink2: #7A6F5C; --stamp: #A63A31;
  }
  html, body { height: 100%; }
  body { font-family: 'IBM Plex Sans', sans-serif; background: #EDE6D3; color: var(--ink); height: 100%; }
  .page-wrap { display: grid; grid-template-columns: 0.82fr 1fr; height: 100vh; overflow: hidden; }

  /* ---------- LEFT: leather cover ---------- */
  .left {
    position: relative;
    background:
      radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.06), transparent 55%),
      linear-gradient(160deg, var(--cover), var(--cover2));
    padding: 2.6rem 2.3rem;
    display: flex; flex-direction: column; justify-content: space-between;
    height: 100vh; overflow: hidden;
  }
  .blob { display: none; }
  .logo-row { display: flex; align-items: center; gap: 10px; position: relative; z-index: 1; }
  .logo-mark {
    width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid var(--gold);
    display: flex; align-items: center; justify-content: center;
    color: var(--gold); font-family: 'Fraunces', serif; font-size: 15px; font-weight: 600;
  }
  .logo-name { font-family: 'Courier Prime', monospace; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); opacity: 0.85; }

  .hero { position: relative; z-index: 1; margin-top: 1.6rem; }
  .hero-eyebrow { font-family: 'Courier Prime', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: var(--gold); opacity: 0.85; margin-bottom: 12px; }
  .hero-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: 32px; line-height: 1.12; margin-bottom: 14px; color: var(--gold); text-shadow: 0 1px 0 rgba(0,0,0,0.3); }
  .hero-body { font-size: 13px; color: #CBBB9A; line-height: 1.7; max-width: 260px; }

  .stats { display: flex; flex-direction: column; gap: 0; position: relative; z-index: 1; margin-top: 1.4rem; }
  .stat { display: flex; justify-content: space-between; align-items: baseline; padding: 10px 0; border-bottom: 1px dashed rgba(190,154,82,0.28); font-family: 'Courier Prime', monospace; }
  .stat-num { font-size: 13px; font-weight: 700; color: var(--gold); order: 2; }
  .stat-lbl { font-size: 10.5px; letter-spacing: 0.5px; text-transform: uppercase; color: #B9AB8A; order: 1; }

  .folio { position: relative; z-index: 1; font-family: 'Courier Prime', monospace; font-size: 10.5px; letter-spacing: 1px; color: var(--gold); opacity: 0.65; text-transform: uppercase; margin-top: 1.2rem; }

  /* ---------- RIGHT: ledger paper ---------- */
  .right {
    overflow-y: auto; height: 100vh; background: var(--paper);
    display: flex; align-items: flex-start; justify-content: center; padding: 0 2.5rem;
    background-image: repeating-linear-gradient(var(--paper) 0px, var(--paper) 33px, var(--rule-blue) 34px, var(--paper) 35px);
    background-position: 0 12px;
    position: relative;
  }
  .right::before { content: ''; position: absolute; left: 2.4rem; top: 0; bottom: 0; width: 1.5px; background: var(--rule-red); opacity: 0.5; }
  .form-card { width: 100%; max-width: 360px; padding: 3rem 0 3rem 1rem; position: relative; z-index: 1; }
  .form-eyebrow { font-family: 'Courier Prime', monospace; font-size: 10.5px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--stamp); margin-bottom: 8px; }
  .form-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: 25px; margin-bottom: 4px; }
  .form-sub { font-size: 13px; color: var(--ink2); margin-bottom: 1.7rem; line-height: 1.5; }

  .field { margin-bottom: 8px; }
  .field-meta { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
  .field label { display: block; font-family: 'Courier Prime', monospace; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--ink2); margin-bottom: 2px; }
  .field-meta label { margin-bottom: 0; }
  .field input {
    width: 100%; background: transparent; border: none; border-bottom: 1px solid rgba(36,28,19,0.18);
    padding: 7px 2px 9px; color: var(--ink); font-family: 'IBM Plex Sans', sans-serif; font-size: 14.5px; outline: none;
    transition: border-color 0.15s;
  }
  .field input::placeholder { color: #B6AB92; }
  .field input:focus { border-bottom: 1px solid var(--stamp); }
  .forgot { font-size: 11.5px; color: var(--stamp); text-decoration: none; font-weight: 600; }
  .forgot:hover { text-decoration: underline; }

  .btn-primary {
    display: block; margin: 1.8rem auto 0; width: 176px; height: 64px;
    border: 2.5px solid var(--stamp); border-radius: 50%; background: transparent; color: var(--stamp);
    font-family: 'Courier Prime', monospace; font-weight: 700; font-size: 12.5px; letter-spacing: 1.5px;
    text-transform: uppercase; cursor: pointer; position: relative; transform: rotate(-5deg);
    transition: transform 0.15s, background 0.15s, color 0.15s;
  }
  .btn-primary::before { content: ''; position: absolute; inset: 5px; border: 1px solid var(--stamp); border-radius: 50%; opacity: 0.6; }
  .btn-primary:hover:not(:disabled) { transform: rotate(0deg); background: var(--stamp); color: var(--paper); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: rotate(-5deg); }

  .divider { display: none; }
  .footer-link { text-align: center; margin-top: 1.6rem; font-size: 12px; color: var(--ink2); }
  .footer-link a { color: var(--ink); font-weight: 700; text-decoration: none; border-bottom: 1px solid var(--gold); }
  .footer-link a:hover { opacity: 0.75; }

  .error-box { background: rgba(162,58,49,0.08); border: 1px solid rgba(162,58,49,0.35); color: var(--stamp); border-radius: 4px; padding: 9px 12px; font-size: 13px; margin-bottom: 14px; display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; font-family: 'IBM Plex Sans', sans-serif; }
  .warn-box { background: rgba(190,154,82,0.12); border: 1px solid rgba(190,154,82,0.4); color: #6B4F1E; border-radius: 4px; padding: 12px 14px; font-size: 13px; margin-bottom: 14px; line-height: 1.6; }
  .warn-box a { color: var(--stamp); font-weight: 600; text-decoration: underline; cursor: pointer; }

  .splash { position: fixed; inset: 0; background: var(--cover); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; z-index: 50; }
  .splash-logo { width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid var(--gold); display: flex; align-items: center; justify-content: center; color: var(--gold); font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600; }
  .splash-text { font-family: 'Courier Prime', monospace; font-size: 12.5px; letter-spacing: 1px; color: #CBBB9A; text-transform: uppercase; }
  .splash-spinner { width: 20px; height: 20px; border: 2px solid rgba(190,154,82,0.25); border-top-color: var(--gold); border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 700px) {
    .page-wrap { grid-template-columns: 1fr; height: auto; overflow: visible; }
    .left { display: none; }
    .right { height: auto; padding: 2rem 1.25rem; }
    .right::before { left: 1.2rem; }
    .form-card { padding: 2rem 0 2rem 0.8rem; }
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
            <span className="logo-name">Postore — The Ledger</span>
          </div>
          <div className="hero">
            <p className="hero-eyebrow">Est. for the modern duka</p>
            <h1 className="hero-title">Sell smarter,<br />grow faster.</h1>
            <p className="hero-body">Complete POS for modern retailers. Manage inventory, process payments, and track every transaction in real time.</p>
          </div>
          <div className="stats">
            <div className="stat"><span className="stat-lbl">Daily transactions</span><span className="stat-num">--</span></div>
            <div className="stat"><span className="stat-lbl">Uptime SLA</span><span className="stat-num">--</span></div>
            <div className="stat"><span className="stat-lbl">User rating</span><span className="stat-num">--</span></div>
          </div>
          <div className="folio">Folio 01 — Sign In</div>
        </div>

        {/* RIGHT */}
        <div className="right">
          <div className="form-card">
            <p className="form-eyebrow">Welcome back</p>
            <h2 className="form-title">Sign in to your ledger</h2>
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
        color: "var(--ink2)", display: "flex", alignItems: "center",
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
