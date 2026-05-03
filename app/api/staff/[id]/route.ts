import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import bcrypt from "bcryptjs";

/* ── PUT /api/staff/[id] — update staff (admin ownership verified) ── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } 
): Promise<NextResponse> {
  try {
    const { full_name, email, password, admin_id } = await request.json();
    const { id } = await params;

    if (!full_name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }
    if (!admin_id) {
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });
    }

    const pool = await getPool();

    // Verify this staff member belongs to this admin
    const [check] = await pool.query(
      "SELECT id FROM staff WHERE id = ? AND admin_id = ?",
      [id, admin_id]
    ) as [{ id: string }[], unknown];

    if ((check as { id: string }[]).length === 0) {
      return NextResponse.json({ error: "Staff member not found or access denied" }, { status: 403 });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        "UPDATE staff SET full_name = ?, email = ? WHERE id = ?",
        [full_name, email, id]
      );

      // Reset password only if provided
      if (password && password.length >= 8) {
        const hashed = await bcrypt.hash(password, 10);
        await conn.query(
          "UPDATE staff SET password = ? WHERE id = ?",
          [hashed, id]
        );
      }

      await conn.commit();
      return NextResponse.json({ success: true });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── DELETE /api/staff/[id] — remove staff (admin ownership verified) ── */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const admin_id = request.nextUrl.searchParams.get("admin_id");

    if (!admin_id) {
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });
    }

    const pool = await getPool();

    // Verify ownership before deleting
    const [check] = await pool.query(
      "SELECT id FROM staff WHERE id = ? AND admin_id = ?",
      [id, admin_id]
    ) as [{ id: string }[], unknown];

    if ((check as { id: string }[]).length === 0) {
      return NextResponse.json({ error: "Staff member not found or access denied" }, { status: 403 });
    }

    // Deleting from staff
    await pool.query(
      "DELETE FROM staff WHERE id = ?",
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}