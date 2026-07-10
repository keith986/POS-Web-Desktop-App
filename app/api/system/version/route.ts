import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { RowDataPacket } from "mysql2";
import fs from "fs";
import path from "path";

/* ── Row types matching your exact schema ── */
interface UpdateStateRow extends RowDataPacket {
  is_critical: number;
  message: string | null;
  target_version: string | null;
}
interface AuthUserRow extends RowDataPacket {
  id: string;
  email: string;
  is_super_admin: number | boolean | null;
}

/* ══════════════════════════════════════════════════════════
   VERSION RESOLUTION
   Reads Next.js's own build id, which changes on every `next build`.
   Cached after the first read — picking up a new value requires a process
   restart, and every deploy on this VPS restarts the process anyway, so
   re-reading the file on every poll would be pure overhead.
══════════════════════════════════════════════════════════ */
let cachedVersion: string | null = null;

function getBuildVersion(): string {
  if (cachedVersion) return cachedVersion;
  try {
    const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");
    cachedVersion = fs.readFileSync(buildIdPath, "utf8").trim();
  } catch {
    // Local dev / no production build yet — fall back to a stable placeholder
    // so the client never sees a spurious "update available" banner.
    cachedVersion = "dev";
  }
  return cachedVersion;
}

/* ── Auth helper ──
   Update checks aren't super-admin gated like the rest of the console API —
   any logged-in admin or staff member should see the banner and be able to
   dismiss it. Only "set_critical" below is restricted to super admins. ── */
async function verifyUser(
  pool: Awaited<ReturnType<typeof getPool>>,
  token: string | null
): Promise<{ id: string; isSuperAdmin: boolean } | null> {
  if (!token) return null;

  const [userRows] = await pool.query<AuthUserRow[]>(
    "SELECT id, email, is_super_admin FROM users WHERE id = ? LIMIT 1", [token]
  );
  if (userRows.length > 0) {
    const row = userRows[0];
    const isSuperAdmin = row.email === "admin@postore.app" || !!row.is_super_admin;
    return { id: row.id, isSuperAdmin };
  }

  const [staffRows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM staff WHERE id = ? LIMIT 1", [token]
  );
  if (staffRows.length > 0) {
    return { id: staffRows[0].id as string, isSuperAdmin: false };
  }

  return null;
}

/* ══════════════════════════════════════════════════════════
   GET — current build version, whether it's flagged critical, and
   whether *this* user has already dismissed it.
══════════════════════════════════════════════════════════ */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;

  try {
    const pool = await getPool();
    const requester = await verifyUser(pool, token);
    if (!requester) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const version = getBuildVersion();

    const [[state]] = await pool.query<UpdateStateRow[]>(
      "SELECT is_critical, message, target_version FROM app_update_state WHERE id = 1"
    );

    // The critical flag/message stays pinned to the version it was set for.
    // Deploying anything newer silently retires it, so a forgotten flag
    // can't force-reload every session on every future deploy.
    const isCritical = !!state?.is_critical && state.target_version === version;
    const message = isCritical ? state?.message ?? null : null;

    const [dismissRows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM app_update_dismissals WHERE user_id = ? AND version = ? LIMIT 1",
      [requester.id, version]
    );

    return NextResponse.json({
      version,
      isCritical,
      message,
      dismissed: dismissRows.length > 0,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/* ══════════════════════════════════════════════════════════
   POST
     { action: "dismiss" }                                  — any logged-in user
     { action: "set_critical", isCritical, message }         — super admin only
══════════════════════════════════════════════════════════ */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;

  try {
    const pool = await getPool();
    const requester = await verifyUser(pool, token);
    if (!requester) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action === "dismiss") {
      const version = getBuildVersion();
      await pool.query(
        `INSERT INTO app_update_dismissals (user_id, version)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE dismissed_at = NOW()`,
        [requester.id, version]
      );
      return NextResponse.json({ success: true });
    }

    if (action === "set_critical") {
      if (!requester.isSuperAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const isCritical = !!body?.isCritical;
      const message = typeof body?.message === "string" ? (body.message.trim() || null) : null;
      const version = getBuildVersion();

      await pool.query(
        `UPDATE app_update_state
         SET is_critical = ?, message = ?, target_version = ?, updated_at = NOW()
         WHERE id = 1`,
        [isCritical ? 1 : 0, message, isCritical ? version : null]
      );

      return NextResponse.json({ success: true, version, isCritical, message });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
