import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false });

  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      "SELECT id FROM password_resets WHERE token = ? AND expires_at > NOW() LIMIT 1",
      [token]
    ) as [{ id: number }[], unknown];

    return NextResponse.json({ valid: rows.length > 0 });
  } catch {
    return NextResponse.json({ valid: false });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { token, password } = await request.json();
  if (!token || !password)
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });

  try {
    const pool = await getPool();

    // Get the user_id from the reset token
    const [rows] = await pool.query(
      `SELECT user_id FROM password_resets
       WHERE token = ? AND expires_at > NOW() LIMIT 1`,
      [token]
    ) as [{ user_id: string }[], unknown];

    if (!rows || rows.length === 0)
      return NextResponse.json({ error: "Reset link is invalid or expired" }, { status: 400 });

    const userId = rows[0].user_id;
    const hashed = await bcrypt.hash(password, 10);

    // Check which table this user_id belongs to
    const [adminRows] = await pool.query(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [userId]
    ) as [{ id: string }[], unknown];

    const [staffRows] = await pool.query(
      "SELECT id FROM staff WHERE id = ? LIMIT 1",
      [userId]
    ) as [{ id: string }[], unknown];

    if (adminRows.length > 0) {
      // It's an admin/user
      await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashed, userId]);
    } else if (staffRows.length > 0) {
      // It's a staff member
      await pool.query("UPDATE staff SET password = ? WHERE id = ?", [hashed, userId]);
    } else {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Invalidate the token after successful reset
    await pool.query("DELETE FROM password_resets WHERE token = ?", [token]);

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}