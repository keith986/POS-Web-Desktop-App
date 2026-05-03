"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/app/_lib/StoreContext";

/* ── Types — match existing products table exactly ── */
interface InventoryItem {
  product_id:   string;
  product_name: string;
  category:     string;
  sku:          string | null;
  price:        number;
  stock:        number;
  status:       "active" | "inactive";
  admin_id:     string;
  updated_at:   string;
}

interface StockMovement {
  id:           string;
  product_id:   string;
  product_name: string;
  type:         "restock" | "adjustment" | "sale" | "return";
  quantity:     number;
  note:         string | null;
  created_at:   string;
}

interface AdjustForm {
  type:     "restock" | "adjustment" | "return";
  quantity: string;
  note:     string;
}

interface StoredUser {
  id:         string;
  full_name:  string;
  email:      string;
  role:       string;
  store_name: string | null;
}

/* ── Helpers ── */
function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/* ── Shared styles ── */
const fieldStyle: React.CSSProperties = {
  width: "100%", background: "#f5f4f0",
  border: "1px solid #c8c6bc", borderRadius: 8,
  padding: "9px 12px", color: "#141410",
  fontFamily: "inherit", fontSize: 14, outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 500,
  letterSpacing: "0.5px", textTransform: "uppercase",
  color: "#4a4a40", marginBottom: 5,
};

/* ── SVG Icons ── */
function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
    </svg>
  );
}
function IconArrowUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </svg>
  );
}
function IconArrowDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
    </svg>
  );
}
function IconArrowUpDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 11 12 6 7 11"/><polyline points="7 13 12 18 17 13"/>
    </svg>
  );
}

/* ── Toast ── */
function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div style={{
      position: "fixed", bottom: "2rem", right: "2rem",
      background: type === "error" ? "#dc2626" : "#141410",
      color: "#fff", padding: "0.85rem 1.25rem", borderRadius: 10,
      fontSize: 13, display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
      animation: "toastIn 0.3s ease", zIndex: 1100,
    }}>
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        {type === "error"
          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        }
      </span>
      {msg}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

/* ── Spinner ── */
function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", color: "#9a9a8e", fontSize: 13, gap: 10 }}>
      <div style={{ width: 18, height: 18, border: "2px solid #e2e0d8", borderTopColor: "#141410", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      {label}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Stock Badge — low threshold is 8 (no min_stock column) ── */
const LOW_THRESHOLD = 8;

function StockBadge({ stock }: { stock: number }) {
  const cfg =
    stock === 0         ? { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "Out of stock" } :
    stock <= LOW_THRESHOLD ? { bg: "#fffbeb", color: "#d97706", border: "#fde68a", label: `Low — ${stock}` } :
                          { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", label: `${stock} in stock` };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 500, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

/* ── Movement Badge ── */
function MovementBadge({ type }: { type: StockMovement["type"] }) {
  const cfg: Record<string, { bg: string; color: string; border: string; label: string; sign: string }> = {
    restock:    { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", label: "Restock",    sign: "+" },
    adjustment: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", label: "Adjustment", sign: "±" },
    sale:       { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "Sale",       sign: "−" },
    return:     { bg: "#fffbeb", color: "#d97706", border: "#fde68a", label: "Return",     sign: "+" },
  };
  const c = cfg[type] ?? cfg.adjustment;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 500, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.sign} {c.label}
    </span>
  );
}

/* ── Adjust Panel ── */
function AdjustPanel({
  open, onClose, item, onSave, saving, formatCurrency,
}: {
  open:           boolean;
  onClose:        () => void;
  item:           InventoryItem | null;
  onSave:         (form: AdjustForm) => void;
  saving:         boolean;
  formatCurrency: (n: number) => string;
}) {
  const blank: AdjustForm = { type: "restock", quantity: "", note: "" };
  const [form, setForm] = useState<AdjustForm>(blank);

  const prevOpen = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) {
      setForm({ type: "restock", quantity: "", note: "" });
    }
    prevOpen.current = open;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !item) return null;

  const set = (key: keyof AdjustForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const hints = {
    restock:    "Increase stock after receiving a delivery.",
    adjustment: "Directly set the stock to a specific number.",
    return:     "Add stock back from a customer return.",
  };

  const newStock =
    form.type === "adjustment"
      ? Number(form.quantity || 0)
      : item.stock + Number(form.quantity || 0);

  const newStockColor =
    newStock <= 0              ? "#dc2626" :
    newStock <= LOW_THRESHOLD  ? "#d97706" :
    "#16a34a";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 420,
        background: "#fff", zIndex: 901, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column", animation: "panelIn 0.25s ease",
      }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Adjust Stock</div>
            <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2 }}>{item.product_name}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.1rem" }}>

          {/* Current stock */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 8, padding: "0.75rem 1rem" }}>
              <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Current Stock</div>
              <div style={{ fontSize: 24, fontWeight: 500 }}>{item.stock}</div>
            </div>
            <div style={{ background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 8, padding: "0.75rem 1rem" }}>
              <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Unit Price</div>
              <div style={{ fontSize: 24, fontWeight: 500 }}>{formatCurrency(item.price)}</div>
            </div>
          </div>

          {/* Type */}
          <div>
            <label style={labelStyle}>Adjustment Type</label>
            <select style={fieldStyle} value={form.type} onChange={set("type")}>
              <option value="restock">Restock — add incoming stock</option>
              <option value="adjustment">Manual adjustment — set exact count</option>
              <option value="return">Customer return — add back</option>
            </select>
            <p style={{ fontSize: 11, color: "#9a9a8e", marginTop: 4 }}>{hints[form.type]}</p>
          </div>

          {/* Quantity */}
          <div>
            <label style={labelStyle}>{form.type === "adjustment" ? "New Stock Count" : "Quantity to Add"}</label>
            <input style={fieldStyle} type="number" min="0" placeholder="0" value={form.quantity} onChange={set("quantity")} />
          </div>

          {/* Preview */}
          {form.quantity !== "" && !isNaN(Number(form.quantity)) && (
            <div style={{ background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 8, padding: "0.75rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, color: "#9a9a8e" }}>Stock after adjustment</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: newStockColor }}>
                {Math.max(0, newStock)} units
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label style={labelStyle}>Note (optional)</label>
            <textarea
              style={{ ...fieldStyle, resize: "vertical", minHeight: 72, lineHeight: 1.5 }}
              placeholder="e.g. Received shipment from supplier…"
              value={form.note}
              onChange={set("note")}
            />
          </div>
        </div>

        <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #e2e0d8", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.quantity}
            style={{ padding: "9px 20px", background: saving || !form.quantity ? "#9a9a8e" : "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving || !form.quantity ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {saving ? "Saving…" : "Apply Adjustment"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── History Drawer ── */
function HistoryDrawer({
  open, onClose, productName, movements, loading, formatDateTime,
}: {
  open:            boolean;
  onClose:         () => void;
  productName:     string;
  movements:       StockMovement[];
  loading:         boolean;
  formatDateTime:  (d: string) => string;
}) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 420,
        background: "#fff", zIndex: 901, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column", animation: "panelIn 0.25s ease",
      }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Stock History</div>
            <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 2 }}>{productName}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? <Spinner label="Loading history…" /> : movements.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>
              No stock movements recorded yet.
            </div>
          ) : movements.map(m => (
            <div key={m.id} style={{ padding: "0.9rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: m.type === "sale" ? "#fef2f2" : m.type === "adjustment" ? "#eff6ff" : "#f0fdf4",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {m.type === "sale"
                  ? <IconArrowDown />
                  : m.type === "adjustment"
                    ? <IconArrowUpDown />
                    : <IconArrowUp />
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                  <MovementBadge type={m.type} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: m.type === "sale" ? "#dc2626" : "#16a34a" }}>
                    {m.quantity > 0 ? "+" : ""}{m.quantity}
                  </span>
                </div>
                {m.note && <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 3 }}>{m.note}</div>}
                <div style={{ fontSize: 11, color: "#c8c6bc", marginTop: 4 }}>{formatDateTime(m.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function AdminInventoryPage() {
  const [adminUser]    = useState<StoredUser | null>(getStoredUser);
  const { formatCurrency, formatDate, formatDateTime } = useStore();
  const [inventory,    setInventory]    = useState<InventoryItem[]>([]);
  const [movements,    setMovements]    = useState<StockMovement[]>([]);
  const [fetching,     setFetching]     = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [histLoading,  setHistLoading]  = useState(false);
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState<"all" | "low" | "out">("all");
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [histTarget,   setHistTarget]   = useState<InventoryItem | null>(null);
  const [toast,        setToast]        = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Fetch inventory ── */
  const fetchInventory = useCallback(async () => {
    if (!adminUser?.id) return;
    setFetching(true);
    try {
      const res  = await fetch(`/api/inventory?admin_id=${adminUser.id}`);
      const data = await res.json();
      setInventory(Array.isArray(data) ? data : []);
    } catch {
      showToast("Failed to load inventory", "error");
    } finally {
      setFetching(false);
    }
  }, [adminUser?.id]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  /* ── Fetch movement history ── */
  const fetchHistory = async (item: InventoryItem) => {
    setHistTarget(item);
    setMovements([]);
    setHistLoading(true);
    try {
      const res  = await fetch(`/api/inventory/${item.product_id}/history?admin_id=${adminUser?.id}`);
      const data = await res.json();
      setMovements(Array.isArray(data) ? data : []);
    } catch {
      showToast("Failed to load history", "error");
    } finally {
      setHistLoading(false);
    }
  };

  /* ── Apply adjustment ── */
  const handleAdjust = async (form: AdjustForm) => {
    if (!adminUser?.id || !adjustTarget) return;
    if (!form.quantity || isNaN(Number(form.quantity)))
      return showToast("Enter a valid quantity", "error");

    setSaving(true);
    try {
      const res  = await fetch(`/api/inventory/${adjustTarget.product_id}/adjust`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          type:     form.type,
          quantity: Number(form.quantity),
          note:     form.note,
          admin_id: adminUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Stock updated — ${adjustTarget.product_name} now has ${data.newStock} units`);
      setAdjustTarget(null);
      fetchInventory();
    } catch (err) {
      showToast((err as Error).message || "Failed to update stock", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Filtered list ── */
  const filtered = inventory.filter(item => {
    const matchSearch =
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku ?? "").toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "out" ? item.stock === 0 :
      filter === "low" ? item.stock > 0 && item.stock <= LOW_THRESHOLD :
      true;
    return matchSearch && matchFilter;
  });

  /* ── Stats ── */
  const totalValue = inventory.reduce((s, i) => s + i.price * i.stock, 0);
  const lowCount   = inventory.filter(i => i.stock > 0 && i.stock <= LOW_THRESHOLD).length;
  const outCount   = inventory.filter(i => i.stock === 0).length;

  const dater = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(new Date());

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <AdjustPanel
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        item={adjustTarget}
        onSave={handleAdjust}
        saving={saving}
        formatCurrency={formatCurrency}
      />

      <HistoryDrawer
        open={!!histTarget}
        onClose={() => setHistTarget(null)}
        productName={histTarget?.product_name ?? ""}
        movements={movements}
        loading={histLoading}
        formatDateTime={formatDateTime}
      />

      {/* ── Header ── */}
      <header className="header">
        <div className="header-title">Inventory</div>
        <div className="header-date">{dater}</div>
        <button
          onClick={fetchInventory}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#fff", color: "#141410", border: "1px solid #c8c6bc", borderRadius: 7, fontFamily: "inherit", fontSize: 13, cursor: "pointer" }}
        >
          <IconRefresh /> Refresh
        </button>
      </header>

      <main className="main">

        {/* Stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
          {[
            { label: "Total Products",  value: inventory.length,           sub: "In catalogue",    alert: false },
            { label: "Inventory Value", value: formatCurrency(totalValue),  sub: "At current price", alert: false },
            { label: "Low Stock",       value: lowCount,                    sub: "Need restocking",  alert: lowCount > 0 },
            { label: "Out of Stock",    value: outCount,                    sub: "Unavailable now",  alert: outCount > 0 },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: `1px solid ${s.alert ? "#fde68a" : "#e2e0d8"}`, borderRadius: 12, padding: "1.1rem 1.25rem", position: "relative" }}>
              {s.alert && <div style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: "50%", background: "#d97706" }} />}
              <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: s.alert ? "#d97706" : "#141410" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 8, padding: "0 10px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9a9a8e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                style={{ flex: 1, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: "#141410", outline: "none", padding: "7px 0" }}
                placeholder="Search product, SKU or category…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9a9a8e", fontSize: 16, lineHeight: 1 }}>×</button>}
            </div>

            <div style={{ display: "flex", gap: 5 }}>
              {([
                { key: "all", label: "All" },
                { key: "low", label: `Low Stock${lowCount > 0 ? ` (${lowCount})` : ""}` },
                { key: "out", label: `Out of Stock${outCount > 0 ? ` (${outCount})` : ""}` },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  padding: "5px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  background: filter === f.key ? "#141410" : "#f5f4f0",
                  color:      filter === f.key ? "#fff"     : "#4a4a40",
                  border:     filter === f.key ? "1px solid #141410" : "1px solid #c8c6bc",
                  fontWeight: filter === f.key ? 500 : 400,
                  transition: "all 0.15s",
                }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {fetching ? <Spinner label="Loading inventory…" /> : filtered.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>
              {search || filter !== "all" ? "No items match your filters." : "No products found. Add products first."}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Product", "Category", "SKU", "Price", "Stock", "Stock Value", "Last Updated", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.6rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.product_id}
                    style={{ borderBottom: "1px solid #e2e0d8" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}
                  >
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <div style={{ fontWeight: 500, color: "#141410" }}>{item.product_name}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <span style={{ display: "inline-block", padding: "2px 8px", background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 6, fontSize: 11, color: "#4a4a40" }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem", color: "#9a9a8e", fontFamily: "monospace", fontSize: 12 }}>
                      {item.sku ?? "—"}
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem", fontWeight: 500, color: "#141410" }}>
                      {formatCurrency(item.price)}
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <StockBadge stock={item.stock} />
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem", fontWeight: 500, color: "#141410" }}>
                      {formatCurrency(item.price * item.stock)}
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40", whiteSpace: "nowrap" }}>
                      {formatDate(item.updated_at)}
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => setAdjustTarget(item)}
                          style={{ padding: "5px 10px", background: "#141410", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}
                        >
                          Adjust
                        </button>
                        <button
                          onClick={() => fetchHistory(item)}
                          style={{ padding: "5px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 6, fontSize: 12, color: "#4a4a40", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Footer */}
          {!fetching && filtered.length > 0 && (
            <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid #e2e0d8", fontSize: 12, color: "#9a9a8e", display: "flex", justifyContent: "space-between" }}>
              <span>Showing {filtered.length} of {inventory.length} product{inventory.length !== 1 ? "s" : ""}</span>
              <span>Filtered value: <strong style={{ color: "#141410" }}>{formatCurrency(filtered.reduce((s, i) => s + i.price * i.stock, 0))}</strong></span>
            </div>
          )}
        </div>
      </main>
    </>
  );
}