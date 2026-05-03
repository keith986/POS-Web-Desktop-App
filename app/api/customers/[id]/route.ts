import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── PUT /api/customers/[id] ── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { full_name, email, phone, admin_id } = await request.json();

    if (!full_name || !email)
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
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
      "UPDATE customers SET full_name = ?, email = ?, phone = ? WHERE id = ?",
      [full_name, email, phone ?? null, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── DELETE /api/customers/[id]?admin_id=xxx ── */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id }   = await params;
    const admin_id = request.nextUrl.searchParams.get("admin_id");

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    const [check] = await pool.query(
      "SELECT id FROM customers WHERE id = ? AND admin_id = ?",
      [id, admin_id]
    ) as [{ id: string }[], unknown];

    if ((check as { id: string }[]).length === 0)
      return NextResponse.json({ error: "Customer not found or access denied" }, { status: 403 });

    await pool.query("DELETE FROM customers WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}