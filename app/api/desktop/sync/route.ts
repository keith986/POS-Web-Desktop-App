import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/app/_lib/db";
import { RowDataPacket } from "mysql2";

interface AdminRow extends RowDataPacket {
  id: string;
  full_name: string;
  email: string;
  password: string;
  role: string;
  store_name: string;
  domain: string;
  pos_type: string;
  subdomain_status: string;
}

interface StaffRow extends RowDataPacket {
  id: string;
  full_name: string;
  email: string;
  password: string;
  role: string;
  status: string;
}

interface ProductRow extends RowDataPacket {
  id: string;
  name: string;
  category: string;  
  price: number;
  stock: number;
  sku: string;
  description: string;
  status: string;
  emoji: string;  
}

interface AdminIdRow extends RowDataPacket {
  id: string;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

// POST /api/desktop/sync
// Called by desktop app on first launch to pull users + products
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    const pool = await getPool();

    // Get admin for this domain
    const [adminRows] = await pool.query<AdminRow[]>(
      `SELECT id, full_name, email, password, role, store_name, domain, pos_type, subdomain_status
       FROM users 
       WHERE domain = ? AND role = 'admin' AND subdomain_status = 'active'
       LIMIT 1`,
      [domain]
    );

    if (!adminRows.length) {
      return NextResponse.json(
        { error: "Store not found or inactive" },
        { status: 404 }
      );
    }

    const admin = adminRows[0];

    // Get all active staff for this admin
    const [staffRows] = await pool.query<StaffRow[]>(
      `SELECT s.id, s.full_name, s.email, s.password, s.shift_role as role, s.status
       FROM staff s
       WHERE s.admin_id = ? AND s.status = 'active'`,
      [admin.id]
    );

    // Get all active products for this admin
    const [productRows] = await pool.query<ProductRow[]>(
      `SELECT id, name, category, price, stock, sku, description, status, emoji
       FROM products 
       WHERE admin_id = ? AND status = 'active'
       ORDER BY name`,
      [admin.id]
    );

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        full_name: admin.full_name,
        email: admin.email,
        password: admin.password,
        role: "admin",
        store_name: admin.store_name,
        domain: admin.domain,
        pos_type: admin.pos_type,
      },
      staff: staffRows.map((s) => ({
        id: s.id,
        full_name: s.full_name,
        email: s.email,
        password: s.password,
        role: "staff",
        status: s.status,
      })),
      products: productRows.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        sku: p.sku ?? "",
        description: p.description ?? "",
        emoji: p.emoji ?? "",
        is_active: p.status === "active" ? 1 : 0,
      })),
    }, { headers: corsHeaders() });
  } catch (error) {
    console.error("Desktop sync error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// PUT /api/desktop/sync
// Called by desktop app to push offline orders to server
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { order, items, domain } = await request.json();

    if (!domain || !order) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const pool = await getPool();

    const [adminRows] = await pool.query<AdminIdRow[]>(
      "SELECT id FROM users WHERE domain = ? LIMIT 1",
      [domain]
    );

    if (!adminRows.length) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const adminId = adminRows[0].id;

    // Normalize items array — handle both desktop and web field names
    const normalizedItems = (items ?? []).map((item: Record<string, unknown>) => ({
      id: item.id,
      name: item.name || item.product_name,
      product_name: item.product_name || item.name,
      qty: item.qty || item.quantity,
      quantity: item.quantity || item.qty,
      price: item.price || item.unit_price,
      unit_price: item.unit_price || item.price,
      total_price: item.total_price || (Number(item.unit_price || item.price) * Number(item.quantity || item.qty)),
    }));

    await pool.query(
      `INSERT IGNORE INTO orders 
        (id, order_number, customer_name, customer_email, items, subtotal, tax, total, 
         status, payment_method, payment_status, staff_name, admin_id, created_at)
       VALUES (?, ?, 'Walk-in Customer', '', ?, ?, ?, ?, 'completed', ?, 'paid', ?, ?, ?)`,
      [
        order.id,
        order.order_number,
        JSON.stringify(normalizedItems),
        order.subtotal,
        order.tax,
        order.total,
        order.payment_method ?? "cash",
        order.staff_name ?? "Staff",
        adminId,
        order.created_at ?? new Date().toISOString(),
      ]
    );

    // Check if auto-deduct inventory is enabled for this admin
    const [settRows] = await pool.query(
      "SELECT auto_deduct_inventory FROM settings WHERE admin_id = ? LIMIT 1",
      [adminId]
    );

    const setting = (settRows as Record<string, unknown>[])[0];
    const autoDeduct = Boolean(setting?.auto_deduct_inventory ?? false);

    // Deduct inventory if setting is enabled
    if (autoDeduct && normalizedItems.length > 0) {
      for (const item of normalizedItems) {
        if (!item.id || !item.quantity) continue;

        // Deduct stock — never below 0
        await pool.query(
          `UPDATE products
             SET stock = GREATEST(stock - ?, 0), updated_at = NOW()
           WHERE id = ? AND admin_id = ?`,
          [Number(item.quantity), item.id, adminId]
        );

        // Log to stock_movements for audit trail
        await pool.query(
          `INSERT INTO stock_movements 
            (id, product_id, admin_id, quantity, reason, created_at)
           VALUES (UUID(), ?, ?, ?, ?, NOW())`,
          [item.id, adminId, -Number(item.quantity), `Desktop sync: Order ${order.order_number}`]
        );
      }
    }

    return NextResponse.json({ success: true },{ headers: corsHeaders() });
  } catch (error) {
    console.error("Order sync error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500, headers: corsHeaders() }
    );
  }
}