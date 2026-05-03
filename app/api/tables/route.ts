import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";

/* ── GET /api/tables?admin_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT * FROM tables
       WHERE admin_id = ?
       ORDER BY section ASC, table_number ASC`,
      [admin_id]
    );
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/* ── POST /api/tables ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { label, capacity, section, admin_id } = await request.json();

    if (!label || !capacity || !admin_id)
      return NextResponse.json({ error: "label, capacity and admin_id are required" }, { status: 400 });

    const pool = await getPool();

    /* Auto-increment table_number per admin */
    const [countRows] = await pool.query(
      "SELECT COALESCE(MAX(table_number), 0) + 1 AS next_num FROM tables WHERE admin_id = ?",
      [admin_id]
    );
    const table_number = (countRows as { next_num: number }[])[0]?.next_num ?? 1;

    const id = randomUUID();
    await pool.query(
      `INSERT INTO tables (id, table_number, label, capacity, section, status, admin_id)
       VALUES (?, ?, ?, ?, ?, 'available', ?)`,
      [id, table_number, label, Number(capacity), section || "Main", admin_id]
    );

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}