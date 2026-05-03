import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── PUT /api/menu/[id] ── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body   = await request.json();
    const { admin_id, ...fields } = body;

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool     = await getPool();
    const setClauses: string[]  = [];
    const values:    unknown[]  = [];

    const allowed = ["name","description","category","price","cost","calories","prep_time","is_available","is_featured","tags"];
    for (const key of allowed) {
      if (key in fields) {
        if (key === "tags") {
          setClauses.push("tags = ?");
          values.push(JSON.stringify(Array.isArray(fields[key]) ? fields[key] : []));
        } else if (key === "is_available" || key === "is_featured") {
          setClauses.push(`${key} = ?`);
          values.push(fields[key] ? 1 : 0);
        } else {
          setClauses.push(`${key} = ?`);
          values.push(fields[key] ?? null);
        }
      }
    }

    if (setClauses.length === 0)
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    setClauses.push("updated_at = NOW()");
    values.push(id, admin_id);

    await pool.query(
      `UPDATE menu_items SET ${setClauses.join(", ")} WHERE id = ? AND admin_id = ?`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/* ── DELETE /api/menu/[id]?admin_id=xxx ── */
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
    await pool.query(
      "DELETE FROM menu_items WHERE id = ? AND admin_id = ?",
      [id, admin_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}