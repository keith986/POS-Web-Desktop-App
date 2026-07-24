import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
  debug: true,
  logger: true
});

/* ─────────────────────────────────────────────────────────────
   SHARED EMAIL SHELL
   Every notification email (password reset, new order, low
   stock, staff login, daily report) renders inside this same
   card so the brand stays consistent. Callers only supply the
   inner content block + a plain-text fallback.
───────────────────────────────────────────────────────────── */
function renderEmailShell(opts: {
  displayName: string;
  preheader?: string;
  bodyHtml:   string;
}): string {
  const { displayName, bodyHtml } = opts;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f5f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e2e0d8;overflow:hidden;">

              <!-- Header -->
              <tr>
                <td style="padding:32px 32px 24px;border-bottom:1px solid #e2e0d8;text-align:center;">
                  <span style="font-size:15px;font-weight:600;color:#141410;">${displayName}</span>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px;">
                  ${bodyHtml}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:20px 32px;background:#fafaf8;border-top:1px solid #e2e0d8;">
                  <p style="margin:0;font-size:11px;color:#c8c6bc;text-align:center;line-height:1.6;">
                    This email was sent by ${displayName} team<br>
                    <a href="https://pos.upendoapps.com" style="color:#9a9a8e;text-decoration:none;">pos.upendoapps.com</a>
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function statRow(label: string, value: string, emphasis = false): string {
  return `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#9a9a8e;">${label}</td>
      <td style="padding:6px 0;font-size:${emphasis ? "15px" : "13px"};color:#141410;font-weight:${emphasis ? "700" : "500"};text-align:right;">${value}</td>
    </tr>
  `;
}

async function dispatch(to: string, subject: string, html: string, text: string): Promise<boolean> {
  try {
    await transporter.verify();
  } catch (verifyError) {
    console.error("❌ SMTP verify failed:", verifyError);
    throw verifyError;
  }

  try {
    await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME ?? "POStore"}" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (err) {
    console.error(`Error sending email ("${subject}") to ${to}:`, err);
    return false;
  }
}

/* ─────────────────────────────────────────────────────────────
   PASSWORD RESET  (unchanged behavior, now built on the shell)
───────────────────────────────────────────────────────────── */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  storeName?: string
): Promise<boolean> {
  const displayName = storeName ?? "POStore";

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#141410;letter-spacing:-0.5px;">
      Reset your password
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#9a9a8e;line-height:1.6;">
      We received a request to reset your password. Click the button below to create a new one. This link expires in <strong style="color:#141410;">1 hour</strong>.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center">
          <a href="${resetUrl}"
            style="display:inline-block;padding:13px 32px;background:#141410;color:#ffffff;text-decoration:none;border-radius:9px;font-size:14px;font-weight:600;letter-spacing:0.2px;">
            Reset my password →
          </a>
        </td>
      </tr>
    </table>

    <div style="margin:28px 0;border-top:1px solid #e2e0d8;"></div>

    <p style="margin:0 0 6px;font-size:12px;color:#9a9a8e;">
      Button not working? Copy and paste this link into your browser:
    </p>
    <p style="margin:0;font-size:11px;color:#4a4a40;word-break:break-all;background:#f5f4f0;padding:10px 12px;border-radius:7px;border:1px solid #e2e0d8;">
      ${resetUrl}
    </p>

    <div style="margin-top:24px;padding:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
      <p style="margin:0;font-size:12px;color:#92400e;line-height:1.5;">
        If you didn't request this, you can safely ignore this email. Your password won't change.
      </p>
    </div>
  `;

  const html = renderEmailShell({ displayName, bodyHtml: body });
  const text = `Reset your password\n\nClick this link to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`;

  return dispatch(to, "Reset your password", html, text);
}

/* ─────────────────────────────────────────────────────────────
   NEW ORDER NOTIFICATION → sent to the store's notif_email
   whenever a sale is recorded (Settings → notif_new_order).
───────────────────────────────────────────────────────────── */
export async function sendNewOrderEmail(
  to: string,
  order: {
    order_number:   string;
    customer_name:  string;
    total:          number;
    payment_method: string;
    item_count:     number;
    currency?:      string;
  },
  storeName?: string
): Promise<boolean> {
  const displayName = storeName ?? "POStore";
  const currency = order.currency ?? "KES";

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#141410;letter-spacing:-0.5px;">
      New order received
    </h1>
    <p style="margin:0 0 20px;font-size:14px;color:#9a9a8e;line-height:1.6;">
      Order <strong style="color:#141410;">#${order.order_number}</strong> was just recorded.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:#f5f4f0;border-radius:10px;border:1px solid #e2e0d8;padding:16px;">
      ${statRow("Customer", order.customer_name)}
      ${statRow("Items", String(order.item_count))}
      ${statRow("Payment method", order.payment_method.toUpperCase())}
      ${statRow("Total", `${currency} ${order.total.toFixed(2)}`, true)}
    </table>

    <p style="margin:20px 0 0;font-size:12px;color:#9a9a8e;line-height:1.6;">
      You're getting this because "New Order" notifications are turned on in Settings → Notifications.
    </p>
  `;

  const html = renderEmailShell({ displayName, bodyHtml: body });
  const text = `New order received\n\nOrder #${order.order_number}\nCustomer: ${order.customer_name}\nItems: ${order.item_count}\nPayment: ${order.payment_method.toUpperCase()}\nTotal: ${currency} ${order.total.toFixed(2)}`;

  return dispatch(to, `New order #${order.order_number} — ${currency} ${order.total.toFixed(2)}`, html, text);
}

/* ─────────────────────────────────────────────────────────────
   LOW STOCK ALERT → sent when a product crosses below the
   low-stock threshold (Settings → notif_low_stock).
───────────────────────────────────────────────────────────── */
export async function sendLowStockEmail(
  to: string,
  product: {
    name:      string;
    sku?:      string | null;
    stock:     number;
    threshold: number;
  },
  storeName?: string
): Promise<boolean> {
  const displayName = storeName ?? "POStore";

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#141410;letter-spacing:-0.5px;">
      Low stock alert
    </h1>
    <p style="margin:0 0 20px;font-size:14px;color:#9a9a8e;line-height:1.6;">
      <strong style="color:#141410;">${product.name}</strong>${product.sku ? ` (SKU: ${product.sku})` : ""} has dropped below your low-stock threshold.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:#fffbeb;border-radius:10px;border:1px solid #fde68a;padding:16px;">
      ${statRow("Current stock", String(product.stock), true)}
      ${statRow("Threshold", String(product.threshold))}
    </table>

    <p style="margin:20px 0 0;font-size:12px;color:#9a9a8e;line-height:1.6;">
      You're getting this because "Low Stock Alert" notifications are turned on in Settings → Notifications.
    </p>
  `;

  const html = renderEmailShell({ displayName, bodyHtml: body });
  const text = `Low stock alert\n\n${product.name}${product.sku ? ` (SKU: ${product.sku})` : ""}\nCurrent stock: ${product.stock}\nThreshold: ${product.threshold}`;

  return dispatch(to, `Low stock: ${product.name} (${product.stock} left)`, html, text);
}

/* ─────────────────────────────────────────────────────────────
   STAFF LOGIN ALERT → sent when a staff member signs in
   (Settings → notif_staff_login).
───────────────────────────────────────────────────────────── */
export async function sendStaffLoginEmail(
  to: string,
  login: {
    staff_name: string;
    email:      string;
    ip:         string;
    time?:      Date;
  },
  storeName?: string
): Promise<boolean> {
  const displayName = storeName ?? "POStore";
  const when = (login.time ?? new Date()).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" });

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#141410;letter-spacing:-0.5px;">
      Staff sign-in
    </h1>
    <p style="margin:0 0 20px;font-size:14px;color:#9a9a8e;line-height:1.6;">
      <strong style="color:#141410;">${login.staff_name}</strong> just signed in to your store dashboard.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:#f5f4f0;border-radius:10px;border:1px solid #e2e0d8;padding:16px;">
      ${statRow("Email", login.email)}
      ${statRow("IP address", login.ip)}
      ${statRow("Time", when)}
    </table>

    <p style="margin:20px 0 0;font-size:12px;color:#9a9a8e;line-height:1.6;">
      You're getting this because "Staff Login" notifications are turned on in Settings → Notifications.
    </p>
  `;

  const html = renderEmailShell({ displayName, bodyHtml: body });
  const text = `Staff sign-in\n\n${login.staff_name} (${login.email})\nIP: ${login.ip}\nTime: ${when}`;

  return dispatch(to, `Staff sign-in: ${login.staff_name}`, html, text);
}

/* ─────────────────────────────────────────────────────────────
   DAILY SUMMARY REPORT → sent every morning if enabled
   (Settings → notif_daily_report). Triggered by an external
   scheduler hitting /api/notifications/daily-report.
───────────────────────────────────────────────────────────── */
export async function sendDailyReportEmail(
  to: string,
  report: {
    date:          string;
    order_count:   number;
    total_revenue: number;
    avg_order:     number;
    low_stock_count: number;
    currency?:     string;
  },
  storeName?: string
): Promise<boolean> {
  const displayName = storeName ?? "POStore";
  const currency = report.currency ?? "KES";

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#141410;letter-spacing:-0.5px;">
      Your daily summary
    </h1>
    <p style="margin:0 0 20px;font-size:14px;color:#9a9a8e;line-height:1.6;">
      Here's how ${displayName} did on <strong style="color:#141410;">${report.date}</strong>.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:#f5f4f0;border-radius:10px;border:1px solid #e2e0d8;padding:16px;">
      ${statRow("Orders", String(report.order_count))}
      ${statRow("Revenue", `${currency} ${report.total_revenue.toFixed(2)}`, true)}
      ${statRow("Avg. order value", `${currency} ${report.avg_order.toFixed(2)}`)}
      ${statRow("Products low on stock", String(report.low_stock_count))}
    </table>

    <p style="margin:20px 0 0;font-size:12px;color:#9a9a8e;line-height:1.6;">
      You're getting this because "Daily Summary" notifications are turned on in Settings → Notifications.
    </p>
  `;

  const html = renderEmailShell({ displayName, bodyHtml: body });
  const text = `Daily summary — ${report.date}\n\nOrders: ${report.order_count}\nRevenue: ${currency} ${report.total_revenue.toFixed(2)}\nAvg. order: ${currency} ${report.avg_order.toFixed(2)}\nLow stock products: ${report.low_stock_count}`;

  return dispatch(to, `Daily summary — ${report.date}`, html, text);
}
