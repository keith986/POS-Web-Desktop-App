/* eslint-disable */
const log = require("electron-log");
const Store = require("electron-store");
const store = new Store();
const db = require("./../db/database");

const getBackendUrl = () => {
  return store.get("backendUrl") || process.env.REACT_APP_BACKEND_URL || "http://localhost:3000";
};

const getAdminId = () => store.get("adminId");
const setAdminId = (id) => {
  if (id) store.set("adminId", id);
};

const setLastSync = () => store.set("lastSync", new Date().toISOString());
const getLastSync = () => store.get("lastSync");

const setSubscriptionCache = (subscription) => {
  if (!subscription) return;
  store.set("subscriptionStatus", subscription);
  store.set("subscriptionLastSync", new Date().toISOString());
};

const getSubscriptionCache = () => store.get("subscriptionStatus");

const isBackendOnline = async () => {
  try {
    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/api/desktop/sync`, {
      method: "OPTIONS",
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch (error) {
    return false;
  }
};

const resolveAdminId = () => {
  let adminId = getAdminId();
  if (adminId) return adminId;

  const result = db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1", []);
  if (result.success && result.data.length > 0) {
    adminId = result.data[0].id;
    setAdminId(adminId);
    return adminId;
  }

  return null;
};

const fetchSubscriptionStatus = async (adminId) => {
  if (!adminId) return null;
  const backendUrl = getBackendUrl();

  try {
    const res = await fetch(`${backendUrl}/api/subscription/status?admin_id=${encodeURIComponent(adminId)}`, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const body = await res.text();
      log.warn("Subscription status request failed", res.status, body);
      return null;
    }

    const data = await res.json();
    setSubscriptionCache(data);
    return data;
  } catch (error) {
    log.warn("Subscription status fetch failed:", error);
    return null;
  }
};

const calculateDaysBetween = (from, to) => {
  const diff = to.getTime() - new Date(from).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const validateAccess = async () => {
  const now = new Date();
  const adminId = resolveAdminId();
  if (!adminId) {
    return { allowed: false, reason: "missing_admin", message: "No admin user found. Please connect online and sync your store." };
  }

  const online = await isBackendOnline();
  const subscription = online ? await fetchSubscriptionStatus(adminId) : getSubscriptionCache();
  const lastSync = getLastSync();
  const offlineJoinDays = lastSync ? calculateDaysBetween(lastSync, now) : null;

  if (!online) {
    if (offlineJoinDays === null || offlineJoinDays > 21) {
      return {
        allowed: false,
        reason: "offline_timeout",
        message: "This desktop app has been offline for more than 3 weeks. Connect to the network and sync to continue.",
      };
    }

    if (!subscription) {
      return {
        allowed: false,
        reason: "no_cached_subscription",
        message: "No cached subscription data available. Connect to the internet to verify your subscription.",
      };
    }

    const isLifetime = subscription.plan === "lifetime";

    if (!isLifetime && (subscription.status === "expired" || subscription.daysLeft <= 0)) {
      return {
        allowed: false,
        reason: "expired_offline",
        subscription,
        message: "Your subscription has expired. Connect online and renew your subscription to continue.",
      };
    }

    if (!isLifetime && subscription.daysLeft != null && subscription.daysLeft <= 7) {
      return {
        allowed: false,
        reason: "expiring_soon_offline",
        subscription,
        message: "Your subscription will expire within 7 days. Connect to the internet now to renew or continue using the app.",
      };
    }

    return {
      allowed: true,
      offline: true,
      subscription,
      lastSync,
      message: "Offline access is allowed until the 3-week offline grace period expires.",
    };
  }

  if (!subscription) {
    return {
      allowed: false,
      reason: "subscription_check_failed",
      message: "Unable to load subscription status from the server. Please try again.",
    };
  }

  const isLifetime = subscription.plan === "lifetime";

  if (!isLifetime && (subscription.status === "expired" || subscription.daysLeft <= 0)) {
    return {
      allowed: false,
      reason: "expired_online",
      subscription,
      message: "Your subscription has expired. Renew on the website before continuing.",
    };
  }

  const warning = !isLifetime && subscription.daysLeft != null && subscription.daysLeft <= 7
    ? `Your subscription expires in ${subscription.daysLeft} day${subscription.daysLeft !== 1 ? "s" : ""}. Please renew online soon.`
    : null;

  return {
    allowed: true,
    online: true,
    subscription,
    lastSync,
    warning,
  };
};

const markOnlineSync = async () => {
  const adminId = resolveAdminId();
  if (adminId) {
    await fetchSubscriptionStatus(adminId);
  }
  setLastSync();
};

module.exports = {
  validateAccess,
  fetchSubscriptionStatus,
  getLastSync,
  getSubscriptionCache,
  setLastSync,
  setSubscriptionCache,
  resolveAdminId,
  markOnlineSync,
};
