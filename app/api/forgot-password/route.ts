import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/app/_lib/mailer";
import { RowDataPacket } from "mysql2";

interface UserRow extends RowDataPacket {
  id: string;
  store_name: string | null;
  email: string;
  source: "admin" | "staff";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { email } = await request.json();
  if (!email)
    return NextResponse.json({ error: "Email is required" }, { status: 400 });

  try {
    const pool = await getPool();

    // Check users table first, then staff table
    const [adminRows] = await pool.query<UserRow[]>(
      "SELECT id, store_name, email, 'admin' AS source FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    const [staffRows] = await pool.query<UserRow[]>(
      "SELECT id, NULL AS store_name, email, 'staff' AS source FROM staff WHERE email = ? LIMIT 1",
      [email]
    );

    const user = adminRows[0] ?? staffRows[0] ?? null;

    // Always return success to prevent email enumeration
    if (!user)
      return NextResponse.json({ success: true });

    const token   = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)`,
      [user.id, token, expires]
    );

    const resetUrl = `https://pos.upendoapps.com/reset-password?token=${token}`;

    const sending = await sendPasswordResetEmail(email, resetUrl, user.store_name ?? undefined);

    if(sending){
      console.log(`Password reset email sent to ${email} with token ${token}`);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Failed to send email" });

  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}