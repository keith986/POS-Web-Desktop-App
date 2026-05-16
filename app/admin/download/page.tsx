"use client";

import React from "react";
import Link from "next/link";

export default function DownloadPage() {
  return (
    <>
      <header className="header">
        <Link href="/admin/dashboard" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18, cursor: "pointer" }}>←</span>
          <div className="header-title">Download Desktop App</div>
        </Link>
      </header>

      <main style={{
        padding: "2rem",
        maxWidth: "800px",
        margin: "0 auto",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e0d8",
          borderRadius: "12px",
          padding: "2rem",
          marginBottom: "1.5rem",
        }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "1rem", color: "#141410" }}>
            Desktop Application
          </h1>
          <p style={{ color: "#4a4a40", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            Download the POS desktop application for offline access and enhanced performance on your point-of-sale system.
          </p>

          <div style={{
            background: "#f5f4f0",
            border: "1px solid #e2e0d8",
            borderRadius: "8px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#141410" }}>
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="17" x2="22" y2="17"/>
              </svg>
              <h2 style={{ fontSize: "16px", fontWeight: 500, color: "#141410", margin: 0 }}>
                Windows
              </h2>
            </div>
            <p style={{ color: "#4a4a40", fontSize: "14px", marginBottom: "1rem" }}>
              Download the Windows desktop application for full offline functionality.
            </p>
            <a
              href="/api/download/desktop"
              download="postore-setup.exe"
              style={{
                display: "inline-block",
                background: "#d4522a",
                color: "#ffffff",
                padding: "0.75rem 1.5rem",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "14px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#b93f1f")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#d4522a")}
            >
              Download for Windows
            </a>
          </div>

          <div style={{
            background: "#f5f4f0",
            border: "1px solid #e2e0d8",
            borderRadius: "8px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#141410" }}>
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 2h6v4H9V2z"/>
              </svg>
              <h2 style={{ fontSize: "16px", fontWeight: 500, color: "#141410", margin: 0 }}>
                System Requirements
              </h2>
            </div>
            <ul style={{ color: "#4a4a40", fontSize: "14px", lineHeight: 1.8, marginLeft: "1rem" }}>
              <li>Windows 10 or later</li>
              <li>At least 4GB RAM</li>
              <li>Internet connection for initial setup</li>
            </ul>
          </div>

          <div style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "1.5rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#16a34a" }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <h2 style={{ fontSize: "16px", fontWeight: 500, color: "#16a34a", margin: 0 }}>
                Installation Support
              </h2>
            </div>
            <p style={{ color: "#4a4a40", fontSize: "14px" }}>
              The installer will guide you through the setup process. Your session will be automatically synced.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
