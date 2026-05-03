import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import bcrypt from "bcryptjs";

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { user_id, currentPassword, newPassword } = await request.json();

    if (!user_id || !currentPassword || !newPassword)
      return NextResponse.json({ error: "user_id, currentPassword and newPassword are required" }, { status: 400 });

    if (newPassword.length < 8)
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });

    const pool = await getPool();

    // Fetch current hashed password
    const [rows] = await pool.query(
      "SELECT password FROM users WHERE id = ?", [user_id]
    );
    const users = rows as { password: string }[];

    if (!users.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const match = await bcrypt.compare(currentPassword, users[0].password);
    if (!match) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    // Hash and save new password
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashed, user_id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}