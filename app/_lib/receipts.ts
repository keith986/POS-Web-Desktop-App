import { getPool } from "./db";

/**
 * Generate receipt content from order data
 */
export async function generateReceipt(
  order_id: string,
  admin_id: string,
  options: { includeQR?: boolean; footerText?: string } = {}
): Promise<{ html: string; text: string }> {
  const pool = await getPool();

  // Fetch order with settings
  const [orderRows] = await pool.query(
    `SELECT o.*, s.store_name, s.address, s.phone, s.email, s.tax_rate, s.tax_name, s.receipt_footer
     FROM orders o
     JOIN settings s ON o.admin_id = s.admin_id
     WHERE o.id = ? AND o.admin_id = ?`,
    [order_id, admin_id]
  );

  if ((orderRows as unknown[]).length === 0) {
    throw new Error("Order not found");
  }

  const order = (orderRows as any[])[0];
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

  // Generate plain text receipt
  const textReceipt = generateTextReceipt(order, items, options);

  // Generate HTML receipt
  const htmlReceipt = generateHTMLReceipt(order, items, options);

  return {
    html: htmlReceipt,
    text: textReceipt,
  };
}

/**
 * Generate plain text receipt
 */
function generateTextReceipt(
  order: any,
  items: any[],
  options: { includeQR?: boolean; footerText?: string }
): string {
  const { store_name, address, phone, email, tax_rate, tax_name, receipt_footer } = order;

  let receipt = `
${'='.repeat(40)}
${store_name.toUpperCase()}
${'='.repeat(40)}

Order #: ${order.order_number}
Date: ${new Date(order.created_at).toLocaleString()}
Cashier: ${order.staff_name || 'N/A'}
Customer: ${order.customer_name}
${order.customer_email ? `Email: ${order.customer_email}` : ''}

${'-'.repeat(40)}
ITEMS:
${'-'.repeat(40)}
`;

  let subtotal = 0;
  items.forEach((item: any) => {
    const lineTotal = item.qty * item.unit_price;
    subtotal += lineTotal;
    receipt += `${item.name.substring(0, 20).padEnd(20)} ${item.qty}x $${item.unit_price.toFixed(2)} = $${lineTotal.toFixed(2)}\n`;
  });

  receipt += `
${'-'.repeat(40)}
Subtotal:     $${subtotal.toFixed(2)}
Tax (${tax_rate}% ${tax_name}): $${order.tax.toFixed(2)}
${order.discount_amount ? `Discount:     -$${order.discount_amount.toFixed(2)}\n` : ''}
Total:        $${order.total.toFixed(2)}
${'-'.repeat(40)}

Payment Method: ${order.payment_method.toUpperCase()}
Status: ${order.status.toUpperCase()}

${address ? `Address: ${address}` : ''}
${phone ? `Phone: ${phone}` : ''}
${email ? `Email: ${email}` : ''}

${receipt_footer || 'Thank you for your business!'}
${options.footerText ? `\n${options.footerText}` : ''}

${'='.repeat(40)}
`;

  return receipt;
}

/**
 * Generate HTML receipt
 */
function generateHTMLReceipt(
  order: any,
  items: any[],
  options: { includeQR?: boolean; footerText?: string }
): string {
  const { store_name, address, phone, email, tax_rate, tax_name, receipt_footer } = order;

  let subtotal = 0;
  const itemsHTML = items
    .map((item: any) => {
      const lineTotal = item.qty * item.unit_price;
      subtotal += lineTotal;
      return `
        <tr>
          <td>${item.name}</td>
          <td style="text-align: right;">${item.qty}</td>
          <td style="text-align: right;">$${item.unit_price.toFixed(2)}</td>
          <td style="text-align: right;">$${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt ${order.order_number}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .receipt { border: 1px solid #ddd; padding: 20px; background: #f9f9f9; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
    .header h1 { margin: 0; }
    .header p { margin: 5px 0; font-size: 12px; }
    .order-info { margin: 15px 0; font-size: 13px; }
    .order-info p { margin: 3px 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f0f0f0; font-weight: bold; }
    .totals { margin-top: 15px; border-top: 2px solid #333; padding-top: 10px; }
    .totals-row { display: flex; justify-content: space-between; margin: 5px 0; }
    .total-row { font-weight: bold; font-size: 16px; }
    .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>${store_name}</h1>
      <p>Order #${order.order_number}</p>
      <p>${new Date(order.created_at).toLocaleString()}</p>
    </div>

    <div class="order-info">
      <p><strong>Customer:</strong> ${order.customer_name}</p>
      ${order.customer_email ? `<p><strong>Email:</strong> ${order.customer_email}</p>` : ''}
      ${order.staff_name ? `<p><strong>Cashier:</strong> ${order.staff_name}</p>` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: right;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal:</span>
        <span>$${subtotal.toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span>Tax (${tax_rate}% ${tax_name}):</span>
        <span>$${order.tax.toFixed(2)}</span>
      </div>
      ${order.discount_amount ? `<div class="totals-row"><span>Discount:</span><span>-$${order.discount_amount.toFixed(2)}</span></div>` : ''}
      <div class="totals-row total-row">
        <span>Total:</span>
        <span>$${order.total.toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span>Payment Method:</span>
        <span>${order.payment_method.toUpperCase()}</span>
      </div>
      <div class="totals-row">
        <span>Status:</span>
        <span>${order.status.toUpperCase()}</span>
      </div>
    </div>

    <div class="footer">
      ${address ? `<p>${address}</p>` : ''}
      ${phone ? `<p>Phone: ${phone}</p>` : ''}
      ${email ? `<p>Email: ${email}</p>` : ''}
      <p style="margin-top: 10px;">${receipt_footer || 'Thank you for your business!'}</p>
      ${options.footerText ? `<p>${options.footerText}</p>` : ''}
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Apply discount to order
 */
export async function applyDiscount(
  order_id: string,
  discount_code: string,
  admin_id: string
): Promise<{ discount_amount: number; discount_id: string }> {
  const pool = await getPool();

  // Find discount by code
  const [discountRows] = await pool.query(
    `SELECT * FROM discounts 
     WHERE code = ? AND admin_id = ? AND is_active = 1
     AND (valid_from IS NULL OR valid_from <= NOW())
     AND (valid_until IS NULL OR valid_until >= NOW())`,
    [discount_code, admin_id]
  );

  if ((discountRows as unknown[]).length === 0) {
    throw new Error("Discount code not found or expired");
  }

  const discount = (discountRows as any[])[0];

  // Check usage limit
  if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
    throw new Error("Discount code usage limit exceeded");
  }

  // Get order
  const [orderRows] = await pool.query(
    "SELECT * FROM orders WHERE id = ? AND admin_id = ?",
    [order_id, admin_id]
  );

  if ((orderRows as unknown[]).length === 0) {
    throw new Error("Order not found");
  }

  const order = (orderRows as any[])[0];
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

  // Calculate discount amount
  let discountAmount = 0;
  const subtotal = items.reduce((sum: number, item: any) => sum + item.qty * item.unit_price, 0);

  if (discount.discount_type === 'percentage') {
    discountAmount = (subtotal * discount.discount_value) / 100;
    if (discount.max_discount) {
      discountAmount = Math.min(discountAmount, discount.max_discount);
    }
  } else if (discount.discount_type === 'fixed') {
    discountAmount = discount.discount_value;
  }

  // Update order
  await pool.query(
    "UPDATE orders SET discount_amount = ?, discount_code = ? WHERE id = ?",
    [discountAmount, discount_code, order_id]
  );

  // Increment usage count
  await pool.query("UPDATE discounts SET usage_count = usage_count + 1 WHERE id = ?", [discount.id]);

  return {
    discount_amount: discountAmount,
    discount_id: discount.id,
  };
}

/**
 * Lookup product by barcode
 */
export async function lookupByBarcode(
  barcode: string,
  admin_id: string
): Promise<any | null> {
  const pool = await getPool();

  const [rows] = await pool.query(
    `SELECT p.* FROM products p
     JOIN barcodes b ON p.id = b.product_id
     WHERE b.barcode = ? AND p.admin_id = ? AND p.status = 'active'`,
    [barcode, admin_id]
  );

  return (rows as any[]).length > 0 ? (rows as any[])[0] : null;
}
