"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme:       Theme;
  setTheme:    (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "pos-theme";

/**
 * Safety-net CSS for legacy/un-migrated pages.
 * ─────────────────────────────────────────
 * Many existing pages hardcode card/panel backgrounds (e.g. `background: "#fff"`)
 * but leave text color unset, relying on inheritance from <body>. Body's
 * default color is `var(--ink)`, which intentionally FLIPS in dark mode
 * (dark text → light text) for pages that have been fully migrated to theme
 * variables (background + color both flip together, e.g. the Orders and
 * Dashboard pages). On pages that haven't been migrated yet, that same flip
 * turns text near-white while its hardcoded white background stays put —
 * producing exactly the washed-out, low-contrast numbers seen on the
 * dashboard before it was fixed.
 *
 * This rule targets ONLY inline-styled elements that don't declare their own
 * `color` — i.e. text relying on inheritance — and pins them to a color that
 * reads fine against the light, hardcoded backgrounds still used throughout
 * the app. It intentionally does NOT touch:
 *   - Elements that set their own inline `color` (already explicit, left alone)
 *   - Class-based styling with no inline `style` attribute (e.g. `.product-name`)
 *   - The sidebar (every sidebar element sets its own color explicitly)
 *
 * It's a stopgap, not a substitute for migrating each page to paired
 * background+color theme variables — but it stops untouched pages from
 * becoming unreadable the moment dark mode is turned on.
 */
const THEME_SAFETY_CSS = `
  .main [style]:not([style*="color:"]),
  .card [style]:not([style*="color:"]) {
    color: #767674;
  }
`;

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* localStorage unavailable — fall through to system preference */
  }
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // `resolvedTheme` is null until we know the real preference. This lets us
  // render "light" markup on the server (avoiding hydration mismatch) while
  // only needing a SINGLE setState call on mount, instead of two separate
  // ones (theme + mounted) that would cause a cascading re-render.
  const [resolvedTheme, setResolvedTheme] = useState<Theme | null>(null);
  const mounted = resolvedTheme !== null;
  const theme: Theme = resolvedTheme ?? "light";

  useEffect(() => {
    // Intentional: this reads localStorage/matchMedia, external browser APIs
    // that can't be accessed during render (SSR-unsafe) or via a useState
    // lazy initializer without risking a hydration mismatch. The "you might
    // not need an effect" heuristic doesn't apply — there's no way to derive
    // this value from props/state during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResolvedTheme(getInitialTheme());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore write errors (private browsing, quota, etc.) */
    }
  }, [theme, mounted]);

  const setTheme = useCallback((t: Theme) => setResolvedTheme(t), []);
  const toggleTheme = useCallback(
    () => setResolvedTheme(prev => ((prev ?? "light") === "light" ? "dark" : "light")),
    []
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <style>{THEME_SAFETY_CSS}</style>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

/* ── Ready-made toggle button ──────────────────────────
   Drop this into the sidebar footer (see .theme-toggle-btn styles
   already defined in layout.tsx). Usage:

     import { ThemeToggle } from "@/app/_lib/ThemeContext";
     ...
     <ThemeToggle />
── */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button type="button" className="theme-toggle-btn" onClick={toggleTheme}>
      {isDark ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}

/* ── Compact header icon toggle ──────────────────────────
   Sized/styled to match .header-bell (32x32, bordered, rounded) so it drops
   straight into a page header next to the notification bell. Usage:

     import { HeaderThemeToggle } from "@/app/_lib/ThemeContext";
     ...
     <HeaderThemeToggle />
── */
export function HeaderThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="header-bell"
      style={{ background: "none", cursor: "pointer" }}
    >
      {isDark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}