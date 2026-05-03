import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";

/* ── GET /api/dashboard?admin_id=xxx ── */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const admin_id = request.nextUrl.searchParams.get("admin_id");
    if (!admin_id)
      return NextResponse.json({ error: "admin_id is required" }, { status: 400 });

    const pool = await getPool();

    /* ─── 1. Revenue: today + this week ─── */
    const [[revRow]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN payment_status='paid' AND DATE(created_at)=CURDATE() THEN total ELSE 0 END),0) AS today,
         COALESCE(SUM(CASE WHEN payment_status='paid' AND created_at >= DATE_SUB(NOW(),INTERVAL 7 DAY) THEN total ELSE 0 END),0) AS week
       FROM orders WHERE admin_id = ?`,
      [admin_id]
    ) as [Record<string, number>[], unknown];

    const rev = revRow as Record<string, number>;

    /* ─── 2. Order counts ─── */
    const [[ordRow]] = await pool.query(
      `SELECT
         SUM(CASE WHEN DATE(created_at)=CURDATE() THEN 1 ELSE 0 END) AS today,
         SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END)            AS pending
       FROM orders WHERE admin_id = ?`,
      [admin_id]
    ) as [Record<string, number>[], unknown];

    const ord = ordRow as Record<string, number>;

    /* ─── 3. Active staff from staff table ─── */
    const [[staffRow]] = await pool.query(
      `SELECT
         SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active
       FROM staff WHERE admin_id = ?`,
      [admin_id]
    ) as [Record<string, number>[], unknown];

    /* ─── 4. Total customers ─── */
    const [[custRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM customers WHERE admin_id = ?`,
      [admin_id]
    ) as [Record<string, number>[], unknown];

    /* ─── 5. Low stock count from products ─── */
    const [[stockRow]] = await pool.query(
      `SELECT SUM(CASE WHEN stock <= 8 THEN 1 ELSE 0 END) AS low
       FROM products WHERE admin_id = ? AND status='active'`,
      [admin_id]
    ) as [Record<string, number>[], unknown];

    /* ─── 6. Weekly revenue by day (last 7 days) ─── */
    const [weeklyRows] = await pool.query(
      `SELECT
         DATE_FORMAT(created_at,'%a') AS day,
         COALESCE(SUM(CASE WHEN payment_status='paid' THEN total ELSE 0 END),0) AS revenue
       FROM orders
       WHERE admin_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at), day
       ORDER BY DATE(created_at) ASC`,
      [admin_id]
    ) as [{ day: string; revenue: number }[], unknown];

    /* ─── 7. Recent orders (last 5) ─── */
    const [recentOrders] = await pool.query(
      `SELECT id, order_number, customer_name, total, status, payment_status, created_at
       FROM orders
       WHERE admin_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [admin_id]
    ) as [{ id: string; order_number: string; customer_name: string; total: number; status: string; payment_status: string; created_at: string }[], unknown];

    /* ─── 8. Payment methods breakdown ─── */
    const [[totalOrdRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM orders WHERE admin_id = ?`,
      [admin_id]
    ) as [Record<string, number>[], unknown];

    const [methodRows] = await pool.query(
      `SELECT payment_method AS method, COUNT(*) AS count
       FROM orders WHERE admin_id = ?
       GROUP BY payment_method`,
      [admin_id]
    ) as [{ method: string; count: number }[], unknown];

    const totalOrd = Number((totalOrdRow as Record<string, number>).total) || 1;
    const paymentMethods = (methodRows as { method: string; count: number }[]).map(m => ({
      method: m.method,
      count:  m.count,
      pct:    Math.round((m.count / totalOrd) * 100),
    }));

    /* ─── 9. Top products — fetch order items + aggregate in JS (MariaDB compatible) ─── */
    const [orderItemRows] = await pool.query(
      `SELECT items FROM orders
       WHERE admin_id = ? AND payment_status='paid'
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [admin_id]
    ) as [{ items: string | object }[], unknown];

    const productMap = new Map<string, { name: string; units_sold: number; revenue: number }>();
    for (const row of orderItemRows as { items: string | object }[]) {
      try {
        const items: { product_id: string; name: string; qty: number; price: number }[] =
          typeof row.items === "string" ? JSON.parse(row.items) : row.items as { product_id: string; name: string; qty: number; price: number }[];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if (!item.product_id) continue;
          const qty = Number(item.qty) || 0;
          const price = Number(item.price) || 0;
          const ex = productMap.get(item.product_id);
          if (ex) { ex.units_sold += qty; ex.revenue += qty * price; }
          else { productMap.set(item.product_id, { name: item.name || "Unknown", units_sold: qty, revenue: qty * price }); }
        }
      } catch { /* skip */ }
    }

    const productIds = [...productMap.keys()];
    let topProducts: { name: string; category: string; sku: string | null; units_sold: number; revenue: number }[] = [];

    if (productIds.length > 0) {
      const ph = productIds.map(() => "?").join(",");
      const [prodRows] = await pool.query(
        `SELECT id, name, category, sku FROM products WHERE id IN (${ph}) AND admin_id = ?`,
        [...productIds, admin_id]
      ) as [{ id: string; name: string; category: string; sku: string | null }[], unknown];

      topProducts = (prodRows as { id: string; name: string; category: string; sku: string | null }[])
        .map(p => {
          const a = productMap.get(p.id);
          return { name: p.name, category: p.category, sku: p.sku, units_sold: a?.units_sold ?? 0, revenue: a?.revenue ?? 0 };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    }

    /* ─── 10. Activity feed — built from recent events across tables ─── */
    const activity: { color: string; message: string; time: string }[] = [];

    /* Recent orders */
    const [actOrders] = await pool.query(
      `SELECT order_number, customer_name, total, status, created_at
       FROM orders WHERE admin_id = ?
       ORDER BY created_at DESC LIMIT 3`,
      [admin_id]
    ) as [{ order_number: string; customer_name: string; total: number; status: string; created_at: string }[], unknown];

    for (const o of actOrders as { order_number: string; customer_name: string; total: number; status: string; created_at: string }[]) {
      const isRefund = o.status === "refunded";
      activity.push({
        color:   isRefund ? "#dc2626" : "#16a34a",
        message: isRefund
          ? `<strong>Refund processed</strong> — Order ${o.order_number}, Ksh.${Number(o.total).toFixed(2)}`
          : `<strong>New order ${o.order_number}</strong> — ${o.customer_name}, Ksh.${Number(o.total).toFixed(2)}`,
        time: timeAgo(o.created_at),
      });
    }

    /* Low stock alerts from products */
    const [actStock] = await pool.query(
      `SELECT name, stock FROM products
       WHERE admin_id = ? AND stock <= 8 AND status='active'
       ORDER BY stock ASC LIMIT 2`,
      [admin_id]
    ) as [{ name: string; stock: number }[], unknown];

    for (const s of actStock as { name: string; stock: number }[]) {
      activity.push({
        color:   "#d97706",
        message: s.stock === 0
          ? `<strong>Out of stock</strong> — ${s.name}`
          : `<strong>Inventory low</strong> — ${s.name} (${s.stock} left)`,
        time: "now",
      });
    }

    /* Recent staff logins */
    const [actStaff] = await pool.query(
      `SELECT full_name, last_login FROM staff
       WHERE admin_id = ? AND last_login IS NOT NULL
       ORDER BY last_login DESC LIMIT 2`,
      [admin_id]
    ) as [{ full_name: string; last_login: string }[], unknown];

    for (const s of actStaff as { full_name: string; last_login: string }[]) {
      activity.push({
        color:   "#2563eb",
        message: `<strong>Staff login</strong> — ${s.full_name} signed in`,
        time:    timeAgo(s.last_login),
      });
    }

    /* Sort by most recent first (crude but effective) */
    activity.sort((a, b) => {
      const order = ["just now", "now", "m ago", "h ago", "d ago"];
      const rank = (t: string) => order.findIndex(o => t.includes(o.replace("m ago","m").replace("h ago","h").replace("d ago","d")));
      return rank(a.time) - rank(b.time);
    });

    /* ─── Build response ─── */


    return NextResponse.json({
      revenue_today:   Number(rev.today) || 0,
      revenue_week:    Number(rev.week)  || 0,
      orders_today:    Number(ord.today)   || 0,
      orders_pending:  Number(ord.pending) || 0,
      active_staff:    Number((staffRow as unknown as Record<string, number>).active) || 0,
      total_customers: Number((custRow  as Record<string, number>).total)  || 0,
      low_stock_count: Number((stockRow as Record<string, number>).low)    || 0,
      weekly_revenue:  Array.isArray(weeklyRows)   ? weeklyRows   : [],
      recent_orders:   Array.isArray(recentOrders) ? recentOrders : [],
      top_products:    Array.isArray(topProducts)  ? topProducts  : [],
      activity:        activity.slice(0, 6),
      payment_methods: Array.isArray(paymentMethods) ? paymentMethods : [],
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── timeAgo helper (server-side) ── */
function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}