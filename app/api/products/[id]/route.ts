import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── PUT /api/products/[id] — update product ── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { name, category, price, stock, sku, description, admin_id } = await request.json();

    if (!name || !category || price == null || stock == null)
      return NextResponse.json({ error: "Name, category, price and stock are required" }, { status: 400 });
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    const [check] = await pool.query(
      "SELECT id FROM products WHERE id = ? AND admin_id = ?",
      [id, admin_id]
    ) as [{ id: string }[], unknown];

    if ((check as { id: string }[]).length === 0)
      return NextResponse.json({ error: "Product not found or access denied" }, { status: 403 });

    await pool.query(
      `UPDATE products SET name = ?, category = ?, price = ?, stock = ?, sku = ?, description = ?
       WHERE id = ?`,
      [name, category, price, stock, sku ?? null, description ?? null, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── DELETE /api/products/[id]?admin_id=xxx ── */
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

    const [check] = await pool.query(
      "SELECT id FROM products WHERE id = ? AND admin_id = ?",
      [id, admin_id]
    ) as [{ id: string }[], unknown];

    if ((check as { id: string }[]).length === 0)
      return NextResponse.json({ error: "Product not found or access denied" }, { status: 403 });

    await pool.query("DELETE FROM products WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}