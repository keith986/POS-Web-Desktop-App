const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const { checkForUpdate, registerUpdaterHandlers } = require("./updater");

process.on("uncaughtException", (error) => {
  try {
    const logPath = path.join(require("os").homedir(), "Desktop", "crash.log");
    fs.writeFileSync(logPath, `TIME: ${new Date()}\n${error.stack || error}`);
  } catch (e) {}
  app.quit();
});

const log = require("electron-log");
log.transports.file.level = "info";
log.transports.console.level = "debug";

let mainWindow;

function createWindow() {
  const isDev = !app.isPackaged;
  const userDataPath = app.getPath("userData");

  log.info("isDev:", isDev);
  log.info("userDataPath:", userDataPath);

  mainWindow = new BrowserWindow({
    width: 520,
    height: 620,
    minWidth: 520,
    minHeight: 620,
    resizable: false,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0f0f0f",
  });

  const startURL = isDev
    ? "http://localhost:3001"
    : `file://${path.join(app.getAppPath(), "build/index.html")}`;

  log.info("Loading URL:", startURL);
  mainWindow.loadURL(startURL);
 
  registerUpdaterHandlers(mainWindow);

  mainWindow.webContents.on("did-finish-load", () => {
    // Auto-check for updates on startup (silent = true means no "you're up to date" toast)
    setTimeout(() => {
      checkForUpdate(mainWindow, true);
    }, 3000); // wait 3s after load so UI is ready
  });


  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  setupMenu();
  setupIPC();
}

function setupMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Exit",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setupIPC() {
  // ── Window resize after login ─────────────────────────────────
  ipcMain.on("login-success", () => {
    if (!mainWindow) return;
    mainWindow.setResizable(true);
    mainWindow.setMinimumSize(900, 600);
    mainWindow.setSize(1280, 800);
    mainWindow.center();
    // mainWindow.maximize(); // uncomment to maximize after login
    log.info("login-success: window expanded to 1280x800");
  });

  // ── Database operations ───────────────────────────────────────
  const db = require("./db/database");
  const accessManager = require("./utils/accessManager");

  ipcMain.handle("db-init", async () => {
    return await db.initialize();
  });

  ipcMain.handle("db-query", async (event, query, params) => {
    return await db.query(query, params);
  });

  ipcMain.handle("db-execute", async (event, query, params) => {
    return await db.execute(query, params);
  });

  // ── Store operations ──────────────────────────────────────────
  const Store = require("electron-store");
  const store = new Store();

  ipcMain.handle("store-set", (event, key, value) => {
    store.set(key, value);
    return true;
  });

  ipcMain.handle("store-get", (event, key) => {
    return store.get(key);
  });

  ipcMain.handle("store-delete", (event, key) => {
    store.delete(key);
    return true;
  });

  // ── Sync operations ───────────────────────────────────────────
  ipcMain.handle("sync-start", async () => {
    const sync = require("./utils/syncManager");
    return await sync.startSync();
  });

  ipcMain.handle("sync-status", async () => {
    const sync = require("./utils/syncManager");
    return sync.getStatus();
  });

  ipcMain.handle("validate-access", async () => {
    return await accessManager.validateAccess();
  });

  // ── App info ──────────────────────────────────────────────────
  //ipcMain.handle("get-app-version", () => app.getVersion());
}

app.on("ready", () => {
  try {
    createWindow();
  } catch (err) {
    log.error("CRASH in ready:", err);
    try {
      fs.writeFileSync(
        path.join(app.getPath("userData"), "crash.log"),
        err.stack || err.toString()
      );
      fs.writeFileSync(
        path.join(require("os").homedir(), "Desktop", "crash.log"),
        err.stack || err.toString()
      );
    } catch (e) {}
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});