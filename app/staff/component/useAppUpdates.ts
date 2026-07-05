"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHANGELOG, ChangelogEntry } from "./changelog";

const SW_URL = "/sw.js";

/** How long a critical update waits before applying itself, in seconds.
 *  Long enough to read the modal, short enough that it can't be stalled.
 *  Only counts down while the staff member isn't mid-action. */
const CRITICAL_AUTO_APPLY_SECONDS = 10;

/** How often to actively ask the browser "is there a newer sw.js yet?"
 *  instead of waiting for the next full page navigation to find out. */
const UPDATE_CHECK_INTERVAL_MS = 60_000; // 1 minute

/**
 * @param isBusy Pass `true` while the staff member is mid-action and a
 * reload would lose work — e.g. items in the cart, the payment modal
 * open, an unsaved form. The critical-update countdown pauses (but
 * keeps checking every second) while this is true, and only resumes
 * once it goes back to false. Non-critical updates are unaffected —
 * those already wait for an explicit click regardless of busy state.
 */
export function useAppUpdates(isBusy: boolean = false) {
  const [showModal,        setShowModal]        = useState(false);
  const [updateAvailable,  setUpdateAvailable]  = useState(false); // drives the header pill
  const [pendingEntries,   setPendingEntries]   = useState<ChangelogEntry[]>([]);
  const [isCritical,       setIsCritical]       = useState(false);
  const [autoApplyIn,      setAutoApplyIn]      = useState<number | null>(null);
  const [autoApplyPaused,  setAutoApplyPaused]  = useState(false);

  const waitingWorker = useRef<ServiceWorker | null>(null);
  const countdownId   = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkIntervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanupExtras   = useRef<(() => void) | null>(null);
  const busyRef        = useRef(isBusy);

  useEffect(() => { busyRef.current = isBusy; }, [isBusy]);

  const clearCountdown = useCallback(() => {
    if (countdownId.current) {
      clearInterval(countdownId.current);
      countdownId.current = null;
    }
  }, []);

  /** "Update now" — promote the waiting worker to active.
   *  The actual reload happens once the browser confirms the new
   *  version has taken over (controllerchange, below). */
  const applyUpdate = useCallback(() => {
    clearCountdown();
    waitingWorker.current?.postMessage({ type: "SKIP_WAITING" });
    setShowModal(false);
  }, [clearCountdown]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const flagUpdate = (worker: ServiceWorker) => {
      waitingWorker.current = worker;

      // The service worker only knows "a new version exists," not what
      // changed or whether it's urgent — changelog.ts supplies that.
      // The newest entry is treated as "what's in this update."
      const topEntry = CHANGELOG[0];
      const critical = !!topEntry?.critical;

      setPendingEntries(CHANGELOG.slice(0, 1));
      setUpdateAvailable(true);
      setIsCritical(critical);
      setShowModal(true);

      if (critical) {
        let remaining = CRITICAL_AUTO_APPLY_SECONDS;
        setAutoApplyIn(remaining);
        setAutoApplyPaused(busyRef.current);

        countdownId.current = setInterval(() => {
          // Staff member is mid-sale / mid-payment — hold the countdown
          // where it is and keep checking back every second instead of
          // reloading out from under them.
          if (busyRef.current) {
            setAutoApplyPaused(true);
            return;
          }
          setAutoApplyPaused(false);
          remaining -= 1;
          setAutoApplyIn(remaining);
          if (remaining <= 0) {
            clearCountdown();
            waitingWorker.current?.postMessage({ type: "SKIP_WAITING" });
            setShowModal(false);
          }
        }, 1000);
      } else {
        setAutoApplyIn(null);
        setAutoApplyPaused(false);
      }
    };

    navigator.serviceWorker.register(SW_URL).then((reg) => {
      // A new version was already installed and waiting before this
      // tab/session started (e.g. deploy happened while they were away).
      if (reg.waiting && navigator.serviceWorker.controller) {
        flagUpdate(reg.waiting);
      }
      // A new version finishes installing while this tab is open.
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            flagUpdate(newWorker);
          }
        });
      });

      // The browser only re-checks sw.js for changes on navigation by
      // default, which on a dashboard people leave open all shift could
      // mean hours before a deploy is even noticed. Ask explicitly:
      // periodically, and whenever the tab comes back into focus.
      const checkForUpdate = () => { reg.update().catch(() => {}); };

      checkIntervalId.current = setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);

      const onVisibilityChange = () => {
        if (document.visibilityState === "visible") checkForUpdate();
      };
      document.addEventListener("visibilitychange", onVisibilityChange);
      window.addEventListener("focus", checkForUpdate);

      // Stash these so the outer cleanup (below) can remove them —
      // they're only created once `reg` resolves.
      cleanupExtras.current = () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("focus", checkForUpdate);
      };
    }).catch(() => {
      // Service workers can fail to register (unsupported browser,
      // insecure context, etc.) — fail quietly, app just runs unfrozen.
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      clearCountdown();
      if (checkIntervalId.current) clearInterval(checkIntervalId.current);
      cleanupExtras.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearCountdown]);

  /** "Ignore for now" — close the modal but keep the header pill lit.
   *  Not available for critical updates: those can't be silenced,
   *  only watched (and, if you're busy, waited on) until applied. */
  const ignoreUpdate = useCallback(() => {
    if (isCritical) return;
    setShowModal(false);
  }, [isCritical]);

  const reopenModal = useCallback(() => setShowModal(true), []);

  return {
    pendingEntries,
    showModal,
    updateAvailable,
    isCritical,
    autoApplyIn,
    autoApplyPaused,
    applyUpdate,
    ignoreUpdate,
    reopenModal,
  };
}