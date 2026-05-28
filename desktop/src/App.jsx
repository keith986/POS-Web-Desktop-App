import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import "./styles/global.css";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isSetup, setIsSetup] = useState(false); // has domain been configured?
  const [loading, setLoading] = useState(true);
  const [subscriptionNotification, setSubscriptionNotification] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        await window.electronAPI.initializeDatabase();

        // Check if domain is already configured (app was set up before)
        const domain = await window.electronAPI.getStoreData("domain");
        setIsSetup(!!domain);

        // Restore logged-in user from store if exists
        const storedUser = await window.electronAPI.getStoreData("currentUser");
        if (storedUser) {
          const access = await window.electronAPI.validateAccess();
          if (access.allowed) {
            setCurrentUser(storedUser);
            if (access.warning) {
              setSubscriptionNotification({ message: access.warning, subscription: access.subscription });
            }
            window.electronAPI.loginSuccess();
          } else {
            await window.electronAPI.setStoreData("currentUser", null);
            console.warn("Stored session blocked by subscription rules:", access.message || access.reason);
          }
        }

        // Auto-sync in background if already set up
        if (domain) {
          window.electronAPI.startSync().catch(console.error);
        }
      } catch (err) {
        console.error("Init failed:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSetupComplete = () => {
    setIsSetup(true);
  };

  const handleLogin = async (user, notification = null) => {
    setCurrentUser(user);
    // Persist user to store
    await window.electronAPI.setStoreData("currentUser", user);
    setSubscriptionNotification(notification);
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    // Clear user from store
    await window.electronAPI.setStoreData("currentUser", null);
  };

  if (loading) {
    return (
      <div className="splash">
        <div className="splash-logo">
          <span className="splash-icon">⬡</span>
          <h1>POStore</h1>
        </div>
        <div className="splash-spinner" />
      </div>
    );
  }

  return (
    <>
      {subscriptionNotification && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.65)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}>
          <div style={{
            width: "100%",
            maxWidth: 520,
            background: "#111",
            borderRadius: 24,
            padding: 28,
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            color: "#fff",
            lineHeight: 1.6,
          }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Subscription notice</h2>
            <p style={{ margin: 0, color: "#ddd" }}>{subscriptionNotification.message}</p>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button
                style={{
                  border: "none",
                  background: "#ff8500",
                  color: "#fff",
                  padding: "10px 18px",
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                onClick={() => setSubscriptionNotification(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Routes>
      {!isSetup ? (
        <Route path="/*" element={<Setup onSetupComplete={handleSetupComplete} />} />
      ) : !currentUser ? (
        <Route path="/*" element={<Login onLogin={handleLogin} />} />
      ) : currentUser.role === "admin" ? (
        <>
          <Route path="/admin/*" element={<AdminDashboard user={currentUser} onLogout={handleLogout} />} />
          <Route path="/*" element={<Navigate to="/admin" replace />} />
        </>
      ) : (
        <>
          <Route path="/staff/*" element={<StaffDashboard user={currentUser} onLogout={handleLogout} />} />
          <Route path="/*" element={<Navigate to="/staff" replace />} />
        </>
      )}
    </Routes>
    </>
  );
}

export default App;