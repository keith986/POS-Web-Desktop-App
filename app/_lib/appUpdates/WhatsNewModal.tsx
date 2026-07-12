"use client";

import { ChangelogEntry, ChangeType } from "./changelog";

interface WhatsNewModalProps {
  open:            boolean;
  entries:         ChangelogEntry[];
  onUpdate:        () => void;
  onIgnore:        () => void;
  isCritical?:     boolean;
  /** Optional override message a super admin set server-side for this
   *  critical build (POST /api/system/version { action: "set_critical" }).
   *  Falls back to the changelog entry's own copy when not set. */
  criticalMessage?: string | null;
  /** Seconds remaining before a critical update applies itself. */
  autoApplyIn?:    number | null;
  /** True while the countdown is held because the person is busy. */
  autoApplyPaused?: boolean;
}

/* ─── Per-type badge styling + icon ─────────────────────────── */
const TYPE_META: Record<ChangeType, { label: string; bg: string; color: string; icon: string }> = {
  feature:     { label: "New",     bg: "#eff6ff", color: "#2563eb", icon: "M12 5v14M5 12h14" },
  improvement: { label: "Improved", bg: "#f0fdf4", color: "#16a34a", icon: "M13 2L3 14h7l-1 8 10-12h-7z" },
  fix:         { label: "Fixed",   bg: "#fffbeb", color: "#d97706", icon: "M12 20a8 8 0 100-16 8 8 0 000 16zM12 8v4M12 16h.01" },
  removed:     { label: "Removed", bg: "#fef2f2", color: "#dc2626", icon: "M18 6L6 18M6 6l12 12" },
};

function TypeIcon({ d }: { d: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function IcoSparkle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 4.9L19 9.8l-4.9 1.9L12 17l-1.9-4.9L5 9.8l4.9-1.9z" />
      <path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </svg>
  );
}

function IcoAlert() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IcoPause() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

const css = `
  @keyframes wnFadeIn  { from { opacity: 0 }                        to { opacity: 1 } }
  @keyframes wnSlideUp { from { opacity: 0; transform: translate(-50%,-46%) } to { opacity: 1; transform: translate(-50%,-50%) } }

  .wn-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(3px);
    z-index: 2000;
    animation: wnFadeIn 0.2s ease;
  }

  .wn-card {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%,-50%);
    background: var(--surface, #fff);
    border: 1px solid var(--border, #e2e0d8);
    border-radius: 16px;
    width: 100%; max-width: 440px;
    max-height: 82vh;
    display: flex; flex-direction: column;
    z-index: 2001;
    box-shadow: 0 24px 60px rgba(0,0,0,0.22);
    font-family: 'DM Sans', sans-serif;
    animation: wnSlideUp 0.22s cubic-bezier(.4,0,.2,1);
    overflow: hidden;
  }
  .wn-card.critical { border-color: #fecaca; }

  .wn-head {
    padding: 1.5rem 1.75rem 1.1rem;
    border-bottom: 1px solid var(--border, #eee);
    flex-shrink: 0;
  }
  .wn-icon-wrap {
    width: 44px; height: 44px; border-radius: 50%;
    background: var(--accent-bg, #eff6ff);
    color: var(--accent, #2563eb);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 0.85rem;
  }
  .wn-icon-wrap.critical { background: #fef2f2; color: #dc2626; }

  .wn-title { font-size: 16px; font-weight: 600; color: var(--ink, #141410); margin-bottom: 4px; }
  .wn-sub   { font-size: 12.5px; color: var(--muted, #9a9a8e); line-height: 1.55; }

  .wn-list {
    padding: 1rem 1.75rem;
    overflow-y: auto;
    flex: 1;
    display: flex; flex-direction: column; gap: 14px;
  }

  .wn-entry { padding-bottom: 14px; border-bottom: 1px dashed var(--border2, #eee); }
  .wn-entry:last-child { border-bottom: none; padding-bottom: 0; }

  .wn-entry-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .wn-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10.5px; font-weight: 600; letter-spacing: 0.2px;
    padding: 2px 8px; border-radius: 100px;
  }
  .wn-version { font-size: 11px; color: var(--muted, #9a9a8e); margin-left: auto; }

  .wn-entry-title { font-size: 13.5px; font-weight: 600; color: var(--ink, #141410); margin-bottom: 4px; }
  .wn-entry-desc  { font-size: 12.5px; color: var(--muted, #6b6b60); line-height: 1.6; margin-bottom: 8px; }

  .wn-why {
    display: flex; gap: 7px;
    background: var(--bg, #faf9f5); border-radius: 8px;
    padding: 8px 10px; font-size: 12px; line-height: 1.55;
    color: var(--ink, #4a4a40);
  }
  .wn-why b { color: var(--ink, #141410); }
  .wn-why.critical { background: #fef2f2; color: #7f1d1d; }
  .wn-why.critical b { color: #991b1b; }

  .wn-actions {
    display: flex; flex-direction: column; gap: 8px;
    padding: 1rem 1.75rem 1.5rem;
    border-top: 1px solid var(--border, #eee);
    flex-shrink: 0;
  }
  .wn-actions-row { display: flex; gap: 8px; }

  .wn-btn-ignore {
    flex: 1; padding: 10px 0;
    background: #fff; color: #4a4a40;
    border: 1px solid #c8c6bc; border-radius: 9px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px; cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .wn-btn-ignore:hover { background: #f5f4f0; border-color: #9a9a8e; }

  .wn-btn-update {
    flex: 1.4; padding: 10px 0;
    background: var(--accent, #2563eb); color: #fff;
    border: none; border-radius: 9px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 500; cursor: pointer;
    transition: filter 0.15s, transform 0.1s;
  }
  .wn-btn-update:hover  { filter: brightness(1.08); }
  .wn-btn-update:active { transform: scale(0.98); }
  .wn-btn-update.critical { background: #dc2626; }

  .wn-countdown {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    text-align: center; font-size: 11.5px; color: var(--muted, #9a9a8e);
  }
  .wn-countdown b { color: #dc2626; }
  .wn-countdown.paused { color: #b45309; }
  .wn-countdown.paused b { color: #b45309; }
`;

export default function WhatsNewModal({
  open, entries, onUpdate, onIgnore,
  isCritical = false, criticalMessage = null, autoApplyIn = null, autoApplyPaused = false,
}: WhatsNewModalProps) {
  if (!open || entries.length === 0) return null;

  const plural = entries.length > 1;

  return (
    <>
      <style>{css}</style>

      {/* Critical updates can't be dismissed by clicking outside. */}
      <div className="wn-overlay" onClick={isCritical ? undefined : onIgnore} />

      <div className={`wn-card ${isCritical ? "critical" : ""}`}>
        <div className="wn-head">
          <div className={`wn-icon-wrap ${isCritical ? "critical" : ""}`}>
            {isCritical ? <IcoAlert /> : <IcoSparkle />}
          </div>
          <div className="wn-title">
            {isCritical
              ? "A critical update is ready"
              : plural
                ? `${entries.length} updates are available`
                : "An update is available"}
          </div>
          <div className="wn-sub">
            {isCritical
              ? criticalMessage
                ? criticalMessage
                : autoApplyPaused
                  ? "This fixes something important. It'll apply itself as soon as you finish what you're doing — no rush."
                  : "This fixes something important and will be applied automatically — you don't need to do anything."
              : "Here\u2019s what changed on your dashboard. Update now, or keep working and update later from the button in the header."}
          </div>
        </div>

        <div className="wn-list">
          {entries.map(e => {
            const meta = TYPE_META[e.type];
            return (
              <div className="wn-entry" key={e.version + e.title}>
                <div className="wn-entry-top">
                  <span className="wn-badge" style={{ background: meta.bg, color: meta.color }}>
                    <TypeIcon d={meta.icon} /> {meta.label}
                  </span>
                  <span className="wn-version">v{e.version}</span>
                </div>
                <div className="wn-entry-title">{e.title}</div>
                <div className="wn-entry-desc">{e.description}</div>
                <div className={`wn-why ${isCritical ? "critical" : ""}`}>
                  <span>{isCritical ? "⚠️" : "💡"}</span>
                  <span><b>Why it matters:</b> {e.importance}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="wn-actions">
          {isCritical ? (
            <>
              <div className="wn-actions-row">
                <button className="wn-btn-update critical" onClick={onUpdate} style={{ flex: 1 }}>
                  Update now
                </button>
              </div>
              {autoApplyIn !== null && (
                autoApplyPaused ? (
                  <div className="wn-countdown paused">
                    <IcoPause /> Paused — waiting until you&apos;re free
                  </div>
                ) : (
                  <div className="wn-countdown">
                    Applying automatically in <b>{autoApplyIn}s</b>
                  </div>
                )
              )}
            </>
          ) : (
            <div className="wn-actions-row">
              <button className="wn-btn-ignore" onClick={onIgnore}>Ignore for now</button>
              <button className="wn-btn-update" onClick={onUpdate}>Update now</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}