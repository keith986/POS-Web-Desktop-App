import React, { useRef } from "react";
import { UploadIcon } from "./Icons";

/**
 *   <ImportButton onFile={(file) => handleFile(file)} />
 */
export default function ImportButton({ onFile, label = "Import" }) {
  const inputRef = useRef(null);

  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()}>
        <UploadIcon size={13} /> {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </>
  );
}
