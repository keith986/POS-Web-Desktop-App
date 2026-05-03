// app/api/suppliers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface SupplierRow extends RowDataPacket {
  id:            string;
  name:          string;
  category:      string;
  contact_name:  string | null;
  email:         string | null;
  phone:         string | null;
  address:       string | null;
  city:          string | null;
  country:       string | null;
  tax_number:    string | null;
  payment_terms: string | null;
  credit_limit:  number;
  balance_due:   number;
  status:        "active" | "inactive" | "blacklisted";
  notes:         string | null;
  admin_id:      string;
  created_at:    string;
}

/* ── GET /api/suppliers?admin_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const [rows] = await pool.query<SupplierRow[]>(
      `SELECT * FROM suppliers
       WHERE admin_id = ?
       ORDER BY name ASC`,
      [admin_id]
    );

    return NextResponse.json(rows);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── POST /api/suppliers ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const {
      name, category, contact_name, email, phone,
      address, city, country, tax_number, payment_terms,
      credit_limit, status, notes, admin_id,
    } = await request.json();

    if (!name)
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const id   = randomUUID();

    await pool.query<ResultSetHeader>(
      `INSERT INTO suppliers
         (id, name, category, contact_name, email, phone,
          address, city, country, tax_number, payment_terms,
          credit_limit, status, notes, admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        category      || "Other",
        contact_name  ?? null,
        email         ?? null,
        phone         ?? null,
        address       ?? null,
        city          ?? null,
        country       ?? null,
        tax_number    ?? null,
        payment_terms ?? null,
        Number(credit_limit) || 0,
        status        || "active",
        notes         ?? null,
        admin_id,
      ]
    );

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}