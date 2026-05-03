// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";

const VALID_STATUSES        = ["pending", "processing", "completed", "refunded", "cancelled"];
const VALID_PAYMENT_METHODS = ["card", "cash", "mobile"];

/* ── GET /api/orders?admin_id=xxx&today=true&customer_id=xxx&status=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const sp          = request.nextUrl.searchParams;
    const admin_id    = sp.get("admin_id");
    const customer_id = sp.get("customer_id");
    const today       = sp.get("today") === "true";
    const status      = sp.get("status");

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    let sql    = "SELECT * FROM orders WHERE admin_id = ?";
    const args: (string | number)[] = [admin_id];

    if (customer_id) { sql += " AND customer_id = ?";            args.push(customer_id); }
    if (today)       { sql += " AND DATE(created_at) = CURDATE()"; }
    if (status)      { sql += " AND status = ?";                 args.push(status); }

    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, args);

    const orders = (rows as Record<string, unknown>[]).map(o => ({
      ...o,
      items: typeof o.items === "string" ? JSON.parse(o.items as string) : o.items ?? [],
    }));

    return NextResponse.json(orders);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── POST /api/orders — create a new order ── */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const {
      customer_id, customer_name, customer_email,
      items, subtotal, tax, total,
      status,           // ← respect status sent by caller
      payment_method, payment_status,
      staff_name, note, admin_id,
    } = await request.json();

    if (!customer_name || !items || !total || !admin_id)
      return NextResponse.json(
        { error: "customer_name, items, total and admin_id are required" },
        { status: 400 }
      );

    /* Validate status — default to pending if not provided or invalid */
    const orderStatus = VALID_STATUSES.includes(status) ? status : "pending";
    const payMethod   = VALID_PAYMENT_METHODS.includes(payment_method?.toLowerCase())
      ? payment_method.toLowerCase()
      : "cash";

    const pool         = await getPool();
    const id           = randomUUID();
    const order_number = `ORD-${Date.now().toString().slice(-6)}`;

    /* ── 1. Insert order ── */
    await pool.query(
      `INSERT INTO orders
         (id, order_number, customer_id, customer_name, customer_email,
          items, subtotal, tax, total,
          status, payment_method, payment_status,
          staff_name, note, admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, order_number,
        customer_id ?? null, customer_name, customer_email ?? "",
        JSON.stringify(items), subtotal ?? 0, tax ?? 0, total,
        orderStatus,           // ← was hardcoded 'pending', now uses sent value
        payMethod, payment_status ?? "paid",
        staff_name ?? null, note ?? null, admin_id,
      ]
    );

    /* ── 2. Update customer stats if linked and completed ── */
    if (customer_id && orderStatus === "completed") {
      await pool.query(
        `UPDATE customers SET
           total_orders   = total_orders + 1,
           total_spent    = total_spent + ?,
           loyalty_points = loyalty_points + ?,
           last_order     = NOW()
         WHERE id = ? AND admin_id = ?`,
        [Number(total), Math.floor(Number(total)), customer_id, admin_id]
      );
    }

    /* ── 3. Auto-deduct stock if setting is ON and order is completed ── */
    if (orderStatus === "completed") {
      const [settRows] = await pool.query(
        "SELECT auto_deduct_inventory FROM settings WHERE admin_id = ? LIMIT 1",
        [admin_id]
      );

      const setting     = (settRows as Record<string, unknown>[])[0];
      const autoDeduct  = Boolean(setting?.auto_deduct_inventory ?? false);

      if (autoDeduct) {
        const parsedItems = Array.isArray(items) ? items : [];

        for (const item of parsedItems) {
          if (!item.id || !item.quantity) continue;

          /* Deduct — never below 0 */
          await pool.query(
            `UPDATE products
               SET stock = GREATEST(stock - ?, 0), updated_at = NOW()
             WHERE id = ? AND admin_id = ?`,
            [Number(item.quantity), item.id, admin_id]
          );

          /* Log to stock_movements */
          await pool.query(
            `INSERT INTO stock_movements
               (id, product_id, type, quantity, note, admin_id)
             VALUES (UUID(), ?, 'sale', ?, ?, ?)`,
            [
              item.id,
              -Math.abs(Number(item.quantity)),
              `Auto-deducted via ${order_number}${staff_name ? ` — ${staff_name}` : ""}`,
              admin_id,
            ]
          );
        }
      }
    }

    return NextResponse.json({ success: true, id, order_number });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}