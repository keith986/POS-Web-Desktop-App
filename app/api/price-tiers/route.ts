// app/api/price-tiers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface PriceTierRow extends RowDataPacket {
  id:               string;
  name:             string;
  description:      string | null;
  discount_type:    "percentage" | "fixed";
  discount_value:   number;
  min_order_qty:    number;
  min_order_amount: number;
  customer_group:   string;
  is_active:        number;
  priority:         number;
  applies_to:       "all" | "category" | "product";
  category_ids:     string | null;
  product_ids:      string | null;
  valid_from:       string | null;
  valid_until:      string | null;
  admin_id:         string;
  created_at:       string;
}

function parseTier(t: PriceTierRow) {
  return {
    ...t,
    is_active:    Boolean(t.is_active),
    category_ids: t.category_ids ? JSON.parse(t.category_ids) : [],
    product_ids:  t.product_ids  ? JSON.parse(t.product_ids)  : [],
  };
}

/* ── GET /api/price-tiers?admin_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const [rows] = await pool.query<PriceTierRow[]>(
      `SELECT * FROM price_tiers
       WHERE admin_id = ?
       ORDER BY priority ASC, name ASC`,
      [admin_id]
    );

    return NextResponse.json(rows.map(parseTier));
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── POST /api/price-tiers ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const {
      name, description, discount_type, discount_value,
      min_order_qty, min_order_amount, customer_group,
      is_active, priority, applies_to, category_ids,
      product_ids, valid_from, valid_until, admin_id,
    } = await request.json();

    if (!name)
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });
    if (discount_value === undefined || isNaN(Number(discount_value)))
      return NextResponse.json({ error: "A valid discount_value is required" }, { status: 400 });

    const pool = await getPool();
    const id   = randomUUID();

    await pool.query<ResultSetHeader>(
      `INSERT INTO price_tiers
         (id, name, description, discount_type, discount_value,
          min_order_qty, min_order_amount, customer_group, is_active,
          priority, applies_to, category_ids, product_ids,
          valid_from, valid_until, admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        description      ?? null,
        discount_type    || "percentage",
        Number(discount_value),
        Number(min_order_qty)    || 0,
        Number(min_order_amount) || 0,
        customer_group   || "All Customers",
        is_active !== false ? 1 : 0,
        Number(priority) || 1,
        applies_to       || "all",
        category_ids?.length ? JSON.stringify(category_ids) : null,
        product_ids?.length  ? JSON.stringify(product_ids)  : null,
        valid_from       || null,
        valid_until      || null,
        admin_id,
      ]
    );

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}