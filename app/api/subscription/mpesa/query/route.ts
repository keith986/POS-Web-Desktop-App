// app/api/subscription/mpesa/query/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── GET /api/subscription/mpesa/query?id=<checkoutRequestId> ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id)
      return NextResponse.json({ error: "id (checkoutRequestId) is required" }, { status: 400 });

    const pool = await getPool();

    const [rows] = await pool.query(
      `SELECT status, mpesa_receipt, result_desc
       FROM mpesa_transactions
       WHERE checkout_request_id = ?
       LIMIT 1`,
      [id]
    );

    const tx = (rows as Record<string, unknown>[])[0];

    if (!tx)
      return NextResponse.json({ paid: false, error: "Transaction not found" });

    if (tx.status === "completed")
      return NextResponse.json({ paid: true, receipt: tx.mpesa_receipt ?? null });

    if (tx.status === "failed" || tx.status === "cancelled")
      return NextResponse.json({ paid: false, failed: true, reason: tx.result_desc ?? "Payment not completed" });

    /* Still pending */
    return NextResponse.json({ paid: false, pending: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}