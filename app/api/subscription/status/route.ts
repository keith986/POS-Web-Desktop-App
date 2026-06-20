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

    const txList = txRows as Record<string, unknown>[];

    const payments = txList.map(tx => ({
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

    /* ── 3. No subscription row yet ─────────────────────────────────────────
       Still check mpesa_transactions — admin may have paid via M-Pesa but the
       subscriptions row was never created / updated.                          */
    if (!sub) {
      const latestCompletedTx = txList.find(t => t.status === "completed");

      if (!latestCompletedTx) {
        return NextResponse.json({
          status: "none", paidUntil: null, plan: null,
          amount: null, payments, daysLeft: null,
        });
      }

      // Derive 30-day window from the payment date
      const txDate  = new Date(latestCompletedTx.created_at as string);
      const derived = new Date(txDate);
      derived.setDate(derived.getDate() + 30);

      const now      = new Date();
      const daysLeft = Math.ceil((derived.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const paidUntil = derived.toISOString().split("T")[0];
      const plan      = String(latestCompletedTx.plan ?? "starter");
      const amount    = Number(latestCompletedTx.amount);

      if (daysLeft > 0) {
        // Auto-heal: insert a subscriptions row so this resolves itself going forward
        await pool.query(
          `INSERT INTO subscriptions (user_id, plan, status, amount, next_billing_date, created_at, updated_at)
           VALUES (?, ?, 'active', ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
             status = 'active', plan = VALUES(plan), amount = VALUES(amount),
             next_billing_date = VALUES(next_billing_date), updated_at = NOW()`,
          [admin_id, plan, amount, paidUntil]
        );

        return NextResponse.json({
          status: "active", paidUntil, plan, amount,
          payments, daysLeft: Math.max(0, daysLeft), subStatus: "active",
        });
      }

      return NextResponse.json({
        status: "expired", paidUntil, plan, amount,
        payments, daysLeft: 0, subStatus: "expired",
      });
    }

    /* ── 4. Subscription row exists — compute days left ── */
    const now             = new Date();
    const isLifetime      = String(sub.plan).toLowerCase() === "lifetime";
    const nextBillingDate = new Date(sub.next_billing_date as string);
    const daysLeft        = isLifetime
      ? null
      : Math.ceil((nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let status: "active" | "expired" | "due" | "none" = "none";
    if (isLifetime) {
      status = sub.status === "cancelled" ? "expired" : "active";
    } else if (sub.status === "active") {
      status = daysLeft != null && daysLeft > 0 ? "active" : "expired";
    } else if (sub.status === "expired" || sub.status === "cancelled") {
      status = "expired";
    } else if (sub.status === "pending") {
      status = "due";
    }

    /* ── 5. Sub row says expired — check mpesa_transactions as fallback ─────
       This handles the case where admin paid via M-Pesa but the webhook
       never updated the subscriptions row (e.g. Keith's case).               */
    if (status === "expired") {
      const latestCompletedTx = txList.find(t => t.status === "completed");

      if (latestCompletedTx) {
        const txDate  = new Date(latestCompletedTx.created_at as string);
        const derived = new Date(txDate);
        derived.setDate(derived.getDate() + 30);

        const derivedDaysLeft = Math.ceil(
          (derived.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (derivedDaysLeft > 0) {
          const paidUntil = derived.toISOString().split("T")[0];
          const plan      = String(latestCompletedTx.plan ?? sub.plan);
          const amount    = Number(latestCompletedTx.amount ?? sub.amount);

          // Auto-heal: update the stale subscriptions row
          await pool.query(
            `UPDATE subscriptions
             SET status = 'active', plan = ?, amount = ?, next_billing_date = ?, updated_at = NOW()
             WHERE user_id = ?`,
            [plan, amount, paidUntil, admin_id]
          );

          return NextResponse.json({
            status:    "active",
            paidUntil,
            plan,
            amount,
            payments,
            daysLeft:  Math.max(0, derivedDaysLeft),
            subStatus: "active",
          });
        }
      }
    }

    /* ── 6. Return normal result ── */
    return NextResponse.json({
      status,
      paidUntil: isLifetime ? null : sub.next_billing_date,
      plan:      sub.plan,
      amount:    Number(sub.amount),
      payments,
      daysLeft:  isLifetime ? null : daysLeft != null ? Math.max(0, daysLeft) : 0,
      subStatus: sub.status,
    });

  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}