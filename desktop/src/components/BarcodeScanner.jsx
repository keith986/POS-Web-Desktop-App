import React, { useEffect, useRef, useState } from "react";
import { XIcon, BoxIcon } from "./Icons";

/**
 * Camera-based barcode scanner modal.
 * Renders a live video feed from the device camera with an animated
 * scanning frame (corner brackets + moving laser line), decodes common
 * 1D/2D barcode formats via html5-qrcode, and falls back to manual entry
 * if no camera is available.
 *
 * Props:
 *  - open: boolean, whether the modal is shown
 *  - onClose: () => void
 *  - onDetect: (code: string) => void   called every time a code is read
 *  - continuous: boolean (default true)  keep scanning after a hit vs. auto-close
 *  - title: string
 */
export default function BarcodeScanner({ open, onClose, onDetect, continuous = true, title = "Scan barcode" }) {
  const regionId = "barcode-scan-region";
  const scannerRef = useRef(null);
  const lastHitRef = useRef({ code: "", time: 0 });
  const [status, setStatus] = useState("starting"); // starting | scanning | detected | error
  const [errorMsg, setErrorMsg] = useState("");
  const [lastCode, setLastCode] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus("starting");
    setErrorMsg("");
    setManualMode(false);
    setManualCode("");

    import("html5-qrcode").then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      if (cancelled) return;
      let scanner;
      try {
        scanner = new Html5Qrcode(regionId, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
        });
      } catch (e) {
        setStatus("error");
        setErrorMsg("Couldn't start the scanner engine.");
        return;
      }
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 150 } },
          (decodedText) => {
            if (cancelled) return;
            const now = Date.now();
            // Ignore the same code re-firing across consecutive frames
            if (decodedText === lastHitRef.current.code && now - lastHitRef.current.time < 1500) return;
            lastHitRef.current = { code: decodedText, time: now };

            setStatus("detected");
            setLastCode(decodedText);
            onDetect(decodedText);

            if (continuous) {
              setTimeout(() => { if (!cancelled) setStatus("scanning"); }, 850);
            } else {
              setTimeout(() => { if (!cancelled) onClose(); }, 700);
            }
          },
          () => { /* per-frame miss — ignore, this fires constantly while aiming */ }
        )
        .then(() => { if (!cancelled) setStatus("scanning"); })
        .catch(() => {
          if (!cancelled) {
            setStatus("error");
            setErrorMsg("Camera unavailable. Check permissions, or enter the code below.");
          }
        });
    });

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {});
      }
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const submitManual = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onDetect(manualCode.trim());
    setManualCode("");
    if (!continuous) onClose();
  };

  return (
    <div className="scanner-overlay" onClick={onClose}>
      <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <span>{title}</span>
          <button className="scanner-close" onClick={onClose} title="Close"><XIcon size={16} /></button>
        </div>

        {!manualMode && (
          <div className="scanner-viewport">
            <div id={regionId} className="scanner-video-region" />
            {status !== "error" && (
              <div className={`scanner-frame ${status === "detected" ? "scanner-frame-hit" : ""}`}>
                <span className="scanner-corner tl" /><span className="scanner-corner tr" />
                <span className="scanner-corner bl" /><span className="scanner-corner br" />
                {status === "scanning" && <div className="scanner-laser" />}
              </div>
            )}
            {status === "starting" && <div className="scanner-status">Starting camera…</div>}
            {status === "detected" && <div className="scanner-status scanner-status-hit"><BoxIcon size={13} /> {lastCode}</div>}
            {status === "error" && (
              <div className="scanner-status scanner-status-error">{errorMsg}</div>
            )}
          </div>
        )}

        {manualMode || status === "error" ? (
          <form className="scanner-fallback" onSubmit={submitManual}>
            <input
              className="pos-search"
              autoFocus
              placeholder="Type barcode / SKU and press Enter"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button type="submit" className="btn-primary" style={{ width: "auto" }}>Add</button>
          </form>
        ) : (
          <p className="scanner-hint">
            Point the camera at a barcode.{" "}
            <button type="button" className="scanner-manual-link" onClick={() => setManualMode(true)}>Enter it manually instead</button>
          </p>
        )}
      </div>
    </div>
  );
}
