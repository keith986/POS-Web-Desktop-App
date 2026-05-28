// app/api/mpesa/webhook/route.ts
// Handles callbacks for BOTH subscription payments and sale payments
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body     = await request.json();
    const callback = body?.Body?.stkCallback;

    if (!callback) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const {
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = callback;

    const pool = await getPool();

    // ── Extract metadata ───────────────────────────────────────────────
    const items: { Name: string; Value: string | number }[] =
      CallbackMetadata?.Item ?? [];
    const getMeta = (name: string) =>
      items.find(i => i.Name === name)?.Value ?? null;

    const mpesaReceipt = getMeta("MpesaReceiptNumber") as string | null;
    const amount       = getMeta("Amount")             as number | null;

    // ── Determine which table this checkout belongs to ─────────────────
    // Check mpesa_stk_requests first (sale payments)
    const [stkRows] = await pool.query(
      "SELECT id, admin_id, order_id FROM mpesa_stk_requests WHERE checkout_request_id = ? LIMIT 1",
      [CheckoutRequestID]
    ) as [{ id: string; admin_id: string; order_id: string | null }[], unknown];

    const isSalePayment = stkRows.length > 0;

    if (isSalePayment) {
      // ── SALE PAYMENT CALLBACK ────────────────────────────────────────
      const { admin_id, order_id } = stkRows[0];

      if (ResultCode !== 0) {
        await pool.query(
          `UPDATE mpesa_stk_requests SET status = 'failed', result_desc = ?, updated_at = NOW()
           WHERE checkout_request_id = ?`,
          [ResultDesc, CheckoutRequestID]
        );
        // Mark order payment as failed
        if (order_id) {
          await pool.query(
            "UPDATE orders SET payment_status = 'failed', updated_at = NOW() WHERE id = ?",
            [order_id]
          );
        }
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      // Success — mark STK request as completed
      await pool.query(
        `UPDATE mpesa_stk_requests
         SET status = 'completed', mpesa_receipt = ?, result_desc = ?, updated_at = NOW()
         WHERE checkout_request_id = ?`,
        [mpesaReceipt, ResultDesc, CheckoutRequestID]
      );

      // Mark order as paid
      if (order_id) {
        await pool.query(
          `UPDATE orders
           SET payment_status = 'paid', payment_method = 'mpesa',
               mpesa_receipt = ?, status = 'completed', updated_at = NOW()
           WHERE id = ?`,
          [mpesaReceipt, order_id]
        );
      }

      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // ── SUBSCRIPTION PAYMENT CALLBACK ───────────────────────────────────
    // Check mpesa_transactions table
    const [txRows] = await pool.query(
      "SELECT user_id, plan, amount FROM mpesa_transactions WHERE checkout_request_id = ? LIMIT 1",
      [CheckoutRequestID]
    ) as [{ user_id: string; plan: string; amount: number }[], unknown];

    if (!txRows.length) {
      // Unknown checkout ID — still return 200 to Safaricom
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const { user_id, plan } = txRows[0];

    if (ResultCode !== 0) {
      await pool.query(
        "UPDATE mpesa_transactions SET status = 'failed', result_desc = ? WHERE checkout_request_id = ?",
        [ResultDesc, CheckoutRequestID]
      );
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // Mark transaction as completed
    await pool.query(
      `UPDATE mpesa_transactions
       SET status = 'completed', mpesa_receipt = ?, result_desc = ?, updated_at = NOW()
       WHERE checkout_request_id = ?`,
      [mpesaReceipt, ResultDesc, CheckoutRequestID]
    );

    // Update or create subscription row — same auto-heal logic as verify-session
    const nextBilling = new Date();
    nextBilling.setDate(nextBilling.getDate() + 30);
    const nextBillingStr = nextBilling.toISOString().split("T")[0];

    await pool.query(
      `INSERT INTO subscriptions (user_id, plan, status, amount, next_billing_date, created_at, updated_at)
       VALUES (?, ?, 'active', ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         status = 'active', plan = VALUES(plan), amount = VALUES(amount),
         next_billing_date = VALUES(next_billing_date), updated_at = NOW()`,
      [user_id, plan, amount, nextBillingStr]
    );

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (error) {
    console.error("[mpesa-webhook]", error);
    // Always 200 to Safaricom — never return an error status
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}