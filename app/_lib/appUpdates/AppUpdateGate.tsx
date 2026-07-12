"use client";

import { useEffect, useState } from "react";
import { useAppUpdates } from "./useAppUpdates";
import WhatsNewModal from "./WhatsNewModal";

const css = `
  @keyframes appUpdatePulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.45); }
    50%      { box-shadow: 0 0 0 5px rgba(22,163,74,0); }
  }
  .app-update-pill {
    position: fixed;
    top: 14px; right: 20px;
    z-index: 900; /* below the modal (2000+), above normal page content */
    display: flex; align-items: center; gap: 7px;
    padding: 6px 12px; border-radius: 100px;
    border: 1px solid rgba(22,163,74,0.3);
    background: #fff;
    color: #16a34a; font-family: 'DM Sans', sans-serif;
    font-size: 12px; font-weight: 600; cursor: pointer;
    white-space: nowrap; line-height: 1;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    transition: background 0.15s, transform 0.1s;
  }
  .app-update-pill:hover  { background: rgba(22,163,74,0.1); }
  .app-update-pill:active { transform: scale(0.97); }
  .app-update-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #16a34a; flex-shrink: 0;
    animation: appUpdatePulse 1.8s ease-in-out infinite;
  }
  @media (max-width: 800px) {
    .app-update-pill { top: 10px; right: 60px; padding: 6px 8px; }
    .app-update-pill-label { display: none; }
  }
`;

/** Minimal shape of whatever is stored under localStorage "user" —
 *  only the id (used as the auth token for /api/system/version) and
 *  role matter here. */
interface StoredAccount {
  id: string;
  role?: string;
}

/**
 * Drop this once near the top of a layout (e.g. admin/layout.tsx) to
 * get the same frozen-until-you-update behavior + update modal that
 * the staff dashboard has — no per-page wiring needed.
 *
 * @param role Only activate for accounts with this role, so mounting
 * it in a shared layout doesn't accidentally fire for someone else's
 * session data still sitting in localStorage.
 * @param isBusy Unused — kept for API symmetry with useAppUpdates,
 * where nothing auto-applies anymore so "busy" has nothing to pause.
 */
export default function AppUpdateGate({
  role,
  isBusy = false,
}: {
  role: "admin" | "staff";
  isBusy?: boolean;
}) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) return;
      const account = JSON.parse(stored) as StoredAccount;
      if (account?.id && account.role === role) setToken(account.id);
    } catch {
      // No valid session yet — the hook just stays inert until a
      // token shows up (e.g. after login this component remounts
      // under the authenticated layout).
    }
  }, [role]);

  const {
    pendingEntries, showModal, updateAvailable, isCritical, criticalMessage,
    applyUpdate, ignoreUpdate,
  } = useAppUpdates(token, isBusy);

  return (
    <>
      <style>{css}</style>

      {updateAvailable && !showModal && (
        <button
          className="app-update-pill"
          onClick={applyUpdate}
          title="Click to update and reload now"
        >
          <span className="app-update-dot" />
          <span className="app-update-pill-label">Update available</span>
        </button>
      )}

      <WhatsNewModal
        open={showModal}
        entries={pendingEntries}
        onUpdate={applyUpdate}
        onIgnore={ignoreUpdate}
        isCritical={isCritical}
        criticalMessage={criticalMessage}
      />
    </>
  );
}
