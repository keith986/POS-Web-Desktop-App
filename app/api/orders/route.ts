// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { randomUUID } from "crypto";
import { notifyNewOrder, notifyLowStockIfCrossed } from "@/app/_lib/notify";
import { submitEtimsInvoice, saveEtimsResult } from "@/app/_lib/etims";

const VALID_STATUSES        = ["pending", "processing", "completed", "refunded", "cancelled"];
const VALID_PAYMENT_METHODS = ["card", "cash", "mobile"];

/* ── GET /api/orders?admin_id=xxx&range=today|week|month|all&customer_id=xxx&status=xxx&page=1&limit=50 ── */
const VALID_RANGES = ["today", "week", "month", "all"] as const;
type Range = typeof VALID_RANGES[number];

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const sp          = request.nextUrl.searchParams;
    const admin_id    = sp.get("admin_id");
    const customer_id = sp.get("customer_id");
    const status      = sp.get("status");
    const page        = Math.max(1, Number(sp.get("page")) || 1);
    const limit       = sp.get("limit") ? Math.max(1, Number(sp.get("limit"))) : null;

    // range=... is the new param. today=true is kept working so the
    // admin orders page (which never sends either) still gets everything,
    // and any other old caller passing today=true still gets today-only.
    let range: Range = "all";
    const rangeParam = sp.get("range") as Range | null;
    if (rangeParam && VALID_RANGES.includes(rangeParam)) range = rangeParam;
    else if (sp.get("today") === "true")                 range = "today";

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    let sql    = "SELECT * FROM orders WHERE admin_id = ?";
    const args: (string | number)[] = [admin_id];

    if (customer_id) { sql += " AND customer_id = ?"; args.push(customer_id); }
    if (status)       { sql += " AND status = ?";      args.push(status); }

    if (range === "today") sql += " AND DATE(created_at) = CURDATE()";
    if (range === "week")  sql += " AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
    if (range === "month") sql += " AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    // range === "all" adds no date filter

    sql += " ORDER BY created_at DESC";

    // Pagination is opt-in — only applied when ?limit is sent, so existing
    // callers that never pass it still get the full array back unpaginated.
    let total: number | null = null;
    if (limit) {
      const [countRows] = await pool.query(
        sql.replace("SELECT *", "SELECT COUNT(*) AS c"),
        args
      );
      total = Number((countRows as { c: number }[])[0]?.c ?? 0);

      sql += " LIMIT ? OFFSET ?";
      args.push(limit, (page - 1) * limit);
    }

    const [rows] = await pool.query(sql, args);

    const orders = (rows as Record<string, unknown>[]).map(o => ({
      ...o,
      items: typeof o.items === "string" ? JSON.parse(o.items as string) : o.items ?? [],
    }));

    // Shape is unchanged (plain array) when no pagination is requested, so
    // /admin/orders and any other existing caller keeps working untouched.
    if (limit) {
      return NextResponse.json({ orders, total, page, limit });
    }
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
      items, subtotal, discount_amount, discount_code, tax, total,
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
          items, subtotal, discount_amount, discount_code, tax, total,
          status, payment_method, payment_status,
          staff_name, note, admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, order_number,
        customer_id ?? null, customer_name, customer_email ?? "",
        JSON.stringify(items), subtotal ?? 0, discount_amount ?? 0, discount_code ?? null, tax ?? 0, total,
        orderStatus,           // ← was hardcoded 'pending', now uses sent value
        payMethod, payment_status ?? "paid",
        staff_name ?? null, note ?? null, admin_id,
      ]
    );

    /* Fire-and-forget: "New Order" email alert (Settings → Notifications) */
    notifyNewOrder(admin_id, {
      order_number:   order_number,
      customer_name:  customer_name,
      total:          Number(total),
      payment_method: payMethod,
      item_count:     Array.isArray(items) ? items.length : 0,
    });

    /* Fire-and-forget: submit to KRA eTIMS if the store has it enabled
       (Settings → Tax & Billing). Never blocks the sale response — the
       control number lands on the order a beat later and the receipt
       picks it up whenever it's printed/sent. */
    if (orderStatus === "completed") {
      submitEtimsInvoice(
        {
          id, order_number, customer_name,
          items: Array.isArray(items) ? items : [],
          subtotal: Number(subtotal ?? 0),
          tax:      Number(tax ?? 0),
          total:    Number(total),
          payment_method: payMethod,
        },
        admin_id
      )
        .then(result => saveEtimsResult(id, result))
        .catch(() => { /* already caught inside submitEtimsInvoice */ });
    }

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

          /* Read stock before the deduction so we can detect a
             threshold crossing for the low-stock alert below */
          const [prodRows] = await pool.query(
            "SELECT name, sku, stock FROM products WHERE id = ? AND admin_id = ?",
            [item.id, admin_id]
          );
          const prod = (prodRows as { name: string; sku: string | null; stock: number }[])[0];
          if (!prod) continue;

          const previousStock = prod.stock;
          const newStock      = Math.max(0, previousStock - Number(item.quantity));

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

          /* Fire-and-forget: only emails if this sale pushed the
             product from above the threshold to at/below it */
          notifyLowStockIfCrossed(
            admin_id,
            { name: prod.name, sku: prod.sku },
            previousStock,
            newStock
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