import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { notifyDailyReport } from "@/app/_lib/notify";

/**
 * GET /api/notifications/daily-report
 * ─────────────────────────────────────────────────────────────
 * Emails yesterday's sales summary to every admin who has
 * "Daily Summary" turned on in Settings → Notifications.
 *
 * This route does the sending but not the scheduling — point an
 * external scheduler at it once a day (e.g. Vercel Cron, or any
 * `curl` cron job) with:
 *
 *   Authorization: Bearer <CRON_SECRET>
 *
 * where CRON_SECRET matches the env var of the same name. If
 * CRON_SECRET isn't set, the route refuses to run (fails closed)
 * so it can't be triggered by accident in an unconfigured deploy.
 *
 * Example vercel.json:
 *   { "crons": [{ "path": "/api/notifications/daily-report", "schedule": "0 5 * * *" }] }
 *   (05:00 UTC ≈ 08:00 Africa/Nairobi)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on the server" },
      { status: 500 }
    );
  }

  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  if (token !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const pool = await getPool();

    const [admins] = await pool.query(
      `SELECT admin_id FROM settings WHERE notif_daily_report = 1 AND notif_email <> ''`
    );

    const adminIds = (admins as { admin_id: string }[]).map(r => r.admin_id);

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const admin_id of adminIds) {
      const [[stats]] = await pool.query(
        `SELECT
           COUNT(*)                                   AS order_count,
           COALESCE(SUM(total), 0)                     AS total_revenue,
           COALESCE(AVG(total), 0)                      AS avg_order
         FROM orders
         WHERE admin_id = ?
           AND DATE(created_at) = CURDATE() - INTERVAL 1 DAY
           AND status != 'cancelled'`,
        [admin_id]
      ) as [{ order_count: number; total_revenue: string; avg_order: string }[], unknown];

      const [[lowStock]] = await pool.query(
        `SELECT COUNT(*) AS low_stock_count
         FROM products p
         JOIN settings s ON s.admin_id = p.admin_id
         WHERE p.admin_id = ? AND p.stock <= s.low_stock_threshold`,
        [admin_id]
      ) as [{ low_stock_count: number }[], unknown];

      // Nothing happened yesterday and nothing is low — skip the noise
      if (Number(stats.order_count) === 0 && Number(lowStock.low_stock_count) === 0) {
        skipped++;
        continue;
      }

      const reportDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const ok = await notifyDailyReport(admin_id, {
        date:            reportDate,
        order_count:     Number(stats.order_count),
        total_revenue:   Number(stats.total_revenue),
        avg_order:       Number(stats.avg_order),
        low_stock_count: Number(lowStock.low_stock_count),
      });

      if (ok) sent++;
      else failed++;
    }

    return NextResponse.json({
      success: true,
      eligible_admins: adminIds.length,
      sent,
      skipped,
      failed,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
