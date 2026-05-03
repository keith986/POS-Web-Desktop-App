import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

const VALID_TYPES = ["retail", "restaurant", "salon", "wholesale", "pharmacy"] as const;
type PosType = typeof VALID_TYPES[number];

/* ── POST /api/onboarding ──
   Body: { admin_id: string, pos_type: PosType }
   Saves pos_type to users table and returns updated user.
── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { admin_id, pos_type } = await request.json();

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    if (!VALID_TYPES.includes(pos_type as PosType))
      return NextResponse.json({ error: "Invalid pos_type" }, { status: 400 });

    const pool = await getPool();

    await pool.query(
      "UPDATE users SET pos_type = ? WHERE id = ?",
      [pos_type, admin_id]
    );

    /* Return updated user so client can refresh localStorage */
    const [rows] = await pool.query(
      "SELECT id, full_name, email, role, store_name, domain, pos_type FROM users WHERE id = ?",
      [admin_id]
    );

    const user = (rows as Record<string, unknown>[])[0];
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}