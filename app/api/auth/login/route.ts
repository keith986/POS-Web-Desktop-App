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
  is_super_admin:   boolean;
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
  status:           string;
  plan:             string;
  next_billing_date: string;
}

interface TxRow extends RowDataPacket {
  plan:       string;
  created_at: string;
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
 * Returns true when the admin has a valid, paid, non-expired subscription.
 *
 * Priority:
 *  1. subscriptions row with status='active' AND next_billing_date in the future
 *  2. subscriptions row expired BUT latest completed mpesa_transactions is within 30 days
 *     → auto-heals the subscriptions row so future checks pass without this fallback
 *  3. No subscriptions row but completed mpesa tx within 30 days
 *     → same auto-heal
 */
async function adminHasActivePlan(
  pool: Awaited<ReturnType<typeof getPool>>,
  adminId: string
): Promise<boolean> {
  const now = new Date();

  // 1. Check subscriptions table
  const [subRows] = await pool.query<SubRow[]>(
    "SELECT status, plan, next_billing_date FROM subscriptions WHERE user_id = ? LIMIT 1",
    [adminId]
  );
  const sub = subRows[0] ?? null;

  if (sub) {
    const isLifetime = String(sub.plan).toLowerCase() === "lifetime";
    const endDate = new Date(sub.next_billing_date);
    if (isLifetime || (sub.status === "active" && endDate >= now)) {
      // Lifetime or genuinely active — allow through
      return true;
    }
  }

  // 2. Fallback: check for a completed M-Pesa transaction within the last 30 days
  const [txRows] = await pool.query<TxRow[]>(
    `SELECT plan, created_at FROM mpesa_transactions
     WHERE user_id = ? AND status = 'completed'
     ORDER BY created_at DESC LIMIT 1`,
    [adminId]
  );

  if (txRows.length === 0) return false;

  const txDate  = new Date(txRows[0].created_at);
  const derived = new Date(txDate);
  derived.setDate(derived.getDate() + 30);

  if (derived < now) return false; // tx exists but payment period has also expired

  // Payment is valid — auto-heal the subscriptions row so future logins
  // don't need this fallback and the subscription page shows correctly
  const paidUntil = derived.toISOString().split("T")[0];
  const plan      = txRows[0].plan;

  if (sub) {
    // Update existing stale row
    await pool.query(
      `UPDATE subscriptions
       SET status = 'active', plan = ?, next_billing_date = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [plan, paidUntil, adminId]
    );
  } else {
    // Insert missing row
    await pool.query(
      `INSERT INTO subscriptions (user_id, plan, status, amount, next_billing_date, created_at, updated_at)
       VALUES (?, ?, 'active', 0, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         status = 'active', plan = VALUES(plan),
         next_billing_date = VALUES(next_billing_date), updated_at = NOW()`,
      [adminId, plan, paidUntil]
    );
  }

  return true;
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

      // Super admin bypass - check is_super_admin flag OR default superadmin email
      if ((user.is_super_admin || user.email === "admin@postore.app") && user.role === "admin") {
        const { password: _, ...safeUser } = user;
        // Ensure is_super_admin is always true for the response
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
          "SELECT status, plan, next_billing_date FROM subscriptions WHERE user_id = ? LIMIT 1",
          [user.id]
        );
        const activeSub = subRows.find(s => {
          const isLifetime = String(s.plan).toLowerCase() === "lifetime";
          if (s.status !== "active" && !isLifetime) return false;
          return isLifetime || new Date(s.next_billing_date) >= new Date();
        });

        if (activeSub) {
          const { password: _, ...safeUser } = user;
          await logLoginNotification(pool, user.id, user.full_name, "admin", user.email, request);
          return NextResponse.json({
            success: true,
            user: { ...safeUser, plan: activeSub.plan, payment_status: "active" },
          });
        }

        // Fall back to completed M-Pesa transaction within 30 days
        const [txRows] = await pool.query<TxRow[]>(
          `SELECT plan, created_at FROM mpesa_transactions
           WHERE user_id = ? AND status = 'completed'
           ORDER BY created_at DESC LIMIT 1`,
          [user.id]
        );

        if (txRows.length > 0) {
          const txDate  = new Date(txRows[0].created_at);
          const derived = new Date(txDate);
          derived.setDate(derived.getDate() + 30);

          if (derived >= new Date()) {
            // Auto-heal subscriptions row
            const paidUntil = derived.toISOString().split("T")[0];
            await pool.query(
              `UPDATE subscriptions
               SET status = 'active', plan = ?, next_billing_date = ?, updated_at = NOW()
               WHERE user_id = ?`,
              [txRows[0].plan, paidUntil, user.id]
            );

            const { password: _, ...safeUser } = user;
            await logLoginNotification(pool, user.id, user.full_name, "admin", user.email, request);
            return NextResponse.json({
              success: true,
              user: { ...safeUser, plan: txRows[0].plan, payment_status: "active" },
            });
          }
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

      // Check admin's subscription — checks date validity + auto-heals DB
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