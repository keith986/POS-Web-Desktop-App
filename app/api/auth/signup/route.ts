import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import bcrypt from "bcryptjs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/* ─────────────────────────────────────────────────────────
   This API is called AFTER M-Pesa payment completes.
   Before creating any account it:
     1. Verifies checkout_request_id exists in mpesa_transactions
     2. Confirms status = 'completed'
     3. Confirms amount matches the selected plan
     4. Confirms transaction not already used
   Only then creates: user + subdomain + subscription
──────────────────────────────────────────────────────────── */

/* ── Pricing matrix — mirrors your plans.ts ── */
type PlanId  = "starter" | "pro" | "enterprise";
type PosType = "retail" | "restaurant" | "salon" | "wholesale" | "pharmacy";

const POS_PRICES: Record<PosType, Record<PlanId, number>> = {
  retail:     { starter: 999,  pro: 1999, enterprise: 3999 },
  restaurant: { starter: 1299, pro: 2499, enterprise: 4999 },
  salon:      { starter: 999,  pro: 1999, enterprise: 3999 },
  wholesale:  { starter: 1499, pro: 2999, enterprise: 5999 },
  pharmacy:   { starter: 1299, pro: 2499, enterprise: 4999 },
};

function getExpectedPrice(posType: string, plan: string): number | null {
  const pos = POS_PRICES[posType as PosType];
  if (!pos) return null;
  return pos[plan as PlanId] ?? null;
}

interface CpanelResult {
  success: boolean;
  error?:  string;
  url?:    string;
}

async function createSubdomain(subdomain: string): Promise<CpanelResult> {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "upendoapps.com";
  try {
    const { stdout, stderr } = await execAsync(
      `sudo /usr/local/bin/create-subdomain.sh ${subdomain}`
    );
    if (stdout.includes("SUCCESS")) {
      return { success: true, url: `https://${subdomain}.${baseDomain}` };
    }
    return { success: false, error: stderr };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const {
      full_name,
      email,
      password,
      store_name,
      domain,
      plan,
      pos_type,
      checkout_request_id,
    } = await request.json();

    /* ── 1. Basic validation ── */
    if (!full_name || !email || !password || !store_name || !domain)
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });

    if (!checkout_request_id)
      return NextResponse.json({
        error: "Payment reference is required. Please complete payment first.",
      }, { status: 400 });

    if (password.length < 6)
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    if (!/^[a-z0-9-]{2,50}$/.test(domain))
      return NextResponse.json({
        error: "Invalid domain — only lowercase letters, numbers and hyphens",
      }, { status: 400 });

    const pool = await getPool();

    /* ── 2. Verify M-Pesa transaction is COMPLETED ── */
    const [txRows] = await pool.query(
      `SELECT id, status, amount, plan, pos_type, user_id
       FROM mpesa_transactions
       WHERE checkout_request_id = ?
       LIMIT 1`,
      [checkout_request_id]
    ) as [{ id: number; status: string; amount: number; plan: string; pos_type: string | null; user_id: string | null }[], unknown];

    if (!txRows.length)
      return NextResponse.json({
        error: "Payment not found. Please try paying again or contact support.",
      }, { status: 402 });

    const tx = txRows[0];

    /* Check payment status */
    if (tx.status !== "completed") {
      const msgs: Record<string, string> = {
        pending:   "Payment is still processing. Please wait a moment and try again.",
        failed:    "Payment failed. Please try paying again.",
        cancelled: "Payment was cancelled. Please complete payment to create your account.",
      };
      return NextResponse.json({
        error: msgs[tx.status] ?? "Payment not confirmed. Contact support.",
      }, { status: 402 });
    }

    /* Check transaction not already used */
    if (tx.user_id)
      return NextResponse.json({
        error: "This payment has already been used. Please sign in or contact support.",
      }, { status: 409 });

    /* Verify amount matches pos_type + plan combination */
    const selectedPlan = plan     ?? tx.plan     ?? "starter";
    const selectedPos  = pos_type ?? tx.pos_type ?? null;
    const expectedPrice = selectedPos
      ? getExpectedPrice(selectedPos, selectedPlan)
      : null;

    if (expectedPrice !== null && Number(tx.amount) < expectedPrice)
      return NextResponse.json({
        error: `Payment of KES ${tx.amount} does not match the ${selectedPlan} plan for ${selectedPos} (KES ${expectedPrice}). Contact support.`,
      }, { status: 402 });

    /* ── 3. Check email + domain uniqueness ── */
    const [emailRows] = await pool.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email.toLowerCase().trim()]
    );
    if ((emailRows as unknown[]).length > 0)
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

    const [domainRows] = await pool.query(
      "SELECT id FROM users WHERE domain = ? LIMIT 1",
      [domain]
    );
    if ((domainRows as unknown[]).length > 0)
      return NextResponse.json({ error: "That store domain is already taken." }, { status: 409 });

    /* ── 4. Create subdomain ── */
    const cpanel           = await createSubdomain(domain);
    const subdomain_url    = cpanel.url ?? null;
    const subdomain_status = cpanel.success ? "active" : "pending";

    if (!cpanel.success)
      console.warn(`[Signup] Subdomain failed for "${domain}": ${cpanel.error}. Account created anyway.`);

    /* ── 5. Create user account ── */
    const id     = crypto.randomUUID();
    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users
         (id, full_name, email, password, role, store_name, domain,
          subdomain_url, subdomain_status, pos_type)
       VALUES (?, ?, ?, ?, 'admin', ?, ?, ?, ?, ?)`,
      [
        id,
        full_name,
        email.toLowerCase().trim(),
        hashed,
        store_name,
        domain,
        subdomain_url,
        subdomain_status,
        pos_type ?? null,
      ]
    );

    /* ── 6. Create subscription (active immediately) ── */
    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    await pool.query(
      `INSERT INTO subscriptions (user_id, plan, status, amount, next_billing_date)
       VALUES (?, ?, 'active', ?, ?)`,
      [
        id,
        selectedPlan,
        Number(tx.amount),
        nextBilling.toISOString().split("T")[0],
      ]
    );

    /* ── 7. Mark M-Pesa transaction as used by this user ── */
    await pool.query(
      "UPDATE mpesa_transactions SET user_id = ? WHERE checkout_request_id = ?",
      [id, checkout_request_id]
    );

    console.log(`[Signup] ✅ ${email} | plan: ${selectedPlan} | domain: ${domain}.${process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "upendoapps.com"}`);

    return NextResponse.json({
      success:           true,
      subdomain_created: cpanel.success,
      user: {
        id,
        full_name,
        email:            email.toLowerCase().trim(),
        role:             "admin",
        store_name,
        domain,
        subdomain_url,
        subdomain_status,
        pos_type:         pos_type ?? null,
        payment_status:   "active",
      },
    }, { status: 201 });

  } catch (error) {
    const err = error as Error;
    console.error("[Signup] Error:", err.message);
    if (err.message.includes("Duplicate"))
      return NextResponse.json({ error: "Email or domain already exists." }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}