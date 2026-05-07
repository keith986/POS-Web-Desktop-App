import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";

/* ── GET /api/barcodes?admin_id=xxx&barcode=xxxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    const barcode = request.nextUrl.searchParams.get("barcode");

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    let query = "SELECT b.*, p.name, p.price, p.stock FROM barcodes b JOIN products p ON b.product_id = p.id WHERE b.admin_id = ?";
    const params: string[] = [admin_id];

    if (barcode) {
      query += " AND b.barcode = ?";
      params.push(barcode);
    }

    query += " ORDER BY b.created_at DESC";

    const [rows] = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── POST /api/barcodes ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { product_id, barcode, barcode_type, is_primary, admin_id } = await request.json();

    if (!product_id || !barcode || !admin_id)
      return NextResponse.json({ error: "product_id, barcode, and admin_id are required" }, { status: 400 });

    const pool = await getPool();
    const id = randomUUID();

    // If marking as primary, unmark other barcodes for this product
    if (is_primary) {
      await pool.query(
        "UPDATE barcodes SET is_primary = 0 WHERE product_id = ? AND admin_id = ?",
        [product_id, admin_id]
      );
    }

    await pool.query(
      `INSERT INTO barcodes (id, product_id, barcode, barcode_type, is_primary, admin_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, product_id, barcode, barcode_type || 'ean13', is_primary ? 1 : 0, admin_id]
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── DELETE /api/barcodes?id=xxx ── */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const pool = await getPool();
    await pool.query("DELETE FROM barcodes WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
