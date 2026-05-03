import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── GET /api/orders/[id] ── */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id }   = await params;
    const admin_id = request.nextUrl.searchParams.get("admin_id");

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    const [rows] = await pool.query(
      "SELECT * FROM orders WHERE id = ? AND admin_id = ?",
      [id, admin_id]
    ) as [Record<string, unknown>[], unknown];

    if ((rows as unknown[]).length === 0)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const order = rows[0] as Record<string, unknown>;
    return NextResponse.json({
      ...order,
      items: typeof order.items === "string" ? JSON.parse(order.items) : order.items ?? [],
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}