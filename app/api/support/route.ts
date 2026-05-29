import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { RowDataPacket } from "mysql2";

interface SupportRow extends RowDataPacket {
  id: string;
  admin_id: string;
  sender: "admin" | "super_admin" | "staff";
  title: string;
  message: string;
  created_at: string;
}

interface SupportConversationRow extends RowDataPacket {
  admin_id: string;
  full_name: string | null;
  email: string | null;
  last_message: string;
  last_sender: "admin" | "super_admin";
  last_at: string;
  message_count: number;
}

async function verifyAdmin(pool: Awaited<ReturnType<typeof getPool>>, token: string | null): Promise<boolean> {
  if (!token) return false;
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, email FROM users WHERE id = ? LIMIT 1",
    [token]
  );
  return rows.length > 0 && (rows[0] as { email: string }).email === "admin@postore.app";
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const pool = await getPool();
  const adminId = request.nextUrl.searchParams.get("admin_id");
  const superAdmin = request.nextUrl.searchParams.get("super_admin");

  if (superAdmin === "1") {
    const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!await verifyAdmin(pool, token)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ensure support_reads exists to track per-thread read timestamps
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS support_reads (
          admin_id CHAR(36) NOT NULL PRIMARY KEY,
          last_read_super DATETIME NULL,
          last_read_admin DATETIME NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } catch (e) { /* ignore creation errors */ }

    try {
      const [rows] = await pool.query<any[]>(
        `SELECT
           counts.admin_id,
           COALESCE(u.full_name, s.full_name) AS full_name,
           COALESCE(u.email, '') AS email,
           m.message AS last_message,
           m.sender AS last_sender,
           m.created_at AS last_at,
           counts.message_count,
           COALESCE(unread.unread_count, 0) AS unread_count,
           CASE WHEN u.id IS NOT NULL THEN 'admin' WHEN s.id IS NOT NULL THEN 'staff' ELSE 'unknown' END AS role
         FROM (
           SELECT admin_id, MAX(created_at) AS last_at, COUNT(*) AS message_count
           FROM support_messages
           GROUP BY admin_id
         ) AS counts
         JOIN support_messages m ON m.admin_id = counts.admin_id AND m.created_at = counts.last_at
         LEFT JOIN users u ON u.id = counts.admin_id
         LEFT JOIN staff s ON s.id = counts.admin_id
         LEFT JOIN (
           SELECT sm.admin_id, COUNT(*) AS unread_count
           FROM support_messages sm
           LEFT JOIN support_reads sr ON sr.admin_id = sm.admin_id
           WHERE sm.sender = 'admin' AND (sr.last_read_super IS NULL OR sm.created_at > sr.last_read_super)
           GROUP BY sm.admin_id
         ) unread ON unread.admin_id = counts.admin_id
         ORDER BY counts.last_at DESC`,
        []
      );

      return NextResponse.json(rows.map(row => ({
        admin_id: row.admin_id,
        full_name: row.full_name || "Unknown",
        email: row.email || "",
        last_message: row.last_message,
        last_sender: row.last_sender,
        last_at: row.last_at,
        message_count: Number(row.message_count),
        unread_count: Number(row.unread_count || 0),
        role: row.role || 'unknown',
        time: timeAgo(row.last_at),
      })));
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  }

  if (!adminId) {
    return NextResponse.json({ error: "admin_id required" }, { status: 400 });
  }

  try {
    const [rows] = await pool.query<SupportRow[]>(
      `SELECT id, admin_id, sender, title, message, created_at
       FROM support_messages
       WHERE admin_id = ?
       ORDER BY created_at ASC`,
      [adminId]
    );

    // get last read timestamps for this admin
    let lastReadAdmin = null;
    try {
      const [srRows] = await pool.query<any[]>("SELECT last_read_admin FROM support_reads WHERE admin_id = ? LIMIT 1", [adminId]);
      lastReadAdmin = srRows.length ? srRows[0].last_read_admin : null;
    } catch { lastReadAdmin = null; }

    const msgs = rows.map(row => ({
      id: row.id,
      sender: row.sender,
      message: row.message,
      title: row.title,
      time: timeAgo(row.created_at),
      created_at: row.created_at,
      is_new: row.sender === 'super_admin' && (!lastReadAdmin || new Date(row.created_at) > new Date(lastReadAdmin)),
    }));

    // mark messages as read depending on who requested them
    try {
      const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
      if (await verifyAdmin(pool, token)) {
        await pool.query(`INSERT INTO support_reads (admin_id, last_read_super) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE last_read_super = NOW()`, [adminId]);
      } else {
        await pool.query(`INSERT INTO support_reads (admin_id, last_read_admin) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE last_read_admin = NOW()`, [adminId]);
      }
    } catch (e) { /* ignore */ }

    return NextResponse.json(msgs);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const pool = await getPool();
  const body = await request.json();
  const adminId = body?.admin_id;
  const sender = body?.sender;
  const message = body?.message;
  const title = body?.title || "Support";

  if (!adminId || !message || !sender) {
    return NextResponse.json({ error: "admin_id, sender and message are required" }, { status: 400 });
  }

  if (!["admin", "super_admin", "staff"].includes(sender)) {
    return NextResponse.json({ error: "Invalid sender" }, { status: 400 });
  }

  if (sender === "super_admin") {
    const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    if (!await verifyAdmin(pool, token)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const [result] = await pool.query<any>(
      `INSERT INTO support_messages (admin_id, sender, title, message) VALUES (?, ?, ?, ?)`,
      [adminId, sender, title, message]
    );

    return NextResponse.json({ success: true, id: result.insertId || null });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
