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

    /* ── 3. Staff — verify their admin's subscription is still valid ── */
    if (foundRole === "staff") {
      // Get the admin_id for this staff member
      const [staffAdminRows] = await pool.query(
        "SELECT admin_id FROM staff WHERE id = ? LIMIT 1",
        [user_id]
      ) as [{ admin_id: string }[], unknown];

      if (!staffAdminRows.length) return NextResponse.json({ valid: false });

      const adminId = staffAdminRows[0].admin_id;
      const adminValid = await checkAdminSubscription(pool, adminId);

      if (!adminValid) {
        return NextResponse.json({
          valid: false, payment_status: "unpaid", plan: null,
        });
      }

      return NextResponse.json({
        valid: true, payment_status: "active", plan: "starter",
      });
    }

    /* ── 4. Admin — check subscription status ── */
    const isActive = await checkAdminSubscription(pool, user_id);

    if (isActive) {
      // Re-fetch plan after potential auto-heal
      const [subRows] = await pool.query(
        "SELECT plan FROM subscriptions WHERE user_id = ? LIMIT 1",
        [user_id]
      ) as [{ plan: string }[], unknown];

      const plan = subRows[0]?.plan ?? "starter";
      return NextResponse.json({ valid: true, payment_status: "active", plan });
    }

    return NextResponse.json({ valid: false, payment_status: "unpaid", plan: null });

  } catch (error) {
    console.error("[verify-session]", (error as Error).message);
    /* On DB error — fail closed (don't allow through) */
    return NextResponse.json({ valid: false, payment_status: "unpaid", plan: null });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Shared helper — same 3-step logic used in login route & subscription API
   1. subscriptions row: active + next_billing_date in the future
   2. subscriptions row expired + mpesa tx within 30 days → auto-heal DB
   3. No subscriptions row + mpesa tx within 30 days → auto-heal DB
───────────────────────────────────────────────────────────────────────── */
async function checkAdminSubscription(
  pool: Awaited<ReturnType<typeof getPool>>,
  adminId: string
): Promise<boolean> {
  const now = new Date();

  // 1. Check subscriptions table
  const [subRows] = await pool.query(
    "SELECT status, plan, next_billing_date FROM subscriptions WHERE user_id = ? LIMIT 1",
    [adminId]
  ) as [{ status: string; plan: string; next_billing_date: string }[], unknown];

  const sub = subRows[0] ?? null;

  if (sub) {
    const endDate = new Date(sub.next_billing_date);
    if (sub.status === "active" && endDate >= now) {
      // Genuinely active — allow through immediately
      return true;
    }
  }

  // 2. Fallback: latest completed M-Pesa tx — check 30-day window
  const [txRows] = await pool.query(
    `SELECT plan, created_at FROM mpesa_transactions
     WHERE user_id = ? AND status = 'completed'
     ORDER BY created_at DESC LIMIT 1`,
    [adminId]
  ) as [{ plan: string; created_at: string }[], unknown];

  if (txRows.length === 0) return false;

  const txDate  = new Date(txRows[0].created_at);
  const derived = new Date(txDate);
  derived.setDate(derived.getDate() + 30);

  if (derived < now) return false; // Payment period also expired

  // Payment is still valid — auto-heal the subscriptions row
  const paidUntil = derived.toISOString().split("T")[0];
  const plan      = txRows[0].plan;

  if (sub) {
    // Update stale row
    await pool.query(
      `UPDATE subscriptions
       SET status = 'active', plan = ?, next_billing_date = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [plan, paidUntil, adminId]
    );
  } else {
    // Insert missing row
    await pool.query(
      `INSERT INTO subscriptions (user_id, plan, status, amount, next_billing_date, created_at, updated_at)
       VALUES (?, ?, 'active', 0, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         status = 'active', plan = VALUES(plan),
         next_billing_date = VALUES(next_billing_date), updated_at = NOW()`,
      [adminId, plan, paidUntil]
    );
  }

  return true;
}