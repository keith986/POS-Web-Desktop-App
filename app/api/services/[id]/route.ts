// app/api/services/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";
import { RowDataPacket, ResultSetHeader } from "mysql2";

/* ── Types ── */
interface ServiceRow extends RowDataPacket {
  id:          string;
  name:        string;
  category:    string;
  description: string | null;
  duration:    number;
  price:       number;
  deposit:     number;
  is_active:   number;
  staff_ids:   string | null;
  image_url:   string | null;
  admin_id:    string;
  created_at:  string;
  updated_at:  string;
}

function parseService(s: ServiceRow) {
  return {
    ...s,
    is_active: Boolean(s.is_active),
    staff_ids: s.staff_ids
      ? typeof s.staff_ids === "string"
        ? JSON.parse(s.staff_ids)
        : s.staff_ids
      : [],
  };
}

/* ── GET /api/services?admin_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const [rows] = await pool.query<ServiceRow[]>(
      `SELECT * FROM services
       WHERE admin_id = ?
       ORDER BY category ASC, name ASC`,
      [admin_id]
    );

    return NextResponse.json(rows.map(parseService));
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── POST /api/services ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const {
      name, category, description,
      duration, price, deposit,
      is_active, staff_ids, image_url, admin_id,
    } = await request.json();

    if (!name || !admin_id)
      return NextResponse.json({ error: "name and admin_id are required" }, { status: 400 });

    if (!price || isNaN(Number(price)))
      return NextResponse.json({ error: "A valid price is required" }, { status: 400 });

    const pool = await getPool();
    const id   = randomUUID();

    await pool.query<ResultSetHeader>(
      `INSERT INTO services
         (id, name, category, description, duration, price, deposit,
          is_active, staff_ids, image_url, admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        category    || "Other",
        description ?? null,
        Number(duration) || 60,
        Number(price),
        Number(deposit)  || 0,
        is_active !== false ? 1 : 0,
        staff_ids  ? JSON.stringify(staff_ids) : null,
        image_url  ?? null,
        admin_id,
      ]
    );

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}