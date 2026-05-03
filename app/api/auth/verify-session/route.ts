import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── POST /api/auth/verify-session
   Body: { user_id: string, role: string }
   Returns:
     { valid: false }
     { valid: true, payment_status: "unpaid",  plan: null }
     { valid: true, payment_status: "active",  plan: "starter"|"pro"|"enterprise" }
── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user_id, role } = await request.json();

    if (!user_id || !role)
      return NextResponse.json({ valid: false });

    const pool = await getPool();

    /* ── 1. Check user exists in users table ── */
    const [userRows] = await pool.query(
      "SELECT id, role FROM users WHERE id = ? LIMIT 1",
      [user_id]
    ) as [{ id: string; role: string }[], unknown];

    let foundRole: string | null = null;

    if (userRows.length && userRows[0].role === role) {
      foundRole = userRows[0].role;
    }

    /* ── 2. If not found in users, check staff table ── */
    if (!foundRole && role === "staff") {
      const [staffRows] = await pool.query(
        "SELECT id FROM staff WHERE id = ? AND status = 'active' LIMIT 1",
        [user_id]
      ) as [{ id: string }[], unknown];
      if (staffRows.length) foundRole = "staff";
    }

    if (!foundRole) return NextResponse.json({ valid: false });

    /* ── 3. Staff don't need a subscription check ── */
    if (foundRole === "staff") {
      return NextResponse.json({
        valid:          true,
        payment_status: "active",
        plan:           "starter",
      });
    }

    /* ── 4. Admin — check subscription status ── */
const [subRows] = await pool.query(
  `SELECT plan, status FROM subscriptions WHERE user_id = ? LIMIT 1`,
  [user_id]
) as [{ plan: string; status: string }[], unknown];

// Subscription exists
if (subRows.length > 0) {
  if (subRows[0].status === "active") {
    return NextResponse.json({
      valid: true, payment_status: "active", plan: subRows[0].plan,
    });
  }
  // Subscription exists but cancelled/expired — block immediately, no mpesa fallback
  return NextResponse.json({
    valid: false, payment_status: "unpaid", plan: null,
  });
}

// No subscription row at all — check mpesa as fallback
const [txRows] = await pool.query(
  `SELECT plan FROM mpesa_transactions
   WHERE user_id = ? AND status = 'completed'
   ORDER BY created_at DESC LIMIT 1`,
  [user_id]
) as [{ plan: string }[], unknown];

if (txRows.length > 0) {
  return NextResponse.json({
    valid: true, payment_status: "active", plan: txRows[0].plan,
  });
}

return NextResponse.json({ valid: false, payment_status: "unpaid", plan: null });

  } catch (error) {
    console.error("[verify-session]", (error as Error).message);
    /* On DB error allow through — don't lock users out */
    return NextResponse.json({
      valid:          false,
      payment_status: "unpaid",
      plan:           "null",
    });
  }
}