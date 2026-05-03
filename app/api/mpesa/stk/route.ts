import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { stkPush } from "@/app/_lib/mpesa";
import { getPrice } from "@/app/_lib/pricing";
import type { PosType, PlanId } from "@/app/_lib/pricing";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { phone, plan, pos_type, user_id } = await request.json();

  if (!phone || !plan || !pos_type || !user_id)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  try {
    const amount = getPrice(pos_type as PosType, plan as PlanId);

    const result = await stkPush({
      phone,
      amount,
      accountRef:  "UPENDO KENYADIGITAL POStore",
      description: `UPENDO KENYADIGITAL POStore ${plan} plan - monthly`,
    });

  
  console.log("STK Push result:", JSON.stringify(result));

  if (result.ResponseCode !== "0")
  return NextResponse.json({ 
    error: "Failed to initiate payment",
    details: result 
  }, { status: 400 });

    // Save pending transaction
    const pool = await getPool();
    await pool.query(
      `INSERT INTO mpesa_transactions
       (user_id, checkout_request_id, merchant_request_id, amount, phone, plan, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [user_id, result.CheckoutRequestID, null, amount, phone, plan]
    );

    return NextResponse.json({
      success:            true,
      checkoutRequestId:  result.CheckoutRequestID,
      customerMessage:    result.CustomerMessage,
      amount,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}