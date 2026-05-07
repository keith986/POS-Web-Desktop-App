import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";

/* ── GET /api/receipts?admin_id=xxx&order_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    const order_id = request.nextUrl.searchParams.get("order_id");

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    let query = "SELECT * FROM receipts WHERE admin_id = ?";
    const params: string[] = [admin_id];

    if (order_id) {
      query += " AND order_id = ?";
      params.push(order_id);
    }

    query += " ORDER BY created_at DESC";

    const [rows] = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── POST /api/receipts ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { order_id, receipt_html, receipt_text, admin_id } = await request.json();

    if (!order_id || !receipt_html || !receipt_text || !admin_id)
      return NextResponse.json(
        { error: "order_id, receipt_html, receipt_text, and admin_id are required" },
        { status: 400 }
      );

    const pool = await getPool();
    const id = randomUUID();
    const receipt_number = `RCP-${Date.now()}`;

    // Check if receipt already exists for this order
    const [existing] = await pool.query(
      "SELECT id FROM receipts WHERE order_id = ? AND admin_id = ?",
      [order_id, admin_id]
    );

    if ((existing as unknown[]).length > 0) {
      return NextResponse.json({ error: "Receipt already exists for this order" }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO receipts (id, order_id, receipt_number, receipt_html, receipt_text, admin_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, order_id, receipt_number, receipt_html, receipt_text, admin_id]
    );

    return NextResponse.json({ success: true, id, receipt_number });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── PUT /api/receipts?id=xxx ── */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { action, sent_to } = await request.json();

    if (!action)
      return NextResponse.json({ error: "action is required (print or email)" }, { status: 400 });

    const pool = await getPool();

    if (action === 'print') {
      await pool.query("UPDATE receipts SET printed_at = NOW() WHERE id = ?", [id]);
    } else if (action === 'email') {
      if (!sent_to)
        return NextResponse.json({ error: "sent_to is required for email action" }, { status: 400 });

      await pool.query("UPDATE receipts SET email_sent_at = NOW(), sent_to = ? WHERE id = ?", [sent_to, id]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── DELETE /api/receipts?id=xxx ── */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const pool = await getPool();
    await pool.query("DELETE FROM receipts WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
