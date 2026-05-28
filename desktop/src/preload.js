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

  // Access validation
  validateAccess: () => ipcRenderer.invoke("validate-access"),

  // App
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // Window
  loginSuccess: () => ipcRenderer.send("login-success"),

checkForUpdate: () => ipcRenderer.invoke("check-for-update"),
downloadUpdate: (url) => ipcRenderer.invoke("download-update", url),
ignoreUpdate: () => ipcRenderer.invoke("ignore-update"),
getPendingUpdate: () => ipcRenderer.invoke("get-pending-update"),
getAppVersion: () => ipcRenderer.invoke("get-app-version"),
 
// Listen for update events from main process
onUpdateAvailable: (callback) => {
  ipcRenderer.on("update-available", (_event, data) => callback(data));
},
onUpdateCheckResult: (callback) => {
  ipcRenderer.on("update-check-result", (_event, data) => callback(data));
},
// Remove listeners when component unmounts
removeUpdateListeners: () => {
  ipcRenderer.removeAllListeners("update-available");
  ipcRenderer.removeAllListeners("update-check-result");
},

});