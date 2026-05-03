import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { RowDataPacket } from "mysql2";

interface Row extends RowDataPacket { id: string }

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { email, domain } = await request.json();
  
  try {
    const pool = await getPool();

    const [emailRows] = await pool.query<Row[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1", [email]
    );
    if (emailRows.length > 0)
      return NextResponse.json({ error: "Email already registered." });

    const [domainRows] = await pool.query<Row[]>(
      "SELECT id FROM users WHERE domain = ? LIMIT 1", [domain]
    );
    if (domainRows.length > 0)
      return NextResponse.json({ error: "Domain already taken. Choose another." });

    return NextResponse.json({ available: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}