// app/_lib/mpesa.ts
const MPESA_BASE_URL = "https://api.safaricom.co.ke";

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const res = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  const data = await res.json();
  return data.access_token;
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
}

function getPassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0"))   return "254" + cleaned.slice(1);
  if (cleaned.startsWith("254")) return cleaned;
  if (cleaned.startsWith("7") || cleaned.startsWith("1")) return "254" + cleaned;
  return cleaned;
}

// ─────────────────────────────────────────
// STK PUSH
// ─────────────────────────────────────────
export async function stkPush({
  phone,
  amount,
  accountRef,
  description,
  partyB,        // ← optional: admin's till number for sale payments
                 //   omit for subscription payments (uses platform shortcode)
}: {
  phone:        string;
  amount:       number;
  accountRef:   string;
  description:  string;
  partyB?:      string;
}): Promise<{
  CheckoutRequestID:  string;
  MerchantRequestID?: string;
  ResponseCode:       string;
  ResponseDescription?: string;
  CustomerMessage:    string;
  errorMessage?:      string;
}> {
  const token     = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey   = process.env.MPESA_PASSKEY!;
  const timestamp = getTimestamp();
  const password  = getPassword(shortcode, passkey, timestamp);

  const sanitizedPhone    = normalizePhone(phone);
  const receivingParty    = partyB ?? shortcode;

  // CustomerBuyGoodsOnline → till number (sale payments to admin)
  // CustomerPayBillOnline  → paybill    (subscription payments to platform)
  const transactionType = partyB
    ? "CustomerBuyGoodsOnline"
    : "CustomerPayBillOnline";

  const res = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   transactionType,
      Amount:            Math.ceil(amount),   // M-Pesa only accepts whole numbers
      PartyA:            sanitizedPhone,
      PartyB:            receivingParty,
      PhoneNumber:       sanitizedPhone,
      CallBackURL:       process.env.MPESA_CALLBACK_URL,
      AccountReference:  accountRef,
      TransactionDesc:   description,
    }),
  });

  return res.json();
}

// ─────────────────────────────────────────
// STK QUERY  (unchanged from your original)
// ─────────────────────────────────────────
export async function stkQuery(checkoutRequestId: string) {
  const token     = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey   = process.env.MPESA_PASSKEY!;
  const timestamp = getTimestamp();
  const password  = getPassword(shortcode, passkey, timestamp);

  const res = await fetch(`${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password:          password,
      Timestamp:         timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });

  return res.json();
}