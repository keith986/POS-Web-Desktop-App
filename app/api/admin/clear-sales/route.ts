import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── DELETE /api/admin/clear-sales?admin_id=xxx ──
   Deletes all orders and sale-type stock movements for this admin.
   Also resets customer total_orders and total_spent to 0.
── */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    /* Count before deleting so we can report back */
    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM orders WHERE admin_id = ?",
      [admin_id]
    ) as [{ total: number }[], unknown];

    const deleted = Number((countRow as { total: number }).total) || 0;

    /* Delete orders */
    await pool.query("DELETE FROM orders WHERE admin_id = ?", [admin_id]);

    /* Delete sale-type stock movements only */
    await pool.query(
      "DELETE FROM stock_movements WHERE admin_id = ? AND type = 'sale'",
      [admin_id]
    );

    /* Reset customer totals */
    await pool.query(
      "UPDATE customers SET total_orders = 0, total_spent = 0.00, last_order = NULL WHERE admin_id = ?",
      [admin_id]
    );

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}