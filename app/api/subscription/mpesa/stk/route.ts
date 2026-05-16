// app/api/subscription/mpesa/stk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

const PLAN_MONTHS: Record<string, number> = {
  monthly:   1,
  quarterly: 3,
  yearly:   12,
};

/* ── Safaricom token ── */
async function getMpesaToken(): Promise<string> {
  const key    = process.env.MPESA_CONSUMER_KEY    ?? "";
  const secret = process.env.MPESA_CONSUMER_SECRET ?? "";
  const creds  = Buffer.from(`${key}:${secret}`).toString("base64");

  const res = await fetch(
    `${process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke"}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${creds}` } }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get M-Pesa token");
  return data.access_token;
}

/* ── POST /api/subscription/mpesa/stk ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { phone, amount, period, admin_id } = await request.json();

    if (!phone || !amount || !period || !admin_id)
      return NextResponse.json(
        { error: "phone, amount, period and admin_id are required" },
        { status: 400 }
      );

    if (!PLAN_MONTHS[period])
      return NextResponse.json({ error: "Invalid plan period" }, { status: 400 });

    /* ── Normalise phone: 07xx / 01xx → 2547xx / 2541xx ── */
    const normPhone = phone
      .replace(/\s/g, "")
      .replace(/^\+/, "")
      .replace(/^0/, "254");

    const shortCode   = process.env.MPESA_SHORTCODE       ?? "174379";
    const passkey     = process.env.MPESA_PASSKEY          ?? "";
    const callbackUrl = process.env.MPESA_CALLBACK_URL     ??
      `${process.env.NEXT_PUBLIC_APP_URL}/api/subscription/mpesa/callback`;
    const baseUrl     = process.env.MPESA_BASE_URL         ?? "https://sandbox.safaricom.co.ke";

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, "")
      .slice(0, 14);

    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");

    const token = await getMpesaToken();

    const stkBody = {
      BusinessShortCode: shortCode,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   "CustomerPayBillOnline",
      Amount:            Math.ceil(Number(amount)),
      PartyA:            normPhone,
      PartyB:            shortCode,
      PhoneNumber:       normPhone,
      CallBackURL:       callbackUrl,
      AccountReference:  "POStore",
      TransactionDesc:   `POStore ${period} subscription`,
    };

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify(stkBody),
    });

    const stkData = await stkRes.json();

    if (stkData.ResponseCode !== "0") {
      return NextResponse.json(
        { success: false, error: stkData.ResponseDescription ?? "STK Push failed" },
        { status: 400 }
      );
    }

    /* ── Save pending transaction to DB ── */
    const pool = await getPool();
    await pool.query(
      `INSERT INTO mpesa_transactions
         (user_id, checkout_request_id, merchant_request_id, amount, phone, plan, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        admin_id,
        stkData.CheckoutRequestID,
        stkData.MerchantRequestID ?? null,
        Number(amount),
        normPhone,
        period,
      ]
    );

    return NextResponse.json({
      success:           true,
      checkoutRequestId: stkData.CheckoutRequestID,
    });
  } catch (error) {
    const err = error as Error;
    console.error("[subscription/mpesa/stk]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}