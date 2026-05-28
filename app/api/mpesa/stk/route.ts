// app/api/mpesa/stk-push/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { stkPush } from "@/app/_lib/mpesa";

/**
 * Unified STK push endpoint — handles two scenarios:
 *
 * 1. SUBSCRIPTION payment (existing flow — admin paying for their plan)
 *    Body: { phone, plan, pos_type, user_id }
 *    → uses platform shortcode, saves to mpesa_transactions
 *
 * 2. SALE payment (new flow — customer paying for goods via staff POS)
 *    Body: { phone, amount, admin_id, order_id?, account_reference? }
 *    → fetches admin's till, sends STK to customer, saves to mpesa_stk_requests
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const pool = await getPool();

    // ── Detect which flow based on fields present ──────────────────────────
    const isSalePayment = !!body.admin_id && !!body.amount && !body.plan;

    // ══════════════════════════════════════════════════════════════════════
    // FLOW 1 — SALE PAYMENT (customer → admin's till via staff POS)
    // ══════════════════════════════════════════════════════════════════════
    if (isSalePayment) {
      const {
        admin_id,
        order_id        = null,
        phone,                    // customer phone
        amount,
        account_reference = "POStore Sale",
      } = body;

      if (!admin_id || !phone || !amount) {
        return NextResponse.json(
          { error: "admin_id, phone, and amount are required" },
          { status: 400 }
        );
      }

      // Fetch admin's till number
      const [adminRows] = await pool.query(
        "SELECT mpesa_till, store_name FROM users WHERE id = ? LIMIT 1",
        [admin_id]
      ) as [{ mpesa_till: string | null; store_name: string | null }[], unknown];

      if (!adminRows.length) {
        return NextResponse.json({ error: "Admin not found" }, { status: 404 });
      }

      const tillNumber = adminRows[0].mpesa_till?.trim();
      if (!tillNumber) {
        return NextResponse.json({
          error: "This store hasn't set up M-Pesa yet. Ask the admin to add their till number in Settings → M-Pesa.",
        }, { status: 422 });
      }

      const amountInt = Math.ceil(Number(amount));
      const storeName = adminRows[0].store_name ?? "POStore";

      // Send STK push using shared helper — override PartyB with admin's till
      const result = await stkPush({
        phone,
        amount:     amountInt,
        accountRef: account_reference,
        description: `Payment to ${storeName}`,
        partyB:     tillNumber,   // ← money goes to admin's till, not platform shortcode
      });

      console.log("[stk-push/sale] result:", JSON.stringify(result));

      if (result.ResponseCode !== "0") {
        return NextResponse.json({
          error:   result.errorMessage ?? result.ResponseDescription ?? "STK push failed",
          details: result,
        }, { status: 400 });
      }

      // Save pending STK request for polling
      await pool.query(
        `INSERT INTO mpesa_stk_requests
           (admin_id, order_id, checkout_request_id, merchant_request_id, phone, amount, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
         ON DUPLICATE KEY UPDATE
           status = 'pending', created_at = NOW()`,
        [
          admin_id,
          order_id,
          result.CheckoutRequestID,
          result.MerchantRequestID ?? null,
          phone,
          amountInt,
        ]
      );

      return NextResponse.json({
        success:           true,
        checkoutRequestId: result.CheckoutRequestID,
        customerMessage:   result.CustomerMessage ?? "STK push sent. Ask customer to check their phone.",
        amount:            amountInt,
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // FLOW 2 — SUBSCRIPTION PAYMENT (admin paying for POStore plan)
    // ══════════════════════════════════════════════════════════════════════
    const { phone, plan, pos_type, user_id } = body;

    if (!phone || !plan || !pos_type || !user_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Dynamic import to avoid importing pricing on every request
    const { getPrice } = await import("@/app/_lib/pricing");

    const amount = getPrice(pos_type, plan);

    const result = await stkPush({
      phone,
      amount,
      accountRef:   "UPENDO KENYADIGITAL POStore",
      description:  `UPENDO KENYADIGITAL POStore ${plan} plan - monthly`,
      // No partyB override — uses platform shortcode (subscription goes to you)
    });

    console.log("[stk-push/subscription] result:", JSON.stringify(result));

    if (result.ResponseCode !== "0") {
      return NextResponse.json({
        error:   "Failed to initiate payment",
        details: result,
      }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO mpesa_transactions
         (user_id, checkout_request_id, merchant_request_id, amount, phone, plan, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [user_id, result.CheckoutRequestID, null, amount, phone, plan]
    );

    return NextResponse.json({
      success:           true,
      checkoutRequestId: result.CheckoutRequestID,
      customerMessage:   result.CustomerMessage,
      amount,
    });

  } catch (error) {
    console.error("[stk-push]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}