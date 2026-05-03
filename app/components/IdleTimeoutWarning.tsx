"use client";
import { useState, useEffect } from "react";
import { useIdleTimeout } from "@/app/hooks/useIdleTimeout";
import { useRouter } from "next/navigation";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function getIsLoggedIn() {
  if (typeof window === "undefined") return false;
  try {
    const user = JSON.parse(localStorage.getItem("user") ?? "null");
    return !!user?.id;
  } catch {
    return false;
  }
}

function clearSession() {
  localStorage.removeItem("user");
  localStorage.removeItem("read_notifs");
  localStorage.removeItem("tab_close_time");
}

export default function IdleTimeoutWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown,   setCountdown]   = useState(300);
  const [isLoggedIn]                  = useState(getIsLoggedIn);
  const router = useRouter();

  // ── On mount: check if tab was closed for more than 30 mins ──
  useEffect(() => {
    const closeTime = localStorage.getItem("tab_close_time");
    if (closeTime) {
      const elapsed = Date.now() - parseInt(closeTime, 10);
      if (elapsed >= SESSION_TIMEOUT_MS) {
        clearSession();
        router.replace("/");
        window.location.reload();
        return;
      }
    }
    // Clear the close time since tab is now open
    localStorage.removeItem("tab_close_time");

    // Save timestamp when tab is closed/hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        localStorage.setItem("tab_close_time", Date.now().toString());
      } else {
        // Tab became visible again — check elapsed time
        const t = localStorage.getItem("tab_close_time");
        if (t) {
          const elapsed = Date.now() - parseInt(t, 10);
          if (elapsed >= SESSION_TIMEOUT_MS) {
            clearSession();
            router.replace("/");
            window.location.reload(); // Force reload to reset state and show login screen
            return;
          }
          localStorage.removeItem("tab_close_time");
        }
      }
    };

    const handleBeforeUnload = () => {
      localStorage.setItem("tab_close_time", Date.now().toString());
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.replace("/");
  };

  useIdleTimeout({
    timeoutMinutes: 30,
    warningMinutes: 5,
    onWarning: () => {
      if (!isLoggedIn) return;
      setShowWarning(true);
      setCountdown(300);
    },
    onLogout: handleLogout,
  });

  // ── Countdown ticker — auto logout when it hits 0 ──
  useEffect(() => {
    if (!showWarning) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto logout when countdown depletes
          clearSession();
          router.replace("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWarning]);

  if (!isLoggedIn) return null;
  if (!showWarning) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{
        background: "#fff", borderRadius: 12,
        padding: "2rem", maxWidth: 400, width: "90%",
        textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" stroke="black" strokeWidth="2" fill="white" />
            <line x1="50" y1="50" x2="50" y2="30" stroke="black" strokeWidth="4" strokeLinecap="round" />
            <line x1="50" y1="50" x2="65" y2="50" stroke="black" strokeWidth="2" strokeLinecap="round" />
            <circle cx="50" cy="50" r="3" fill="black" />
          </svg>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          Session Expiring Soon
        </h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
          You have been inactive. Your session will expire in:
        </p>

        <div style={{
          fontSize: 36, fontWeight: 700,
          color: countdown < 60 ? "#dc2626" : "#d4522a",
          marginBottom: 24,
        }}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={() => {
              setShowWarning(false);
              setCountdown(300);
            }}
            style={{
              padding: "10px 24px", background: "#141410",
              color: "#fff", border: "none", borderRadius: 8,
              cursor: "pointer", fontSize: 14, fontWeight: 500,
            }}
          >
            Stay logged in
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 24px", background: "#f3f4f6",
              color: "#374151", border: "none", borderRadius: 8,
              cursor: "pointer", fontSize: 14,
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}