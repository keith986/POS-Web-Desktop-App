import React, { useMemo } from "react";

/**
 * Shows parsed import rows with per-row validation before committing.
 *
 * columns: [{ key, label }]
 * mapRow: (rawRow) => { row: {...normalized}, errors: string[] }
 * onConfirm: (validNormalizedRows) => void
 */
export default function ImportPreviewModal({ title, rawRows, mapRow, columns, onConfirm, onClose, importing }) {
  const mapped = useMemo(() => rawRows.map((r) => mapRow(r)), [rawRows, mapRow]);
  const validRows = mapped.filter((m) => m.errors.length === 0);
  const errorRows = mapped.filter((m) => m.errors.length > 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 760, width: "94%" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title" style={{ marginBottom: 6 }}>{title}</h2>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, fontSize: 12 }}>
          <span className="badge badge-green">{validRows.length} ready to import</span>
          {errorRows.length > 0 && <span className="badge badge-red">{errorRows.length} with errors (skipped)</span>}
          <span style={{ color: "var(--text-3)" }}>{rawRows.length} rows found in file</span>
        </div>

        <div style={{ maxHeight: 360, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
          <table className="data-table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mapped.map((m, i) => (
                <tr key={i}>
                  <td className="row-number-cell">{i + 1}</td>
                  {columns.map((c) => (
                    <td key={c.key} style={{ color: m.errors.length ? "var(--text-3)" : "var(--text)" }}>
                      {String(m.row[c.key] ?? "—")}
                    </td>
                  ))}
                  <td>
                    {m.errors.length ? (
                      <span className="badge badge-red" title={m.errors.join(", ")}>{m.errors[0]}</span>
                    ) : (
                      <span className="badge badge-green">OK</span>
                    )}
                  </td>
                </tr>
              ))}
              {mapped.length === 0 && (
                <tr><td colSpan={columns.length + 2} style={{ textAlign: "center", padding: "2rem", color: "var(--text-3)" }}>No rows found in this file.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={importing}>Cancel</button>
          <button
            className="btn-primary"
            disabled={validRows.length === 0 || importing}
            onClick={() => onConfirm(validRows.map((m) => m.row))}
          >
            {importing ? "Importing…" : `Import ${validRows.length} row${validRows.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
