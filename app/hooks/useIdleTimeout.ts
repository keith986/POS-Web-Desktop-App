"use client";
import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseIdleTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onWarning?: () => void;
  onLogout?: () => void;
}

export function useIdleTimeout({
  timeoutMinutes = 30,
  warningMinutes = 5,
  onWarning,
  onLogout,
}: UseIdleTimeoutOptions = {}) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("read_notifs");
    onLogout?.();
    router.push("/");
  }, [router, onLogout]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000;

    warningRef.current = setTimeout(() => {
      onWarning?.();
    }, warningMs);

    timeoutRef.current = setTimeout(() => {
      logout();
    }, timeoutMs);
  }, [timeoutMinutes, warningMinutes, logout, onWarning]);

  useEffect(() => {
    // Only run if a user is logged in
    const user = (() => {
      try { return JSON.parse(localStorage.getItem("user") ?? "null"); }
      catch { return null; }
    })();
    if (!user?.id) return;

    const events = [
      "mousedown", "mousemove", "keydown",
      "scroll", "touchstart", "click", "keypress",
    ];

    resetTimer();
    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [resetTimer]);

  return { resetTimer };
}