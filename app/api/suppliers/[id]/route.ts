// app/api/suppliers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
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

interface IdRow extends RowDataPacket {
  id: string;
}

/* ── GET /api/suppliers/[id] ── */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const pool   = await getPool();

    const [rows] = await pool.query<SupplierRow[]>(
      "SELECT * FROM suppliers WHERE id = ?",
      [id]
    );

    if (rows.length === 0)
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    return NextResponse.json(rows[0]);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── PUT /api/suppliers/[id] ── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
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

    const [check] = await pool.query<IdRow[]>(
      "SELECT id FROM suppliers WHERE id = ? AND admin_id = ?",
      [id, admin_id]
    );

    if (check.length === 0)
      return NextResponse.json({ error: "Supplier not found or access denied" }, { status: 403 });

    await pool.query<ResultSetHeader>(
      `UPDATE suppliers SET
         name          = ?,
         category      = ?,
         contact_name  = ?,
         email         = ?,
         phone         = ?,
         address       = ?,
         city          = ?,
         country       = ?,
         tax_number    = ?,
         payment_terms = ?,
         credit_limit  = ?,
         status        = ?,
         notes         = ?
       WHERE id = ? AND admin_id = ?`,
      [
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

/* ── DELETE /api/suppliers/[id]?admin_id=xxx ── */
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
      "SELECT id FROM suppliers WHERE id = ? AND admin_id = ?",
      [id, admin_id]
    );

    if (check.length === 0)
      return NextResponse.json({ error: "Supplier not found or access denied" }, { status: 403 });

    await pool.query<ResultSetHeader>(
      "DELETE FROM suppliers WHERE id = ?",
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}