import React, { useState, useEffect } from "react";
import bcrypt from "bcryptjs";

export default function Settings({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("security");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [taxSettings, setTaxSettings] = useState({ taxName: "VAT", taxRate: 16, taxInclusive: false });
  const [taxMessage, setTaxMessage] = useState("");
  const [taxMessageType, setTaxMessageType] = useState("");
  const [taxLoading, setTaxLoading] = useState(false);
  const [inventoryMode, setInventoryMode] = useState("auto");
  const [inventoryMessage, setInventoryMessage] = useState("");
  const [inventoryMessageType, setInventoryMessageType] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSwitchAccountConfirm, setShowSwitchAccountConfirm] = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false);

  // Update state
  const [appVersion, setAppVersion] = useState("...");
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateCheckMsg, setUpdateCheckMsg] = useState("");
  const [updateCheckType, setUpdateCheckType] = useState("");
  const [updateDownloading, setUpdateDownloading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedTax = await window.electronAPI.getStoreData("taxSettings");
        if (storedTax) setTaxSettings(storedTax);
        const storedInventory = await window.electronAPI.getStoreData("inventoryMode");
        if (storedInventory) setInventoryMode(storedInventory);
      } catch (err) { console.error("Failed to load settings:", err); }
    };
    loadSettings();
    window.electronAPI?.getAppVersion?.().then((v) => { if (v) setAppVersion(v); });
    window.electronAPI?.getPendingUpdate?.().then((u) => { if (u) setUpdateInfo(u); });
    window.electronAPI?.onUpdateAvailable?.((data) => { setUpdateInfo(data); setUpdateCheckMsg(""); });
    window.electronAPI?.onUpdateCheckResult?.((data) => {
      setUpdateChecking(false);
      if (data.error) { setUpdateCheckMsg(data.error); setUpdateCheckType("error"); }
      else { setUpdateCheckMsg(data.message || "You're on the latest version."); setUpdateCheckType("success"); }
    });
    return () => { window.electronAPI?.removeUpdateListeners?.(); };
  }, []);

  const handleCheckForUpdate = async () => {
    setUpdateChecking(true); setUpdateCheckMsg(""); setUpdateInfo(null);
    await window.electronAPI?.checkForUpdate?.();
    setTimeout(() => setUpdateChecking(false), 10000);
  };

  const handleDownloadUpdate = async () => {
    setUpdateDownloading(true);
    await window.electronAPI?.downloadUpdate?.(updateInfo?.downloadUrl);
    setTimeout(() => setUpdateDownloading(false), 3000);
  };

  const handleIgnoreUpdate = async () => {
    await window.electronAPI?.ignoreUpdate?.();
    setUpdateInfo(null);
    setUpdateCheckMsg("Update dismissed. You'll be reminded again tomorrow.");
    setUpdateCheckType("info");
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault(); setMessage(""); setLoading(true);
    try {
      if (!passwordForm.currentPassword || !passwordForm.newPassword) { setMessage("All fields are required"); setMessageType("error"); return; }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) { setMessage("New passwords do not match"); setMessageType("error"); return; }
      if (passwordForm.newPassword.length < 6) { setMessage("Password must be at least 6 characters"); setMessageType("error"); return; }
      const userResult = await window.electronAPI.queryDatabase("SELECT password_hash FROM users WHERE id = ?", [user.id]);
      if (!userResult.success || !userResult.data[0]) { setMessage("User not found"); setMessageType("error"); return; }
      const passwordMatch = await bcrypt.compare(passwordForm.currentPassword, userResult.data[0].password_hash);
      if (!passwordMatch) { setMessage("Current password is incorrect"); setMessageType("error"); return; }
      const newHash = await bcrypt.hash(passwordForm.newPassword, 10);
      const updateResult = await window.electronAPI.executeDatabase("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, user.id]);
      if (!updateResult.success) { setMessage("Failed to update password"); setMessageType("error"); }
      else { setMessage("Password changed successfully"); setMessageType("success"); setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); }
    } catch { setMessage("Error changing password"); setMessageType("error"); }
    finally { setLoading(false); }
  };

  const handleSaveTaxSettings = async () => {
    setTaxMessage(""); setTaxMessageType(""); setTaxLoading(true);
    try {
      if (!taxSettings.taxName || taxSettings.taxRate < 0) { setTaxMessage("Please fill in all tax fields correctly"); setTaxMessageType("error"); return; }
      await window.electronAPI.setStoreData("taxSettings", taxSettings);
      setTaxMessage("Tax settings saved successfully"); setTaxMessageType("success");
      setTimeout(() => setTaxMessage(""), 3000);
    } catch { setTaxMessage("Failed to save tax settings"); setTaxMessageType("error"); }
    finally { setTaxLoading(false); }
  };

  const handleSaveInventorySettings = async () => {
    setInventoryMessage(""); setInventoryMessageType("");
    try {
      await window.electronAPI.setStoreData("inventoryMode", inventoryMode);
      setInventoryMessage("Inventory settings saved successfully"); setInventoryMessageType("success");
      setTimeout(() => setInventoryMessage(""), 3000);
    } catch { setInventoryMessage("Failed to save inventory settings"); setInventoryMessageType("error"); }
  };

  const handleSwitchAccount = async () => {
    setSwitchLoading(true);
    try {
      for (const key of ["domain","currentUser","storeInfo","taxSettings","inventoryMode","receiptSettings","backendUrl"]) {
        await window.electronAPI.deleteStoreData(key);
      }
      setShowSwitchAccountConfirm(false); onLogout?.();
    } catch { } finally { setSwitchLoading(false); }
  };

  return (
    <div className="page">
      <div className="page-header"><h1 className="page-title">Settings</h1></div>
      <div className="settings-container">
        <div className="settings-tabs">
          {[
            { id: "security", label: "Security & Account" },
            { id: "tax", label: "Tax Settings" },
            { id: "inventory", label: "Inventory" },
            { id: "updates", label: "Updates", badge: updateInfo ? "NEW" : null },
          ].map(({ id, label, badge }) => (
            <button key={id} className={`settings-tab ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>
              {label}
              {badge && <span style={{ marginLeft: "6px", background: "#48bb78", color: "white", fontSize: "10px", fontWeight: "700", padding: "1px 6px", borderRadius: "10px" }}>{badge}</span>}
            </button>
          ))}
        </div>

        <div className="settings-content">

          {activeTab === "security" && (
            <div className="settings-layout">
              <div className="settings-column left-column">
                <div className="settings-card">
                  <div className="card-header"><h2 className="card-title">Account Information</h2></div>
                  <div className="card-body">
                    <div className="account-avatar-section">
                      <div className="avatar-large">{user.name?.[0]?.toUpperCase() || "A"}</div>
                      <div className="avatar-info"><div className="avatar-name">{user.name}</div><div className="avatar-role">{user.role || "admin"}</div></div>
                    </div>
                    <div className="account-details">
                      <div className="detail-row"><label className="detail-label">Full Name</label><div className="detail-value">{user.name}</div></div>
                      <div className="detail-row"><label className="detail-label">Email</label><div className="detail-value">{user.email}</div></div>
                      <div className="detail-row"><label className="detail-label">Role</label><div className="detail-value" style={{ textTransform: "capitalize" }}>{user.role}</div></div>
                      <div className="detail-row"><label className="detail-label">Admin ID</label><div className="detail-value" style={{ fontFamily: "monospace", fontSize: "12px" }}>{user.id}</div></div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                      <button className="btn-signout" onClick={() => setShowLogoutConfirm(true)}>Sign Out</button>
                      <button className="btn-secondary" style={{ borderColor: "#f97316", color: "#f97316" }} onClick={() => setShowSwitchAccountConfirm(true)}>Switch Account</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="settings-column right-column">
                <div className="settings-card">
                  <div className="card-header"><h2 className="card-title">Change Password</h2></div>
                  <div className="card-body">
                    <form onSubmit={handlePasswordChange}>
                      <div className="form-group"><label className="form-label">Current Password *</label><input type="password" className="form-input" placeholder="Enter current password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required /></div>
                      <div className="form-group"><label className="form-label">New Password *</label><input type="password" className="form-input" placeholder="Min. 6 characters" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required /></div>
                      <div className="form-group"><label className="form-label">Confirm Password *</label><input type="password" className="form-input" placeholder="Repeat new password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required /></div>
                      {message && <div className={`form-${messageType}`}>{message}</div>}
                      <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Updating..." : "Update Password"}</button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tax" && (
            <div className="settings-section">
              <div className="settings-card full-width">
                <div className="card-header"><h2 className="card-title">Tax Configuration</h2></div>
                <div className="card-body">
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Tax Name</label><input type="text" className="form-input" placeholder="e.g. VAT, GST" value={taxSettings.taxName} onChange={(e) => setTaxSettings({ ...taxSettings, taxName: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Tax Rate (%)</label><input type="number" className="form-input" min="0" max="100" step="0.1" value={taxSettings.taxRate} onChange={(e) => setTaxSettings({ ...taxSettings, taxRate: parseFloat(e.target.value) || 0 })} /></div>
                  </div>
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={taxSettings.taxInclusive} onChange={(e) => setTaxSettings({ ...taxSettings, taxInclusive: e.target.checked })} />
                      <span>Tax Inclusive Pricing</span><span className="checkbox-hint">Product prices already include tax</span>
                    </label>
                  </div>
                  <div className="tax-preview"><p className="preview-text">ℹ️ With <strong>{taxSettings.taxName}</strong> at <strong>{taxSettings.taxRate}%</strong>, a <strong>1,000 KES</strong> item shows <strong>{(1000 * (1 + taxSettings.taxRate / 100)).toFixed(2)} KES</strong> at checkout.</p></div>
                  {taxMessage && <div className={`form-${taxMessageType}`}>{taxMessage}</div>}
                  <button className="btn-primary" onClick={handleSaveTaxSettings} disabled={taxLoading}>{taxLoading ? "Saving..." : "Save Tax Settings"}</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="settings-section">
              <div className="settings-card full-width">
                <div className="card-header"><h2 className="card-title">Inventory Deduction</h2></div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Inventory Deduction Mode</label>
                    <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}><input type="radio" name="inventoryMode" value="auto" checked={inventoryMode === "auto"} onChange={(e) => setInventoryMode(e.target.value)} /><span>Automatic</span></label>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}><input type="radio" name="inventoryMode" value="manual" checked={inventoryMode === "manual"} onChange={(e) => setInventoryMode(e.target.value)} /><span>Manual (Requires Admin Approval)</span></label>
                    </div>
                  </div>
                  <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#eff6ff", borderRadius: "6px", borderLeft: "4px solid #3b82f6" }}>
                    <p style={{ margin: "0", fontSize: "13px", color: "#1e40af", lineHeight: "1.5" }}><strong>Automatic:</strong> Stock is deducted immediately when an order is completed.<br /><strong>Manual:</strong> Stock deduction requires admin approval before being finalized.</p>
                  </div>
                  {inventoryMessage && <div style={{ marginTop: "16px" }} className={`form-${inventoryMessageType}`}>{inventoryMessage}</div>}
                  <button className="btn-primary" onClick={handleSaveInventorySettings} style={{ marginTop: "16px" }}>Save Inventory Settings</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "updates" && (
            <div className="settings-section">
              <div className="settings-card full-width">
                <div className="card-header"><h2 className="card-title">App Updates</h2></div>
                <div className="card-body">

                  {/* Version info bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "#f8f9fa", borderRadius: "8px", marginBottom: "20px", border: "1px solid #e2e8f0" }}>
                    <div><div style={{ fontSize: "12px", color: "#718096" }}>Current Version</div><div style={{ fontSize: "22px", fontWeight: "700", color: "#1a202c" }}>v{appVersion}</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontSize: "12px", color: "#718096" }}>App</div><div style={{ fontSize: "13px", color: "#4a5568" }}>POStore Desktop</div></div>
                  </div>

                  {/* Update available */}
                  {updateInfo && (
                    <div style={{ background: "linear-gradient(135deg, #f0fff4 0%, #e6fffa 100%)", border: "1px solid #9ae6b4", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                        <span style={{ fontSize: "20px" }}>🎉</span>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "700", color: "#276749" }}>Update Available — v{updateInfo.newVersion}</div>
                          {updateInfo.releaseDate && <div style={{ fontSize: "11px", color: "#48bb78" }}>Released {updateInfo.releaseDate}</div>}
                        </div>
                      </div>
                      {updateInfo.changelog?.length > 0 && (
                        <div style={{ marginBottom: "12px" }}>
                          <div style={{ fontSize: "12px", fontWeight: "600", color: "#276749", marginBottom: "6px" }}>What's new:</div>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                            {updateInfo.changelog.map((item, i) => (
                              <li key={i} style={{ fontSize: "12px", color: "#2d6a4f", display: "flex", gap: "6px", marginBottom: "4px" }}>
                                <span style={{ color: "#38a169" }}>✓</span> {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "6px", padding: "10px 12px", marginBottom: "12px", fontSize: "12px", color: "#276749", lineHeight: "1.6" }}>
                        <strong>How to update:</strong> Click <em>Download Update</em>. Your browser will download the new installer (<code>postore.exe</code>). Close this app, run the installer, then reopen. <strong>Your data is safe</strong> — the installer does not touch your database.
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className="btn-primary" onClick={handleDownloadUpdate} disabled={updateDownloading} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          {updateDownloading ? "Opening download..." : "Download Update"}
                        </button>
                        <button className="btn-secondary" onClick={handleIgnoreUpdate} style={{ whiteSpace: "nowrap" }}>Remind me later</button>
                      </div>
                    </div>
                  )}

                  {/* No update message */}
                  {!updateInfo && updateCheckMsg && (
                    <div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px", background: updateCheckType === "error" ? "#fff5f5" : updateCheckType === "info" ? "#fffbeb" : "#f0fff4", color: updateCheckType === "error" ? "#c53030" : updateCheckType === "info" ? "#92400e" : "#276749", border: `1px solid ${updateCheckType === "error" ? "#fc8181" : updateCheckType === "info" ? "#fde68a" : "#9ae6b4"}` }}>
                      {updateCheckMsg}
                    </div>
                  )}

                  {!updateInfo && !updateCheckMsg && (
                    <div style={{ color: "#a0aec0", fontSize: "13px", textAlign: "center", marginBottom: "16px" }}>
                      ✓ No updates pending. Click below to check now.
                    </div>
                  )}

                  <button className="btn-secondary" onClick={handleCheckForUpdate} disabled={updateChecking} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: updateChecking ? "spin 1s linear infinite" : "none" }}>
                      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    {updateChecking ? "Checking for updates..." : "Check for Updates"}
                  </button>
                  <p style={{ fontSize: "11px", color: "#a0aec0", marginTop: "12px", textAlign: "center" }}>
                    Updates are checked automatically on startup when connected to the internet.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {showLogoutConfirm && (
        <div className="modal-overlay"><div className="modal">
          <h2 className="modal-title">Sign Out</h2>
          <p className="modal-message">Are you sure you want to sign out?</p>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
            <button className="btn-danger" onClick={() => { setShowLogoutConfirm(false); onLogout?.(); }}>Sign Out</button>
          </div>
        </div></div>
      )}

      {showSwitchAccountConfirm && (
        <div className="modal-overlay"><div className="modal">
          <h2 className="modal-title">Switch Account</h2>
          <p className="modal-message">This will delete all data from this computer and return to setup.</p>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowSwitchAccountConfirm(false)}>Cancel</button>
            <button className="btn-danger" onClick={handleSwitchAccount} disabled={switchLoading}>{switchLoading ? "Switching..." : "Switch Account"}</button>
          </div>
        </div></div>
      )}
    </div>
  );
}