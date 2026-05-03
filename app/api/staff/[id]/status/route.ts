import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── PUT /api/staff/[id]/status — toggle active/inactive (admin verified) ── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { status, admin_id } = await request.json();
    const { id } = await params;

    if (!["active", "inactive"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (!admin_id) {
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });
    }

    const pool = await getPool();

    // Verify this staff belongs to the requesting admin
    const [check] = await pool.query(
      "SELECT id FROM staff WHERE id = ? AND admin_id = ?",
      [id, admin_id]
    ) as [{ id: string }[], unknown];

    if ((check as { id: string }[]).length === 0) {
      return NextResponse.json({ error: "Staff member not found or access denied" }, { status: 403 });
    }

    await pool.query(
      "UPDATE staff SET status = ? WHERE id = ?",
      [status, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}