// app/api/prescriptions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface PrescriptionRow extends RowDataPacket {
  id:               string;
  rx_number:        string;
  patient_name:     string;
  patient_phone:    string | null;
  patient_dob:      string | null;
  patient_id_no:    string | null;
  doctor_name:      string;
  doctor_reg_no:    string | null;
  hospital:         string | null;
  items:            string;
  status:           string;
  payment_status:   string;
  total_amount:     number;
  amount_paid:      number;
  insurance_name:   string | null;
  insurance_no:     string | null;
  insurance_amount: number;
  issued_date:      string;
  expiry_date:      string | null;
  dispensed_date:   string | null;
  notes:            string | null;
  admin_id:         string;
  created_at:       string;
}

function parseRx(r: PrescriptionRow) {
  return {
    ...r,
    items: typeof r.items === "string" ? JSON.parse(r.items) : r.items ?? [],
  };
}

/* ── Generate Rx number ── */
async function generateRxNumber(adminId: string): Promise<string> {
  const pool = await getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS cnt FROM prescriptions WHERE admin_id = ?",
    [adminId]
  );
  const count = (rows[0]?.cnt ?? 0) as number;
  const date  = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `RX-${date}-${String(count + 1).padStart(4, "0")}`;
}

/* ── GET /api/prescriptions?admin_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const [rows] = await pool.query<PrescriptionRow[]>(
      `SELECT * FROM prescriptions
       WHERE admin_id = ?
       ORDER BY created_at DESC`,
      [admin_id]
    );

    return NextResponse.json(rows.map(parseRx));
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── POST /api/prescriptions ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const {
      patient_name, patient_phone, patient_dob, patient_id_no,
      doctor_name, doctor_reg_no, hospital, items,
      payment_status, total_amount, amount_paid,
      insurance_name, insurance_no, insurance_amount,
      issued_date, expiry_date, notes, admin_id,
    } = await request.json();

    if (!patient_name)
      return NextResponse.json({ error: "patient_name is required" }, { status: 400 });
    if (!doctor_name)
      return NextResponse.json({ error: "doctor_name is required" }, { status: 400 });
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool      = await getPool();
    const id        = randomUUID();
    const rx_number = await generateRxNumber(admin_id);

    await pool.query<ResultSetHeader>(
      `INSERT INTO prescriptions
         (id, rx_number, patient_name, patient_phone, patient_dob, patient_id_no,
          doctor_name, doctor_reg_no, hospital, items, status, payment_status,
          total_amount, amount_paid, insurance_name, insurance_no, insurance_amount,
          issued_date, expiry_date, notes, admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, rx_number,
        patient_name,
        patient_phone     ?? null,
        patient_dob       ?? null,
        patient_id_no     ?? null,
        doctor_name,
        doctor_reg_no     ?? null,
        hospital          ?? null,
        JSON.stringify(items ?? []),
        payment_status    || "unpaid",
        Number(total_amount)     || 0,
        Number(amount_paid)      || 0,
        insurance_name    ?? null,
        insurance_no      ?? null,
        Number(insurance_amount) || 0,
        issued_date,
        expiry_date       ?? null,
        notes             ?? null,
        admin_id,
      ]
    );

    return NextResponse.json({ success: true, id, rx_number }, { status: 201 });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}