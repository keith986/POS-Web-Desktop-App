// app/api/subscription/mpesa/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

const PLAN_MONTHS: Record<string, number> = {
  monthly:    1,
  quarterly:  3,
  yearly:    12,
};

/* ── POST /api/subscription/mpesa/callback  (called by Safaricom) ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    /* Always return 200 to Safaricom — never let them retry indefinitely */
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const callback        = (payload?.Body as Record<string, unknown>)?.stkCallback as Record<string, unknown>;
  const checkoutId      = callback?.CheckoutRequestID as string;
  const resultCode      = Number(callback?.ResultCode ?? 1);
  const resultDesc      = (callback?.ResultDesc as string) ?? "";

  if (!checkoutId) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const pool = await getPool();

  try {
    /* ── 1. Find the pending transaction ── */
    const [txRows] = await pool.query(
      `SELECT * FROM mpesa_transactions WHERE checkout_request_id = ? LIMIT 1`,
      [checkoutId]
    );

    const tx = (txRows as Record<string, unknown>[])[0];

    if (!tx) {
      /* Unknown — still ack Safaricom */
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    /* ── 2. Payment failed / cancelled ── */
    if (resultCode !== 0) {
      await pool.query(
        `UPDATE mpesa_transactions
         SET status = 'failed', result_desc = ?, updated_at = NOW()
         WHERE checkout_request_id = ?`,
        [resultDesc, checkoutId]
      );
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    /* ── 3. Payment succeeded — extract metadata ── */
    const metaItems: Record<string, unknown>[] =
      ((callback?.CallbackMetadata as Record<string, unknown>)?.Item as Record<string, unknown>[]) ?? [];

    const getMeta = (name: string) =>
      metaItems.find(i => i.Name === name)?.Value ?? null;

    const mpesaReceipt = getMeta("MpesaReceiptNumber") as string | null;
    const paidAmount   = Number(getMeta("Amount") ?? tx.amount);

    /* ── 4. Mark transaction completed ── */
    await pool.query(
      `UPDATE mpesa_transactions
       SET status = 'completed', mpesa_receipt = ?, result_desc = ?, amount = ?, updated_at = NOW()
       WHERE checkout_request_id = ?`,
      [mpesaReceipt, resultDesc, paidAmount, checkoutId]
    );

    /* ── 5. Upsert subscription ── */
    const plan   = tx.plan as string;
    const months = PLAN_MONTHS[plan] ?? 1;
    const userId = tx.user_id as string;

    const [existingRows] = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    const existing = (existingRows as Record<string, unknown>[])[0] ?? null;

    /* Extend from today, or from current expiry if still active */
    let baseDate = new Date();
    if (existing) {
      const currentExpiry = new Date(existing.next_billing_date as string);
      if (existing.status === "active" && currentExpiry > baseDate) {
        baseDate = currentExpiry;
      }
    }

    const nextBillingDate = new Date(baseDate);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + months);
    const nextDateStr = nextBillingDate.toISOString().slice(0, 10);

    if (existing) {
      await pool.query(
        `UPDATE subscriptions
         SET plan = ?, status = 'active', amount = ?, next_billing_date = ?, updated_at = NOW()
         WHERE user_id = ?`,
        [plan, paidAmount, nextDateStr, userId]
      );
    } else {
      await pool.query(
        `INSERT INTO subscriptions (user_id, plan, status, amount, next_billing_date)
         VALUES (?, ?, 'active', ?, ?)`,
        [userId, plan, paidAmount, nextDateStr]
      );
    }

    console.log(`[subscription/callback] ✅ ${userId} → ${plan} until ${nextDateStr} (receipt: ${mpesaReceipt})`);
  } catch (err) {
    /* Log but still ack Safaricom */
    console.error("[subscription/callback] DB error:", (err as Error).message);
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}