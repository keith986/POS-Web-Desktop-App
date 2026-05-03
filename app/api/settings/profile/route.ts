import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { user_id, full_name, email, phone } = await request.json();

    if (!user_id || !full_name || !email) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const pool = await getPool();

    await pool.query(
      "UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?",
      [full_name, email, phone ?? "", user_id]
    );

    // Return updated user so caller can refresh localStorage
    const [rows] = await pool.query(
      "SELECT id, full_name, email, role, store_name FROM users WHERE id = ?",
      [user_id]
    );
    const updated = (rows as Record<string, unknown>[])[0];

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}