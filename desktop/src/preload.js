const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Database
  initializeDatabase: () => ipcRenderer.invoke("db-init"),
  queryDatabase: (query, params) => ipcRenderer.invoke("db-query", query, params),
  executeDatabase: (query, params) => ipcRenderer.invoke("db-execute", query, params),

  // Store
  setStoreData: (key, value) => ipcRenderer.invoke("store-set", key, value),
  getStoreData: (key) => ipcRenderer.invoke("store-get", key),
  deleteStoreData: (key) => ipcRenderer.invoke("store-delete", key),

  // Sync
  startSync: () => ipcRenderer.invoke("sync-start"),
  getSyncStatus: () => ipcRenderer.invoke("sync-status"),

  // App
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // Window
  loginSuccess: () => ipcRenderer.send("login-success"),
});