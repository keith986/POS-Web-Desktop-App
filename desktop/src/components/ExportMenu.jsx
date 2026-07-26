import React, { useState, useRef, useEffect } from "react";
import { DownloadIcon, FileSpreadsheetIcon, FilePdfIcon, ChevronDownIcon } from "./Icons";

/**
 * A small "Export" button that opens a dropdown of available export formats.
 * Only formats with a handler passed in are shown.
 *
 *   <ExportMenu
 *     onExportExcel={() => exportToExcel(...)}
 *     onExportCSV={() => exportToCSV(...)}
 *     onExportPDF={() => buildPdfReport(...)}
 *   />
 */
export default function ExportMenu({ onExportExcel, onExportCSV, onExportPDF, label = "Export" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const run = (fn) => { setOpen(false); fn && fn(); };

  return (
    <div className="export-menu" ref={ref}>
      <button type="button" className="btn-secondary export-menu-btn" onClick={() => setOpen((o) => !o)}>
        <DownloadIcon size={13} /> {label} <ChevronDownIcon size={10} />
      </button>
      {open && (
        <div className="export-dropdown">
          {onExportExcel && (
            <button type="button" className="export-dropdown-item" onClick={() => run(onExportExcel)}>
              <FileSpreadsheetIcon size={14} /> Export as Excel (.xlsx)
            </button>
          )}
          {onExportCSV && (
            <button type="button" className="export-dropdown-item" onClick={() => run(onExportCSV)}>
              <FileSpreadsheetIcon size={14} /> Export as CSV
            </button>
          )}
          {onExportPDF && (
            <button type="button" className="export-dropdown-item" onClick={() => run(onExportPDF)}>
              <FilePdfIcon size={14} /> Export as PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
}
