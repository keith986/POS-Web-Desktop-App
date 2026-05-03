import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { stkQuery } from "@/app/_lib/mpesa";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { checkoutRequestId, user_id, plan } = await request.json();

  if (!checkoutRequestId)
    return NextResponse.json({ error: "checkoutRequestId required" }, { status: 400 });

  try {
    const result = await stkQuery(checkoutRequestId);
    const pool   = await getPool();

    // Payment successful
    if (result.ResultCode === "0") {
      await pool.query(
        `UPDATE mpesa_transactions SET status = 'completed', mpesa_receipt = ?, result_desc = ? 
         WHERE checkout_request_id = ?`,
        [result.MpesaReceiptNumber ?? null, result.ResultDesc ?? "Success", checkoutRequestId]
      );

      // Activate subscription
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);

      await pool.query(
        `INSERT INTO subscriptions (user_id, plan, status, amount, next_billing_date)
         VALUES (?, ?, 'active', (SELECT amount FROM mpesa_transactions WHERE checkout_request_id = ?), ?)
         ON DUPLICATE KEY UPDATE plan = VALUES(plan), status = 'active', next_billing_date = VALUES(next_billing_date)`,
        [user_id, plan, checkoutRequestId, nextBilling.toISOString().split("T")[0]]
      );

      await pool.query(
        "UPDATE users SET subdomain_status = 'active' WHERE id = ?",
        [user_id]
      );

      return NextResponse.json({ status: "completed" });
    }

    // Still pending
    if (result.ResultCode === "1032" || !result.ResultCode) {
      return NextResponse.json({ status: "pending" });
    }

    // Failed or cancelled
    await pool.query(
      `UPDATE mpesa_transactions SET status = 'failed', result_desc = ? WHERE checkout_request_id = ?`,
      [result.ResultDesc ?? "Failed", checkoutRequestId]
    );

    return NextResponse.json({ status: "failed", message: result.ResultDesc });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}