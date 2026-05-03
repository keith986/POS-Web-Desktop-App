"use client";

import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/app/_lib/StoreContext";

/* ── Types ── */
interface AnalyticsData {
  revenue: {
    total:      number;
    today:      number;
    this_week:  number;
    this_month: number;
    last_month: number;
    growth:     number;
  };
  orders: {
    total:      number;
    today:      number;
    pending:    number;
    processing: number;
    completed:  number;
    cancelled:  number;
    refunded:   number;
    avg_value:  number;
  };
  customers: {
    total:      number;
    active:     number;
    new_month:  number;
    returning:  number;
  };
  products: {
    total:        number;
    active:       number;
    low_stock:    number;
    out_of_stock: number;
    total_value:  number;
  };
  staff: {
    total:   number;
    active:  number;
  };
  revenue_trend:    { label: string; revenue: number; orders: number }[];
  top_products:     { name: string; category: string; sku: string | null; units_sold: number; revenue: number }[];
  orders_by_status: { status: string; count: number }[];
  orders_by_method: { method: string; count: number; total: number }[];
  top_customers:    { name: string; email: string; orders: number; spent: number; loyalty_points: number }[];
  recent_movements: { product_name: string; type: string; quantity: number; note: string | null; created_at: string }[];
}

interface StoredUser {
  id:         string;
  full_name:  string;
  email:      string;
  role:       string;
  store_name: string | null;
}

type Period = "7d" | "30d" | "90d" | "12m";

/* ── Helpers ── */
function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("user") ?? "null"); }
  catch { return null; }
}

const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

/* ── Shared card wrapper ── */
const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e8e6de",
  borderRadius: 14,
  overflow: "hidden",
};

/* ── Spinner ── */
function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6rem 2rem", gap: 14 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #e8e6de", borderTopColor: "#141410", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ fontSize: 13, color: "#9a9a8e", margin: 0 }}>Crunching numbers…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Big Metric ── */
function BigMetric({ label, value, sub, up, change, accent }: {
  label:   string;
  value:   string | number;
  sub:     string;
  up?:     boolean;
  change?: string;
  accent?: string;
}) {
  return (
    <div style={{ padding: "1.4rem 1.5rem" }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: "#9a9a8e", margin: "0 0 10px" }}>{label}</p>
      <p style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-1.5px", color: accent ?? "#141410", margin: "0 0 6px", lineHeight: 1 }}>{value}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <p style={{ fontSize: 11, color: "#9a9a8e", margin: 0 }}>{sub}</p>
        {change && (
          <span style={{ fontSize: 11, fontWeight: 600, color: up ? "#16a34a" : "#dc2626", background: up ? "#f0fdf4" : "#fef2f2", padding: "1px 7px", borderRadius: 100 }}>
            {up ? "↑" : "↓"} {change}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Section Header ── */
function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f0ede6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#141410", margin: 0 }}>{title}</p>
      {meta && <p style={{ fontSize: 11, color: "#9a9a8e", margin: 0 }}>{meta}</p>}
    </div>
  );
}

/* ── Revenue Bar Chart ── */
function RevenueChart({ data, formatCurrency }: { data: { label: string; revenue: number; orders: number }[]; formatCurrency: (n: number) => string }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) return (
    <div style={{ padding: "3rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>No data for this period.</div>
  );

  return (
    <div style={{ padding: "1.25rem 1.5rem" }}>
      {hovered !== null && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "#f5f4f0", borderRadius: 8, display: "inline-flex", gap: 16, fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: "#141410" }}>{data[hovered].label}</span>
          <span style={{ color: "#4a4a40" }}>Revenue: <strong>{formatCurrency(data[hovered].revenue)}</strong></span>
          <span style={{ color: "#4a4a40" }}>Orders: <strong>{data[hovered].orders}</strong></span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 160, position: "relative" }}>
        {/* Y-axis guide lines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <div key={f} style={{ position: "absolute", left: 0, right: 0, bottom: `${f * 100}%`, borderTop: "1px dashed #f0ede6", pointerEvents: "none" }} />
        ))}
        {data.map((d, i) => {
          const h = Math.max((d.revenue / max) * 100, 1);
          const isH = hovered === i;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0, height: "100%", justifyContent: "flex-end", cursor: "pointer" }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <div style={{
                width: "80%", background: isH ? "#141410" : "#e8e6de",
                borderRadius: "3px 3px 0 0", height: `${h}%`,
                transition: "background 0.15s, height 0.3s ease",
              }} />
            </div>
          );
        })}
      </div>
      {/* X labels */}
      <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "#c8c6bc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Horizontal Bar ── */
function HBar({ label, value, max, color, sub }: { label: string; value: number; max: number; color: string; sub: string }) {
  const w = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 90, fontSize: 12, color: "#4a4a40", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ flex: 1, height: 8, background: "#f0ede6", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#141410", minWidth: 28, textAlign: "right" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#9a9a8e", minWidth: 56 }}>{sub}</div>
    </div>
  );
}

/* ── Movement type label ── */
const MOV_CFG: Record<string, { color: string; sign: string; bg: string }> = {
  restock:    { color: "#16a34a", sign: "+", bg: "#f0fdf4" },
  adjustment: { color: "#2563eb", sign: "±", bg: "#eff6ff" },
  sale:       { color: "#dc2626", sign: "−", bg: "#fef2f2" },
  return:     { color: "#d97706", sign: "+", bg: "#fffbeb" },
};

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function AdminAnalyticsPage() {
  const [adminUser] = useState<StoredUser | null>(getStoredUser);
  const { formatCurrency } = useStore();
  /* Convenience aliases matching existing usage */
  const usd     = (n: number) => formatCurrency(n);
  const usdFull = (n: number) => formatCurrency(n);
  const [data,      setData]     = useState<AnalyticsData | null>(null);
  const [fetching,  setFetching] = useState(true);
  const [period,    setPeriod]   = useState<Period>("30d");
  const [error,     setError]    = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!adminUser?.id) return;
    setFetching(true); setError(null);
    try {
      const res  = await fetch(`/api/analytics?admin_id=${adminUser.id}&period=${period}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError((e as Error).message || "Failed to load analytics");
    } finally {
      setFetching(false);
    }
  }, [adminUser?.id, period]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const dater = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(new Date());

  const PERIOD_LABELS: Record<Period, string> = {
    "7d": "7 Days", "30d": "30 Days", "90d": "90 Days", "12m": "12 Months",
  };

  const STATUS_COLOR: Record<string, string> = {
    pending: "#d97706", processing: "#2563eb", completed: "#16a34a",
    cancelled: "#9a9a8e", refunded: "#dc2626",
  };

  const METHOD_COLOR: Record<string, string> = {
    card: "#141410", cash: "#2563eb", mobile: "#16a34a",
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .an-grid4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 1rem; }
        .an-grid3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 1rem; }
        .an-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .an-grid-62 { display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; }
        @media(max-width:1100px){ .an-grid4{grid-template-columns:1fr 1fr} .an-grid-62{grid-template-columns:1fr} }
        @media(max-width:700px){ .an-grid4{grid-template-columns:1fr} .an-grid2{grid-template-columns:1fr} .an-grid3{grid-template-columns:1fr} }
      `}</style>

      {/* ── Header ── */}
      <header className="header">
        <div className="header-title">Analytics</div>
        <div className="header-date">{dater}</div>

        {/* Period tabs */}
        <div style={{ display: "flex", border: "1px solid #e8e6de", borderRadius: 9, overflow: "hidden", background: "#f5f4f0" }}>
          {(["7d","30d","90d","12m"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "6px 14px", border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12, fontWeight: period === p ? 600 : 400,
              background: period === p ? "#141410" : "transparent",
              color:      period === p ? "#fff" : "#4a4a40",
              transition: "all 0.15s",
            }}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <button onClick={fetchAnalytics} style={{ padding: "7px 12px", background: "#fff", color: "#141410", border: "1px solid #e8e6de", borderRadius: 8, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
      </header>

      <main className="main">

        {fetching ? <Spinner /> : error ? (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "1.5rem", color: "#dc2626", fontSize: 13, textAlign: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {error}
            </span>
          </div>
        ) : !data ? null : (<>

          {/* ── Row 1: Revenue KPIs ── */}
          <div className="an-grid4">
            {[
              { label: "Total Revenue",  value: usd(data.revenue.total),      sub: "All paid orders",    change: pct(data.revenue.growth), up: data.revenue.growth >= 0 },
              { label: "This Month",     value: usd(data.revenue.this_month),  sub: "vs " + usd(data.revenue.last_month) + " last month" },
              { label: "This Week",      value: usd(data.revenue.this_week),   sub: "Current week" },
              { label: "Today",          value: usd(data.revenue.today),       sub: "Today so far" },
            ].map(m => (
              <div key={m.label} style={card}>
                <BigMetric {...m} />
              </div>
            ))}
          </div>

          {/* ── Row 2: Operations KPIs ── */}
          <div className="an-grid4" style={{ marginTop: 0 }}>
            {[
              { label: "Total Orders",    value: data.orders.total,                         sub: "All time" },
              { label: "Avg. Order Value",value: usdFull(data.orders.avg_value),             sub: "Per paid transaction" },
              { label: "Customers",       value: data.customers.total,                       sub: `${data.customers.active} active` },
              { label: "Staff Members",   value: data.staff.total,                           sub: `${data.staff.active} active` },
            ].map(m => (
              <div key={m.label} style={card}>
                <BigMetric {...m} />
              </div>
            ))}
          </div>

          {/* ── Row 3: Revenue Chart + Order Status ── */}
          <div className="an-grid-62">

            <div style={card}>
              <SectionHead
                title={`Revenue — Last ${PERIOD_LABELS[period]}`}
                meta={`${data.revenue_trend.length} data points`}
              />
              <RevenueChart data={data.revenue_trend} formatCurrency={formatCurrency} />
            </div>

            <div style={card}>
              <SectionHead title="Orders by Status" meta={`${data.orders.total} total`} />
              <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: 14 }}>
                {data.orders_by_status.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#9a9a8e", margin: 0 }}>No orders yet.</p>
                ) : (
                  data.orders_by_status.map(s => (
                    <HBar
                      key={s.status}
                      label={s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                      value={s.count}
                      max={data.orders.total}
                      color={STATUS_COLOR[s.status] ?? "#9a9a8e"}
                      sub={`${data.orders.total > 0 ? ((s.count/data.orders.total)*100).toFixed(0) : 0}%`}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── Row 4: Top Products + Payment Methods ── */}
          <div className="an-grid2">

            {/* Top Products */}
            <div style={card}>
              <SectionHead title="Top Products" meta="By revenue" />
              {data.top_products.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>No sales recorded yet.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["#", "Product", "Category", "Units", "Revenue"].map(h => (
                        <th key={h} style={{ padding: "0.55rem 1.25rem", textAlign: h === "Units" || h === "Revenue" ? "right" : "left", fontSize: 10, fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #f0ede6", background: "#faf9f6", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_products.slice(0, 7).map((p, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f0ede6" }}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#faf9f6"}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}>
                        <td style={{ padding: "0.7rem 1.25rem", color: "#9a9a8e", fontSize: 11, fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: "0.7rem 1.25rem" }}>
                          <div style={{ fontWeight: 500, color: "#141410" }}>{p.name}</div>
                          {p.sku && <div style={{ fontSize: 10, color: "#c8c6bc", fontFamily: "monospace" }}>{p.sku}</div>}
                        </td>
                        <td style={{ padding: "0.7rem 1.25rem" }}>
                          <span style={{ fontSize: 11, background: "#f5f4f0", padding: "2px 7px", borderRadius: 5, color: "#4a4a40" }}>{p.category}</span>
                        </td>
                        <td style={{ padding: "0.7rem 1.25rem", textAlign: "right", fontWeight: 500 }}>{p.units_sold}</td>
                        <td style={{ padding: "0.7rem 1.25rem", textAlign: "right", fontWeight: 600, color: "#141410" }}>{usdFull(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Payment Methods */}
            <div style={card}>
              <SectionHead title="Payment Methods" meta="By order count" />
              <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: 14 }}>
                {data.orders_by_method.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#9a9a8e", margin: 0 }}>No payment data yet.</p>
                ) : (
                  data.orders_by_method.map(m => (
                    <HBar
                      key={m.method}
                      label={m.method.charAt(0).toUpperCase() + m.method.slice(1)}
                      value={m.count}
                      max={Math.max(...data.orders_by_method.map(x => x.count))}
                      color={METHOD_COLOR[m.method] ?? "#141410"}
                      sub={usd(m.total)}
                    />
                  ))
                )}
              </div>

              {/* Inventory + Staff summary */}
              <div style={{ margin: "0 1.25rem 1.25rem", background: "#f5f4f0", borderRadius: 10, padding: "1rem" }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", color: "#9a9a8e", margin: "0 0 10px" }}>Inventory</p>
                <div style={{ display: "flex", gap: "1rem" }}>
                  {[
                    { label: "Total SKUs",   value: data.products.total,        color: "#141410" },
                    { label: "Low Stock",    value: data.products.low_stock,    color: "#d97706" },
                    { label: "Out of Stock", value: data.products.out_of_stock, color: "#dc2626" },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: "-1px" }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: "#9a9a8e", marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: "1px solid #e8e6de", marginTop: 12, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#4a4a40" }}>
                  <span>Inventory value</span>
                  <strong style={{ color: "#141410" }}>{usdFull(data.products.total_value)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 5: Top Customers + Stock Movements ── */}
          <div className="an-grid2">

            {/* Top Customers */}
            <div style={card}>
              <SectionHead title="Top Customers" meta="By lifetime spend" />
              {data.top_customers.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>No customers yet.</div>
              ) : (
                <div>
                  {data.top_customers.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.85rem 1.5rem", borderBottom: i < data.top_customers.length - 1 ? "1px solid #f0ede6" : "none" }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#faf9f6"}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ""}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#141410", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {initials(c.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#141410", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "#9a9a8e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#141410" }}>{usdFull(c.spent)}</div>
                        <div style={{ fontSize: 10, color: "#9a9a8e" }}>{c.orders} order{c.orders !== 1 ? "s" : ""} · <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ display: "inline", verticalAlign: "middle" }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>{c.loyalty_points} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Stock Movements (from stock_movements table) */}
            <div style={card}>
              <SectionHead title="Recent Stock Movements" meta="From inventory" />
              {data.recent_movements.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>No stock movements recorded yet.</div>
              ) : (
                <div>
                  {data.recent_movements.map((m, i) => {
                    const cfg = MOV_CFG[m.type] ?? MOV_CFG.adjustment;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "0.85rem 1.5rem", borderBottom: i < data.recent_movements.length - 1 ? "1px solid #f0ede6" : "none" }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: cfg.color, flexShrink: 0 }}>
                          {cfg.sign}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#141410", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.product_name}</div>
                          <div style={{ fontSize: 11, color: "#9a9a8e" }}>
                            {m.type.charAt(0).toUpperCase() + m.type.slice(1)}
                            {m.note && ` · ${m.note}`}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.sign}{Math.abs(m.quantity)}</div>
                          <div style={{ fontSize: 10, color: "#c8c6bc" }}>{timeAgo(m.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── New customers this month callout ── */}
          <div style={{ ...card, display: "flex", alignItems: "center", gap: "2rem", padding: "1.25rem 1.75rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", color: "#9a9a8e", margin: "0 0 6px" }}>Customer Summary</p>
              <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px", margin: 0 }}>
                {data.customers.new_month} new customer{data.customers.new_month !== 1 ? "s" : ""} this month
              </p>
            </div>
            {[
              { label: "Total",     value: data.customers.total },
              { label: "Active",    value: data.customers.active },
              { label: "Returning", value: data.customers.returning },
              { label: "New (month)", value: data.customers.new_month },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", minWidth: 70 }}>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-1px" }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "#9a9a8e", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

        </>)}
      </main>
    </>
  );
}