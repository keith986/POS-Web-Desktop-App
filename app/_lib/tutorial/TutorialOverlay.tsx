"use client";

import { useEffect, useState, useCallback } from "react";
import { useTutorial } from "./TutorialContext";

interface Rect { top: number; left: number; width: number; height: number; }

const PAD = 8;

function getRect(selector?: string): Rect | null {
  if (!selector) return null;
  const el = document.querySelector(`[data-tutorial="${selector}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

export default function TutorialOverlay() {
  const { isOpen, steps, stepIndex, next, back, close } = useTutorial();
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[stepIndex];

  const recompute = useCallback(() => {
    if (!step) return;
    setRect(getRect(step.target));
    if (step.target) {
      document.querySelector(`[data-tutorial="${step.target}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;
    /* Small delay lets scroll-into-view from the previous step settle
       before we measure the next target's position. */
    const t = setTimeout(recompute, 60);
    window.addEventListener("resize", recompute);
    return () => { clearTimeout(t); window.removeEventListener("resize", recompute); };
  }, [isOpen, recompute]);

  if (!isOpen || !step) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  /* Tooltip position: prefer below the spotlight, flip above if no room. */
  const cardWidth = 320;
  let cardTop  = rect ? rect.top + rect.height + 14 : vh / 2 - 80;
  let cardLeft = rect ? Math.min(Math.max(rect.left, 16), vw - cardWidth - 16) : vw / 2 - cardWidth / 2;
  if (rect && cardTop + 220 > vh) cardTop = Math.max(rect.top - 220 - 14, 16);

  const darkLayerStyle: React.CSSProperties = {
    position: "fixed", background: "rgba(15,15,12,0.55)", backdropFilter: "blur(2px)",
    zIndex: 4000, transition: "all 0.2s ease",
  };

  return (
    <>
      {/* ── 4 strips around the spotlight (or one full-screen layer if no target) ── */}
      {!rect ? (
        <div style={{ ...darkLayerStyle, inset: 0 }} onClick={close} />
      ) : (
        <>
          <div style={{ ...darkLayerStyle, top: 0, left: 0, right: 0, height: Math.max(rect.top, 0) }} onClick={close} />
          <div style={{ ...darkLayerStyle, top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }} onClick={close} />
          <div style={{ ...darkLayerStyle, top: rect.top, left: 0, width: Math.max(rect.left, 0), height: rect.height }} onClick={close} />
          <div style={{ ...darkLayerStyle, top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height }} onClick={close} />
          {/* Glow ring around the spotlighted element */}
          <div style={{
            position: "fixed", top: rect.top, left: rect.left, width: rect.width, height: rect.height,
            zIndex: 4001, borderRadius: 10, boxShadow: "0 0 0 3px #d4522a, 0 0 24px rgba(212,82,42,0.5)",
            pointerEvents: "none", transition: "all 0.2s ease",
          }} />
        </>
      )}

      {/* ── Tooltip card ── */}
      <div style={{
        position: "fixed", top: cardTop, left: cardLeft, width: cardWidth,
        zIndex: 4002, background: "var(--surface, #fff)", borderRadius: 14,
        padding: "1.1rem 1.25rem", boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        fontFamily: "'DM Sans', sans-serif", transition: "top 0.2s ease, left 0.2s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--accent, #d4522a)" }}>
            Step {stepIndex + 1} of {steps.length}
          </span>
          <button onClick={close} aria-label="Close guide" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted, #9a9a8e)", padding: 2, display: "flex" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink, #141410)", marginBottom: 6 }}>{step.title}</div>
        <div style={{ fontSize: 13, color: "var(--ink2, #4a4a40)", lineHeight: 1.55, marginBottom: step.example ? 10 : 14 }}>{step.body}</div>

        {step.example && (
          <div style={{ fontSize: 12, color: "var(--ink2, #4a4a40)", background: "var(--bg, #f5f4f0)", border: "1px solid var(--border, #e2e0d8)", borderRadius: 8, padding: "0.6rem 0.75rem", marginBottom: 14, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700, color: "var(--ink, #141410)" }}>Example: </span>{step.example}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={back}
            disabled={stepIndex === 0}
            style={{ flex: 1, padding: "8px 0", background: "none", border: "1px solid var(--border, #e2e0d8)", borderRadius: 8, fontSize: 12, color: stepIndex === 0 ? "var(--muted, #c8c6bc)" : "var(--ink2, #4a4a40)", cursor: stepIndex === 0 ? "default" : "pointer", fontFamily: "inherit" }}
          >
            Back
          </button>
          {stepIndex < steps.length - 1 ? (
            <button
              onClick={next}
              style={{ flex: 1, padding: "8px 0", background: "var(--accent, #d4522a)", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={close}
              style={{ flex: 1, padding: "8px 0", background: "var(--accent, #d4522a)", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </>
  );
}
