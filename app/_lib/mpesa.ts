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

export async function stkPush({
  phone, amount, accountRef, description,
}: {
  phone:       string;
  amount:      number;
  accountRef:  string;
  description: string;
}): Promise<{ CheckoutRequestID: string; ResponseCode: string; CustomerMessage: string }> {
  const token     = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey   = process.env.MPESA_PASSKEY!;
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const password  = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

  // Normalize phone — must be 254XXXXXXXXX
  const normalizedPhone = phone.replace(/^0/, "254").replace(/^\+/, "");

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
      TransactionType:   "CustomerPayBillOnline",
      Amount:            amount,
      PartyA:            normalizedPhone,
      PartyB:            shortcode,
      PhoneNumber:       normalizedPhone,
      CallBackURL:       process.env.MPESA_CALLBACK_URL,
      AccountReference:  accountRef,
      TransactionDesc:   description,
    }),
  });

  return res.json();
}

export async function stkQuery(checkoutRequestId: string) {
  const token     = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey   = process.env.MPESA_PASSKEY!;
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const password  = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

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