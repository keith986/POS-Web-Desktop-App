import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";

/* ── GET /api/returns?admin_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    const order_id = request.nextUrl.searchParams.get("order_id");
    const status = request.nextUrl.searchParams.get("status");

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    let query =
      `SELECT r.*, o.order_number, p.name as product_name 
       FROM returns r 
       JOIN orders o ON r.order_id = o.id 
       JOIN products p ON r.product_id = p.id 
       WHERE r.admin_id = ?`;

    const params: (string | null)[] = [admin_id];

    if (order_id) {
      query += " AND r.order_id = ?";
      params.push(order_id);
    }

    if (status) {
      query += " AND r.status = ?";
      params.push(status);
    }

    query += " ORDER BY r.created_at DESC";

    const [rows] = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── POST /api/returns ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const {
      order_id,
      product_id,
      quantity,
      reason,
      condition,
      refund_amount,
      refund_method,
      notes,
      admin_id,
    } = await request.json();

    if (!order_id || !product_id || quantity == null || !reason || refund_amount == null || !admin_id)
      return NextResponse.json(
        { error: "order_id, product_id, quantity, reason, refund_amount, and admin_id are required" },
        { status: 400 }
      );

    const pool = await getPool();
    const id = randomUUID();
    const return_number = `RET-${Date.now()}`;

    await pool.query(
      `INSERT INTO returns (
        id, order_id, return_number, product_id, quantity, reason,
        condition, refund_amount, refund_method, notes, admin_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        order_id,
        return_number,
        product_id,
        quantity,
        reason,
        condition || 'unopened',
        refund_amount,
        refund_method || 'full',
        notes ?? null,
        admin_id,
      ]
    );

    return NextResponse.json({ success: true, id, return_number });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── PUT /api/returns?id=xxx ── */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { status, approved_by, refund_method } = await request.json();

    if (!status)
      return NextResponse.json({ error: "status is required" }, { status: 400 });

    const pool = await getPool();

    let query = "UPDATE returns SET status = ?, updated_at = NOW()";
    const params: (string | null)[] = [status];

    if (approved_by) {
      query += ", approved_by = ?, approved_at = NOW()";
      params.push(approved_by);
    }

    if (status === 'refunded') {
      query += ", refunded_at = NOW()";
    }

    if (refund_method) {
      query += ", refund_method = ?";
      params.push(refund_method);
    }

    query += " WHERE id = ?";
    params.push(id);

    await pool.query(query, params);

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── DELETE /api/returns?id=xxx ── */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const pool = await getPool();
    await pool.query("DELETE FROM returns WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
