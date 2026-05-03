import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── GET /api/inventory?admin_id=xxx ──
   Reads stock directly from the existing products table.
   No separate inventory table needed.
── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    const [rows] = await pool.query(
      `SELECT
         id          AS product_id,
         name        AS product_name,
         category,
         sku,
         price,
         stock,
         status,
         admin_id,
         updated_at
       FROM products
       WHERE admin_id = ?
       ORDER BY name ASC`,
      [admin_id]
    );

    return NextResponse.json(rows);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}