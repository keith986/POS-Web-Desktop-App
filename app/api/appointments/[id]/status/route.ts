import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── PUT /api/appointments/[id]/status
   Body: { status: AppStatus, admin_id: string }
── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id }         = await params;
    const { status, admin_id } = await request.json();

    const VALID = ["scheduled","confirmed","in_progress","completed","cancelled","no_show"];
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });
    if (!VALID.includes(status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    const pool = await getPool();
    await pool.query(
      "UPDATE appointments SET status = ? WHERE id = ? AND admin_id = ?",
      [status, id, admin_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}