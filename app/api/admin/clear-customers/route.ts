import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── DELETE /api/admin/clear-customers?admin_id=xxx ──
   Permanently deletes all customer records for this admin.
   Orders are preserved but customer_id references become orphaned.
── */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    /* Count before deleting */
    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM customers WHERE admin_id = ?",
      [admin_id]
    ) as [{ total: number }[], unknown];

    const deleted = Number((countRow as { total: number }).total) || 0;

    /* Delete all customers for this admin */
    await pool.query("DELETE FROM customers WHERE admin_id = ?", [admin_id]);

    /* Nullify customer_id on orders so they don't point to deleted rows */
    await pool.query(
      "UPDATE orders SET customer_id = NULL WHERE admin_id = ?",
      [admin_id]
    );

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}