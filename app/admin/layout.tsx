"use client";

import { StoreProvider } from "@/app/_lib/StoreContext";
import Sidebar from "./Sidebar";
import IdleTimeoutWarning from "../components/IdleTimeoutWarning";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #f5f4f0;
    --surface:   #ffffff;
    --ink:       #141410;
    --ink2:      #4a4a40;
    --muted:     #9a9a8e;
    --border:    #e2e0d8;
    --border2:   #c8c6bc;
    --accent:    #d4522a;
    --accent-bg: #fff4f0;
    --ok:        #16a34a;
    --ok-bg:     #f0fdf4;
    --warn:      #d97706;
    --warn-bg:   #fffbeb;
    --info:      #2563eb;
    --info-bg:   #eff6ff;
    --sidebar-w: 220px;
    --header-h:  60px;
  }

  html, body { height: 100%; }
  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    color: var(--ink);
    min-height: 100vh;
  }

  /* ── LAYOUT ─────────────────────────── */
  .shell {
    display: grid;
    grid-template-columns: var(--sidebar-w) 1fr;
    grid-template-rows: var(--header-h) 1fr;
    min-height: 100vh;
  }

  /* ── SIDEBAR ─────────────────────────── */
  .sidebar {
    grid-row: 1 / 3;
    background: var(--ink);
    color: #fff;
    display: flex;
    flex-direction: column;
    padding: 0;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .sidebar-logo {
    display: flex; align-items: center; gap: 10px;
    padding: 0 1.25rem;
    height: var(--header-h);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
  }
  .sidebar-logo-mark {
    width: 30px; height: 30px;
    background: var(--accent);
    border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 500; color: #fff;
  }
  .sidebar-logo-name { font-size: 14px; font-weight: 500; color: #fff; }

  .sidebar-section {
    padding: 1.25rem 1rem 0.5rem;
    font-size: 10px; font-weight: 500;
    letter-spacing: 1.5px; text-transform: uppercase;
    color: rgba(255,255,255,0.3);
  }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 0.6rem 1rem;
    margin: 1px 0.5rem;
    border-radius: 7px;
    font-size: 13px; font-weight: 400;
    color: rgba(255,255,255,0.6);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    text-decoration: none;
  }
  .nav-item:hover { background: rgba(255,255,255,0.07); color: #fff; }
  .nav-item.active { background: rgba(255,255,255,0.12); color: #fff; font-weight: 500; }
  .nav-item svg { flex-shrink: 0; opacity: 0.7; }
  .nav-item.active svg { opacity: 1; }

  .nav-badge {
    margin-left: auto;
    background: var(--accent);
    color: #fff;
    font-size: 10px; font-weight: 500;
    padding: 1px 6px; border-radius: 100px;
  }

  .sidebar-footer {
    margin-top: auto;
    padding: 1rem;
    border-top: 1px solid rgba(255,255,255,0.08);
  }
  .sidebar-user {
    display: flex; align-items: center; gap: 10px;
  }
  .sidebar-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--accent);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 500; color: #fff;
    flex-shrink: 0;
  }
  .sidebar-user-name { font-size: 13px; font-weight: 500; color: #fff; }
  .sidebar-user-role { font-size: 11px; color: rgba(255,255,255,0.4); }

  /* ── HEADER ─────────────────────────── */
  .header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center;
    padding: 0 1.75rem;
    gap: 1rem;
    position: sticky; top: 0; z-index: 10;
  }
  .header-title { font-size: 15px; font-weight: 500; flex: 1; }
  .header-date { font-size: 12px; color: var(--muted); }
  .header-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px;
    background: var(--ink); color: #fff;
    border: none; border-radius: 7px;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px; font-weight: 500;
    cursor: pointer; transition: background 0.15s;
  }
  .header-btn:hover { background: #2a2a22; }
  .header-bell {
    width: 32px; height: 32px; border-radius: 7px;
    border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; position: relative;
    transition: background 0.15s;
  }
  .header-bell:hover { background: var(--bg); }
  .bell-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--accent);
    position: absolute; top: 5px; right: 5px;
    border: 1.5px solid var(--surface);
  }

  /* ── MAIN ─────────────────────────── */
  .main {
    padding: 1.75rem;
    overflow-y: auto;
    display: flex; flex-direction: column; gap: 1.5rem;
  }

  /* ── STAT CARDS ─────────────────────── */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex; flex-direction: column; gap: 0.75rem;
  }
  .stat-card-top {
    display: flex; align-items: center; justify-content: space-between;
  }
  .stat-card-label { font-size: 12px; color: var(--muted); font-weight: 400; }
  .stat-card-icon {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .stat-card-value { font-size: 24px; font-weight: 500; letter-spacing: -0.5px; }
  .stat-card-change {
    font-size: 12px; display: flex; align-items: center; gap: 4px;
  }
  .change-up { color: var(--ok); }
  .change-down { color: var(--accent); }

  /* ── GRID 2-COL ─────────────────────── */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .three-col { display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; }

  /* ── CARD ─────────────────────────── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }
  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }
  .card-title { font-size: 13px; font-weight: 500; }
  .card-action {
    font-size: 12px; color: var(--accent);
    cursor: pointer; text-decoration: none;
    transition: opacity 0.15s;
  }
  .card-action:hover { opacity: 0.7; }
  .card-body { padding: 1.25rem; }

  /* ── CHART BAR ───────────────────────── */
  .chart-wrap {
    display: flex; align-items: flex-end; gap: 8px;
    height: 140px; padding: 0 0 0.5rem;
  }
  .chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .chart-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
  .chart-bar {
    width: 100%; border-radius: 4px 4px 0 0;
    background: var(--ink);
    transition: background 0.2s;
    cursor: pointer;
    position: relative;
  }
  .chart-bar:hover { background: var(--accent); }
  .chart-bar.highlight { background: var(--accent); }
  .chart-lbl { font-size: 10px; color: var(--muted); }

  /* ── TABLE ───────────────────────────── */
  .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
  .tbl th {
    text-align: left; padding: 0.6rem 1.25rem;
    font-size: 11px; font-weight: 500; letter-spacing: 0.5px;
    text-transform: uppercase; color: var(--muted);
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }
  .tbl td { padding: 0.75rem 1.25rem; border-bottom: 1px solid var(--border); color: var(--ink2); }
  .tbl tr:last-child td { border-bottom: none; }
  .tbl tr:hover td { background: var(--bg); }

  /* ── BADGE ───────────────────────────── */
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 100px;
    font-size: 11px; font-weight: 500;
  }
  .badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
  .badge.ok   { background: var(--ok-bg);   color: var(--ok); }
  .badge.warn { background: var(--warn-bg); color: var(--warn); }
  .badge.bad  { background: var(--accent-bg); color: var(--accent); }
  .badge.info { background: var(--info-bg); color: var(--info); }

  /* ── PRODUCT LIST ─────────────────────── */
  .product-row {
    display: flex; align-items: center; gap: 12px;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border);
  }
  .product-row:last-child { border-bottom: none; }
  .product-thumb {
    width: 36px; height: 36px; border-radius: 8px;
    background: var(--bg);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }
  .product-name { font-size: 13px; font-weight: 500; flex: 1; }
  .product-sub  { font-size: 11px; color: var(--muted); }
  .product-val  { font-size: 13px; font-weight: 500; }

  /* ── ACTIVITY FEED ─────────────────────── */
  .activity-item {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 0.65rem 0;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
  }
  .activity-item:last-child { border-bottom: none; }
  .activity-dot {
    width: 8px; height: 8px; border-radius: 50%;
    margin-top: 3px; flex-shrink: 0;
  }
  .activity-text { color: var(--ink2); line-height: 1.5; flex: 1; }
  .activity-text strong { color: var(--ink); font-weight: 500; }
  .activity-time { color: var(--muted); white-space: nowrap; }

  /* ── MINI DONUT ─────────────────────── */
  .donut-wrap { display: flex; align-items: center; gap: 1.5rem; }
  .donut-legend { display: flex; flex-direction: column; gap: 8px; flex: 1; }
  .legend-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
  .legend-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
  .legend-label { flex: 1; color: var(--ink2); }
  .legend-pct { font-weight: 500; color: var(--ink); }

  @media (max-width: 1100px) {
    .stat-grid { grid-template-columns: repeat(2,1fr); }
    .three-col { grid-template-columns: 1fr; }
  }
  @media (max-width: 800px) {
    :root { --sidebar-w: 0px; }
    .sidebar { display: none; }
    .shell { grid-template-columns: 1fr; }
  }
`;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
 
  return (
    <StoreProvider>
      <IdleTimeoutWarning />
      <style>{css}</style>
      <div className="shell">
        <Sidebar />
        {children}
      </div>
    </StoreProvider>
  );
}