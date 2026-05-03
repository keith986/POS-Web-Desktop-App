import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── GET /api/user/plan?user_id=xxx
   Returns the user's active plan from the subscriptions table,
   falling back to the last completed mpesa_transaction,
   defaulting to "starter" if nothing is found.
── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user_id = request.nextUrl.searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json({ plan: "starter" });
    }

    const pool = await getPool();

    /* ── 1. Active subscription row ── */
    const [subRows] = await pool.query(
      `SELECT plan
       FROM subscriptions
       WHERE user_id = ? AND status = 'active'
       LIMIT 1`,
      [user_id]
    ) as [{ plan: string }[], unknown];

    if (subRows.length > 0) {
      return NextResponse.json({ plan: subRows[0].plan });
    }

    /* ── 2. Last completed M-Pesa transaction ── */
    const [txRows] = await pool.query(
      `SELECT plan
       FROM mpesa_transactions
       WHERE user_id = ? AND status = 'completed'
       ORDER BY created_at DESC
       LIMIT 1`,
      [user_id]
    ) as [{ plan: string }[], unknown];

    if (txRows.length > 0) {
      return NextResponse.json({ plan: txRows[0].plan });
    }

    /* ── 3. Default ── */
    return NextResponse.json({ plan: "starter" });

  } catch (error) {
    console.error("[user/plan]", (error as Error).message);
    return NextResponse.json({ plan: "starter" });
  }
}