import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

const DEFAULTS = {
  store_name:            "POStore",
  domain:                "postore",
  email:                 "",
  phone:                 "",
  address:               "",
  currency:              "KES",
  timezone:              "Africa/Nairobi",
  tax_enabled:           true,
  tax_rate:              "16",
  tax_name:              "VAT",
  tax_inclusive:         false,
  receipt_footer:        "Thank you for shopping with us!",
  notif_new_order:       true,
  notif_low_stock:       true,
  notif_daily_report:    false,
  notif_staff_login:     false,
  notif_email:           "",
  auto_deduct_inventory: false,
};

/* ── GET /api/settings?admin_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ ...DEFAULTS });

    const pool = await getPool();

    const [rows] = await pool.query(
      "SELECT * FROM settings WHERE admin_id = ? LIMIT 1",
      [admin_id]
    );

    const settings = (rows as Record<string, unknown>[])[0] ?? null;

    if (!settings) {
      return NextResponse.json({ ...DEFAULTS });
    }

    const row = settings as Record<string, unknown>;
    return NextResponse.json({
      ...row,
      currency:              row.currency              ?? "KES",
      timezone:              row.timezone              ?? "Africa/Nairobi",
      auto_deduct_inventory: Boolean(row.auto_deduct_inventory ?? false),
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── PUT /api/settings ── */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body     = await request.json();
    const admin_id = body.admin_id;

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    await pool.query(`
      INSERT INTO settings (
        admin_id, store_name, domain, email, phone, address,
        currency, timezone, tax_enabled, tax_rate, tax_name,
        tax_inclusive, receipt_footer,
        notif_new_order, notif_low_stock, notif_daily_report,
        notif_staff_login, notif_email,
        auto_deduct_inventory
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        store_name            = VALUES(store_name),
        domain                = VALUES(domain),
        email                 = VALUES(email),
        phone                 = VALUES(phone),
        address               = VALUES(address),
        currency              = VALUES(currency),
        timezone              = VALUES(timezone),
        tax_enabled           = VALUES(tax_enabled),
        tax_rate              = VALUES(tax_rate),
        tax_name              = VALUES(tax_name),
        tax_inclusive         = VALUES(tax_inclusive),
        receipt_footer        = VALUES(receipt_footer),
        notif_new_order       = VALUES(notif_new_order),
        notif_low_stock       = VALUES(notif_low_stock),
        notif_daily_report    = VALUES(notif_daily_report),
        notif_staff_login     = VALUES(notif_staff_login),
        notif_email           = VALUES(notif_email),
        auto_deduct_inventory = VALUES(auto_deduct_inventory),
        updated_at            = NOW()
    `, [
      admin_id,
      body.store_name,     body.domain,        body.email,
      body.phone,          body.address,
      body.currency,       body.timezone,
      body.tax_enabled,    body.tax_rate,      body.tax_name,
      body.tax_inclusive,  body.receipt_footer,
      body.notif_new_order,    body.notif_low_stock,
      body.notif_daily_report, body.notif_staff_login,
      body.notif_email,
      body.auto_deduct_inventory ? 1 : 0,
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}