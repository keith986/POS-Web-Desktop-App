/**
 * exportToCsv
 * ─────────────────────────────────────────
 * Converts an array of objects into a CSV file and triggers a browser
 * download. Used across the admin dashboard (e.g. Orders → "Export CSV").
 *
 * Usage:
 *   exportToCsv("orders", filtered, [
 *     { key: "order_number",  label: "Order #" },
 *     { key: "total",         label: "Total", format: v => formatCurrency(v as number) },
 *     { key: "created_at",    label: "Date",  format: v => new Date(v as string).toLocaleString() },
 *   ]);
 */

export interface CsvColumn<T> {
  /** Property on each row to read. Supports dot-notation for nested values, e.g. "customer.name". */
  key: keyof T | string;
  /** Column header shown in the CSV. */
  label: string;
  /** Optional formatter — receives the raw value, returns the display string. */
  format?: (value: unknown, row: T) => string;
}

function getValue<T>(row: T, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
    return undefined;
  }, row);
}

/** Escapes a single CSV field per RFC 4180 (wraps in quotes if it contains a comma, quote, or newline). */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  if (typeof window === "undefined") return;

  const header = columns.map(col => escapeCsvField(col.label)).join(",");

  const lines = rows.map(row =>
    columns
      .map(col => {
        const raw = getValue(row, col.key as string);
        const display = col.format ? col.format(raw, row) : raw;
        return escapeCsvField(display);
      })
      .join(",")
  );

  // Leading BOM so Excel opens UTF-8 CSVs (e.g. "Ksh", accented names) correctly.
  const csv = "\uFEFF" + [header, ...lines].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);

  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  link.href = url;
  link.download = `${filename}-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
