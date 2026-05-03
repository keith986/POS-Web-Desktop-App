import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { RowDataPacket } from "mysql2";

interface NotifRow extends RowDataPacket {
  id:         string;
  admin_id:   string;
  type:       "order" | "login" | "stock" | "refund";
  title:      string;
  message:    string;
  created_at: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminId = request.nextUrl.searchParams.get("admin_id");
  if (!adminId)
    return NextResponse.json({ error: "admin_id required" }, { status: 400 });

  try {
    const pool = await getPool();
    const [rows] = await pool.query<NotifRow[]>(
      `SELECT id, type, title, message, created_at
       FROM notifications
       WHERE admin_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [adminId]
    );

    const notifications = rows.map(n => ({
      id:      n.id,
      type:    n.type,
      title:   n.title,
      message: n.message,
      time:    timeAgo(n.created_at),
      read:    false, // read state is managed client-side via localStorage
    }));

    return NextResponse.json(notifications);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}