import { getPool } from "./db";
import {
  sendNewOrderEmail,
  sendLowStockEmail,
  sendStaffLoginEmail,
  sendDailyReportEmail,
} from "./mailer";

/**
 * notify.ts
 * ─────────────────────────────────────────────────────────────
 * Single place that decides WHETHER a notification should go out
 * (based on the admin's Settings → Notifications toggles) and
 * fires the email if so. Every function here is fire-and-forget
 * safe: it never throws, so a broken SMTP config can't take down
 * an order, a stock adjustment, or a login.
 *
 * Add SMS/push here later by branching inside each notify* function
 * — the call sites (orders route, inventory route, login route)
 * don't need to change.
 */

export const DEFAULT_LOW_STOCK_THRESHOLD = 10; // fallback only, for stores with no settings row yet

interface NotifSettings {
  store_name:          string;
  notif_new_order:     boolean;
  notif_low_stock:     boolean;
  notif_daily_report:  boolean;
  notif_staff_login:   boolean;
  notif_email:         string;
  low_stock_threshold: number;
  currency:            string;
}

async function getNotifSettings(admin_id: string): Promise<NotifSettings | null> {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT store_name, notif_new_order, notif_low_stock, notif_daily_report,
              notif_staff_login, notif_email, low_stock_threshold, currency
       FROM settings WHERE admin_id = ? LIMIT 1`,
      [admin_id]
    );
    const row = (rows as Record<string, unknown>[])[0];
    if (!row) return null;

    return {
      store_name:          (row.store_name as string) ?? "POStore",
      notif_new_order:     Boolean(row.notif_new_order),
      notif_low_stock:     Boolean(row.notif_low_stock),
      notif_daily_report:  Boolean(row.notif_daily_report),
      notif_staff_login:   Boolean(row.notif_staff_login),
      notif_email:         (row.notif_email as string) ?? "",
      low_stock_threshold: Number(row.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD),
      currency:            (row.currency as string) ?? "KES",
    };
  } catch (err) {
    console.error("notify: failed to load settings for", admin_id, err);
    return null;
  }
}

/* ── New order ── */
export async function notifyNewOrder(
  admin_id: string,
  order: {
    order_number:   string;
    customer_name:  string;
    total:          number;
    payment_method: string;
    item_count:     number;
  }
): Promise<void> {
  try {
    const s = await getNotifSettings(admin_id);
    if (!s || !s.notif_new_order || !s.notif_email) return;

    await sendNewOrderEmail(
      s.notif_email,
      { ...order, currency: s.currency },
      s.store_name
    );
  } catch (err) {
    console.error("notifyNewOrder failed:", err);
  }
}

/* ── Low stock — call with the stock level BEFORE and AFTER a
   change; only fires the email the moment it crosses the admin's
   configured threshold, so a slow-moving low-stock item doesn't
   spam an email on every subsequent sale. ── */
export async function notifyLowStockIfCrossed(
  admin_id: string,
  product: { name: string; sku?: string | null },
  previousStock: number,
  newStock: number
): Promise<void> {
  try {
    const s = await getNotifSettings(admin_id);
    if (!s || !s.notif_low_stock || !s.notif_email) return;

    const threshold = s.low_stock_threshold;
    if (!(previousStock > threshold && newStock <= threshold)) return;

    await sendLowStockEmail(
      s.notif_email,
      { name: product.name, sku: product.sku, stock: newStock, threshold },
      s.store_name
    );
  } catch (err) {
    console.error("notifyLowStockIfCrossed failed:", err);
  }
}

/* ── Staff login ── */
export async function notifyStaffLogin(
  admin_id: string,
  login: { staff_name: string; email: string; ip: string }
): Promise<void> {
  try {
    const s = await getNotifSettings(admin_id);
    if (!s || !s.notif_staff_login || !s.notif_email) return;

    await sendStaffLoginEmail(s.notif_email, login, s.store_name);
  } catch (err) {
    console.error("notifyStaffLogin failed:", err);
  }
}

/* ── Daily report — used by the /api/notifications/daily-report
   cron endpoint, one admin at a time. ── */
export async function notifyDailyReport(
  admin_id: string,
  report: {
    date: string;
    order_count: number;
    total_revenue: number;
    avg_order: number;
    low_stock_count: number;
  }
): Promise<boolean> {
  try {
    const s = await getNotifSettings(admin_id);
    if (!s || !s.notif_daily_report || !s.notif_email) return false;

    return await sendDailyReportEmail(
      s.notif_email,
      { ...report, currency: s.currency },
      s.store_name
    );
  } catch (err) {
    console.error("notifyDailyReport failed:", err);
    return false;
  }
}
