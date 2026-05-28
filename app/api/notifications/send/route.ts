import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const admin_id = body.admin_id;
    const message = body.message;
    const title = body.title ?? null;
    const type = body.type ?? "support";

    if (!admin_id || !message) return NextResponse.json({ error: "admin_id and message required" }, { status: 400 });

    const pool = await getPool();
    await pool.query(
      `INSERT INTO notifications (admin_id, type, title, message, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [admin_id, type, title, message]
    );

    return NextResponse.json({ success: true, message: "Message sent" });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
