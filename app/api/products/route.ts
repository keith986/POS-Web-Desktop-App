import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";

/* ── GET /api/products?admin_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const [rows] = await pool.query(
      "SELECT * FROM products WHERE admin_id = ? ORDER BY created_at DESC",
      [admin_id]
    );
    return NextResponse.json(rows);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── POST /api/products ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { name, category, price, stock, sku, description, admin_id } = await request.json();

    if (!name || !category || price == null || stock == null)
      return NextResponse.json({ error: "Name, category, price and stock are required" }, { status: 400 });
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const id   = randomUUID();

    await pool.query(
      `INSERT INTO products (id, name, category, price, stock, sku, description, admin_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [id, name, category, price, stock, sku ?? null, description ?? null, admin_id]
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}