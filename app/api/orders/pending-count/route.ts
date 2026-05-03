import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── GET /api/orders/pending-count?admin_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    const [[row]] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM orders
       WHERE admin_id = ? AND status = 'pending'`,
      [admin_id]
    ) as [{ count: number }[], unknown];

    return NextResponse.json({ count: Number((row as { count: number }).count) || 0 });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}