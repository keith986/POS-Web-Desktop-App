/* eslint-disable */
const log = require("electron-log");
const Store = require("electron-store");
const store = new Store();

let syncStatus = { syncing: false, lastSync: null, error: null };

const getBackendUrl = () => {
  return store.get("backendUrl") || process.env.REACT_APP_BACKEND_URL || "http://localhost:3000";
};

const getDomain = () => store.get("domain") || "";

/*
const isOnline = async () => {
  try {
    const res = await fetch(`${getBackendUrl()}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
};
*/

const isOnline = async () => {
  try {
    const res = await fetch(`${getBackendUrl()}/api/desktop/sync`, {
      method: "OPTIONS",  // Use OPTIONS — it's fast and we know it exists
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
};

// Called on first launch — pulls all users + products from server
const initialSync = async (domain) => {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/desktop/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const err = await response.json();
      return { success: false, error: err.error || "Sync failed" };
    }

    const data = await response.json();
    const db = require("../db/database");

    // Save domain for future syncs
    store.set("domain", domain);

    // Insert admin user
    db.execute(
      `INSERT OR REPLACE INTO users (id, full_name, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 'admin', 1)`,
      [data.admin.id, data.admin.full_name, data.admin.email, data.admin.password]
    );

    // Insert staff
    for (const s of data.staff) {
      db.execute(
        `INSERT OR REPLACE INTO users (id, full_name, email, password_hash, role, is_active)
         VALUES (?, ?, ?, ?, 'staff', 1)`,
        [s.id, s.full_name, s.email, s.password]
      );
    }

    // Insert products
    for (const p of data.products) {
      db.execute(
        `INSERT OR REPLACE INTO products 
         (id, name, category, price, stock, sku, description, emoji, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.name, p.category, p.price, p.stock, p.sku || "", p.description || "", p.emoji || "", p.is_active]
      );
    }

    // Save store info
    store.set("storeInfo", {
      store_name: data.admin.store_name,
      domain: data.admin.domain,
      pos_type: data.admin.pos_type,
    });

    log.info(`Initial sync complete: ${data.staff.length} staff, ${data.products.length} products`);
    return { success: true, data };
  } catch (error) {
    log.error("Initial sync failed:", error);
    return { success: false, error: error.message };
  }
};

// Background sync — pushes offline orders + pulls updated products/staff
const startSync = async () => {
  if (syncStatus.syncing) return { success: false, message: "Already syncing" };

  const domain = getDomain();
  if (!domain) return { success: false, message: "Not set up" };

  syncStatus.syncing = true;

  try {
    const online = await isOnline();
    if (!online) {
      syncStatus.syncing = false;
      return { success: false, message: "Offline" };
    }

    const db = require("../db/database");
    const backendUrl = getBackendUrl();

    // Push unsynced orders
    const orders = db.query("SELECT * FROM orders WHERE synced = 0");
    if (orders.success && orders.data.length > 0) {
      for (const order of orders.data) {
        try {
          const items = db.query("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
          const res = await fetch(`${backendUrl}/api/desktop/sync`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order, items: items.data || [], domain }),
          });
          if (res.ok) {
            db.execute("UPDATE orders SET synced = 1 WHERE id = ?", [order.id]);
          }
        } catch (err) {
          log.error("Order sync failed:", err);
        }
      }
    }

    // Pull latest products
    const res = await fetch(`${backendUrl}/api/desktop/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data = await res.json();
      for (const p of data.products) {
        db.execute(
          `INSERT OR REPLACE INTO products 
           (id, name, category, price, stock, sku, description, emoji, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.id, p.name, p.category, p.price, p.stock, p.sku || "", p.description || "", p.emoji || "", p.is_active]
        );
      }
      // Update staff too
      for (const s of data.staff) {
        db.execute(
          `INSERT OR REPLACE INTO users (id, full_name, email, password_hash, role, is_active)
           VALUES (?, ?, ?, ?, 'staff', 1)`,
          [s.id, s.full_name, s.email, s.password]
        );
      }
    }

    syncStatus.lastSync = new Date().toISOString();
    syncStatus.error = null;
    syncStatus.syncing = false;
    return { success: true, lastSync: syncStatus.lastSync };
  } catch (error) {
    syncStatus.syncing = false;
    syncStatus.error = error.message;
    return { success: false, error: error.message };
  }
};

const getStatus = () => syncStatus;

// Auto sync every 5 minutes
setInterval(() => startSync(), 5 * 60 * 1000);

module.exports = { startSync, initialSync, getStatus, isOnline };