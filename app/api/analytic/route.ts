import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { classifyTrafficSource, hostFromUrl, type TrafficSource } from "@/app/_lib/trafficSource";

type Period = "7d" | "30d" | "90d" | "all";
function getDays(period: Period): number | null {
  return period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json() as {
        domain: string;
        type: "visit" | "click";
        source?: string | null;
        referrer?: string | null;
        landing_page?: string | null;
        utm_source?: string | null;
        utm_medium?: string | null;
        utm_campaign?: string | null;
      };
      const { domain, type, referrer, landing_page, utm_source, utm_medium, utm_campaign } = body;
      if (!domain || !["visit", "click"].includes(type)) {
        return NextResponse.json({ ok: false });
      }
 
      const pool = await getPool();
 
      if (type === "visit") {
        await pool.query(`
          INSERT INTO site_analytics (domain, total_visits, last_visit)
          VALUES (?, 1, NOW())
          ON DUPLICATE KEY UPDATE
            total_visits = total_visits + 1,
            last_visit   = NOW()
        `, [domain]);

        /* Trust the server's own classification over whatever the client sent */
        const source: TrafficSource = classifyTrafficSource({ referrer, utmSource: utm_source });

        await pool.query(
          `INSERT INTO traffic_sources
             (domain, source, referrer_url, referrer_host, landing_page, utm_source, utm_medium, utm_campaign)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [domain, source, referrer ?? null, hostFromUrl(referrer) ?? null, landing_page ?? null, utm_source ?? null, utm_medium ?? null, utm_campaign ?? null]
        );
      }
 
      if (type === "click") {
        await pool.query(`
          INSERT INTO site_analytics (domain, total_clicks)
          VALUES (?, 1)
          ON DUPLICATE KEY UPDATE
            total_clicks = total_clicks + 1
        `, [domain]);
      }
 
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ ok: false, error: (error as Error).message });
    }
}

/* ── GET /api/analytic?domain=xxx&period=30d ──
   Traffic-source breakdown for a single store (used by the Admin dashboard). */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const domain = request.nextUrl.searchParams.get("domain");
    const period = (request.nextUrl.searchParams.get("period") ?? "30d") as Period;
    if (!domain) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    const pool = await getPool();
    const days = getDays(period);
    const dateFilter = days ? "AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)" : "";
    const params = days ? [domain, days] : [domain];

    const [bySource] = await pool.query(
      `SELECT source, COUNT(*) AS count
       FROM traffic_sources
       WHERE domain = ? ${dateFilter}
       GROUP BY source
       ORDER BY count DESC`,
      params
    ) as [{ source: string; count: number }[], unknown];

    const [recent] = await pool.query(
      `SELECT source, referrer_url, referrer_host, landing_page, utm_source, utm_medium, utm_campaign, created_at
       FROM traffic_sources
       WHERE domain = ?
       ORDER BY created_at DESC
       LIMIT 25`,
      [domain]
    ) as [Record<string, unknown>[], unknown];

    const [trend] = await pool.query(
      `SELECT DATE_FORMAT(created_at,'%d %b') AS label, COUNT(*) AS count
       FROM traffic_sources
       WHERE domain = ? ${dateFilter}
       GROUP BY DATE(created_at), label
       ORDER BY DATE(created_at)`,
      params
    ) as [{ label: string; count: number }[], unknown];

    const total = bySource.reduce((sum, r) => sum + Number(r.count), 0);

    return NextResponse.json({ total, by_source: bySource, recent, trend });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}