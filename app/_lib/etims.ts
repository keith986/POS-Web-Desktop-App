// app/_lib/etims.ts
//
// KRA eTIMS (VSCU) client. Field names below follow KRA's general VSCU
// invoice payload shape — confirm the exact request/response schema against
// the spec you receive when registering as an OSCU/VSCU integrator on
// KRA's developer portal, since small naming differences exist between
// KRA API versions and this hasn't been validated against a live sandbox.

import { getPool } from "@/app/_lib/db";

const ETIMS_BASE_URL = process.env.ETIMS_BASE_URL || "https://etims-api.kra.go.ke/etims-api";

interface EtimsSettingsRow {
  etims_enabled:   number | boolean;
  etims_pin:       string | null;
  etims_branch_id: string;
  etims_cmc_key:   string | null;
}

export interface OrderForEtims {
  id:             string;
  order_number:   string;
  customer_name:  string;
  customer_pin?:  string | null;
  items:          { name: string; quantity: number; price: number; sku?: string }[];
  subtotal:       number;
  tax:            number;
  total:          number;
  payment_method: string;
}

export interface EtimsResult {
  status:          "submitted" | "failed";
  invoiceNumber?:  string;
  controlCode?:    string;
  qrUrl?:          string;
  error?:          string;
}

async function getEtimsSettings(admin_id: string): Promise<EtimsSettingsRow | null> {
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT etims_enabled, etims_pin, etims_branch_id, etims_cmc_key
     FROM settings WHERE admin_id = ? LIMIT 1`,
    [admin_id]
  );
  const s = (rows as EtimsSettingsRow[])[0];
  return s ?? null;
}

function buildInvoicePayload(order: OrderForEtims, settings: EtimsSettingsRow) {
  return {
    tin:       settings.etims_pin,
    bhfId:     settings.etims_branch_id,
    invcNo:    order.order_number,
    custTin:   order.customer_pin || null,
    custNm:    order.customer_name,
    salesTyCd: "N",
    rcptTyCd:  "S",
    pmtTyCd:   order.payment_method?.toLowerCase().includes("mpesa") ? "05" : "01",
    totAmt:    order.total,
    taxAmt:    order.tax,
    itemList:  order.items.map((it, idx) => ({
      itemSeq:  idx + 1,
      itemNm:   it.name,
      itemCd:   it.sku || null,
      qty:      it.quantity,
      prc:      it.price,
      splyAmt:  it.quantity * it.price,
      taxTyCd:  "B",
    })),
  };
}

/** Fire-and-forget from POST /api/orders — a KRA outage must never block a sale. */
export async function submitEtimsInvoice(order: OrderForEtims, admin_id: string): Promise<EtimsResult> {
  try {
    const settings = await getEtimsSettings(admin_id);

    if (!settings || !settings.etims_enabled) {
      return { status: "failed", error: "eTIMS not enabled for this store" };
    }
    if (!settings.etims_pin || !settings.etims_cmc_key) {
      return { status: "failed", error: "Missing KRA PIN or CMC key in settings" };
    }

    const payload = buildInvoicePayload(order, settings);

    const res = await fetch(`${ETIMS_BASE_URL}/invoices`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${settings.etims_cmc_key}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || data.resultCd !== "000") {
      return { status: "failed", error: data.resultMsg || `KRA error ${res.status}` };
    }

    return {
      status:        "submitted",
      invoiceNumber: data.invcNo,
      controlCode:   data.rcptSign,
      qrUrl:         data.qrCodeUrl,
    };
  } catch (err) {
    return { status: "failed", error: (err as Error).message };
  }
}

export async function saveEtimsResult(order_id: string, result: EtimsResult): Promise<void> {
  const pool = await getPool();
  await pool.query(
    `UPDATE orders SET
       etims_status         = ?,
       etims_invoice_number = ?,
       etims_control_code   = ?,
       etims_qr_url         = ?,
       etims_error           = ?
     WHERE id = ?`,
    [
      result.status,
      result.invoiceNumber ?? null,
      result.controlCode ?? null,
      result.qrUrl ?? null,
      result.error ?? null,
      order_id,
    ]
  );
}
