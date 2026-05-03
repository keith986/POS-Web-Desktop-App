import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

type Period = "7d" | "30d" | "90d" | "12m";

function getDays(period: Period): number {
  return period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
}

/* ── GET /api/analytics?admin_id=xxx&period=30d ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    const period   = (request.nextUrl.searchParams.get("period") ?? "30d") as Period;

    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();
    const days = getDays(period);
    const useMonths = period === "12m";

    /* ─── 1. Revenue totals from orders ─── */
    const [[revRow]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN payment_status='paid' THEN total ELSE 0 END), 0) AS total,
         COALESCE(SUM(CASE WHEN payment_status='paid' AND DATE(created_at)=CURDATE() THEN total ELSE 0 END), 0) AS today,
         COALESCE(SUM(CASE WHEN payment_status='paid' AND created_at >= DATE_SUB(NOW(),INTERVAL 7 DAY) THEN total ELSE 0 END), 0) AS this_week,
         COALESCE(SUM(CASE WHEN payment_status='paid' AND created_at >= DATE_FORMAT(NOW(),'%Y-%m-01') THEN total ELSE 0 END), 0) AS this_month,
         COALESCE(SUM(CASE WHEN payment_status='paid'
                            AND created_at >= DATE_FORMAT(DATE_SUB(NOW(),INTERVAL 1 MONTH),'%Y-%m-01')
                            AND created_at <  DATE_FORMAT(NOW(),'%Y-%m-01') THEN total ELSE 0 END), 0) AS last_month
       FROM orders WHERE admin_id = ?`,
      [admin_id]
    ) as [Record<string, number>[], unknown];

    const rev = revRow as Record<string, number>;
    const growth = Number(rev.last_month) > 0
      ? ((Number(rev.this_month) - Number(rev.last_month)) / Number(rev.last_month)) * 100
      : 0;

    /* ─── 2. Order counts from orders ─── */
    const [[ordRow]] = await pool.query(
      `SELECT
         COUNT(*)                                                                    AS total,
         SUM(CASE WHEN DATE(created_at)=CURDATE() THEN 1 ELSE 0 END)               AS today,
         SUM(CASE WHEN status='pending'    THEN 1 ELSE 0 END)                       AS pending,
         SUM(CASE WHEN status='processing' THEN 1 ELSE 0 END)                       AS processing,
         SUM(CASE WHEN status='completed'  THEN 1 ELSE 0 END)                       AS completed,
         SUM(CASE WHEN status='cancelled'  THEN 1 ELSE 0 END)                       AS cancelled,
         SUM(CASE WHEN status='refunded'   THEN 1 ELSE 0 END)                       AS refunded,
         COALESCE(AVG(CASE WHEN payment_status='paid' THEN total END), 0)           AS avg_value
       FROM orders WHERE admin_id = ?`,
      [admin_id]
    ) as [Record<string, number>[], unknown];

    /* ─── 3. Customer stats from customers table ─── */
    const [[custRow]] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN created_at >= DATE_FORMAT(NOW(),'%Y-%m-01') THEN 1 ELSE 0 END) AS new_month,
         SUM(CASE WHEN total_orders > 1 THEN 1 ELSE 0 END) AS \`returning\`
       FROM customers WHERE admin_id = ?`,
      [admin_id]
    ) as [Record<string, number>[], unknown];

    /* ─── 4. Product stats from products table ─── */
    const [[prodRow]] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN stock > 0 AND stock <= 8 THEN 1 ELSE 0 END) AS low_stock,
         SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS out_of_stock,
         COALESCE(SUM(price * stock), 0) AS total_value
       FROM products WHERE admin_id = ?`,
      [admin_id]
    ) as [Record<string, number>[], unknown];

    /* ─── 5. Staff stats — from staff table using admin_id column ─── */
    const [[staffRow]] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active
       FROM staff WHERE admin_id = ?`,
      [admin_id]
    ) as [Record<string, number>[], unknown];

    /* ─── 6. Revenue trend from orders ─── */
    const [revTrend] = await pool.query(
      useMonths
        ? `SELECT
             DATE_FORMAT(created_at,'%b %y') AS label,
             COALESCE(SUM(CASE WHEN payment_status='paid' THEN total ELSE 0 END),0) AS revenue,
             COUNT(*) AS orders
           FROM orders
           WHERE admin_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
           GROUP BY YEAR(created_at), MONTH(created_at), label
           ORDER BY YEAR(created_at), MONTH(created_at)`
        : `SELECT
             DATE_FORMAT(created_at,'%d %b') AS label,
             COALESCE(SUM(CASE WHEN payment_status='paid' THEN total ELSE 0 END),0) AS revenue,
             COUNT(*) AS orders
           FROM orders
           WHERE admin_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
           GROUP BY DATE(created_at), label
           ORDER BY DATE(created_at)`,
      useMonths ? [admin_id] : [admin_id, days]
    ) as [{ label: string; revenue: number; orders: number }[], unknown];

    /* ─── 7. Orders by status ─── */
    const [byStatus] = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM orders
       WHERE admin_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY status ORDER BY count DESC`,
      [admin_id, days]
    ) as [{ status: string; count: number }[], unknown];

    /* ─── 8. Orders by payment method ─── */
    const [byMethod] = await pool.query(
      `SELECT
         payment_method AS method,
         COUNT(*) AS count,
         COALESCE(SUM(CASE WHEN payment_status='paid' THEN total ELSE 0 END),0) AS total
       FROM orders
       WHERE admin_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY payment_method ORDER BY count DESC`,
      [admin_id, days]
    ) as [{ method: string; count: number; total: number }[], unknown];

    /* ─── 9. Top products — MariaDB compatible (fetch + aggregate in JS) ─── */
    const [orderRows] = await pool.query(
      `SELECT items FROM orders
       WHERE admin_id = ? AND payment_status = 'paid'
         AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [admin_id, days]
    ) as [{ items: string | object }[], unknown];

    const productMap = new Map<string, { name: string; units_sold: number; revenue: number }>();
    for (const row of orderRows as { items: string | object }[]) {
      try {
        const items: { product_id: string; name: string; qty: number; price: number }[] =
          typeof row.items === "string" ? JSON.parse(row.items) : (row.items as { product_id: string; name: string; qty: number; price: number }[]);
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if (!item.product_id) continue;
          const ex = productMap.get(item.product_id);
          const qty = Number(item.qty) || 0;
          const price = Number(item.price) || 0;
          if (ex) { ex.units_sold += qty; ex.revenue += qty * price; }
          else { productMap.set(item.product_id, { name: item.name || "Unknown", units_sold: qty, revenue: qty * price }); }
        }
      } catch { /* skip */ }
    }

    const productIds = [...productMap.keys()];
    let topProducts: { name: string; category: string; sku: string | null; units_sold: number; revenue: number }[] = [];
    if (productIds.length > 0) {
      const ph = productIds.map(() => "?").join(",");
      const [prodDetails] = await pool.query(
        `SELECT id, name, category, sku FROM products WHERE id IN (${ph}) AND admin_id = ?`,
        [...productIds, admin_id]
      ) as [{ id: string; name: string; category: string; sku: string | null }[], unknown];
      topProducts = (prodDetails as { id: string; name: string; category: string; sku: string | null }[])
        .map(p => { const a = productMap.get(p.id); return { name: p.name, category: p.category, sku: p.sku, units_sold: a?.units_sold ?? 0, revenue: a?.revenue ?? 0 }; })
        .sort((a, b) => b.revenue - a.revenue).slice(0, 7);
    }

    /* ─── 10. Top customers from customers table ─── */
    const [topCustomers] = await pool.query(
      `SELECT full_name AS name, email, total_orders AS orders, total_spent AS spent, loyalty_points
       FROM customers
       WHERE admin_id = ?
       ORDER BY total_spent DESC
       LIMIT 7`,
      [admin_id]
    ) as [{ name: string; email: string; orders: number; spent: number; loyalty_points: number }[], unknown];

    /* ─── 11. Recent stock movements from stock_movements table ─── */
    const [recentMovements] = await pool.query(
      `SELECT
         p.name AS product_name,
         sm.type,
         sm.quantity,
         sm.note,
         sm.created_at
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       WHERE sm.admin_id = ?
       ORDER BY sm.created_at DESC
       LIMIT 8`,
      [admin_id]
    ) as [{ product_name: string; type: string; quantity: number; note: string | null; created_at: string }[], unknown];

    /* ─── Build response ─── */
    const ord   = ordRow   as Record<string, number>;
    const cust  = custRow  as Record<string, number>;
    const prod  = prodRow  as Record<string, number>;
    const staff = staffRow as Record<string, number>;

    return NextResponse.json({
      revenue: {
        total:      Number(rev.total)      || 0,
        today:      Number(rev.today)      || 0,
        this_week:  Number(rev.this_week)  || 0,
        this_month: Number(rev.this_month) || 0,
        last_month: Number(rev.last_month) || 0,
        growth:     parseFloat(growth.toFixed(1)),
      },
      orders: {
        total:      Number(ord.total)      || 0,
        today:      Number(ord.today)      || 0,
        pending:    Number(ord.pending)    || 0,
        processing: Number(ord.processing) || 0,
        completed:  Number(ord.completed)  || 0,
        cancelled:  Number(ord.cancelled)  || 0,
        refunded:   Number(ord.refunded)   || 0,
        avg_value:  Number(ord.avg_value)  || 0,
      },
      customers: {
        total:     Number(cust.total)               || 0,
        active:    Number(cust.active)              || 0,
        new_month: Number(cust.new_month)           || 0,
        returning: Number(cust["returning"])        || 0,
      },
      products: {
        total:         Number(prod.total)         || 0,
        active:        Number(prod.active)        || 0,
        low_stock:     Number(prod.low_stock)     || 0,
        out_of_stock:  Number(prod.out_of_stock)  || 0,
        total_value:   Number(prod.total_value)   || 0,
      },
      staff: {
        total:  Number(staff.total)  || 0,
        active: Number(staff.active) || 0,
      },
      revenue_trend:    revTrend        as { label: string; revenue: number; orders: number }[],
      top_products:     topProducts     as { name: string; category: string; sku: string | null; units_sold: number; revenue: number }[],
      orders_by_status: byStatus        as { status: string; count: number }[],
      orders_by_method: byMethod        as { method: string; count: number; total: number }[],
      top_customers:    topCustomers    as { name: string; email: string; orders: number; spent: number; loyalty_points: number }[],
      recent_movements: recentMovements as { product_name: string; type: string; quantity: number; note: string | null; created_at: string }[],
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}