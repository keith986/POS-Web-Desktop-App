import React, { useState, useEffect } from "react";
import bcrypt from "bcryptjs";

export default function Settings({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("security");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"
  const [loading, setLoading] = useState(false);
  const [taxSettings, setTaxSettings] = useState({
    taxName: "VAT",
    taxRate: 16,
    taxInclusive: false,
  });
  const [taxMessage, setTaxMessage] = useState("");
  const [taxMessageType, setTaxMessageType] = useState("");
  const [taxLoading, setTaxLoading] = useState(false);
  const [inventoryMode, setInventoryMode] = useState("auto"); // "auto" or "manual"
  const [inventoryMessage, setInventoryMessage] = useState("");
  const [inventoryMessageType, setInventoryMessageType] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSwitchAccountConfirm, setShowSwitchAccountConfirm] = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false);

  // Load tax settings from store on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedTax = await window.electronAPI.getStoreData("taxSettings");
        if (storedTax) {
          setTaxSettings(storedTax);
        }
        const storedInventory = await window.electronAPI.getStoreData("inventoryMode");
        if (storedInventory) {
          setInventoryMode(storedInventory);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    loadSettings();
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (!passwordForm.currentPassword || !passwordForm.newPassword) {
        setMessage("All fields are required");
        setMessageType("error");
        setLoading(false);
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setMessage("New passwords do not match");
        setMessageType("error");
        setLoading(false);
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        setMessage("Password must be at least 6 characters");
        setMessageType("error");
        setLoading(false);
        return;
      }

      // Verify current password
      const userResult = await window.electronAPI.queryDatabase(
        "SELECT password_hash FROM users WHERE id = ?",
        [user.id]
      );

      if (!userResult.success || !userResult.data[0]) {
        setMessage("User not found");
        setMessageType("error");
        setLoading(false);
        return;
      }

      const passwordMatch = await bcrypt.compare(
        passwordForm.currentPassword,
        userResult.data[0].password_hash
      );

      if (!passwordMatch) {
        setMessage("Current password is incorrect");
        setMessageType("error");
        setLoading(false);
        return;
      }

      // Hash and update new password
      const newHash = await bcrypt.hash(passwordForm.newPassword, 10);
      const updateResult = await window.electronAPI.executeDatabase(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        [newHash, user.id]
      );

      if (!updateResult.success) {
        setMessage("Failed to update password");
        setMessageType("error");
      } else {
        setMessage("Password changed successfully");
        setMessageType("success");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (err) {
      console.error("Password change error:", err);
      setMessage("Error changing password");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

    const handleSaveTaxSettings = async () => {
      setTaxMessage("");
      setTaxMessageType("");
      setTaxLoading(true);

      try {
        if (!taxSettings.taxName || taxSettings.taxRate < 0) {
          setTaxMessage("Please fill in all tax fields correctly");
          setTaxMessageType("error");
          setTaxLoading(false);
          return;
        }

        await window.electronAPI.setStoreData("taxSettings", taxSettings);
        setTaxMessage("Tax settings saved successfully");
        setTaxMessageType("success");
      } catch (err) {
        console.error("Save tax settings error:", err);
        setTaxMessage("Failed to save tax settings");
        setTaxMessageType("error");
      } finally {
        setTaxLoading(false);
      }
    };

  const handleSaveInventorySettings = async () => {
    setInventoryMessage("");
    setInventoryMessageType("");

    try {
      await window.electronAPI.setStoreData("inventoryMode", inventoryMode);
      setInventoryMessage("Inventory settings saved successfully");
      setInventoryMessageType("success");
      setTimeout(() => setInventoryMessage(""), 3000);
    } catch (err) {
      console.error("Save inventory settings error:", err);
      setInventoryMessage("Failed to save inventory settings");
      setInventoryMessageType("error");
    }
  };


  const handleSwitchAccount = async () => {
    setSwitchLoading(true);
    try {
      // Clear all app data
      await window.electronAPI.deleteStoreData("domain");
      await window.electronAPI.deleteStoreData("currentUser");
      await window.electronAPI.deleteStoreData("storeInfo");
      await window.electronAPI.deleteStoreData("taxSettings");
      await window.electronAPI.deleteStoreData("inventoryMode");
      await window.electronAPI.deleteStoreData("backendUrl");
      
      // Logout
      setShowSwitchAccountConfirm(false);
      onLogout?.();
      window.location.reload();
    } catch (err) {
      console.error("Switch account error:", err);
    } finally {
      setSwitchLoading(false);
    }
  };

  return (
      <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="settings-container">
        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            Security & Account
          </button>
          <button
            className={`settings-tab ${activeTab === "tax" ? "active" : ""}`}
            onClick={() => setActiveTab("tax")}
          >
            Tax Settings
          </button>
          <button
            className={`settings-tab ${activeTab === "inventory" ? "active" : ""}`}
            onClick={() => setActiveTab("inventory")}
          >
            Inventory
          </button>
        
        </div>

        <div className="settings-content">
          {/* ══ SECURITY & ACCOUNT TAB ══ */}
          {activeTab === "security" && (
            <div className="settings-layout">
              <div className="settings-column left-column">
                {/* Account Information Card */}
                <div className="settings-card">
                  <div className="card-header">
                    <h2 className="card-title">Account Information</h2>
                  </div>
                  <div className="card-body">
                    {/* Avatar Section */}
                    <div className="account-avatar-section">
                      <div className="avatar-large">{user.name?.[0]?.toUpperCase() || "A"}</div>
                      <div className="avatar-info">
                        <div className="avatar-name">{user.name}</div>
                        <div className="avatar-role">{user.role || "admin"}</div>
                      </div>
                    </div>

                    {/* Account Details */}
                    <div className="account-details">
                      <div className="detail-row">
                        <label className="detail-label">Full Name</label>
                        <div className="detail-value">{user.name}</div>
                      </div>
                      <div className="detail-row">
                        <label className="detail-label">Email</label>
                        <div className="detail-value">{user.email}</div>
                      </div>
                      <div className="detail-row">
                        <label className="detail-label">Role</label>
                        <div className="detail-value" style={{ textTransform: "capitalize" }}>
                          {user.role}
                        </div>
                      </div>
                      <div className="detail-row">
                        <label className="detail-label">Admin ID</label>
                        <div className="detail-value" style={{ fontFamily: "monospace", fontSize: "12px" }}>
                          {user.id}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                      <button
                        className="btn-signout"
                        onClick={() => setShowLogoutConfirm(true)}
                      >
                        Sign Out
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ borderColor: "#f97316", color: "#f97316" }}
                        onClick={() => setShowSwitchAccountConfirm(true)}
                      >
                        Switch Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="settings-column right-column">
                {/* Change Password Card */}
                <div className="settings-card">
                  <div className="card-header">
                    <h2 className="card-title">Change Password</h2>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handlePasswordChange}>
                      <div className="form-group">
                        <label className="form-label">Current Password *</label>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="Enter current password"
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              currentPassword: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">New Password *</label>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="Min. 6 characters"
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              newPassword: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Confirm Password *</label>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="Repeat new password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              confirmPassword: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      {message && (
                        <div className={`form-${messageType}`}>{message}</div>
                      )}

                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                      >
                        {loading ? "Updating..." : "Update Password"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ TAX SETTINGS TAB ══ */}
          {activeTab === "tax" && (
            <div className="settings-section">
              <div className="settings-card full-width">
                <div className="card-header">
                  <h2 className="card-title">Tax Configuration</h2>
                </div>
                <div className="card-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tax Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. VAT, GST"
                        value={taxSettings.taxName}
                        onChange={(e) =>
                          setTaxSettings({
                            ...taxSettings,
                            taxName: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Tax Rate (%)</label>
                      <input
                        type="number"
                        className="form-input"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="e.g. 16"
                        value={taxSettings.taxRate}
                        onChange={(e) =>
                          setTaxSettings({
                            ...taxSettings,
                            taxRate: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={taxSettings.taxInclusive}
                        onChange={(e) =>
                          setTaxSettings({
                            ...taxSettings,
                            taxInclusive: e.target.checked,
                          })
                        }
                      />
                      <span>Tax Inclusive Pricing</span>
                      <span className="checkbox-hint">
                        Product prices already include tax
                      </span>
                    </label>
                  </div>

                  <div className="tax-preview">
                    <p className="preview-text">
                      ℹ️ With <strong>{taxSettings.taxName}</strong> at <strong>{taxSettings.taxRate}%</strong>, a 
                      <strong> 1,000 KES</strong> item will show <strong>{(1000 * (1 + taxSettings.taxRate / 100)).toFixed(2)} KES</strong> at checkout.
                    </p>
                  </div>

                  {taxMessage && (
                    <div className={`form-${taxMessageType}`}>{taxMessage}</div>
                  )}

                  <button className="btn-primary" onClick={handleSaveTaxSettings} disabled={taxLoading}>
                    {taxLoading ? "Saving..." : "Save Tax Settings"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ INVENTORY TAB ══ */}
          {activeTab === "inventory" && (
            <div className="settings-section">
              <div className="settings-card full-width">
                <div className="card-header">
                  <h2 className="card-title">Inventory Deduction</h2>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Inventory Deduction Mode</label>
                    <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="inventoryMode"
                          value="auto"
                          checked={inventoryMode === "auto"}
                          onChange={(e) => setInventoryMode(e.target.value)}
                        />
                        <span>Automatic</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="inventoryMode"
                          value="manual"
                          checked={inventoryMode === "manual"}
                          onChange={(e) => setInventoryMode(e.target.value)}
                        />
                        <span>Manual (Requires Admin Approval)</span>
                      </label>
                    </div>
                  </div>

                  <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#eff6ff", borderRadius: "6px", borderLeft: "4px solid #3b82f6" }}>
                    <p style={{ margin: "0", fontSize: "13px", color: "#1e40af", lineHeight: "1.5" }}>
                      <strong>Automatic:</strong> Stock is deducted immediately when an order is completed.
                      <br />
                      <strong>Manual:</strong> Stock deduction requires admin approval before being finalized.
                    </p>
                  </div>

                  {inventoryMessage && (
                    <div style={{ marginTop: "16px" }} className={`form-${inventoryMessageType}`}>{inventoryMessage}</div>
                  )}

                  <button className="btn-primary" onClick={handleSaveInventorySettings} style={{ marginTop: "16px" }}>
                    Save Inventory Settings
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Sign Out</h2>
            <p className="modal-message">
              Are you sure you want to sign out?
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout?.();
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Switch Account Confirmation Modal */}
      {showSwitchAccountConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Switch Account</h2>
            <p className="modal-message">
              This will delete all data from this computer and return to setup. You can then sign into a different account.
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowSwitchAccountConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={handleSwitchAccount}
                disabled={switchLoading}
              >
                {switchLoading ? "Switching..." : "Switch Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
