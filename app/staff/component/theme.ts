"use client";

import { useEffect, useState, useCallback } from "react";

/* ─────────────────────────────────────────────────────────────
   THEME REGISTRY
   Every theme just overrides the same CSS custom properties
   that staffCss / StaffSettingsTab already build on:
   --bg --surface --ink --ink2 --muted --border --border2 --accent --accent-bg

   Applied via a `data-theme` attribute on <html>, so nothing that
   already reads var(--ink) etc. needs to change.
───────────────────────────────────────────────────────────── */
export interface StaffTheme {
  id:      string;
  label:   string;
  swatch:  string; // representative color for the picker dot
  vars: {
    bg:         string;
    surface:    string;
    ink:        string;
    ink2:       string;
    muted:      string;
    border:     string;
    border2:    string;
    accent:     string;
    accentBg:   string;
  };
}

export const THEMES: StaffTheme[] = [
  {
    id: "light", label: "Light", swatch: "#ffffff",
    vars: {
      bg: "#f7f6f2", surface: "#ffffff", ink: "#141410", ink2: "#3f3f38",
      muted: "#9a9a8e", border: "#ece9e1", border2: "#d8d5cb",
      accent: "#2563eb", accentBg: "#eff6ff",
    },
  },
  {
    id: "dark", label: "Dark", swatch: "#1c1c18",
    vars: {
      bg: "#0f0f0c", surface: "#1c1c18", ink: "#f5f4f0", ink2: "#d4d2c8",
      muted: "#8a8a7e", border: "rgba(255,255,255,0.08)", border2: "rgba(255,255,255,0.14)",
      accent: "#3b82f6", accentBg: "rgba(37,99,235,0.18)",
    },
  },
  {
    id: "midnight", label: "Midnight", swatch: "#111a2e",
    vars: {
      bg: "#0b1120", surface: "#111a2e", ink: "#e8edf7", ink2: "#b9c3d8",
      muted: "#6b7a99", border: "rgba(255,255,255,0.08)", border2: "rgba(255,255,255,0.14)",
      accent: "#60a5fa", accentBg: "rgba(96,165,250,0.18)",
    },
  },
  {
    id: "sepia", label: "Sepia", swatch: "#e7dcc4",
    vars: {
      bg: "#f4ecdd", surface: "#fdf8ef", ink: "#3b2f22", ink2: "#5c4a36",
      muted: "#a08a6b", border: "#e7dcc4", border2: "#d9c9a3",
      accent: "#b45309", accentBg: "#fef3c7",
    },
  },
  {
    id: "forest", label: "Forest", swatch: "#c3d4c6",
    vars: {
      bg: "#eef4ee", surface: "#ffffff", ink: "#16241c", ink2: "#35473c",
      muted: "#7e9186", border: "#dbe6dd", border2: "#c3d4c6",
      accent: "#16a34a", accentBg: "#ecfdf5",
    },
  },
];

export const DEFAULT_THEME_ID = "light";
const STORAGE_KEY = "staff_theme";

function applyTheme(id: string) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", id);
}

/* ── Shared hook: read/write the active theme ──
   Any component can call this — they all converge on the same
   localStorage value + the same data-theme attribute, so the
   Settings picker and the page shell never fall out of sync. */
export function useStaffTheme() {
  // Lazy initializer: reads localStorage once, synchronously, during the
  // first client render — no setState-in-effect needed for the initial value.
  const [theme, setThemeState] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME_ID;
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME_ID; }
    catch { return DEFAULT_THEME_ID; }
  });

  // Effect only does the external-system update (DOM attribute), not setState.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((id: string) => {
    setThemeState(id); // the effect above applies it to <html> and picks up the change
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  }, []);

  return { theme, setTheme };
}

/* ── Global stylesheet: one [data-theme="x"] block per theme ── */
export function buildThemeCss(): string {
  return THEMES.map(t => `
  html[data-theme="${t.id}"] {
    --bg: ${t.vars.bg};
    --surface: ${t.vars.surface};
    --ink: ${t.vars.ink};
    --ink2: ${t.vars.ink2};
    --muted: ${t.vars.muted};
    --border: ${t.vars.border};
    --border2: ${t.vars.border2};
    --accent: ${t.vars.accent};
    --accent-bg: ${t.vars.accentBg};
  }`).join("\n") + `
  html { transition: background 0.2s ease; }
  body { background: var(--bg); color: var(--ink); }
`;
}