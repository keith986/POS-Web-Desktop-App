import React, { useState, useEffect } from "react";

export default function UpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Check if there's already a pending update from before this component mounted
    window.electronAPI?.getPendingUpdate?.().then((pending) => {
      if (pending) setUpdateInfo(pending);
    });

    // Listen for new update notifications from main process
    window.electronAPI?.onUpdateAvailable?.((data) => {
      setUpdateInfo(data);
      setDismissed(false); // re-show on reminder
    });

    return () => {
      window.electronAPI?.removeUpdateListeners?.();
    };
  }, []);

  if (!updateInfo || dismissed) return null;

  const handleDownload = async () => {
    setDownloading(true);
    await window.electronAPI?.downloadUpdate?.(updateInfo.downloadUrl);
    // After opening browser to download, show a message
    setTimeout(() => setDownloading(false), 3000);
  };

  const handleIgnore = async () => {
    await window.electronAPI?.ignoreUpdate?.();
    setDismissed(true);
  };

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 9999,
      width: "340px",
      background: "#1a1a2e",
      border: "1px solid #667eea",
      borderRadius: "12px",
      boxShadow: "0 8px 32px rgba(102,126,234,0.3)",
      overflow: "hidden",
      animation: "slideIn 0.3s ease",
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 16 12 12 8 16"/>
            <line x1="12" y1="12" x2="12" y2="21"/>
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
          </svg>
          <span style={{ color: "white", fontSize: "13px", fontWeight: "700" }}>
            {updateInfo.isReminder ? "⏰ Update Reminder" : "🆕 Update Available"}
          </span>
        </div>
        <button
          onClick={handleIgnore}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "16px", padding: "0" }}
        >✕</button>
      </div>

      {/* Body */}
      <div style={{ padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#a0aec0" }}>Current version</div>
            <div style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: "600" }}>v{updateInfo.currentVersion}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "12px", color: "#a0aec0" }}>New version</div>
            <div style={{ fontSize: "13px", color: "#48bb78", fontWeight: "700" }}>v{updateInfo.newVersion}</div>
          </div>
        </div>

        {updateInfo.releaseDate && (
          <div style={{ fontSize: "11px", color: "#718096", marginBottom: "8px" }}>
            Released: {updateInfo.releaseDate}
          </div>
        )}

        {/* Changelog toggle */}
        {updateInfo.changelog?.length > 0 && (
          <div style={{ marginBottom: "10px" }}>
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: "none", border: "none", color: "#667eea",
                fontSize: "11px", cursor: "pointer", padding: "0",
                display: "flex", alignItems: "center", gap: "4px",
              }}
            >
              {expanded ? "▾" : "▸"} What's new
            </button>
            {expanded && (
              <ul style={{ margin: "6px 0 0 0", paddingLeft: "16px", listStyle: "none" }}>
                {updateInfo.changelog.map((item, i) => (
                  <li key={i} style={{ fontSize: "11px", color: "#cbd5e0", marginBottom: "3px", display: "flex", gap: "6px" }}>
                    <span style={{ color: "#48bb78" }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* How to update info */}
        <div style={{
          background: "rgba(102,126,234,0.1)",
          border: "1px solid rgba(102,126,234,0.2)",
          borderRadius: "6px",
          padding: "8px 10px",
          marginBottom: "12px",
          fontSize: "11px",
          color: "#a0aec0",
          lineHeight: "1.5",
        }}>
          <strong style={{ color: "#e2e8f0" }}>How to update:</strong> Click Download below.
          Your browser will download the new installer. Run it to replace this version.
          Your data is safe — the installer does not delete your database.
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              flex: 1,
              background: downloading ? "#4a5568" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "7px",
              padding: "9px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: downloading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "opacity 0.2s",
            }}
          >
            {downloading ? (
              <>Opening download...</>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download Update
              </>
            )}
          </button>
          <button
            onClick={handleIgnore}
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "#718096",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "7px",
              padding: "9px 12px",
              fontSize: "12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Later
          </button>
        </div>

        <p style={{ fontSize: "10px", color: "#4a5568", margin: "8px 0 0", textAlign: "center" }}>
          You'll be reminded daily until you update
        </p>
      </div>
    </div>
  );
}