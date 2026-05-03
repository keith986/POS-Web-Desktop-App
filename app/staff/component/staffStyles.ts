/* ─────────────────────────────────────────────────────────────
   staffStyles.js
   Shared CSS string for the staff dashboard shell & all
   inner components. Import and inject with <style>{staffCss}</style>
───────────────────────────────────────────────────────────── */

const staffCss = `
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
    --accent:    #2563eb;
    --accent-bg: #eff6ff;
    --accent-dk: #1d4ed8;
    --ok:        #16a34a;
    --ok-bg:     #f0fdf4;
    --warn:      #d97706;
    --warn-bg:   #fffbeb;
    --red:       #dc2626;
    --red-bg:    #fef2f2;
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

  /* ── SHELL ── */
  .staff-shell {
    display: grid;
    grid-template-columns: var(--sidebar-w) 1fr;
    grid-template-rows: var(--header-h) 1fr;
    min-height: 100vh;
  }

  /* ── HEADER ── */
  .staff-header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center;
    padding: 0 1.75rem; gap: 1rem;
    position: sticky; top: 0; z-index: 20;
  }
  .hdr-title { font-size: 15px; font-weight: 500; flex: 1; }
  .hdr-shift-pill {
    display: flex; align-items: center; gap: 6px;
    background: var(--ok-bg); border: 1px solid #bbf7d0;
    padding: 4px 12px; border-radius: 100px;
    font-size: 12px; color: var(--ok); font-weight: 500;
  }
  .hdr-shift-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--ok);
    animation: hdr-pulse 2s infinite;
  }
  @keyframes hdr-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .hdr-time { font-size: 12px; color: var(--muted); }
  .hdr-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 14px;
    background: var(--accent); color: #fff;
    border: none; border-radius: 7px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 500;
    cursor: pointer; transition: background 0.15s, transform 0.1s;
  }
  .hdr-btn:hover { background: var(--accent-dk); transform: translateY(-1px); }
  .hdr-btn:active { transform: translateY(0); }

  /* ── MAIN ── */
  .staff-main {
    padding: 1.75rem;
    overflow-y: auto;
    display: flex; flex-direction: column; gap: 1.5rem;
  }

  /* ── TAB BAR ── */
  .staff-tabs {
    display: flex; gap: 2px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px; padding: 4px;
    width: fit-content;
  }
  .staff-tab-btn {
    padding: 7px 18px;
    border: none; border-radius: 7px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 400;
    color: var(--muted); cursor: pointer;
    background: transparent;
    transition: background 0.15s, color 0.15s;
    display: flex; align-items: center; gap: 7px;
  }
  .staff-tab-btn:hover { color: var(--ink); }
  .staff-tab-btn.active { background: var(--ink); color: #fff; font-weight: 500; }
  .staff-tab-count {
    background: rgba(255,255,255,0.2);
    font-size: 10px; padding: 1px 6px; border-radius: 100px;
  }
  .staff-tab-btn:not(.active) .staff-tab-count { background: var(--bg); color: var(--muted); }

  /* ── STAT STRIP ── */
  .stat-strip {
    display: grid; grid-template-columns: repeat(4,1fr); gap: 1rem;
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px; padding: 1.1rem 1.25rem;
    display: flex; flex-direction: column; gap: 6px;
  }
  .stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-value { font-size: 22px; font-weight: 500; letter-spacing: -0.5px; }
  .stat-sub   { font-size: 11px; color: var(--muted); }

  /* ── CARD ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px; overflow: hidden;
  }
  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border-bottom: 1px solid var(--border);
  }
  .card-title { font-size: 13px; font-weight: 500; }
  .card-meta  { font-size: 12px; color: var(--muted); }
  .card-body  { padding: 1.25rem; }

  /* ── TOOLBAR / SEARCH ── */
  .toolbar {
    display: flex; align-items: center; gap: 10px;
    padding: 1rem 1.25rem; border-bottom: 1px solid var(--border);
  }
  .search-wrap {
    flex: 1; display: flex; align-items: center; gap: 8px;
    background: var(--bg); border: 1px solid var(--border2);
    border-radius: 8px; padding: 0 10px;
  }
  .search-wrap input {
    flex: 1; border: none; background: transparent;
    font-family: 'DM Sans', sans-serif; font-size: 13px;
    color: var(--ink); outline: none; padding: 7px 0;
  }
  .search-wrap input::placeholder { color: var(--muted); }
  .filter-btn {
    padding: 7px 12px;
    background: var(--bg); border: 1px solid var(--border2);
    border-radius: 8px; font-family: 'DM Sans', sans-serif;
    font-size: 12px; color: var(--ink2); cursor: pointer;
    transition: border-color 0.15s;
    display: flex; align-items: center; gap: 5px;
  }
  .filter-btn:hover { border-color: var(--ink); }
  .filter-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }

  /* ── PRODUCT GRID ── */
  .product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 1rem; padding: 1.25rem;
  }
  .product-card {
    border: 1px solid var(--border);
    border-radius: 10px; overflow: hidden;
    background: var(--bg);
    transition: border-color 0.15s, box-shadow 0.15s;
    cursor: default;
  }
  .product-card:hover { border-color: var(--border2); box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
  .product-thumb {
    height: 110px; background: var(--surface);
    display: flex; align-items: center; justify-content: center;
    font-size: 40px; border-bottom: 1px solid var(--border);
    position: relative;
  }
  .product-stock-badge {
    position: absolute; top: 8px; right: 8px;
    font-size: 10px; font-weight: 500;
    padding: 2px 7px; border-radius: 100px;
  }
  .product-info { padding: 0.75rem; }
  .product-name  { font-size: 13px; font-weight: 500; margin-bottom: 2px; }
  .product-cat   { font-size: 11px; color: var(--muted); margin-bottom: 6px; }
  .product-price { font-size: 14px; font-weight: 500; color: var(--ink); }
  .product-stock-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 6px;
  }
  .product-stock-num { font-size: 11px; color: var(--muted); }
  .add-to-sale-btn {
    padding: 4px 10px;
    background: var(--accent); color: #fff;
    border: none; border-radius: 6px;
    font-family: 'DM Sans', sans-serif;
    font-size: 11px; font-weight: 500;
    cursor: pointer; transition: background 0.15s;
  }
  .add-to-sale-btn:hover { background: var(--accent-dk); }
  .add-to-sale-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── SALE RECORDER ── */
  .sale-layout { display: grid; grid-template-columns: 1fr 340px; gap: 1rem; align-items: start; }
  .sale-item-row {
    display: flex; align-items: center; gap: 12px;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }
  .sale-item-row:last-child { border-bottom: none; }
  .sale-emoji { font-size: 22px; width: 36px; text-align: center; flex-shrink: 0; }
  .sale-item-name  { font-size: 13px; font-weight: 500; flex: 1; }
  .sale-item-price { font-size: 13px; color: var(--muted); }
  .qty-ctrl { display: flex; align-items: center; gap: 6px; }
  .qty-btn {
    width: 24px; height: 24px; border-radius: 5px;
    border: 1px solid var(--border2);
    background: var(--bg); color: var(--ink);
    font-size: 14px; line-height: 1;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .qty-btn:hover { background: var(--border); }
  .qty-num { font-size: 13px; font-weight: 500; min-width: 20px; text-align: center; }
  .remove-btn {
    background: none; border: none;
    color: var(--muted); cursor: pointer; font-size: 16px;
    padding: 2px 4px; border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }
  .remove-btn:hover { color: var(--red); background: var(--red-bg); }

  /* ── SALE SUMMARY ── */
  .summary-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px; overflow: hidden;
    position: sticky; top: 1.75rem;
  }
  .summary-header {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
    font-size: 13px; font-weight: 500;
  }
  .summary-body { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 10px; }
  .summary-row { display: flex; justify-content: space-between; font-size: 13px; }
  .summary-row .label { color: var(--muted); }
  .summary-row.total {
    font-weight: 500; font-size: 15px;
    padding-top: 8px; border-top: 1px solid var(--border);
  }
  .payment-select {
    width: 100%; padding: 8px 10px;
    background: var(--bg); border: 1px solid var(--border2);
    border-radius: 8px; font-family: 'DM Sans', sans-serif;
    font-size: 13px; color: var(--ink); outline: none; cursor: pointer;
  }
  .complete-btn {
    width: 100%; padding: 11px;
    background: var(--ok); color: #fff;
    border: none; border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 500;
    cursor: pointer; transition: background 0.15s, transform 0.1s;
    margin-top: 4px;
  }
  .complete-btn:hover { background: #15803d; transform: translateY(-1px); }
  .complete-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
  .empty-cart {
    padding: 2.5rem 1.25rem; text-align: center;
    color: var(--muted); font-size: 13px;
  }
  .empty-cart-icon { font-size: 32px; margin-bottom: 8px; }

  /* ── SALES TABLE ── */
  .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
  .tbl th {
    text-align: left; padding: 0.6rem 1.25rem;
    font-size: 11px; font-weight: 500; letter-spacing: 0.5px;
    text-transform: uppercase; color: var(--muted);
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }
  .tbl td { padding: 0.8rem 1.25rem; border-bottom: 1px solid var(--border); color: var(--ink2); }
  .tbl tr:last-child td { border-bottom: none; }
  .tbl tr:hover td { background: var(--bg); }

  /* ── BADGE ── */
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 100px;
    font-size: 11px; font-weight: 500;
  }
  .badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
  .badge.ok   { background: var(--ok-bg);   color: var(--ok); }
  .badge.warn { background: var(--warn-bg); color: var(--warn); }
  .badge.bad  { background: var(--red-bg);  color: var(--red); }
  .badge.info { background: var(--accent-bg); color: var(--accent); }

  /* ── TOAST ── */
  .staff-toast {
    position: fixed; bottom: 2rem; right: 2rem;
    background: var(--ink); color: #fff;
    padding: 0.9rem 1.25rem;
    border-radius: 10px; font-size: 13px;
    display: flex; align-items: center; gap: 10px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.2);
    animation: st-in 0.3s ease, st-out 0.4s ease 2.6s forwards;
    z-index: 999;
  }
  @keyframes st-in  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes st-out { from { opacity:1; } to { opacity:0; } }
  .staff-toast-icon { font-size: 18px; }

  /* ── RESPONSIVE ── */
  @media (max-width: 1100px) {
    .sale-layout { grid-template-columns: 1fr; }
    .summary-card { position: static; }
  }
  @media (max-width: 900px) {
    .stat-strip { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 700px) {
    :root { --sidebar-w: 0px; }
    .staff-shell { grid-template-columns: 1fr; }
  }
`;

export default staffCss;