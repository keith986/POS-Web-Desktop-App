// app/api/prescriptions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
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

interface IdRow extends RowDataPacket { id: string; }

function parseRx(r: PrescriptionRow) {
  return { ...r, items: typeof r.items === "string" ? JSON.parse(r.items) : r.items ?? [] };
}

/* ── GET /api/prescriptions/[id] ── */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const pool   = await getPool();
    const [rows] = await pool.query<PrescriptionRow[]>(
      "SELECT * FROM prescriptions WHERE id = ?", [id]
    );
    if (rows.length === 0)
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    return NextResponse.json(parseRx(rows[0]));
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── PUT /api/prescriptions/[id] ── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const {
      patient_name, patient_phone, patient_dob, patient_id_no,
      doctor_name, doctor_reg_no, hospital, items,
      payment_status, total_amount, amount_paid,
      insurance_name, insurance_no, insurance_amount,
      issued_date, expiry_date, notes, admin_id,
    } = await request.json();

    if (!patient_name)
      return NextResponse.json({ error: "patient_name is required" }, { status: 400 });
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const [check] = await pool.query<IdRow[]>(
      "SELECT id FROM prescriptions WHERE id = ? AND admin_id = ?", [id, admin_id]
    );
    if (check.length === 0)
      return NextResponse.json({ error: "Prescription not found or access denied" }, { status: 403 });

    await pool.query<ResultSetHeader>(
      `UPDATE prescriptions SET
         patient_name     = ?, patient_phone    = ?, patient_dob      = ?,
         patient_id_no    = ?, doctor_name      = ?, doctor_reg_no    = ?,
         hospital         = ?, items            = ?, payment_status   = ?,
         total_amount     = ?, amount_paid      = ?, insurance_name   = ?,
         insurance_no     = ?, insurance_amount = ?, issued_date      = ?,
         expiry_date      = ?, notes            = ?
       WHERE id = ? AND admin_id = ?`,
      [
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
        id, admin_id,
      ]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── DELETE /api/prescriptions/[id]?admin_id=xxx ── */
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
      "SELECT id FROM prescriptions WHERE id = ? AND admin_id = ?", [id, admin_id]
    );
    if (check.length === 0)
      return NextResponse.json({ error: "Prescription not found or access denied" }, { status: 403 });

    await pool.query<ResultSetHeader>("DELETE FROM prescriptions WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}