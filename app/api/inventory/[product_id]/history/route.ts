import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── GET /api/inventory/[product_id]/history?admin_id=xxx ──
   Returns stock movement log for one product, newest first.
── */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ product_id: string }> }
): Promise<NextResponse> {
  try {
    const { product_id } = await params;
    const admin_id = request.nextUrl.searchParams.get("admin_id");

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    /* Verify ownership via products table */
    const [check] = await pool.query(
      "SELECT id FROM products WHERE id = ? AND admin_id = ?",
      [product_id, admin_id]
    ) as [{ id: string }[], unknown];

    if ((check as { id: string }[]).length === 0)
      return NextResponse.json({ error: "Product not found or access denied" }, { status: 403 });

    const [rows] = await pool.query(
      `SELECT
         sm.id,
         sm.product_id,
         p.name  AS product_name,
         sm.type,
         sm.quantity,
         sm.note,
         sm.created_at
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       WHERE sm.product_id = ? AND sm.admin_id = ?
       ORDER BY sm.created_at DESC
       LIMIT 100`,
      [product_id, admin_id]
    );

    return NextResponse.json(rows);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}