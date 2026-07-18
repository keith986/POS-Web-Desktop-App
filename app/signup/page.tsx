"use client";
import { useState } from "react";
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

  .steps { display: flex; flex-direction: column; gap: 16px; position: relative; z-index: 1; margin-top: 1.6rem; }
  .step { display: flex; align-items: flex-start; gap: 12px; }
  .step-num {
    width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--gold); color: var(--gold);
    font-family: 'Courier Prime', monospace; font-size: 11px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
    background: transparent;
  }
  .step-num.done { background: var(--gold); color: var(--cover2); border-color: var(--gold); }
  .step-text { font-size: 13px; color: #CBBB9A; line-height: 1.5; }
  .step-text strong { color: var(--gold); font-weight: 600; }

  .folio { position: relative; z-index: 1; font-family: 'Courier Prime', monospace; font-size: 10.5px; letter-spacing: 1px; color: var(--gold); opacity: 0.65; text-transform: uppercase; margin-top: 1.2rem; }

  /* ---------- RIGHT: ledger paper ---------- */
  .right {
    overflow-y: auto; height: 100vh; background: var(--paper);
    display: flex; align-items: flex-start; justify-content: center; padding: 0 2.5rem;
    background-image: repeating-linear-gradient(var(--paper) 0px, var(--paper) 33px, var(--rule-blue) 34px, var(--paper) 35px);
    background-position: 0 8px;
    position: relative;
  }
  .right::before { content: ''; position: absolute; left: 2.4rem; top: 0; bottom: 0; width: 1.5px; background: var(--rule-red); opacity: 0.5; }
  .form-card { width: 100%; max-width: 380px; padding: 2.6rem 0 2.6rem 1rem; position: relative; z-index: 1; }
  .form-eyebrow { font-family: 'Courier Prime', monospace; font-size: 10.5px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--stamp); margin-bottom: 8px; }
  .form-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: 24px; margin-bottom: 4px; }
  .form-sub { font-size: 13px; color: var(--ink2); margin-bottom: 1.5rem; line-height: 1.5; }

  .field { margin-bottom: 8px; }
  .field label { display: block; font-family: 'Courier Prime', monospace; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--ink2); margin-bottom: 2px; }
  .field input {
    width: 100%; background: transparent; border: none; border-bottom: 1px solid rgba(36,28,19,0.18);
    padding: 7px 2px 9px; color: var(--ink); font-family: 'IBM Plex Sans', sans-serif; font-size: 14.5px; outline: none;
    transition: border-color 0.15s;
  }
  .field input::placeholder { color: #B6AB92; }
  .field input:focus { border-bottom: 1px solid var(--stamp); }
  .field-hint { font-size: 11px; color: var(--ink2); margin-top: 4px; font-style: italic; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 8px; }
  .domain-wrap { display: flex; align-items: baseline; border-bottom: 1px solid rgba(36,28,19,0.18); transition: border-color 0.15s; }
  .domain-wrap:focus-within { border-bottom: 1px solid var(--stamp); }
  .domain-input { flex: 1; border: none; outline: none; padding: 7px 2px 9px; font-family: 'IBM Plex Sans', sans-serif; font-size: 14.5px; color: var(--ink); background: transparent; }
  .domain-suffix { padding: 7px 2px 9px; font-family: 'Courier Prime', monospace; font-size: 11px; color: var(--ink2); white-space: nowrap; }

  .btn-primary {
    display: block; margin: 1.4rem auto 0; width: 176px; height: 64px;
    border: 2.5px solid var(--stamp); border-radius: 50%; background: transparent; color: var(--stamp);
    font-family: 'Courier Prime', monospace; font-weight: 700; font-size: 11.5px; letter-spacing: 1px;
    text-transform: uppercase; cursor: pointer; position: relative; transform: rotate(-5deg);
    transition: transform 0.15s, background 0.15s, color 0.15s;
  }
  .btn-primary::before { content: ''; position: absolute; inset: 5px; border: 1px solid var(--stamp); border-radius: 50%; opacity: 0.6; }
  .btn-primary:hover:not(:disabled) { transform: rotate(0deg); background: var(--stamp); color: var(--paper); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: rotate(-5deg); }

  .divider { display: none; }
  .footer-link { text-align: center; margin-top: 1.4rem; font-size: 12px; color: var(--ink2); }
  .footer-link a { color: var(--ink); font-weight: 700; text-decoration: none; border-bottom: 1px solid var(--gold); }
  .footer-link a:hover { opacity: 0.75; }

  .error-box { background: rgba(162,58,49,0.08); border: 1px solid rgba(162,58,49,0.35); color: var(--stamp); border-radius: 4px; padding: 9px 12px; font-size: 13px; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; font-family: 'IBM Plex Sans', sans-serif; }

  @media (max-width: 700px) {
    .page-wrap { grid-template-columns: 1fr; height: auto; overflow: visible; }
    .left { display: none; }
    .right { height: auto; padding: 2rem 1.25rem; }
    .right::before { left: 1.2rem; }
    .form-card { padding: 2rem 0 2rem 0.8rem; }
  }
`;

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name:        "",
    email:            "",
    password:         "",
    confirm_password: "",
    store_name:       "",
    domain:           "",
  });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  const update = (k: string, v: string) => {
    if (k === "store_name") {
      const slug = v.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
      setForm(f => ({ ...f, store_name: v, domain: slug }));
    } else if (k === "domain") {
      setForm(f => ({ ...f, domain: v.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) }));
    } else {
      setForm(f => ({ ...f, [k]: v }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.full_name || !form.email || !form.password || !form.store_name || !form.domain)
      return setError("Please fill in all fields.");

    if (form.password.length < 6)
      return setError("Password must be at least 6 characters.");

    if (form.password !== form.confirm_password)
      return setError("Passwords do not match.");

    if (!/^[a-z0-9]+$/.test(form.domain))
      return setError("Domain can only contain lowercase letters and numbers.");

    setLoading(true);

    try {
      // ── Check availability only — do NOT create account yet ──
      const res  = await fetch("/api/auth/check-availability", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: form.email, domain: form.domain }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // ── Store in sessionStorage — account created after payment ──
      sessionStorage.setItem("pending_signup", JSON.stringify({
        full_name:  form.full_name,
        email:      form.email,
        password:   form.password,
        store_name: form.store_name,
        domain:     form.domain,
      }));

      router.push("/payment?signup=true");

    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <style>{css}</style>
      <div className="page-wrap">

        {/* ── LEFT ── */}
        <div className="left">
          <div className="logo-row">
            <div className="logo-mark">P</div>
            <span className="logo-name">Postore — The Ledger</span>
          </div>
          <div className="hero">
            <p className="hero-eyebrow">Get started</p>
            <h1 className="hero-title">Your store,<br />your way.</h1>
            <p className="hero-body">
              Set up your POS in minutes. Pay once, get your store live instantly.
            </p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-num done">1</div>
              <div className="step-text"><strong>Fill your details</strong><br />Name, email and store info</div>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <div className="step-text"><strong>Choose a plan &amp; pay</strong><br />Pay via M-Pesa STK push</div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div className="step-text"><strong>Start selling</strong><br />Your store goes live instantly</div>
            </div>
          </div>
          <div className="folio">Folio 02 — New Account</div>
        </div>

        {/* ── RIGHT ── */}
        <div className="right">
          <div className="form-card">
            <p className="form-eyebrow">Step 1 of 2</p>
            <h2 className="form-title">Open your account</h2>
            <p className="form-sub">Fill in your details. Your account activates after payment.</p>

            {error && (
              <div className="error-box">
                <span>⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Full name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={form.full_name}
                  onChange={e => update("full_name", e.target.value)}
                />
              </div>

              <div className="field">
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => update("email", e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="field">
                <label>Store name</label>
                <input
                  type="text"
                  placeholder="My Awesome Store"
                  value={form.store_name}
                  onChange={e => update("store_name", e.target.value)}
                />
              </div>

              <div className="field">
                <label>Store domain</label>
                <div className="domain-wrap">
                  <input
                    className="domain-input"
                    type="text"
                    placeholder="mystore"
                    value={form.domain}
                    onChange={e => update("domain", e.target.value)}
                  />
                  <span className="domain-suffix">.upendoapps.com</span>
                </div>
                {form.domain && (
                  <p className="field-hint">
                    Your store: <strong>{form.domain}.upendoapps.com</strong>
                  </p>
                )}
              </div>

              <div className="field">
  <label>Password</label>
  <div style={{ position: "relative" }}>
    <input
      type={showPassword ? "text" : "password"}
      placeholder="Min 6 characters"
      value={form.password}
      onChange={e => update("password", e.target.value)}
      autoComplete="new-password"
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  </div>
                </div>

<div className="field">
  <label>Confirm password</label>
  <div style={{ position: "relative" }}>
    <input
      type={showConfirm ? "text" : "password"}
      placeholder="Repeat your password"
      value={form.confirm_password}
      onChange={e => update("confirm_password", e.target.value)}
      autoComplete="new-password"
      style={{ paddingRight: "38px" }}
    />
    <button
      type="button"
      onClick={() => setShowConfirm(v => !v)}
      style={{
        position: "absolute", right: "2px", top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", cursor: "pointer", padding: "2px",
        color: "var(--ink2)", display: "flex", alignItems: "center",
      }}
      aria-label={showConfirm ? "Hide password" : "Show password"}
    >
      {showConfirm ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  </div>
</div>

              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Checking…" : "Continue"}
              </button>
            </form>

            <div className="divider" />

            <p className="footer-link">
              Already have an account?{" "}
              <Link href="/">Sign in</Link>
            </p>
          </div>
        </div>

      </div>
    </>
  );
}
