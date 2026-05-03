import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
  
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
      const { domain, type } = await request.json() as {
        domain: string;
        type: "visit" | "click";
      };
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