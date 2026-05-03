// app/api/prescriptions/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface IdRow extends RowDataPacket { id: string; }

/* ── PUT /api/prescriptions/[id]/status ── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id }              = await params;
    const { status, admin_id } = await request.json();

    const validStatuses = ["pending", "verified", "dispensed", "partial", "cancelled", "expired"];
    if (!status || !validStatuses.includes(status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const [check] = await pool.query<IdRow[]>(
      "SELECT id FROM prescriptions WHERE id = ? AND admin_id = ?", [id, admin_id]
    );
    if (check.length === 0)
      return NextResponse.json({ error: "Prescription not found or access denied" }, { status: 403 });

    // Auto-set dispensed_date when marking as dispensed
    const dispensed_date = status === "dispensed"
      ? new Date().toISOString().slice(0, 10)
      : null;

    await pool.query<ResultSetHeader>(
      `UPDATE prescriptions SET status = ?, dispensed_date = COALESCE(?, dispensed_date) WHERE id = ?`,
      [status, dispensed_date, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}