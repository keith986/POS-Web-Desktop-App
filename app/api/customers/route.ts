import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";

/* ── GET /api/customers?admin_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT * FROM customers WHERE admin_id = ? ORDER BY created_at DESC`,
      [admin_id]
    );
    return NextResponse.json(rows);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── POST /api/customers ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { full_name, email, phone, admin_id } = await request.json();

    if (!full_name || !email)
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const id   = randomUUID();

    await pool.query(
      `INSERT INTO customers (id, full_name, email, phone, admin_id, status, total_orders, total_spent, loyalty_points)
       VALUES (?, ?, ?, ?, ?, 'active', 0, 0.00, 0)`,
      [id, full_name, email, phone ?? null, admin_id]
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}