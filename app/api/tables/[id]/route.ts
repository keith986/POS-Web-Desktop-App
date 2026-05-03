import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── PUT /api/tables/[id] — update label, capacity, section OR status ── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id }                              = await params;
    const { label, capacity, section, status, admin_id } = await request.json();

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    /* Build dynamic SET clause */
    const fields: string[]  = [];
    const values: unknown[] = [];

    if (label    !== undefined) { fields.push("label = ?");    values.push(label);             }
    if (capacity !== undefined) { fields.push("capacity = ?"); values.push(Number(capacity));  }
    if (section  !== undefined) { fields.push("section = ?");  values.push(section);           }
    if (status   !== undefined) { fields.push("status = ?");   values.push(status);            }

    if (fields.length === 0)
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    fields.push("updated_at = NOW()");
    values.push(id, admin_id);

    await pool.query(
      `UPDATE tables SET ${fields.join(", ")} WHERE id = ? AND admin_id = ?`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/* ── DELETE /api/tables/[id]?admin_id=xxx ── */
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

    /* Prevent deleting occupied tables */
    const [rows] = await pool.query(
      "SELECT status FROM tables WHERE id = ? AND admin_id = ?",
      [id, admin_id]
    );
    const table = (rows as { status: string }[])[0];
    if (!table)
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    if (table.status === "occupied")
      return NextResponse.json({ error: "Cannot delete an occupied table" }, { status: 409 });

    await pool.query("DELETE FROM tables WHERE id = ? AND admin_id = ?", [id, admin_id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}