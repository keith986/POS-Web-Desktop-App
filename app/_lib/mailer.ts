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

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,  
  storeName?: string
): Promise<boolean> {
  const displayName = storeName ?? "POStore";

  // ── 2. Verify transporter can connect to Gmail ──
  try {
    await transporter.verify();
    console.log("✅ SMTP connection verified — Gmail is reachable");
  } catch (verifyError) {
    console.error("❌ SMTP verify failed:", verifyError);
    throw verifyError; // bubble up so API returns real error
  }

  try{
  await transporter.sendMail({
    from: `"${displayName}" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Reset your password",
    html: `
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
                  <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                    <tr>
                    <td style="padding-left:10px;">
                      <span style="font-size:15px;font-weight:600;color:#141410;">${displayName}</span>
                    </td>
                    </tr>
                 </table>
                 </td>
               </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:32px;">

                    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#141410;letter-spacing:-0.5px;">
                      Reset your password
                    </h1>
                    <p style="margin:0 0 24px;font-size:14px;color:#9a9a8e;line-height:1.6;">
                      We received a request to reset your password. Click the button below to create a new one. This link expires in <strong style="color:#141410;">1 hour</strong>.
                    </p>

                    <!-- CTA Button -->
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

                    <!-- Divider -->
                    <div style="margin:28px 0;border-top:1px solid #e2e0d8;"></div>

                    <!-- Fallback link -->
                    <p style="margin:0 0 6px;font-size:12px;color:#9a9a8e;">
                      Button not working? Copy and paste this link into your browser:
                    </p>
                    <p style="margin:0;font-size:11px;color:#4a4a40;word-break:break-all;background:#f5f4f0;padding:10px 12px;border-radius:7px;border:1px solid #e2e0d8;">
                      ${resetUrl}
                    </p>

                    <!-- Security note -->
                    <div style="margin-top:24px;padding:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
                    <p style="margin:0;font-size:12px;color:#92400e;line-height:1.5;display:flex;align-items:flex-start;gap:8px;">
                    If you didn't request this, you can safely ignore this email. Your password won't change.
                    </p>
                    </div>
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
    `,
    text: `Reset your password\n\nClick this link to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
  });

   return true;
  }catch(err){
    console.log("Error sending password reset email:", err);
    return false;
  }
}