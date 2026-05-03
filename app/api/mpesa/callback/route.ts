import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const callback = body?.Body?.stkCallback;

    if (!callback) return NextResponse.json({ ok: true });

    const checkoutRequestId = callback.CheckoutRequestID;
    const resultCode        = callback.ResultCode;
    const resultDesc        = callback.ResultDesc;

    const pool = await getPool();

    if (resultCode === 0) {
      // Extract M-Pesa receipt from callback metadata
      const items   = callback.CallbackMetadata?.Item ?? [];
      const receipt = items.find((i: { Name: string }) => i.Name === "MpesaReceiptNumber")?.Value ?? null;

      await pool.query(
        `UPDATE mpesa_transactions 
         SET status = 'completed', mpesa_receipt = ?, result_desc = ?
         WHERE checkout_request_id = ?`,
        [receipt, resultDesc, checkoutRequestId]
      );

      // Activate subscription
      const [rows] = await pool.query(
        "SELECT user_id, plan, amount FROM mpesa_transactions WHERE checkout_request_id = ?",
        [checkoutRequestId]
      ) as [{ user_id: string; plan: string; amount: number }[], unknown];

      if (rows.length > 0) {
        const { user_id, plan, amount } = rows[0];
        const nextBilling = new Date();
        nextBilling.setMonth(nextBilling.getMonth() + 1);

        await pool.query(
          `INSERT INTO subscriptions (user_id, plan, status, amount, next_billing_date)
           VALUES (?, ?, 'active', ?, ?)
           ON DUPLICATE KEY UPDATE plan = VALUES(plan), status = 'active', 
           amount = VALUES(amount), next_billing_date = VALUES(next_billing_date)`,
          [user_id, plan, amount, nextBilling.toISOString().split("T")[0]]
        );

        await pool.query(
          "UPDATE users SET subdomain_status = 'active' WHERE id = ?",
          [user_id]
        );

      }
    } else {
      await pool.query(
        `UPDATE mpesa_transactions SET status = 'failed', result_desc = ? WHERE checkout_request_id = ?`,
        [resultDesc, checkoutRequestId]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("M-Pesa callback error:", error);
    return NextResponse.json({ ok: true });
  }
}