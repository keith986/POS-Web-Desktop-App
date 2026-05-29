import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { RowDataPacket } from "mysql2";
import { execSync } from "child_process";
import fs from "fs";

/* ── Row types matching your exact schema ── */
interface CountResult extends RowDataPacket { count: number }

interface UserRow extends RowDataPacket {
  id: string; full_name: string; email: string; role: string;
  store_name: string; domain: string; subdomain_url: string;
  subdomain_status: string; pos_type: string; created_at: string;
}
interface StaffRow extends RowDataPacket {
  id: string; full_name: string; email: string; shift_role: string;
  status: string; last_login: string; created_at: string;
  store_name: string; domain: string;
}
interface OrderRow extends RowDataPacket {
  id: string; admin_id: string; store_name: string; domain: string;
  created_at: string; status: string; total: number;
  payment_status: string; staff_name: string;
}
interface ActivityRow extends RowDataPacket {
  full_name: string; email: string; domain: string;
  created_at: string; type: string; title: string; message: string;
}
interface LogRow extends RowDataPacket {
  id: string; admin_id: string; type: string;
  title: string; message: string; created_at: string;
  domain: string; store_name: string;
}
// Joins mpesa_transactions + users + subscriptions
interface PaymentRow extends RowDataPacket {
  id: string; amount: number; phone: string; plan: string;
  status: string; mpesa_receipt: string; created_at: string;
  result_desc: string; store_name: string; domain: string;
  user_email: string; sub_status: string; next_billing_date: string;
}
interface BillingRow extends RowDataPacket {
  admin_id: string; charge_id: string | null; subscription_id: string | null;
  amount: number; plan: string | null; status: string; mpesa_receipt: string | null;
  subscription_status: string | null; next_billing_date: string | null; created_at: string;
  store_name: string; domain: string; user_email: string;
}
interface AnalyticsRow extends RowDataPacket {
  domain: string; store_name: string;
  total_visits: number; total_clicks: number;
  unique_visitors: number; last_visit: string;
}

/* ── Auth helper ── */
async function verifyAdmin(
  pool: Awaited<ReturnType<typeof getPool>>,
  token: string | null
): Promise<boolean> {
  if (!token) return false;
  const [rows] = await pool.query<UserRow[]>(
    "SELECT id, email FROM users WHERE id = ? LIMIT 1", [token]
  );
  return rows.length > 0 && rows[0].email === "admin@postore.app";
}

/* ══════════════════════════════════════════════════════════
   NGINX LOG PARSER
══════════════════════════════════════════════════════════ */
interface NginxDomainStat {
  domain: string; requests: number; bytes: number;
  errors: number; last_seen: string;
}

function parseNginxLogs(): Record<string, NginxDomainStat> {
  const stats: Record<string, NginxDomainStat> = {};
  const logPaths = [
    "/var/log/nginx/access.log",
    "/var/log/nginx/access.log.1",
  ];
  const hostLineRe = /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"[^"]*"\s+(\d+)\s+(\d+)/;

  for (const logPath of logPaths) {
    if (!fs.existsSync(logPath)) continue;
    try {
      const lines = execSync(`tail -n 50000 "${logPath}" 2>/dev/null`, {
        maxBuffer: 50 * 1024 * 1024, timeout: 10000,
      }).toString();

      for (const line of lines.split("\n")) {
        const domainMatch = line.match(/([a-z0-9-]+)\.upendoapps\.com/i);
        if (!domainMatch) continue;
        const subdomain = domainMatch[1].toLowerCase();

        const m = line.match(hostLineRe);
        if (!m) continue;
        const [, , timeStr, statusStr, bytesStr] = m;
        const status = parseInt(statusStr, 10);
        const bytes  = parseInt(bytesStr, 10) || 0;

        let lastSeen = new Date().toISOString();
        try {
          const months: Record<string, string> = {
            Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",
            Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12",
          };
          const [datePart, timePart] = timeStr.split(":");
          const [day, mon, year]    = datePart.split("/");
          lastSeen = `${year}-${months[mon] ?? "01"}-${day}T${timePart.substring(0,8)}Z`;
        } catch { /* keep default */ }

        if (!stats[subdomain]) {
          stats[subdomain] = { domain: subdomain, requests: 0, bytes: 0, errors: 0, last_seen: lastSeen };
        }
        stats[subdomain].requests++;
        stats[subdomain].bytes += bytes;
        if (status >= 400) stats[subdomain].errors++;
        if (lastSeen > stats[subdomain].last_seen) stats[subdomain].last_seen = lastSeen;
      }
    } catch (err) {
      console.error("Nginx log parse error:", err);
    }
  }

  // Per-vhost log files e.g. /var/log/nginx/subdomain.upendoapps.com.access.log
  try {
    const vhostFiles = fs.readdirSync("/var/log/nginx")
      .filter(f => f.includes("upendoapps") && f.endsWith(".log"));
    for (const f of vhostFiles) {
      const m = f.match(/([a-z0-9-]+)\.upendoapps\.com/i);
      if (!m) continue;
      const subdomain = m[1].toLowerCase();
      try {
        const count = parseInt(
          execSync(`wc -l < /var/log/nginx/${f}`, { timeout: 3000 }).toString().trim(), 10
        ) || 0;
        if (!stats[subdomain]) {
          stats[subdomain] = { domain: subdomain, requests: 0, bytes: 0, errors: 0, last_seen: "" };
        }
        if (count > stats[subdomain].requests) stats[subdomain].requests = count;
      } catch { /* ignore */ }
    }
  } catch { /* /var/log/nginx not readable */ }

  return stats;
}

/* ══════════════════════════════════════════════════════════
   GET
══════════════════════════════════════════════════════════ */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") || "overview";
  const token   = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;

  try {
    const pool = await getPool();
    if (!await verifyAdmin(pool, token)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ── OVERVIEW ── */
    if (section === "overview") {
      const [[userCount]]    = await pool.query<CountResult[]>(
        "SELECT COUNT(*) as count FROM users WHERE email != 'admin@postore.app'"
      );
      const [[staffCount]]   = await pool.query<CountResult[]>("SELECT COUNT(*) as count FROM staff");
      const [[orderCount]]   = await pool.query<CountResult[]>("SELECT COUNT(*) as count FROM orders");
      const [[activeUsers]]  = await pool.query<CountResult[]>(
        "SELECT COUNT(*) as count FROM users WHERE subdomain_status = 'active' AND email != 'admin@postore.app'"
      );
      const [[pendingUsers]] = await pool.query<CountResult[]>(
        "SELECT COUNT(*) as count FROM users WHERE subdomain_status = 'pending' AND email != 'admin@postore.app'"
      );
      const [[activeStaff]]  = await pool.query<CountResult[]>(
        "SELECT COUNT(*) as count FROM staff WHERE status = 'active'"
      );
      const [[todayOrders]]  = await pool.query<CountResult[]>(
        "SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()"
      );
      const [[totalRevenue]] = await pool.query<CountResult[]>(
        "SELECT COALESCE(SUM(total), 0) as count FROM orders WHERE status = 'completed'"
      );
      const [[totalDomains]] = await pool.query<CountResult[]>(
        "SELECT COUNT(*) as count FROM users WHERE domain IS NOT NULL AND domain != '' AND email != 'admin@postore.app'"
      );
      const [[activeDomains]] = await pool.query<CountResult[]>(
        "SELECT COUNT(*) as count FROM users WHERE subdomain_status = 'active' AND domain IS NOT NULL AND email != 'admin@postore.app'"
      );

      let totalVisits = 0;
      let totalClicks = 0;
      try {
        const [[v]] = await pool.query<CountResult[]>("SELECT COALESCE(SUM(total_visits),0) as count FROM site_analytics");
        const [[c]] = await pool.query<CountResult[]>("SELECT COALESCE(SUM(total_clicks),0) as count FROM site_analytics");
        totalVisits = v.count;
        totalClicks = c.count;
      } catch { /* site_analytics not yet created */ }

      return NextResponse.json({
        userCount: userCount.count, staffCount: staffCount.count,
        orderCount: orderCount.count, activeUsers: activeUsers.count,
        pendingUsers: pendingUsers.count, activeStaff: activeStaff.count,
        todayOrders: todayOrders.count, totalRevenue: totalRevenue.count,
        totalDomains: totalDomains.count, activeDomains: activeDomains.count,
        totalVisits, totalClicks,
      });
    }

    /* ── USERS — super admin excluded ── */
    if (section === "users") {
      const [users] = await pool.query<UserRow[]>(`
        SELECT id, full_name, email, role, store_name, domain,
               subdomain_url, subdomain_status, pos_type, created_at
        FROM users
        WHERE email != 'admin@postore.app'
        ORDER BY created_at DESC
      `);
      return NextResponse.json({ users });
    }

    /* ── STAFF ── */
    if (section === "staff") {
      const [staff] = await pool.query<StaffRow[]>(`
        SELECT s.id, s.full_name, s.email, s.shift_role, s.status,
               s.last_login, s.created_at, u.store_name, u.domain
        FROM staff s
        LEFT JOIN users u ON s.admin_id = u.id
        ORDER BY s.created_at DESC
      `);
      return NextResponse.json({ staff });
    }

    /* ── ORDERS ── */
    if (section === "orders") {
      const [orders] = await pool.query<OrderRow[]>(`
        SELECT o.id, o.status, o.total, o.created_at,
               o.admin_id, o.payment_status,
               COALESCE(o.staff_name, 'N/A') AS staff_name,
               u.store_name, u.domain
        FROM orders o
        LEFT JOIN users u ON o.admin_id = u.id
        ORDER BY o.created_at DESC
        LIMIT 200
      `);
      return NextResponse.json({ orders });
    }

    /* ── BILLING — subscriptions and completed mpesa transactions ── */
    if (section === "billing" || section === "payments") {
      const [payments] = await pool.query<BillingRow[]>(`
        SELECT
          u.id AS admin_id,
          mt.id AS charge_id,
          s.id AS subscription_id,
          COALESCE(mt.amount, 0) AS amount,
          s.plan,
          COALESCE(mt.status, s.status, 'unknown') AS status,
          mt.mpesa_receipt,
          s.status AS subscription_status,
          s.next_billing_date,
          COALESCE(mt.created_at, s.updated_at, s.created_at) AS created_at,
          u.store_name,
          u.domain,
          u.email AS user_email
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = u.id
        LEFT JOIN (
          SELECT m1.*
          FROM mpesa_transactions m1
          JOIN (
            SELECT user_id, MAX(created_at) AS latest
            FROM mpesa_transactions
            WHERE status = 'completed'
            GROUP BY user_id
          ) m2 ON m1.user_id = m2.user_id AND m1.created_at = m2.latest AND m1.status = 'completed'
        ) mt ON mt.user_id = u.id
        WHERE u.email != 'admin@postore.app'
          AND (mt.id IS NOT NULL OR s.status IN ('active','paid'))
        ORDER BY created_at DESC
        LIMIT 200
      `);
      return NextResponse.json({ payments });
    }

    /* ── DOMAINS — Nginx stats merged with DB ── */
    if (section === "domains") {
      const [dbUsers] = await pool.query<UserRow[]>(`
        SELECT id, domain, store_name, subdomain_status, email
        FROM users
        WHERE domain IS NOT NULL AND domain != ''
          AND email != 'admin@postore.app'
        ORDER BY store_name
      `);

      const nginxStats = parseNginxLogs();

      const analyticsMap: Record<string, { visits: number; clicks: number }> = {};

      try {
        const [aRows] = await pool.query<AnalyticsRow[]>(
          "SELECT domain, total_visits, total_clicks FROM site_analytics"
        );
        for (const r of aRows) {
          analyticsMap[r.domain] = { visits: r.total_visits, clicks: r.total_clicks };
        }
      } catch { /* site_analytics not yet created */ }

      const domains = dbUsers.map(u => {
        const ng = nginxStats[u.domain] ?? { requests: 0, bytes: 0, errors: 0, last_seen: "" };
        const an = analyticsMap[u.domain]  ?? { visits: 0, clicks: 0 };
        return {
          domain: u.domain, store_name: u.store_name,
          status: u.subdomain_status, user_id: u.id, user_email: u.email,
          requests: ng.requests, bytes: ng.bytes,
          errors: ng.errors, last_seen: ng.last_seen,
          visits: an.visits, clicks: an.clicks,
        };
      });

      return NextResponse.json({ domains });
    }

    /* ── ANALYTICS ── */
    if (section === "analytics") {
      let analytics: AnalyticsRow[] = [];
      try {
        [analytics] = await pool.query<AnalyticsRow[]>(`
          SELECT sa.domain, u.store_name,
                 sa.total_visits, sa.total_clicks,
                 sa.unique_visitors, sa.last_visit
          FROM site_analytics sa
          LEFT JOIN users u ON sa.domain = u.domain
          ORDER BY sa.total_visits DESC
        `);
      } catch { /* table not yet created */ }
      return NextResponse.json({ analytics });
    }

    /* ── ACTIVITY ── */
    if (section === "activity") {
      const [notifications] = await pool.query<ActivityRow[]>(`
        SELECT n.title, n.message, n.type, n.created_at,
               u.full_name, u.email, u.domain
        FROM notifications n
        LEFT JOIN users u ON n.admin_id = u.id
        ORDER BY n.created_at DESC
        LIMIT 50
      `);
      return NextResponse.json({ notifications });
    }

    /* ── LOGS ── */
    if (section === "logs") {
      const [logs] = await pool.query<LogRow[]>(`
        SELECT n.id, n.admin_id, n.type, n.title, n.message, n.created_at,
               u.domain, u.store_name
        FROM notifications n
        LEFT JOIN users u ON n.admin_id = u.id
        ORDER BY n.created_at DESC
        LIMIT 100
      `);
      return NextResponse.json({ logs });
    }

    return NextResponse.json({ error: "Invalid section" }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/* ══════════════════════════════════════════════════════════
   POST — Admin actions
══════════════════════════════════════════════════════════ */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;

  try {
    const pool = await getPool();
    if (!await verifyAdmin(pool, token)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, userId, id, domain } = body as {
      action: string; userId?: string; id?: string; domain?: string;
    };
    const targetId = userId || id || null;

    if (action === "activate_user") {
      await pool.query(
        "UPDATE users SET subdomain_status = 'active' WHERE id = ? AND email != 'admin@postore.app'",
        [userId]
      );
      return NextResponse.json({ success: true, message: "User activated" });
    }

    if (action === "deactivate_user") {
      await pool.query(
        "UPDATE users SET subdomain_status = 'inactive' WHERE id = ? AND email != 'admin@postore.app'",
        [userId]
      );
      return NextResponse.json({ success: true, message: "User deactivated — login blocked" });
    }

    if (action === "delete_user") {
      const [rows] = await pool.query<UserRow[]>(
        "SELECT id, domain FROM users WHERE id = ? AND email != 'admin@postore.app' LIMIT 1",
        [userId]
      );
      if (rows.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });
      const userDomain = rows[0].domain;

      // Delete in FK-safe order using your exact table names
      await pool.query("DELETE FROM staff               WHERE admin_id = ?", [userId]);
      await pool.query("DELETE FROM orders              WHERE admin_id = ?", [userId]);
      await pool.query("DELETE FROM notifications       WHERE admin_id = ?", [userId]);
      await pool.query("DELETE FROM products            WHERE admin_id = ?", [userId]);
      await pool.query("DELETE FROM customers           WHERE admin_id = ?", [userId]);
      await pool.query("DELETE FROM stock_movements     WHERE admin_id = ?", [userId]);
      await pool.query("DELETE FROM settings            WHERE admin_id = ?", [userId]);
      await pool.query("DELETE FROM appointments        WHERE admin_id = ?", [userId]);
      await pool.query("DELETE FROM services            WHERE admin_id = ?", [userId]);
      await pool.query("DELETE FROM suppliers           WHERE admin_id = ?", [userId]);
      await pool.query("DELETE FROM menu_items          WHERE admin_id = ?", [userId]);
      await pool.query("DELETE FROM prescriptions       WHERE admin_id = ?", [userId]);
      await pool.query("DELETE FROM price_tiers         WHERE admin_id = ?", [userId]);
      await pool.query("DELETE FROM mpesa_transactions  WHERE user_id  = ?", [userId]);
      await pool.query("DELETE FROM subscriptions       WHERE user_id  = ?", [userId]);
      await pool.query("DELETE FROM password_resets     WHERE user_id  = ?", [userId]);
      if (userDomain) {
        try { await pool.query("DELETE FROM site_analytics WHERE domain = ?", [userDomain]); }
        catch { /* may not exist */ }
      }
      await pool.query(
        "DELETE FROM users WHERE id = ? AND email != 'admin@postore.app'",
        [userId]
      );
      return NextResponse.json({ success: true, message: "User and all related data deleted" });
    }

    if (action === "delete_domain") {
      if (!domain) return NextResponse.json({ error: "No domain provided" }, { status: 400 });

      await pool.query(
        `UPDATE users SET domain = NULL, subdomain_url = NULL, subdomain_status = 'pending'
         WHERE id = ? AND email != 'admin@postore.app'`,
        [userId]
      );

      // Remove Nginx virtual-host configs
      const configPaths = [
        `/etc/nginx/sites-enabled/${domain}.upendoapps.com`,
        `/etc/nginx/sites-available/${domain}.upendoapps.com`,
        `/etc/nginx/conf.d/${domain}.upendoapps.com.conf`,
      ];
      let touched = false;
      for (const p of configPaths) {
        try { if (fs.existsSync(p)) { fs.unlinkSync(p); touched = true; } } catch { /* permission */ }
      }
      if (touched) {
        try { execSync("nginx -s reload", { timeout: 5000 }); } catch { /* log don't throw */ }
      }

      try { await pool.query("DELETE FROM site_analytics WHERE domain = ?", [domain]); }
      catch { /* ignore */ }

      return NextResponse.json({ success: true, message: `Domain "${domain}.upendoapps.com" removed` });
    }

    if (action === "activate_staff") {
      await pool.query("UPDATE staff SET status = 'active'   WHERE id = ?", [userId]);
      return NextResponse.json({ success: true, message: "Staff member activated" });
    }

    if (action === "deactivate_staff") {
      await pool.query("UPDATE staff SET status = 'inactive' WHERE id = ?", [userId]);
      return NextResponse.json({ success: true, message: "Staff member deactivated" });
    }

    if (action === "delete_staff") {
      await pool.query("DELETE FROM staff WHERE id = ?", [userId]);
      return NextResponse.json({ success: true, message: "Staff member deleted" });
    }

    if (action === "reset_user_password") {
      const newPassword = body?.new_password;
      if (!userId || !newPassword) return NextResponse.json({ error: "Missing user or new password" }, { status: 400 });
      const hash = await bcrypt.hash(String(newPassword), 10);
      await pool.query("UPDATE users SET password = ? WHERE id = ? AND email != 'admin@postore.app'", [hash, userId]);
      return NextResponse.json({ success: true, message: "User password reset" });
    }

    if (action === "reset_staff_password") {
      const newPassword = body?.new_password;
      if (!userId || !newPassword) return NextResponse.json({ error: "Missing staff or new password" }, { status: 400 });
      const hash = await bcrypt.hash(String(newPassword), 10);
      await pool.query("UPDATE staff SET password = ? WHERE id = ?", [hash, userId]);
      return NextResponse.json({ success: true, message: "Staff password reset" });
    }

    if (action === "change_super_password") {
      const currentPassword = body?.current_password;
      const newPassword = body?.new_password;
      if (!currentPassword || !newPassword) return NextResponse.json({ error: "Missing current or new password" }, { status: 400 });
      const [rows] = await pool.query<RowDataPacket[]>("SELECT password FROM users WHERE email = 'admin@postore.app' LIMIT 1");
      if (rows.length === 0) return NextResponse.json({ error: "Super admin account not found" }, { status: 404 });
      const storedHash = String((rows[0] as { password: string }).password);
      const matches = await bcrypt.compare(String(currentPassword), storedHash);
      if (!matches) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      const hash = await bcrypt.hash(String(newPassword), 10);
      await pool.query("UPDATE users SET password = ? WHERE email = 'admin@postore.app'", [hash]);
      return NextResponse.json({ success: true, message: "Super admin password updated" });
    }

    if (action === "mark_payment_paid" || action === "mark_billing_paid") {
      if (!targetId) return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
      await pool.query(
        "UPDATE mpesa_transactions SET status = 'completed' WHERE id = ?",
        [targetId]
      );
      return NextResponse.json({ success: true, message: "Transaction marked as completed" });
    }

    if (action === "refund_billing") {
      if (!targetId) return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
      await pool.query(
        "UPDATE mpesa_transactions SET status = 'refunded' WHERE id = ?",
        [targetId]
      );
      return NextResponse.json({ success: true, message: "Transaction marked as refunded" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}