// app/api/price-tiers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
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

interface IdRow extends RowDataPacket {
  id: string;
}

function parseTier(t: PriceTierRow) {
  return {
    ...t,
    is_active:    Boolean(t.is_active),
    category_ids: t.category_ids ? JSON.parse(t.category_ids) : [],
    product_ids:  t.product_ids  ? JSON.parse(t.product_ids)  : [],
  };
}

/* ── GET /api/price-tiers/[id] ── */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const pool   = await getPool();

    const [rows] = await pool.query<PriceTierRow[]>(
      "SELECT * FROM price_tiers WHERE id = ?",
      [id]
    );

    if (rows.length === 0)
      return NextResponse.json({ error: "Price tier not found" }, { status: 404 });

    return NextResponse.json(parseTier(rows[0]));
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── PUT /api/price-tiers/[id] ── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
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

    const pool = await getPool();

    const [check] = await pool.query<IdRow[]>(
      "SELECT id FROM price_tiers WHERE id = ? AND admin_id = ?",
      [id, admin_id]
    );

    if (check.length === 0)
      return NextResponse.json({ error: "Price tier not found or access denied" }, { status: 403 });

    await pool.query<ResultSetHeader>(
      `UPDATE price_tiers SET
         name             = ?,
         description      = ?,
         discount_type    = ?,
         discount_value   = ?,
         min_order_qty    = ?,
         min_order_amount = ?,
         customer_group   = ?,
         is_active        = ?,
         priority         = ?,
         applies_to       = ?,
         category_ids     = ?,
         product_ids      = ?,
         valid_from       = ?,
         valid_until      = ?
       WHERE id = ? AND admin_id = ?`,
      [
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
        id,
        admin_id,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── DELETE /api/price-tiers/[id]?admin_id=xxx ── */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id }   = await params;
    const admin_id = request.nextUrl.searchParams.get("admin_id");

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    const [check] = await pool.query<IdRow[]>(
      "SELECT id FROM price_tiers WHERE id = ? AND admin_id = ?",
      [id, admin_id]
    );

    if (check.length === 0)
      return NextResponse.json({ error: "Price tier not found or access denied" }, { status: 403 });

    await pool.query<ResultSetHeader>(
      "DELETE FROM price_tiers WHERE id = ?",
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}