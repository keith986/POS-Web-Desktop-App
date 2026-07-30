import * as XLSX from "xlsx";

/**
 * Export one or more tables to a single .xlsx workbook.
 * sheets: [{ name: "Products", rows: [{...}, {...}] }]
 */
export function exportToExcel(filename, sheets) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows || []);
    // Reasonable auto column widths based on header/content length
    if (rows && rows.length > 0) {
      const headers = Object.keys(rows[0]);
      ws["!cols"] = headers.map((h) => ({
        wch: Math.min(40, Math.max(10, h.length + 2, ...rows.map((r) => String(r[h] ?? "").length + 2))),
      }));
    }
    XLSX.utils.book_append_sheet(wb, ws, (name || "Sheet1").substring(0, 31));
  });
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

/** Export a single table to CSV (lighter-weight than xlsx, opens anywhere). */
export function exportToCSV(filename, rows) {
  const ws = XLSX.utils.json_to_sheet(rows || []);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read a File (.csv, .xlsx, .xls) selected via <input type="file"> and
 * resolve to an array of row objects keyed by the header row.
 */
export function readImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const firstSheet = wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: "" });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsArrayBuffer(file);
  });
}

/** Download a ready-made template so users know which columns to fill in. */
export function downloadTemplate(filename, headers) {
  const ws = XLSX.utils.json_to_sheet([headers.reduce((acc, h) => ({ ...acc, [h]: "" }), {})]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
