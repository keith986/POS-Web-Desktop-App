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
    width: 100%; max-width: 960px; height: 580px;
    display: grid; grid-template-columns: 0.9fr 1fr;
    border-radius: 22px; overflow: hidden;
    box-shadow: 0 40px 80px -26px rgba(15,20,18,0.45);
  }

  /* ---------- LEFT: painted signboard ---------- */
  .left {
    position: relative; background: var(--teal);
    padding: 2.6rem 2.6rem; display: flex; flex-direction: column; justify-content: space-between;
    overflow-y: auto;
  }
  .left::after {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 25% 15%, rgba(255,255,255,0.10), transparent 45%);
  }
  .logo-row { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 0; }
  .logo-mark {
    width: 48px; height: 48px; border-radius: 50%; background: var(--yellow);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Baloo 2', sans-serif; font-weight: 800; font-size: 22px; color: var(--teal-deep);
    box-shadow: 0 6px 0 rgba(15,65,63,0.35);
  }
  .logo-name {
    font-family: 'Baloo 2', sans-serif; font-weight: 800; font-size: 15px; letter-spacing: 1px;
    color: var(--cream); margin-top: 12px; text-transform: uppercase;
  }
  .logo-tag { font-size: 12px; color: rgba(251,247,238,0.65); margin-top: 3px; }

  .hero { position: relative; z-index: 1; margin-top: 1.1rem; }
  .hero-title {
    font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 30px; line-height: 1.1; color: var(--yellow);
  }
  .hero-body { font-size: 13.5px; color: rgba(251,247,238,0.78); line-height: 1.6; margin-top: 12px; max-width: 280px; }

  .steps { display: flex; flex-direction: column; gap: 12px; position: relative; z-index: 1; margin-top: 1.2rem; }
  .step { display: flex; align-items: flex-start; gap: 12px; }
  .step-num {
    width: 24px; height: 24px; border-radius: 50%; background: rgba(251,247,238,0.14); color: var(--cream);
    font-family: 'Baloo 2', sans-serif; font-size: 11.5px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
    transition: background .2s, color .2s;
  }
  .step-num.done { background: var(--yellow); color: var(--teal-deep); }
  .step-text { font-size: 12.5px; color: rgba(251,247,238,0.78); line-height: 1.45; }
  .step-text strong { color: var(--yellow); font-weight: 700; font-family: 'Baloo 2', sans-serif; }

  .folio {
    position: relative; z-index: 1; align-self: flex-start; margin-top: 1.2rem;
    background: var(--coral); color: var(--cream); font-family: 'Baloo 2', sans-serif; font-weight: 700;
    font-size: 12.5px; padding: 10px 18px; border-radius: 999px; transform: rotate(-4deg);
    box-shadow: 0 6px 0 rgba(0,0,0,0.15); display: inline-block;
  }

  /* ---------- RIGHT: flip-card stage ---------- */
  .right { position: relative; background: var(--cream); overflow: hidden; perspective: 1500px; }
  .flipper {
    position: relative; width: 100%; height: 100%;
    transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(.45,.15,.2,1);
  }
  .flipper.flipped { transform: rotateY(180deg); }
  .face {
    position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden;
    overflow-y: auto; display: flex; align-items: center; justify-content: center; padding: 2.4rem 3.2rem;
  }
  .face-back { transform: rotateY(180deg); }
  .form-card { width: 100%; max-width: 380px; }
  .form-eyebrow {
    font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 12px; letter-spacing: 1.5px;
    text-transform: uppercase; color: var(--coral);
  }
  .form-title { font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 26px; margin-top: 8px; }
  .form-sub { font-size: 13.5px; color: var(--ink-soft); margin-top: 8px; margin-bottom: 1.6rem; line-height: 1.5; }

  .field { margin-bottom: 16px; }
  .field label { display: block; font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; font-weight: 600; color: var(--ink); margin-bottom: 8px; }
  .field input {
    width: 100%; border: none; background: #F1EADA; outline: none; border-radius: 12px;
    font-family: 'IBM Plex Sans', sans-serif; font-size: 14.5px; color: var(--ink);
    padding: 13px 16px; transition: box-shadow .15s;
  }
  .field input::placeholder { color: #A79A85; }
  .field input:focus { box-shadow: 0 0 0 2.5px var(--teal); }
  .field-hint { font-size: 11.5px; color: var(--ink-soft); margin-top: 6px; }
  .field-hint strong { color: var(--teal); }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
  .domain-wrap {
    display: flex; align-items: center; background: #F1EADA; border-radius: 12px; transition: box-shadow 0.15s;
    padding-right: 12px;
  }
  .domain-wrap:focus-within { box-shadow: 0 0 0 2.5px var(--teal); }
  .domain-input { flex: 1; border: none; outline: none; padding: 13px 16px; font-family: 'IBM Plex Sans', sans-serif; font-size: 14.5px; color: var(--ink); background: transparent; }
  .domain-suffix { font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; color: var(--ink-soft); white-space: nowrap; }

  .btn-primary {
    display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
    margin-top: 0.4rem; padding: 16px 0;
    background: var(--teal); border: none; color: var(--cream);
    font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 15px;
    cursor: pointer; border-radius: 14px; box-shadow: 0 5px 0 var(--teal-deep);
    transition: transform .1s;
  }
  .btn-primary:hover:not(:disabled) { transform: translateY(2px); box-shadow: 0 3px 0 var(--teal-deep); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .divider { display: none; }
  .footer-link { text-align: center; margin-top: 1.5rem; font-size: 13px; color: var(--ink-soft); }
  .footer-link a { color: var(--teal); font-weight: 700; text-decoration: none; }
  .footer-link a:hover { text-decoration: underline; }

  .error-box { background: rgba(232,91,63,0.10); border: 1px solid rgba(232,91,63,0.35); color: var(--coral); border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; font-family: 'IBM Plex Sans', sans-serif; }

  .back-link { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink-soft); background: none; border: none; cursor: pointer; margin-bottom: 1.2rem; padding: 0; font-family: 'IBM Plex Sans', sans-serif; }
  .back-link:hover { color: var(--teal); }

  @media (max-width: 760px) {
    .page-wrap { grid-template-columns: 1fr; border-radius: 16px; height: auto; min-height: 580px; }
    .left { display: none; }
    .right { height: 580px; }
    .face { padding: 2.2rem 1.6rem; }
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
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const pending = sessionStorage.getItem("pending_signup");
      if (!pending) return;
      const data = JSON.parse(pending);
      setForm(f => ({
        ...f,
        full_name:        data.full_name        ?? f.full_name,
        email:            data.email             ?? f.email,
        password:         data.password          ?? f.password,
        confirm_password: data.password          ?? f.confirm_password,
        store_name:       data.store_name        ?? f.store_name,
        domain:           data.domain            ?? f.domain,
      }));
    } catch { /* ignore malformed sessionStorage */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.full_name || !form.email || !form.store_name || !form.domain)
      return setError("Please fill in all fields.");

    if (!/^[a-z0-9]+$/.test(form.domain))
      return setError("Domain can only contain lowercase letters and numbers.");

    setStep(2);
  };

  const handleBack = () => {
    setError("");
    setStep(1);
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
            <span className="logo-name">Postore</span>
            <span className="logo-tag">Point of sale for the modern duka</span>
          </div>
          <div className="hero">
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
              <div className={`step-num${step === 2 ? " done" : ""}`}>2</div>
              <div className="step-text"><strong>Set a password</strong><br />Secure your account</div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div className="step-text"><strong>Choose a plan &amp; pay</strong><br />Your store goes live instantly</div>
            </div>
          </div>
          <div className="folio">Step {step} of 2</div>
        </div>

        {/* ── RIGHT ── */}
        <div className="right">
          <div className={`flipper${step === 2 ? " flipped" : ""}`}>

            {/* FRONT FACE — account & store details */}
            <div className="face">
              <div className="form-card">
                <p className="form-eyebrow">Get started</p>
                <h2 className="form-title">Open your account</h2>
                <p className="form-sub">Fill in your details. Your account activates after payment.</p>

                {error && (
                  <div className="error-box">
                    <span>⚠</span> {error}
                  </div>
                )}

                <form onSubmit={handleContinue}>
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

                  <button className="btn-primary" type="submit">
                    Continue →
                  </button>
                </form>

                <p className="footer-link">
                  Already have an account?{" "}
                  <Link href="/">Sign in</Link>
                </p>
              </div>
            </div>

            {/* BACK FACE — password */}
            <div className="face face-back">
              <div className="form-card">
                <button type="button" className="back-link" onClick={handleBack}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  Back
                </button>

                <p className="form-eyebrow">Almost done</p>
                <h2 className="form-title">Secure your account</h2>
                <p className="form-sub">Choose a password for {form.domain ? `${form.domain}.upendoapps.com` : "your store"}.</p>

                {error && (
                  <div className="error-box">
                    <span>⚠</span> {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
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
                          color: "var(--ink-soft)", display: "flex", alignItems: "center",
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
                          color: "var(--ink-soft)", display: "flex", alignItems: "center",
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
                    {loading ? "Checking…" : "Create account →"}
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}
