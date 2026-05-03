import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── PUT /api/menu/[id]/status
   Body: { is_available: boolean, admin_id: string }
   Quick toggle without touching other fields.
── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id }                   = await params;
    const { is_available, admin_id } = await request.json();

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });
    if (is_available === undefined)
      return NextResponse.json({ error: "is_available is required" }, { status: 400 });

    const pool = await getPool();
    await pool.query(
      "UPDATE menu_items SET is_available = ?, updated_at = NOW() WHERE id = ? AND admin_id = ?",
      [is_available ? 1 : 0, id, admin_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}