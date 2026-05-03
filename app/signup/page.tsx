"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --bg: #f5f4f0; --surface: #ffffff; --ink: #141410; --ink2: #4a4a40; --muted: #9a9a8e; --border: #e2e0d8; --border2: #c8c6bc; --accent: #d4522a; }
  html, body { height: 100%; }
  body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--ink); height: 100%; }
  body::before { content: ''; position: fixed; inset: 0; background-image: linear-gradient(rgba(0,0,0,0.032) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.032) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; z-index: 0; }
  .page-wrap { display: grid; grid-template-columns: 1fr 1fr; height: 100vh; overflow: hidden; position: relative; z-index: 1; }
  .left { background: var(--surface); border-right: 1px solid var(--border); padding: 2.5rem; display: flex; flex-direction: column; justify-content: space-between; height: 100vh; overflow: hidden; position: relative; }
  .blob { position: absolute; border-radius: 50%; pointer-events: none; }
  .blob-a { width: 300px; height: 300px; background: #fde8d8; top: -80px; right: -80px; opacity: 0.55; }
  .blob-b { width: 220px; height: 220px; background: #d1fae5; bottom: -60px; left: -60px; opacity: 0.45; }
  .logo-row { display: flex; align-items: center; gap: 10px; position: relative; z-index: 1; }
  .logo-mark { width: 34px; height: 34px; background: var(--ink); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 13px; font-weight: 500; }
  .logo-name { font-weight: 500; font-size: 15px; }
  .hero { position: relative; z-index: 1; }
  .hero-eyebrow { font-size: 11px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 10px; }
  .hero-title { font-size: 28px; font-weight: 500; line-height: 1.2; margin-bottom: 12px; }
  .hero-body { font-size: 13px; color: var(--muted); line-height: 1.65; max-width: 260px; }
  .steps { display: flex; flex-direction: column; gap: 16px; position: relative; z-index: 1; }
  .step { display: flex; align-items: flex-start; gap: 12px; }
  .step-num { width: 24px; height: 24px; border-radius: 50%; background: var(--ink); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  .step-num.done { background: #16a34a; }
  .step-text { font-size: 13px; color: var(--ink2); line-height: 1.5; }
  .step-text strong { color: var(--ink); }
  .right { overflow-y: auto; height: 100vh; background: var(--bg); display: flex; align-items: flex-start; justify-content: center; padding: 0 2.5rem; }
  .form-card { width: 100%; max-width: 360px; padding: 3rem 0; }
  .form-eyebrow { font-size: 11px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
  .form-title { font-size: 22px; font-weight: 500; margin-bottom: 4px; }
  .form-sub { font-size: 13px; color: var(--muted); margin-bottom: 1.8rem; line-height: 1.5; }
  .field { margin-bottom: 14px; }
  .field label { display: block; font-size: 11px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; color: var(--ink2); margin-bottom: 5px; }
  .field input { width: 100%; background: var(--surface); border: 1px solid var(--border2); border-radius: 8px; padding: 9px 12px; color: var(--ink); font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
  .field input::placeholder { color: var(--muted); }
  .field input:focus { border-color: var(--ink); box-shadow: 0 0 0 3px rgba(20,20,16,0.07); }
  .field-hint { font-size: 11px; color: var(--muted); margin-top: 4px; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  .domain-wrap { display: flex; align-items: center; border: 1px solid var(--border2); border-radius: 8px; overflow: hidden; background: var(--surface); transition: border-color 0.15s, box-shadow 0.15s; }
  .domain-wrap:focus-within { border-color: var(--ink); box-shadow: 0 0 0 3px rgba(20,20,16,0.07); }
  .domain-input { flex: 1; border: none; outline: none; padding: 9px 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--ink); background: transparent; }
  .domain-suffix { padding: 9px 12px; background: #f5f4f0; font-size: 12px; color: var(--muted); font-weight: 500; border-left: 1px solid var(--border2); white-space: nowrap; }
  .btn-primary { width: 100%; padding: 11px; background: var(--ink); color: #fff; border: none; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 6px; transition: background 0.15s, transform 0.1s, box-shadow 0.15s; }
  .btn-primary:hover { background: #2a2a22; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(20,20,16,0.18); }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
  .divider { display: flex; align-items: center; gap: 10px; margin: 16px 0; font-size: 12px; color: var(--muted); }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .footer-link { text-align: center; margin-top: 1.2rem; font-size: 12px; color: var(--muted); }
  .footer-link a { color: var(--accent); font-weight: 500; text-decoration: none; }
  .footer-link a:hover { text-decoration: underline; }
  .error-box { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 8px; padding: 9px 12px; font-size: 13px; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
  @media (max-width: 700px) { .page-wrap { grid-template-columns: 1fr; height: auto; overflow: visible; } .left { display: none; } .right { height: auto; padding: 2rem 1.25rem; } .form-card { padding: 2rem 0; } }
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
          <div className="blob blob-a" />
          <div className="blob blob-b" />
          <div className="logo-row">
            <div className="logo-mark">P</div>
            <span className="logo-name">POStore</span>
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
              <div className="step-text"><strong>Choose a plan & pay</strong><br />Pay via M-Pesa STK push</div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div className="step-text"><strong>Start selling</strong><br />Your store goes live instantly</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="right">
          <div className="form-card">
            <p className="form-eyebrow">Step 1 of 2</p>
            <h2 className="form-title">Create your store</h2>
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
        position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", cursor: "pointer", padding: "2px",
        color: "var(--muted)", display: "flex", alignItems: "center",
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
        position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", cursor: "pointer", padding: "2px",
        color: "var(--muted)", display: "flex", alignItems: "center",
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
                {loading ? "Checking…" : "Continue to payment →"}
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