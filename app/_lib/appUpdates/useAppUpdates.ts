"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHANGELOG, ChangelogEntry } from "./changelog";

const SW_URL = "/sw.js";
const VERSION_API = "/api/system/version";

/** How often to actively ask the browser "is there a newer sw.js yet?"
 *  instead of waiting for the next full page navigation to find out. */
const UPDATE_CHECK_INTERVAL_MS = 60_000; // 1 minute

/** If SKIP_WAITING doesn't cause a controllerchange event within this
 *  long, force a reload anyway rather than leaving the person stuck on
 *  the old version with no feedback. */
const RELOAD_FALLBACK_MS = 4_000;

/** How long "Ignore for now" is allowed to stay quiet before the modal
 *  pops back up on its own — like an ad — for as long as the update
 *  remains un-applied. Applies within a single open tab; a fresh page
 *  load (refresh, or logging back in) always shows it again too, see
 *  flagUpdate() below. */
const REPROMPT_INTERVAL_MS = 3 * 60_000; // 3 minutes

interface VersionApiResponse {
  version: string;
  isCritical: boolean;
  message: string | null;
  dismissed: boolean;
}

/**
 * @param token The logged-in person's id (staff.id or users.id) — used
 * to authenticate the /api/system/version calls that back the
 * "server says critical" state. Pass null while auth hasn't loaded yet;
 * the hook just won't talk to the server until it's set (the
 * service-worker freeze/update mechanics still work).
 * @param isBusy Unused — kept only so existing call sites (e.g. the
 * staff dashboard passing cart/payment state) don't need to change.
 * Nothing in this hook auto-applies anymore, critical or not, so there
 * is nothing left for "busy" to pause.
 */
export function useAppUpdates(token: string | null = null, isBusy: boolean = false) {
  const [showModal,        setShowModal]        = useState(false);
  const [updateAvailable,  setUpdateAvailable]  = useState(false); // drives the header pill
  const [pendingEntries,   setPendingEntries]   = useState<ChangelogEntry[]>([]);
  const [isCritical,       setIsCritical]       = useState(false);
  const [criticalMessage,  setCriticalMessage]  = useState<string | null>(null);

  const waitingWorker   = useRef<ServiceWorker | null>(null);
  const checkIntervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanupExtras   = useRef<(() => void) | null>(null);
  const reloadFallbackId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repromptId      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef        = useRef(token);

  useEffect(() => { tokenRef.current = token; }, [token]);

  const clearReprompt = useCallback(() => {
    if (repromptId.current) {
      clearTimeout(repromptId.current);
      repromptId.current = null;
    }
  }, []);

  /** Ask the server what it knows about the currently-deployed build:
   *  whether a super admin has force-flagged it critical, and whether
   *  *this* account already dismissed it. Persisted server-side keyed
   *  by account id, so it survives logout/login, page refreshes, and
   *  cleared cookies/local storage — it isn't tied to this browser at
   *  all, it's tied to the account. */
  const fetchServerState = useCallback(async (): Promise<VersionApiResponse | null> => {
    if (!tokenRef.current) return null;
    try {
      const res = await fetch(VERSION_API, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as VersionApiResponse;
    } catch {
      return null;
    }
  }, []);

  /** Persist "this account ignored this update" server-side. Only
   *  called for non-critical updates — critical ones can't be ignored,
   *  so there's nothing to remember beyond "it got applied". */
  const persistDismiss = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      await fetch(VERSION_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({ action: "dismiss" }),
      });
    } catch {
      // Best-effort — worst case the modal reappears next session,
      // which is a minor annoyance, not a correctness problem.
    }
  }, []);

  /** "Update now" (from the modal OR the header pill — both call this
   *  directly) — promote the waiting worker to active. The reload
   *  normally happens via the browser's controllerchange event, but if
   *  that doesn't fire quickly for any reason, we force it ourselves
   *  so clicking Update always ends in a reload, no dead ends. */
  const applyUpdate = useCallback(() => {
    clearReprompt();
    waitingWorker.current?.postMessage({ type: "SKIP_WAITING" });
    setShowModal(false);

    if (reloadFallbackId.current) clearTimeout(reloadFallbackId.current);
    reloadFallbackId.current = setTimeout(() => {
      window.location.reload();
    }, RELOAD_FALLBACK_MS);
  }, [clearReprompt]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let reloaded = false;
    const doReload = () => {
      if (reloaded) return;
      reloaded = true;
      if (reloadFallbackId.current) clearTimeout(reloadFallbackId.current);
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", doReload);

    const flagUpdate = async (worker: ServiceWorker) => {
      waitingWorker.current = worker;

      // The service worker only knows "a new version exists," not what
      // changed, whether it's urgent, or whether *this account* already
      // said "not now" — changelog.ts + the server supply that.
      const topEntry = CHANGELOG[0];
      const changelogCritical = !!topEntry?.critical;

      const serverState = await fetchServerState();
      // Critical if EITHER this changelog entry says so, OR a super
      // admin has force-flagged the live build critical server-side.
      const critical = changelogCritical || !!serverState?.isCritical;

      setPendingEntries(CHANGELOG.slice(0, 1));
      setUpdateAvailable(true);
      setIsCritical(critical);
      setCriticalMessage(critical ? serverState?.message ?? null : null);

      // Deliberately NOT hiding the modal just because this account
      // clicked "Ignore for now" before. As long as the update hasn't
      // actually been applied (waitingWorker is still parked), the
      // modal is meant to nag like an ad — every fresh page load
      // (refresh, logout/login) shows it again, and ignoreUpdate()
      // below re-queues it within an open tab too. The only way to
      // stop seeing it is to click "Update now".
      //
      // Critical updates are no different in that respect: they used
      // to auto-apply after a 30-second countdown, but nothing ever
      // applies without an explicit click now — critical just means
      // the modal can't be ignored/dismissed, only watched.
      setShowModal(true);
    };

    navigator.serviceWorker.register(SW_URL).then((reg) => {
      // A new version was already installed and waiting before this
      // tab/session started (e.g. deploy happened while they were away).
      if (reg.waiting && navigator.serviceWorker.controller) {
        flagUpdate(reg.waiting).catch(() => {});
      }
      // A new version finishes installing while this tab is open.
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            flagUpdate(newWorker).catch(() => {});
          }
        });
      });

      // The browser only re-checks sw.js for changes on navigation by
      // default, which on a dashboard people leave open all shift could
      // mean hours before a deploy is even noticed. Ask explicitly:
      // once right away, periodically after that, and whenever the tab
      // comes back into focus.
      const checkForUpdate = () => { reg.update().catch(() => {}); };

      checkForUpdate(); // don't wait for the first interval tick
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
      navigator.serviceWorker.removeEventListener("controllerchange", doReload);
      clearReprompt();
      if (checkIntervalId.current) clearInterval(checkIntervalId.current);
      if (reloadFallbackId.current) clearTimeout(reloadFallbackId.current);
      cleanupExtras.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearReprompt, applyUpdate, fetchServerState]);

  /** "Ignore for now" — close the modal for the moment, but it isn't
   *  gone: the header pill stays lit, it pops back up on its own after
   *  REPROMPT_INTERVAL_MS in this tab, and every fresh page load
   *  (refresh, logout/login) shows it again from scratch too. Nothing
   *  about "ignore" is remembered as a way to silence it — the only
   *  way to actually stop seeing it is clicking "Update now". Not
   *  available for critical updates: those can't be silenced at all,
   *  only watched (and, if you're busy, waited on) until applied. */
  const ignoreUpdate = useCallback(() => {
    if (isCritical) return;
    setShowModal(false);
    // Best-effort record of the click (useful for a super-admin "who
    // hasn't updated yet" view) — it no longer suppresses the modal on
    // future loads, see flagUpdate() above.
    persistDismiss();

    // Bring it back on its own after a few minutes, like an ad, for as
    // long as this tab stays open and the update is still un-applied.
    clearReprompt();
    repromptId.current = setTimeout(() => {
      setShowModal(true);
    }, REPROMPT_INTERVAL_MS);
  }, [isCritical, persistDismiss, clearReprompt]);

  const reopenModal = useCallback(() => setShowModal(true), []);

  return {
    pendingEntries,
    showModal,
    updateAvailable,
    isCritical,
    criticalMessage,
    applyUpdate,
    ignoreUpdate,
    reopenModal,
  };
}
