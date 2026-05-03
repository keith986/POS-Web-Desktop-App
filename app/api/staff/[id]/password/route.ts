// app/api/staff/[id]/password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import bcrypt from "bcryptjs";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface StaffRow extends RowDataPacket {
  id:       string;
  password: string;
}

/* ── PUT /api/staff/[id]/password ── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { current_password, new_password } = await request.json();

    if (!current_password || !new_password)
      return NextResponse.json(
        { error: "current_password and new_password are required" },
        { status: 400 }
      );

    if (new_password.length < 6)
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );

    const pool = await getPool();

    /* 1. Fetch current hashed password */
    const [rows] = await pool.query<StaffRow[]>(
      "SELECT id, password FROM staff WHERE id = ? LIMIT 1",
      [id]
    );

    if (rows.length === 0)
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    /* 2. Verify current password */
    const match = await bcrypt.compare(current_password, rows[0].password);
    if (!match)
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );

    /* 3. Hash and update */
    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query<ResultSetHeader>(
      "UPDATE staff SET password = ? WHERE id = ?",
      [hashed, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}