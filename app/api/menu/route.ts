import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";

/* ── GET /api/menu?admin_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT * FROM menu_items
       WHERE admin_id = ?
       ORDER BY is_featured DESC, category ASC, name ASC`,
      [admin_id]
    );

    /* Parse tags JSON string → array */
    const items = (rows as Record<string, unknown>[]).map(row => ({
      ...row,
      tags: typeof row.tags === "string" ? JSON.parse(row.tags || "[]") : (row.tags ?? []),
      is_available: Boolean(row.is_available),
      is_featured:  Boolean(row.is_featured),
    }));

    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/* ── POST /api/menu ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { name, description, category, price, cost, calories, prep_time,
            is_available, is_featured, tags, admin_id } = body;

    if (!name || price == null || !admin_id)
      return NextResponse.json({ error: "name, price and admin_id are required" }, { status: 400 });

    const pool = await getPool();
    const id   = randomUUID();

    await pool.query(
      `INSERT INTO menu_items
         (id, name, description, category, price, cost, calories, prep_time,
          is_available, is_featured, tags, admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, description ?? null, category ?? "Other",
        Number(price), cost ?? null, calories ?? null, prep_time ?? null,
        is_available ? 1 : 1,   // default available on creation
        is_featured  ? 1 : 0,
        JSON.stringify(tags ?? []),
        admin_id,
      ]
    );

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}