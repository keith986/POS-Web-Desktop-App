// app/api/subscription/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── GET /api/subscription/status?admin_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    /* ── 1. Fetch subscription row ── */
    const [subRows] = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = ? LIMIT 1`,
      [admin_id]
    );

    const sub = (subRows as Record<string, unknown>[])[0] ?? null;

    /* ── 2. Fetch payment history from mpesa_transactions ── */
    const [txRows] = await pool.query(
      `SELECT id, created_at, amount, plan, status, mpesa_receipt, checkout_request_id
       FROM mpesa_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [admin_id]
    );

    const payments = (txRows as Record<string, unknown>[]).map(tx => ({
      id:                String(tx.id),
      date:              tx.created_at,
      amount:            Number(tx.amount),
      status:            tx.status === "completed" ? "success"
                       : tx.status === "failed"    ? "failed"
                       : "pending",
      period:            tx.plan,
      checkoutRequestId: tx.checkout_request_id,
      mpesaReceipt:      tx.mpesa_receipt ?? null,
    }));

    /* ── 3. No subscription yet ── */
    if (!sub) {
      return NextResponse.json({
        status:    "none",
        paidUntil: null,
        plan:      null,
        amount:    null,
        payments,
        daysLeft:  null,
      });
    }

    /* ── 4. Compute days left & derive UI status ── */
    const now             = new Date();
    const nextBillingDate = new Date(sub.next_billing_date as string);
    const daysLeft        = Math.ceil(
      (nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let status: "active" | "expired" | "due" | "none" = "none";
    if      (sub.status === "active")                              status = daysLeft > 0 ? "active" : "expired";
    else if (sub.status === "expired" || sub.status === "cancelled") status = "expired";
    else if (sub.status === "pending")                             status = "due";

    return NextResponse.json({
      status,
      paidUntil: sub.next_billing_date,
      plan:      sub.plan,
      amount:    Number(sub.amount),
      payments,
      daysLeft:  Math.max(0, daysLeft),
      subStatus: sub.status,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}