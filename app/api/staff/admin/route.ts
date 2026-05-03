// app/api/staff/admin/route.ts
// Returns the admin's store info for a given staff member
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { RowDataPacket } from "mysql2";

interface AdminStoreRow extends RowDataPacket {
  id:         string;
  full_name:  string;
  store_name: string | null;
  domain:     string | null;
  pos_type:   "retail" | "restaurant" | "salon" | "wholesale" | "pharmacy" | null;
}

/*
  GET /api/staff/admin?staff_id=xxx

  Joins staff → users in one query using the staff's admin_id.
  Returns the admin's public store details — no password, no email.
*/
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const staff_id = request.nextUrl.searchParams.get("staff_id");
    if (!staff_id)
      return NextResponse.json(
        { error: "staff_id is required" },
        { status: 400 }
      );

    const pool = await getPool();

    const [rows] = await pool.query<AdminStoreRow[]>(
      `SELECT
         u.id,
         u.full_name,
         u.store_name,
         u.domain,
         u.pos_type
       FROM staff s
       INNER JOIN users u ON u.id = s.admin_id
       WHERE s.id = ?
       LIMIT 1`,
      [staff_id]
    );

    if (rows.length === 0)
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );

    return NextResponse.json(rows[0]);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}