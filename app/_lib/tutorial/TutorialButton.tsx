"use client";

import { useState } from "react";
import { useTutorial } from "./TutorialContext";

function IconGuide() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 2-3 4" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default function TutorialButton() {
  const { hasTour, pageLabel, steps, start } = useTutorial();
  const [introOpen, setIntroOpen] = useState(false);

  if (!hasTour) return null;

  return (
    <>
      <button
        onClick={() => setIntroOpen(true)}
        title={`How to use ${pageLabel}`}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "1px solid var(--border, #e2e0d8)",
          borderRadius: 100, padding: "5px 12px", cursor: "pointer",
          color: "var(--ink2, #4a4a40)", fontSize: 12, fontWeight: 500,
          fontFamily: "inherit", transition: "all 0.15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-bg, #fff4f0)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent, #d4522a)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent, #d4522a)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ink2, #4a4a40)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border, #e2e0d8)"; }}
      >
        <IconGuide /> Guide
      </button>

      {introOpen && (
        <div
          onClick={() => setIntroOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 3000,
            background: "rgba(20,20,16,0.45)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--surface, #fff)", borderRadius: 16, padding: "1.75rem",
              width: "100%", maxWidth: 420, boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent-bg, #fff4f0)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent, #d4522a)", marginBottom: "1rem" }}>
              <IconGuide />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink, #141410)", marginBottom: 6 }}>
              Guide to {pageLabel}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink2, #4a4a40)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              I'll walk you through this page step by step — {steps.length} quick stops. The background will dim so
              it's clear what each step is talking about; use Next / Back to move through it, or close any time.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setIntroOpen(false)}
                style={{ flex: 1, padding: "10px 0", background: "var(--bg, #f5f4f0)", border: "1px solid var(--border, #e2e0d8)", borderRadius: 9, fontSize: 13, color: "var(--ink2, #4a4a40)", cursor: "pointer", fontFamily: "inherit" }}
              >
                Not now
              </button>
              <button
                onClick={() => { setIntroOpen(false); start(); }}
                style={{ flex: 1, padding: "10px 0", background: "var(--accent, #d4522a)", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
              >
                Start tour
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
