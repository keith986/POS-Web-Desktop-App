import React, { useState, useEffect } from "react";
import bcrypt from "bcryptjs";

const HexIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" stroke="currentColor" strokeWidth="2" fill="none"/>
    <polygon points="16,8 23,12 23,20 16,24 9,20 9,12" fill="currentColor" opacity="0.25"/>
  </svg>
);

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("postore-theme") || "dark"
  );
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("postore-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setTheme(t => t === "dark" ? "light" : "dark");
      setTimeout(() => setAnimating(false), 800);
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await window.electronAPI.queryDatabase(
        "SELECT * FROM users WHERE email = ? AND is_active = 1",
        [email.trim().toLowerCase()]
      );
      if (!result.success || result.data.length === 0) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }
      const user = result.data[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }
      window.electronAPI.loginSuccess();
      onLogin({ id: user.id, name: user.full_name, email: user.email, role: user.role });
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isLight = theme === "light";

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-bg-grid" />
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo" style={{ color: "var(--accent)" }}>
            <HexIcon />
          </div>
          <h1 className="login-title">POStore</h1>
          <p className="login-subtitle">Sign in to continue</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="login-footer">
          <div className="login-footer-row">
            <span className="offline-badge">
              <svg width="7" height="7" viewBox="0 0 7 7" style={{ display: "inline", marginRight: 5 }}>
                <circle cx="3.5" cy="3.5" r="3.5" fill="currentColor"/>
              </svg>
              Offline Ready
            </span>

            {/* Sky arc toggle */}
            <button
              className={`sky-toggle ${isLight ? "sky-toggle--light" : "sky-toggle--dark"} ${animating ? "sky-toggle--animating" : ""}`}
              onClick={toggleTheme}
              title={isLight ? "Switch to dark mode" : "Switch to light mode"}
              type="button"
            >
              <span className="sky-toggle__arc">
                <span className="sky-toggle__celestial">
                  {isLight ? <SunIcon /> : <MoonIcon />}
                </span>
              </span>
              <span className="sky-toggle__label">
                {isLight ? "Light" : "Dark"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}