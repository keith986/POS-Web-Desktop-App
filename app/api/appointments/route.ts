import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";

/* ── GET /api/appointments?admin_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT * FROM appointments
       WHERE admin_id = ?
       ORDER BY date ASC, start_time ASC`,
      [admin_id]
    );
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/* ── POST /api/appointments ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      client_name, client_phone, client_email,
      service_name, service_id, staff_name, staff_id,
      date, start_time, end_time, duration,
      price, deposit, payment_status,
      status, type, notes, admin_id,
    } = body;

    if (!client_name || !service_name || !date || !start_time || !admin_id)
      return NextResponse.json({ error: "client_name, service_name, date, start_time and admin_id are required" }, { status: 400 });

    const pool = await getPool();
    const id   = randomUUID();

    await pool.query(
      `INSERT INTO appointments
         (id, client_name, client_phone, client_email,
          service_name, service_id, staff_name, staff_id,
          date, start_time, end_time, duration,
          price, deposit, payment_status,
          status, type, notes, admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        client_name,
        client_phone  || null,
        client_email  || null,
        service_name,
        service_id    || null,
        staff_name    || null,
        staff_id      || null,
        date,
        start_time,
        end_time      || null,
        Number(duration)  || 60,
        Number(price)     || 0,
        Number(deposit)   || 0,
        payment_status    || "unpaid",
        status            || "scheduled",
        type              || "booked",
        notes             || null,
        admin_id,
      ]
    );

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}