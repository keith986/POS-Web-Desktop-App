import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";

/* ── POST /api/inventory/[product_id]/adjust ──
   Updates the stock column directly in the products table,
   then logs the movement in stock_movements.
── */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ product_id: string }> }
): Promise<NextResponse> {
  try {
    const { product_id } = await params;
    const { type, quantity, note, admin_id } = await request.json();

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });
    if (!["restock", "adjustment", "return"].includes(type))
      return NextResponse.json({ error: "Invalid adjustment type" }, { status: 400 });
    if (quantity == null || isNaN(Number(quantity)))
      return NextResponse.json({ error: "Valid quantity is required" }, { status: 400 });

    const pool = await getPool();

    /* Verify product belongs to this admin and get current stock */
    const [check] = await pool.query(
      "SELECT id, name, stock FROM products WHERE id = ? AND admin_id = ?",
      [product_id, admin_id]
    ) as [{ id: string; name: string; stock: number }[], unknown];

    const product = (check as { id: string; name: string; stock: number }[])[0];
    if (!product)
      return NextResponse.json({ error: "Product not found or access denied" }, { status: 403 });

    const qty = Number(quantity);
    const currentStock = product.stock;

    /* Calculate new stock */
    const newStock =
      type === "adjustment"
        ? Math.max(0, qty)                      // set exact value
        : Math.max(0, currentStock + qty);      // add to existing

    const delta =
      type === "adjustment"
        ? newStock - currentStock               // how much it actually changed
        : qty;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      /* Update stock directly on products table */
      await conn.query(
        "UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?",
        [newStock, product_id]
      );

      /* Log movement in stock_movements */
      await conn.query(
        `INSERT INTO stock_movements (id, product_id, type, quantity, note, admin_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [randomUUID(), product_id, type, delta, note ?? null, admin_id]
      );

      await conn.commit();
      return NextResponse.json({ success: true, previousStock: currentStock, newStock });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}