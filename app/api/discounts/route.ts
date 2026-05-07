import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";

/* ── GET /api/discounts?admin_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const [rows] = await pool.query(
      "SELECT * FROM discounts WHERE admin_id = ? ORDER BY created_at DESC",
      [admin_id]
    );
    return NextResponse.json(rows);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── POST /api/discounts ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const {
      name,
      description,
      discount_type,
      discount_value,
      max_discount,
      min_order_qty,
      min_order_amount,
      applies_to,
      category_ids,
      product_ids,
      code,
      usage_limit,
      valid_from,
      valid_until,
      is_active,
      admin_id,
    } = await request.json();

    if (!name || discount_value == null || !admin_id)
      return NextResponse.json({ error: "name, discount_value, and admin_id are required" }, { status: 400 });

    const pool = await getPool();
    const id = randomUUID();

    await pool.query(
      `INSERT INTO discounts (
        id, name, description, discount_type, discount_value, max_discount,
        min_order_qty, min_order_amount, applies_to, category_ids, product_ids,
        code, usage_limit, valid_from, valid_until, is_active, admin_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        description ?? null,
        discount_type || 'percentage',
        discount_value,
        max_discount ?? null,
        min_order_qty || 1,
        min_order_amount || 0,
        applies_to || 'all',
        category_ids ? JSON.stringify(category_ids) : null,
        product_ids ? JSON.stringify(product_ids) : null,
        code ?? null,
        usage_limit ?? null,
        valid_from ?? null,
        valid_until ?? null,
        is_active ? 1 : 0,
        admin_id,
      ]
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── PUT /api/discounts?id=xxx ── */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const updates = await request.json();
    const pool = await getPool();

    const setClause = Object.keys(updates)
      .filter((key) => key !== "id")
      .map((key) => `${key} = ?`)
      .join(", ");

    const values = Object.values(updates).map((v) => {
      if (typeof v === 'object' && v !== null) return JSON.stringify(v);
      return v;
    });

    values.push(id);

    await pool.query(`UPDATE discounts SET ${setClause}, updated_at = NOW() WHERE id = ?`, values);

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── DELETE /api/discounts?id=xxx ── */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const pool = await getPool();
    await pool.query("DELETE FROM discounts WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
