import React, { useEffect, useRef, useState, useCallback } from "react";

/* ───────────────── ICONS ───────────────── */
const CameraOffIcon = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 2l20 20" /><path d="M9.5 5H15l2 3h3a2 2 0 0 1 2 2v9.5" /><path d="M21 17v.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h1" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);
const KeyboardIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="6" y1="9" x2="6" y2="9.01" /><line x1="10" y1="9" x2="10" y2="9.01" /><line x1="14" y1="9" x2="14" y2="9.01" /><line x1="18" y1="9" x2="18" y2="9.01" /><line x1="6" y1="13" x2="18" y2="13" />
  </svg>
);
const CheckIcon = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/**
 * BarcodeScannerModal
 * Reusable across Admin and Staff screens.
 * - Shows a live camera feed with an animated scanning frame when a camera + BarcodeDetector are available.
 * - Always listens for hardware (USB keyboard-wedge) barcode scanners, which type a code fast then hit Enter.
 * - Falls back to manual code entry if no camera is available or permission is denied.
 *
 * Props:
 *  open: boolean
 *  onClose: () => void
 *  onDetect: (code: string) => void
 *  title?: string
 *  subtitle?: string
 */
export default function BarcodeScannerModal({ open, onClose, onDetect, title = "Scan Barcode", subtitle = "Point a camera or USB scanner at a barcode" }) {
  const videoRef = useRef(null);
  const [cameraState, setCameraState] = useState("initializing"); // initializing | ready | denied | unsupported
  const [manualCode, setManualCode] = useState("");
  const [detectedCode, setDetectedCode] = useState(null);
  const wedgeBuffer = useRef("");
  const wedgeLastTime = useRef(0);

  const handleDetected = useCallback((code) => {
    if (!code) return;
    setDetectedCode(code);
    setTimeout(() => {
      onDetect(code);
    }, 450);
  }, [onDetect]);

  // Hardware USB scanner (keyboard wedge) listener — works regardless of camera availability
  useEffect(() => {
    if (!open) return;
    const handleKeydown = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return; // don't hijack the manual field
      const now = Date.now();
      const gap = now - wedgeLastTime.current;
      wedgeLastTime.current = now;

      if (e.key === "Enter") {
        if (wedgeBuffer.current.length >= 3) {
          handleDetected(wedgeBuffer.current);
        }
        wedgeBuffer.current = "";
        return;
      }
      if (e.key.length === 1) {
        // Fast successive keystrokes (<60ms apart) are almost certainly a hardware scanner, not human typing
        if (gap > 60) wedgeBuffer.current = "";
        wedgeBuffer.current += e.key;
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [open, handleDetected]);

  // Camera + BarcodeDetector loop
  useEffect(() => {
    if (!open) { setDetectedCode(null); setManualCode(""); return; }
    let stream = null;
    let raf = null;
    let stopped = false;
    setCameraState("initializing");

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no-media-devices");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraState("ready");

        if ("BarcodeDetector" in window) {
          const detector = new window.BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code", "itf"],
          });
          const tick = async () => {
            if (stopped) return;
            try {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                const codes = await detector.detect(videoRef.current);
                if (codes.length > 0) {
                  handleDetected(codes[0].rawValue);
                  return;
                }
              }
            } catch (err) { /* keep trying */ }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }
      } catch (err) {
        if (!stopped) setCameraState("denied");
      }
    };
    start();

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [open, handleDetected]);

  if (!open) return null;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) handleDetected(manualCode.trim());
  };

  return (
    <div className="scanner-overlay" onClick={onClose}>
      <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <span>{title}</span>
          <button className="scanner-close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="scanner-viewport">
          {cameraState === "ready" && (
            <video ref={videoRef} className="scanner-video" muted playsInline />
          )}
          {cameraState === "initializing" && (
            <div className="scanner-fallback">
              <div className="scanner-spinner" />
              <span>Starting camera…</span>
            </div>
          )}
          {cameraState === "denied" && (
            <div className="scanner-fallback">
              <CameraOffIcon />
              <span>No camera available</span>
              <span className="scanner-fallback-sub">A connected USB scanner will still work</span>
            </div>
          )}

          {/* Scan frame + animated laser, shown regardless of camera state so a hardware scan still feels active */}
          <div className="scanner-frame">
            <span className="scanner-corner scanner-corner-tl" />
            <span className="scanner-corner scanner-corner-tr" />
            <span className="scanner-corner scanner-corner-bl" />
            <span className="scanner-corner scanner-corner-br" />
            {!detectedCode && <div className="scanner-laser" />}
          </div>

          {detectedCode && (
            <div className="scanner-success-flash">
              <div className="scanner-success-icon"><CheckIcon /></div>
              <div className="scanner-success-code">{detectedCode}</div>
            </div>
          )}
        </div>

        <div className="scanner-status">
          {detectedCode ? "Code captured" : cameraState === "ready" ? "Scanning for a barcode…" : "Listening for scanner input…"}
        </div>

        <form className="scanner-manual-row" onSubmit={handleManualSubmit}>
          <KeyboardIcon />
          <input
            type="text"
            className="pos-search"
            placeholder="Or type / paste a barcode…"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            autoFocus={cameraState !== "ready"}
          />
          <button type="submit" className="btn-primary" style={{ width: "auto", padding: "9px 16px" }}>Use</button>
        </form>
      </div>
    </div>
  );
}
