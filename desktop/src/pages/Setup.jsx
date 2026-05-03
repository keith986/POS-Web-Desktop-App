import React, { useState } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3000";

export default function Setup({ onSetupComplete }) {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("domain"); // domain | syncing | done

  const handleSetup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setStep("syncing");

    try {
      const response = await fetch(`${BACKEND_URL}/api/desktop/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Setup failed. Check your store domain.");
        setStep("domain");
        setLoading(false);
        return;
      }

      // Save domain to electron store
      await window.electronAPI.setStoreData("domain", domain.trim().toLowerCase());
      await window.electronAPI.setStoreData("backendUrl", BACKEND_URL);

      // Initialize database with synced data
      await window.electronAPI.initializeDatabase();

      // Save admin user
      await window.electronAPI.executeDatabase(
        `INSERT OR REPLACE INTO users (id, full_name, email, password_hash, role, is_active)
         VALUES (?, ?, ?, ?, 'admin', 1)`,
        [data.admin.id, data.admin.full_name, data.admin.email, data.admin.password]
      );

      // Save staff
      for (const s of data.staff) {
        await window.electronAPI.executeDatabase(
          `INSERT OR REPLACE INTO users (id, full_name, email, password_hash, role, is_active)
           VALUES (?, ?, ?, ?, 'staff', 1)`,
          [s.id, s.full_name, s.email, s.password]
        );
      }

      // Save products
      for (const p of data.products) {
        await window.electronAPI.executeDatabase(
          `INSERT OR REPLACE INTO products 
           (id, name, category, price, stock, sku, description, emoji, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.id, p.name, p.category, p.price, p.stock, p.sku || "", p.description || "", p.emoji || "", p.is_active]
        );
      }

      await window.electronAPI.setStoreData("storeInfo", {
        store_name: data.admin.store_name,
        domain: data.admin.domain,
        pos_type: data.admin.pos_type,
      });

      setStep("done");
      setTimeout(() => onSetupComplete(), 1500);
    } catch (err) {
      console.error("Setup error:", err);
      setError("Could not connect to server. Make sure you're online.");
      setStep("domain");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-bg-grid" />
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">⬡</div>
          <h1 className="login-title">POStore Desktop</h1>
          <p className="login-subtitle">First time setup</p>
        </div>

        {step === "syncing" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div className="splash-spinner" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "var(--text-2)" }}>Syncing your store data...</p>
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <p style={{ color: "var(--green)", fontWeight: 600 }}>Setup complete!</p>
          </div>
        )}

        {step === "domain" && (
          <form className="login-form" onSubmit={handleSetup}>
            <p style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>
              Enter your store domain to sync your data and get started.
            </p>

            <div className="form-group">
              <label className="form-label">Store Domain</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="mystore"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  required
                  autoFocus
                />
                <span style={{ color: "var(--text-3)", fontSize: 12, whiteSpace: "nowrap" }}>
                  .upendoapps.com
                </span>
              </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Setting up..." : "Set Up App"}
            </button>
          </form>
        )}

        <div className="login-footer">
          <span className="offline-badge">● Offline Ready After Setup</span>
        </div>
      </div>
    </div>
  );
}