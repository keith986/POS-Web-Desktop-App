"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHANGELOG, ChangelogEntry } from "./changelog";

const SW_URL = "/sw.js";  

export function useAppUpdates() {
  const [showModal,       setShowModal]       = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false); // drives the header pill
  const [pendingEntries,  setPendingEntries]  = useState<ChangelogEntry[]>([]);
  const waitingWorker = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let reloaded = false;
    const onControllerChange = () => {
      // Fires once the newly-activated worker takes control — this is
      // the moment the "frozen" old version actually gets replaced.
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const flagUpdate = (worker: ServiceWorker) => {
      waitingWorker.current = worker;
      // The service worker only knows "a new version exists," not what
      // changed. changelog.ts supplies the human-readable description —
      // the newest entry is treated as "what's in this update."
      setPendingEntries(CHANGELOG.slice(0, 1));
      setUpdateAvailable(true);
      setShowModal(true);
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
    }).catch(() => {
      // Service workers can fail to register (unsupported browser,
      // insecure context, etc.) — fail quietly, app just runs unfrozen.
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  /** "Update now" — promote the waiting worker to active.
   *  The actual reload happens in the controllerchange handler above,
   *  once the browser confirms the new version has taken over. */
  const applyUpdate = useCallback(() => {
    waitingWorker.current?.postMessage({ type: "SKIP_WAITING" });
    setShowModal(false);
  }, []);

  /** "Ignore for now" — close the modal but keep the header pill lit,
   *  so the pending update isn't forgotten. The old version keeps
   *  running exactly as before until they come back and update. */
  const ignoreUpdate = useCallback(() => {
    setShowModal(false);
  }, []);

  const reopenModal = useCallback(() => setShowModal(true), []);

  return { pendingEntries, showModal, updateAvailable, applyUpdate, ignoreUpdate, reopenModal };
}