import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

/* ── GET /api/staff?admin_id=xxx — fetch staff belonging to this admin ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");

    if (!admin_id) {
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });
    }

    const pool = await getPool();

    const [rows] = await pool.query(
       "SELECT * FROM staff WHERE admin_id = ?", [admin_id]
    );

    return NextResponse.json(rows);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── POST /api/staff — add new staff member under this admin ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { full_name, email, password, admin_id } = await request.json();

    if (!full_name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
    }
    if (!admin_id) {
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });
    }

    const pool   = await getPool();
    const hashed = await bcrypt.hash(password, 10);
    const id     = randomUUID();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      /* Insert into users table
      await conn.query(
        `INSERT INTO users (id, full_name, email, password, role)
         VALUES (?, ?, ?, ?, 'staff')`,
        [id, full_name, email, hashed]
      ); 
      */

      // Insert into staff table — link to admin
      await conn.query(
        `INSERT INTO staff (id, full_name, email, password, admin_id, shift_role, status)
         VALUES (?, ?, ?, ?, ?, 'staff', 'active')`,
        [id, full_name, email, hashed, admin_id]
      );

      await conn.commit();
      return NextResponse.json({ success: true, id });
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