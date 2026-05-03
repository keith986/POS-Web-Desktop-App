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
          setCurrentUser(storedUser);
          // Emit login-success event to resize window when restoring user
          window.electronAPI.loginSuccess();
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

  const handleLogin = async (user) => {
    setCurrentUser(user);
    // Persist user to store
    await window.electronAPI.setStoreData("currentUser", user);
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
  );
}

export default App;