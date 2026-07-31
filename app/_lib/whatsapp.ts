// app/_lib/whatsapp.ts
//
// MVP: no API keys, no Meta approval process, works today. Builds a wa.me
// link with the receipt pre-filled as text; staff taps the button, WhatsApp
// opens with the message ready to send.

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0"))   return "254" + cleaned.slice(1);
  if (cleaned.startsWith("254")) return cleaned;
  if (cleaned.startsWith("7") || cleaned.startsWith("1")) return "254" + cleaned;
  return cleaned;
}

export interface ReceiptSummary {
  order_number: string;
  store_name:   string;
  items:        { name: string; qty: number; unit_price: number }[];
  total:        number;
  currency:     string;
  etims_control_code?: string | null;
}

function buildReceiptText(r: ReceiptSummary): string {
  const lines = r.items
    .map(i => `${i.qty}x ${i.name} — ${r.currency} ${(i.qty * i.unit_price).toLocaleString()}`)
    .join("\n");

  return [
    `*${r.store_name}*`,
    `Receipt for order ${r.order_number}`,
    "",
    lines,
    "",
    `*Total: ${r.currency} ${r.total.toLocaleString()}*`,
    r.etims_control_code ? `KRA Control No: ${r.etims_control_code}` : "",
    "",
    "Thank you for your business!",
  ].filter(Boolean).join("\n");
}

export function buildReceiptWhatsAppLink(phone: string, receipt: ReceiptSummary): string {
  const number = normalizePhone(phone);
  const text   = encodeURIComponent(buildReceiptText(receipt));
  return `https://wa.me/${number}?text=${text}`;
}
