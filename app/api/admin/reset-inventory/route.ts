import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── DELETE /api/admin/reset-inventory?admin_id=xxx ──
   Sets stock = 0 for all products owned by this admin.
   Clears all stock_movements for this admin.
   Products themselves (name, price, SKU) are preserved.
── */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    /* Count products being reset */
    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM products WHERE admin_id = ?",
      [admin_id]
    ) as [{ total: number }[], unknown];

    const updated = Number((countRow as { total: number }).total) || 0;

    /* Set all stock to 0 */
    await pool.query(
      "UPDATE products SET stock = 0, updated_at = NOW() WHERE admin_id = ?",
      [admin_id]
    );

    /* Clear all stock movement history */
    await pool.query(
      "DELETE FROM stock_movements WHERE admin_id = ?",
      [admin_id]
    );

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}