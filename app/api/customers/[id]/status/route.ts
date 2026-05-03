import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── PUT /api/customers/[id]/status ── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id }               = await params;
    const { status, admin_id } = await request.json();

    if (!["active", "inactive"].includes(status))
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    const [check] = await pool.query(
      "SELECT id FROM customers WHERE id = ? AND admin_id = ?",
      [id, admin_id]
    ) as [{ id: string }[], unknown];

    if ((check as { id: string }[]).length === 0)
      return NextResponse.json({ error: "Customer not found or access denied" }, { status: 403 });

    await pool.query(
      "UPDATE customers SET status = ? WHERE id = ?",
      [status, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}