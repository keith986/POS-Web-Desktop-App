/**
 * updater.js
 * Place at: desktop/src/updater.js
 *
 * HOW IT WORKS:
 * 1. On startup, fetches version.json from your GitHub repo (public/downloads/version.json)
 * 2. Compares with local package.json version
 * 3. If newer → sends "update-available" to renderer + shows OS notification
 * 4. If user ignores → reminds daily via setInterval
 * 5. IPC handlers let the renderer manually check, download, or dismiss
 */

const { ipcMain, shell, Notification, app } = require("electron");
const https = require("https");

// ── CONFIG — update this URL to your actual raw GitHub URL ──────────────────
const VERSION_URL =
  "https://raw.githubusercontent.com/keith986/POS-Web-Desktop-App/raw/refs/heads/main/public/downloads/version.json";

const CURRENT_VERSION = app.getVersion(); // reads from desktop/package.json
const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Simple in-memory state (no extra dependency needed) ─────────────────────
let pendingUpdate = null;
let userIgnored = false;
let reminderTimer = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 8000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

/** Returns true if remote semver is strictly greater than local */
function isNewer(remote, local) {
  const p = (v) => String(v).split(".").map(Number);
  const [rA, rB, rC] = p(remote);
  const [lA, lB, lC] = p(local);
  if (rA !== lA) return rA > lA;
  if (rB !== lB) return rB > lB;
  return rC > lC;
}

// ── Core check ───────────────────────────────────────────────────────────────

async function checkForUpdate(mainWindow, silent = false) {
  let data;
  try {
    data = await fetchJSON(VERSION_URL);
  } catch {
    data = null;
  }

  if (!data || !data.version) {
    if (!silent) {
      mainWindow.webContents.send("update-check-result", {
        hasUpdate: false,
        error: "Could not reach update server. Check your internet connection.",
      });
    }
    return;
  }

  if (isNewer(data.version, CURRENT_VERSION)) {
    pendingUpdate = {
      currentVersion: CURRENT_VERSION,
      newVersion: data.version,
      releaseDate: data.releaseDate || "",
      changelog: data.changelog || [],
      downloadUrl: data.downloadUrl,
    };

    // Tell the renderer — it will show the in-app banner
    mainWindow.webContents.send("update-available", {
      ...pendingUpdate,
      isReminder: false,
    });

    // OS-level notification
    if (Notification.isSupported()) {
      new Notification({
        title: "POStore Update Available",
        body: `Version ${data.version} is ready. Open Settings to update.`,
      }).show();
    }

    // Start daily reminder if user ignores
    startDailyReminder(mainWindow);
  } else {
    pendingUpdate = null;
    if (!silent) {
      mainWindow.webContents.send("update-check-result", {
        hasUpdate: false,
        currentVersion: CURRENT_VERSION,
        message: `You're on the latest version (${CURRENT_VERSION}).`,
      });
    }
  }
}

// ── Daily reminder ────────────────────────────────────────────────────────────

function startDailyReminder(mainWindow) {
  if (reminderTimer) return; // already running
  reminderTimer = setInterval(() => {
    if (pendingUpdate && userIgnored) {
      mainWindow.webContents.send("update-available", {
        ...pendingUpdate,
        isReminder: true,
      });
      if (Notification.isSupported()) {
        new Notification({
          title: "POStore Update Reminder",
          body: `Version ${pendingUpdate.newVersion} is still available. Update when ready.`,
          silent: true,
        }).show();
      }
    }
  }, REMINDER_INTERVAL_MS);
}

// ── IPC Handlers ─────────────────────────────────────────────────────────────

function registerUpdaterHandlers(mainWindow) {
  // Renderer → manually check for updates (from Settings button)
  ipcMain.handle("check-for-update", async () => {
    await checkForUpdate(mainWindow, false);
    return { triggered: true };
  });

  // Renderer → user clicked "Download & Install"
  ipcMain.handle("download-update", async (_e, url) => {
    const target = url || pendingUpdate?.downloadUrl ||
      "https://github.com/keith986/POS-Web-Desktop-App/raw/refs/heads/main/public/downloads/postore.exe";
    await shell.openExternal(target);
    return { opened: true };
  });

  // Renderer → user dismissed / opted out
  ipcMain.handle("ignore-update", () => {
    userIgnored = true;
    return { ignored: true };
  });

  // Renderer → get current pending update info (for Settings page on mount)
  ipcMain.handle("get-pending-update", () => {
    return pendingUpdate || null;
  });

  // Renderer → get current app version
  ipcMain.handle("get-app-version", () => {
    return CURRENT_VERSION;
  });
}

module.exports = { checkForUpdate, registerUpdaterHandlers };