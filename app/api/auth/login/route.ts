import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import bcrypt from "bcryptjs";
import { RowDataPacket } from "mysql2";

interface UserRow extends RowDataPacket {
  id:               string;
  full_name:        string;
  email:            string;
  password:         string;
  role:             "admin" | "staff" | "client";
  store_name:       string | null;
  domain:           string | null;
  pos_type:         string | null;
  subdomain_status: string | null;
  created_at:       string;
}

interface StaffRow extends RowDataPacket {
  id:         string;
  full_name:  string;
  email:      string;
  password:   string;
  admin_id:   string;
  shift_role: "staff";
  status:     "active" | "inactive";
  created_at: string;
  domain:     string | null;
}

interface SubRow extends RowDataPacket {
  status: string;
  plan:   string;
}

interface TxRow extends RowDataPacket {
  plan: string;
}

async function logLoginNotification(
  pool: Awaited<ReturnType<typeof getPool>>,
  adminId: string,
  loginName: string,
  role: "admin" | "staff",
  email: string,
  request: NextRequest
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          || request.headers.get("x-real-ip")
          || "unknown";

  const title   = role === "admin"
    ? `Admin login: ${loginName}`
    : `Staff login: ${loginName}`;

  const message = `${loginName} (${email}) signed in from IP ${ip}`;

  await pool.query(
    `INSERT INTO notifications (admin_id, type, title, message) VALUES (?, 'login', ?, ?)`,
    [adminId, title, message]
  );
}

/**
 * Returns true when the admin has a valid, paid subscription.
 * Checks the subscriptions table first, then falls back to a completed
 * mpesa_transactions row — matching the same logic used in the admin login path.
 */
async function adminHasActivePlan(
  pool: Awaited<ReturnType<typeof getPool>>,
  adminId: string
): Promise<boolean> {
  // 1. Active subscription row
  const [subRows] = await pool.query<SubRow[]>(
    "SELECT status, plan FROM subscriptions WHERE user_id = ? LIMIT 1",
    [adminId]
  );
  if (subRows.some(s => s.status === "active")) return true;

  // 2. Completed M-Pesa transaction (fallback for admins who paid via M-Pesa
  //    but don't yet have a subscriptions row)
  const [txRows] = await pool.query<TxRow[]>(
    `SELECT plan FROM mpesa_transactions
     WHERE user_id = ? AND status = 'completed'
     ORDER BY created_at DESC LIMIT 1`,
    [adminId]
  );
  return txRows.length > 0;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { email, password } = await request.json();

  if (!email || !password)
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

  try {
    const pool = await getPool();

    const host       = request.headers.get("host") || "";
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "upendoapps.com";
    const mainApp    = process.env.NEXT_PUBLIC_MAIN_APP    || "pos.upendoapps.com";
    const subdomain  = host.replace(`.${baseDomain}`, "");
    const isSubdomain =
      subdomain !== host &&
      subdomain !== "www" &&
      subdomain !== "pos" &&
      host !== mainApp;

    /* ── 1. Check users table ── */
    const [userRows] = await pool.query<UserRow[]>(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (userRows.length > 0) {
      const user = userRows[0];

      if (isSubdomain && user.domain !== subdomain)
        return NextResponse.json(
          { error: "This account does not belong to this store" },
          { status: 403 }
        );

      const match = await bcrypt.compare(password, user.password);
      if (!match)
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });

      // Super admin bypass
      if (user.email === "admin@postore.app" && user.role === "admin") {
        const { password: _, ...safeUser } = user;
        return NextResponse.json({
          success: true,
          user: { ...safeUser, payment_status: "active", is_super_admin: true },
        });
      }

      if (user.subdomain_status === "inactive") {
        return NextResponse.json(
          { error: "Your account has been deactivated. Please contact support." },
          { status: 403 }
        );
      }

      // Check subscription for admin
      if (user.role === "admin") {
        const [subRows] = await pool.query<SubRow[]>(
          "SELECT status, plan FROM subscriptions WHERE user_id = ? LIMIT 1",
          [user.id]
        );
        const activeSub = subRows.find(s => s.status === "active");

        if (activeSub) {
          const { password: _, ...safeUser } = user;
          await logLoginNotification(pool, user.id, user.full_name, "admin", user.email, request);
          return NextResponse.json({
            success: true,
            user: { ...safeUser, plan: activeSub.plan, payment_status: "active" },
          });
        }

        // Fall back to completed M-Pesa transaction
        const [txRows] = await pool.query<TxRow[]>(
          `SELECT plan FROM mpesa_transactions
           WHERE user_id = ? AND status = 'completed'
           ORDER BY created_at DESC LIMIT 1`,
          [user.id]
        );

        if (txRows.length > 0) {
          const { password: _, ...safeUser } = user;
          await logLoginNotification(pool, user.id, user.full_name, "admin", user.email, request);
          return NextResponse.json({
            success: true,
            user: { ...safeUser, plan: txRows[0].plan, payment_status: "active" },
          });
        }

        // No valid payment — block
        const { password: _, ...safeUser } = user;
        await logLoginNotification(pool, user.id, user.full_name, "admin", user.email, request);
        return NextResponse.json(
          { user: { ...safeUser, payment_status: "unpaid", plan: null } },
          { status: 402 }
        );
      }

      const { password: _, ...safeUser } = user;
      await logLoginNotification(pool, user.id, user.full_name, "admin", user.email, request);
      return NextResponse.json({ success: true, user: safeUser });
    }

    /* ── 2. Check staff table ── */
    const [staffRows] = await pool.query<StaffRow[]>(
      `SELECT s.*, u.domain
       FROM staff s
       JOIN users u ON s.admin_id = u.id
       WHERE s.email = ? LIMIT 1`,
      [email]
    );

    if (staffRows.length > 0) {
      const staff = staffRows[0];

      if (isSubdomain && staff.domain !== subdomain)
        return NextResponse.json(
          { error: "This account does not belong to this store" },
          { status: 403 }
        );

      if (staff.status === "inactive")
        return NextResponse.json(
          { error: "Your account is inactive. Contact your administrator." },
          { status: 403 }
        );

      // Check admin's subscription — mirrors the admin payment logic:
      // subscriptions table first, then mpesa_transactions fallback.
      const adminPaid = await adminHasActivePlan(pool, staff.admin_id);
      if (!adminPaid)
        return NextResponse.json(
          { error: "Your store subscription has expired. Contact your administrator." },
          { status: 402 }
        );

      const match = await bcrypt.compare(password, staff.password);
      if (!match)
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });

      await pool.query("UPDATE staff SET last_login = NOW() WHERE id = ?", [staff.id]);

      const { password: _, ...safeStaff } = staff;
      await logLoginNotification(pool, staff.admin_id, staff.full_name, "staff", staff.email, request);
      return NextResponse.json({
        success: true,
        user: { ...safeStaff, role: "staff", store_name: null },
      });
    }

    return NextResponse.json(
      { error: "No account found with that email" },
      { status: 404 }
    );

  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}