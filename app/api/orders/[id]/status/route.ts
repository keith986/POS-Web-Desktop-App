// app/api/orders/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

const VALID_STATUSES = ["pending", "processing", "completed", "refunded", "cancelled"];

interface OrderRow extends RowDataPacket {
  id:     string;
  status: string;
  items:  string;
  total:  number;
}

interface SettingsRow extends RowDataPacket {
  auto_deduct_inventory: number;
}

interface ProductRow extends RowDataPacket {
  id:    string;
  stock: number;
}

/* ── PUT /api/orders/[id]/status ── */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id }               = await params;
    const { status, admin_id } = await request.json();

    if (!VALID_STATUSES.includes(status))
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    /* ── 1. Verify ownership + get current order ── */
    const [orderRows] = await pool.query<OrderRow[]>(
      "SELECT id, status, items, total FROM orders WHERE id = ? AND admin_id = ? LIMIT 1",
      [id, admin_id]
    );

    if (orderRows.length === 0)
      return NextResponse.json({ error: "Order not found or access denied" }, { status: 403 });

    const order       = orderRows[0];
    const prevStatus  = order.status;

    /* ── 2. Update order status ── */
    await pool.query<ResultSetHeader>(
      "UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, id]
    );

    /* If refunded → also update payment_status */
    if (status === "refunded") {
      await pool.query<ResultSetHeader>(
        "UPDATE orders SET payment_status = 'refunded' WHERE id = ?",
        [id]
      );
    }

    /* ── 3. Stock deduction logic ── */
    /*
      Only deduct when:
        a) Transitioning INTO "completed" (not already completed)
        b) The store setting auto_deduct_inventory = 1
      Only restock when:
        a) Transitioning FROM "completed" → any other status (undo)
        b) OR status = "refunded" / "cancelled" from completed
    */
    const isCompletingNow  = status === "completed" && prevStatus !== "completed";
    const isUndoingComplete = prevStatus === "completed" &&
      (status === "refunded" || status === "cancelled" || status === "pending" || status === "processing");

    if (isCompletingNow || isUndoingComplete) {
      /* Read auto_deduct_inventory setting for this admin */
      const [settRows] = await pool.query<SettingsRow[]>(
        "SELECT auto_deduct_inventory FROM settings WHERE admin_id = ? LIMIT 1",
        [admin_id]
      );

      const autoDeduct = settRows.length > 0
        ? Boolean(settRows[0].auto_deduct_inventory)
        : false;   // default: manual mode

      if (autoDeduct) {
        /* Parse items JSON */
        const items: { id: string; quantity: number }[] =
          typeof order.items === "string"
            ? JSON.parse(order.items)
            : order.items ?? [];

        for (const item of items) {
          if (!item.id || !item.quantity) continue;

          /* Verify product belongs to this admin */
          const [prodRows] = await pool.query<ProductRow[]>(
            "SELECT id, stock FROM products WHERE id = ? AND admin_id = ? LIMIT 1",
            [item.id, admin_id]
          );

          if (prodRows.length === 0) continue;

          if (isCompletingNow) {
            /* Deduct — never go below 0 */
            await pool.query<ResultSetHeader>(
              `UPDATE products
                 SET stock = GREATEST(stock - ?, 0), updated_at = NOW()
               WHERE id = ? AND admin_id = ?`,
              [item.quantity, item.id, admin_id]
            );

            /* Log as "sale" movement */
            await pool.query<ResultSetHeader>(
              `INSERT INTO stock_movements
                 (id, product_id, type, quantity, note, admin_id)
               VALUES (UUID(), ?, 'sale', ?, ?, ?)`,
              [
                item.id,
                -Math.abs(item.quantity),
                `Auto-deducted from order ${id}`,
                admin_id,
              ]
            );
          } else if (isUndoingComplete) {
            /* Restock — order was reversed */
            await pool.query<ResultSetHeader>(
              `UPDATE products
                 SET stock = stock + ?, updated_at = NOW()
               WHERE id = ? AND admin_id = ?`,
              [item.quantity, item.id, admin_id]
            );

            /* Log as "return" movement */
            await pool.query<ResultSetHeader>(
              `INSERT INTO stock_movements
                 (id, product_id, type, quantity, note, admin_id)
               VALUES (UUID(), ?, 'return', ?, ?, ?)`,
              [
                item.id,
                item.quantity,
                `Stock restored — order ${id} reversed to ${status}`,
                admin_id,
              ]
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}