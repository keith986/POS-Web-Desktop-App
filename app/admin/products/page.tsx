"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useStore } from "@/app/_lib/StoreContext";

/* ── Types ── */
interface Product {
  id:          string;
  name:        string;
  category:    string;
  price:       number;
  stock:       number;
  sku:         string;
  description: string;
  status:      "active" | "inactive";
  admin_id:    string;
  created_at:  string;
}

interface ProductForm {
  name:        string;
  category:    string;
  price:       string;
  stock:       string;
  sku:         string;
  description: string;
}

interface ConfirmState {
  open:      boolean;
  title:     string;
  message:   string;
  onConfirm: () => void;
}

interface StoredUser {
  id:         string;
  full_name:  string;
  email:      string;
  role:       string;
  store_name: string | null;
}

const CATEGORIES = ["All", "Footwear", "Accessories", "Skincare", "Kitchen", "Apparel", "Stationery", "Home", "Bags", "Electronics", "Other"];

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
function IconWarning() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function IconTag() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c8c6bc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  );
}
function IconList() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}
function IconGrid() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconX() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
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

/* ── Confirm Modal ── */
function ConfirmModal({ state, onCancel }: { state: ConfirmState; onCancel: () => void }) {
  if (!state.open) return null;
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        background: "#fff", borderRadius: 14, padding: "1.75rem",
        width: "100%", maxWidth: 400, zIndex: 1001,
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        animation: "slideUp 0.2s ease",
      }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}><IconWarning /></div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#141410", marginBottom: 8 }}>{state.title}</div>
        <div style={{ fontSize: 13, color: "#9a9a8e", lineHeight: 1.6, marginBottom: "1.5rem" }}>{state.message}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "8px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => { state.onConfirm(); onCancel(); }} style={{ padding: "8px 18px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            Yes, proceed
          </button>
        </div>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translate(-50%,-46%)}to{opacity:1;transform:translate(-50%,-50%)}}`}</style>
      </div>
    </>
  );
}

/* ── Spinner ── */
function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", color: "#9a9a8e", fontSize: 13, gap: 10 }}>
      <div style={{ width: 18, height: 18, border: "2px solid #e2e0d8", borderTopColor: "#141410", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      Loading products…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Stock Badge ── */
function StockBadge({ stock }: { stock: number }) {
  const cfg =
    stock === 0 ? { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "Out of stock" } :
    stock <= 8  ? { bg: "#fffbeb", color: "#d97706", border: "#fde68a", label: `Low — ${stock}` } :
                  { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", label: `${stock} in stock` };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 500, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

/* ── Product Slide-over Panel ── */
function ProductPanel({
  open, onClose, mode, product, onSave, saving,
}: {
  open:     boolean;
  onClose:  () => void;
  mode:     "add" | "edit";
  product?: Product | null;
  onSave:   (form: ProductForm) => void;
  saving:   boolean;
}) {
  const blank: ProductForm = { name: "", category: "Other", price: "", stock: "", sku: "", description: "" };
  const [form, setForm] = useState<ProductForm>(blank);

  useEffect(() => {
    if (open) {
      setForm(mode === "edit" && product
        ? { name: product.name, category: product.category, price: String(product.price), stock: String(product.stock), sku: product.sku, description: product.description ?? "" }
        : blank
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, product]);

  if (!open) return null;

  const set = (key: keyof ProductForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "100%", maxWidth: 460,
        background: "#fff", zIndex: 901,
        boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column",
        animation: "panelIn 0.25s ease",
      }}>
        <style>{`@keyframes panelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{mode === "add" ? "Add Product" : "Edit Product"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#9a9a8e", lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.1rem" }}>

          {/* Row: Name + SKU */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
            <div>
              <label style={labelStyle}>Product Name *</label>
              <input style={fieldStyle} placeholder="e.g. Air Runner Pro" value={form.name} onChange={set("name")} />
            </div>
            <div>
              <label style={labelStyle}>SKU</label>
              <input style={fieldStyle} placeholder="e.g. FW-001" value={form.sku} onChange={set("sku")} />
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category *</label>
            <select style={fieldStyle} value={form.category} onChange={set("category")}>
              {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Row: Price + Stock */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
            <div>
              <label style={labelStyle}>Price *</label>
              <input style={fieldStyle} type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={set("price")} />
            </div>
            <div>
              <label style={labelStyle}>Stock Quantity *</label>
              <input style={fieldStyle} type="number" min="0" placeholder="0" value={form.stock} onChange={set("stock")} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...fieldStyle, resize: "vertical", minHeight: 80, lineHeight: 1.5 }}
              placeholder="Optional product description…"
              value={form.description}
              onChange={set("description")}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #e2e0d8", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            style={{ padding: "9px 20px", background: saving ? "#9a9a8e" : "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {saving ? "Saving…" : mode === "add" ? "Add Product" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function AdminProductsPage() {
  const [adminUser]  = useState<StoredUser | null>(getStoredUser);
  const { formatCurrency, formatDate, config } = useStore();
  const [products,   setProducts]  = useState<Product[]>([]);
  const [fetching,   setFetching]  = useState(true);
  const [saving,     setSaving]    = useState(false);
  const [search,     setSearch]    = useState("");
  const [catFilter,  setCatFilter] = useState("All");
  const [view,       setView]      = useState<"grid" | "table">("table");
  const [panelOpen,  setPanelOpen] = useState(false);
  const [panelMode,  setPanelMode] = useState<"add" | "edit">("add");
  const [editTarget, setEditTarget]= useState<Product | null>(null);
  const [toast,      setToast]     = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirm,    setConfirm]   = useState<ConfirmState>({ open: false, title: "", message: "", onConfirm: () => {} });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openConfirm = (title: string, message: string, onConfirm: () => void) =>
    setConfirm({ open: true, title, message, onConfirm });
  const closeConfirm = () => setConfirm(c => ({ ...c, open: false }));

  /* ── Fetch products ── */
  const fetchProducts = useCallback(async () => {
    if (!adminUser?.id) return;
    setFetching(true);
    try {
      const res  = await fetch(`/api/products?admin_id=${adminUser.id}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      showToast("Failed to load products", "error");
    } finally {
      setFetching(false);
    }
  }, [adminUser?.id]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  /* ── Save (add / edit) ── */
  const handleSave = (form: ProductForm) => {
    if (!adminUser?.id) return showToast("Not logged in", "error");
    if (!form.name || !form.category || !form.price || !form.stock)
      return showToast("Name, category, price and stock are required", "error");
    if (isNaN(Number(form.price)) || Number(form.price) < 0)
      return showToast("Enter a valid price", "error");
    if (isNaN(Number(form.stock)) || Number(form.stock) < 0)
      return showToast("Enter a valid stock quantity", "error");

    const action = panelMode === "add" ? "add" : "update";
    const url    = panelMode === "add" ? "/api/products" : `/api/products/${editTarget?.id}`;
    const method = panelMode === "add" ? "POST" : "PUT";

    openConfirm(
      panelMode === "add" ? "Add Product" : "Update Product",
      panelMode === "add"
        ? `Add "${form.name}" to your product catalogue?`
        : `Save changes to "${form.name}"?`,
      async () => {
        setSaving(true);
        try {
          const res  = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name:        form.name,
              category:    form.category,
              price:       Number(form.price),
              stock:       Number(form.stock),
              sku:         form.sku,
              description: form.description,
              admin_id:    adminUser.id,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          showToast(panelMode === "add" ? "Product added" : "Product updated");
          setPanelOpen(false);
          fetchProducts();
        } catch (err) {
          showToast((err as Error).message || `Failed to ${action} product`, "error");
        } finally {
          setSaving(false);
        }
      }
    );
  };

  /* ── Toggle status ── */
  const handleToggleStatus = (product: Product) => {
    if (!adminUser?.id) return;
    const next = product.status === "active" ? "inactive" : "active";
    openConfirm(
      `${next === "active" ? "Activate" : "Deactivate"} Product`,
      `${next === "inactive" ? "Hide" : "Show"} "${product.name}" from the product catalogue?`,
      async () => {
        try {
          const res = await fetch(`/api/products/${product.id}/status`, {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ status: next, admin_id: adminUser.id }),
          });
          if (!res.ok) throw new Error("Failed");
          showToast(`"${product.name}" ${next === "active" ? "activated" : "deactivated"}`);
          fetchProducts();
        } catch {
          showToast("Failed to update status", "error");
        }
      }
    );
  };

  /* ── Delete ── */
  const handleDelete = (product: Product) => {
    if (!adminUser?.id) return;
    openConfirm(
      "Delete Product",
      `Permanently delete "${product.name}"? This cannot be undone.`,
      async () => {
        try {
          const res = await fetch(
            `/api/products/${product.id}?admin_id=${adminUser.id}`,
            { method: "DELETE" }
          );
          if (!res.ok) throw new Error("Failed");
          showToast(`"${product.name}" deleted`);
          fetchProducts();
        } catch {
          showToast("Failed to delete product", "error");
        }
      }
    );
  };

  /* ── Filtered ── */
  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
                        p.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "All" || p.category === catFilter;
    return matchSearch && matchCat;
  });

  const totalValue   = products.reduce((s, p) => s + p.price * p.stock, 0);
  const lowStock     = products.filter(p => p.stock > 0 && p.stock <= 8).length;
  const outOfStock   = products.filter(p => p.stock === 0).length;

  const dater = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(new Date());

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <ConfirmModal state={confirm} onCancel={closeConfirm} />
      <ProductPanel
        key={`${panelMode}-${editTarget?.id ?? "new"}`}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        mode={panelMode}
        product={editTarget}
        onSave={handleSave}
        saving={saving}
      />

      {/* ── Header ── */}
      <header className="header">
        <div className="header-title">Products</div>
        <div className="header-date">{dater}</div>
        <button
          onClick={() => { setPanelMode("add"); setEditTarget(null); setPanelOpen(true); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#141410", color: "#fff", border: "none", borderRadius: 7, fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          <IconPlus /> Add Product
        </button>
      </header>

      <main className="main">

        {/* Stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
          {[
            { label: "Total Products",  value: products.length,           sub: "In catalogue" },
            { label: "Inventory Value", value: formatCurrency(totalValue), sub: "At current price" },
            { label: "Low Stock",       value: lowStock,                   sub: "Need restocking" },
            { label: "Out of Stock",    value: outOfStock,                 sub: "Unavailable" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "1.1rem 1.25rem" }}>
              <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.5px" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Products card */}
        <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

            {/* Search */}
            <div style={{ flex: 1, minWidth: 180, display: "flex", alignItems: "center", gap: 8, background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 8, padding: "0 10px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9a9a8e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                style={{ flex: 1, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: "#141410", outline: "none", padding: "7px 0" }}
                placeholder="Search by name, SKU or category…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9a9a8e", fontSize: 16, lineHeight: 1 }}>×</button>
              )}
            </div>

            {/* Category filters */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCatFilter(c)} style={{
                  padding: "5px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  background: catFilter === c ? "#141410" : "#f5f4f0",
                  color:      catFilter === c ? "#fff" : "#4a4a40",
                  border:     catFilter === c ? "1px solid #141410" : "1px solid #c8c6bc",
                  fontWeight: catFilter === c ? 500 : 400,
                  transition: "all 0.15s",
                }}>
                  {c}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div style={{ display: "flex", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
              {(["table", "grid"] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: "6px 12px", border: "none", cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                  background: view === v ? "#141410" : "transparent",
                  color:      view === v ? "#fff" : "#4a4a40",
                }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {v === "table" ? <><IconList /> Table</> : <><IconGrid /> Grid</>}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {fetching ? <Spinner /> : filtered.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>
              {search || catFilter !== "All" ? "No products match your filters." : "No products yet. Add your first one."}
            </div>
          ) : view === "table" ? (

            /* ── TABLE VIEW ── */
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Product", "Category", "Price", "Stock", "Status", "Added", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.6rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}
                    style={{ borderBottom: "1px solid #e2e0d8" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}
                  >
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <div style={{ fontWeight: 500, color: "#141410" }}>{p.name}</div>
                      {p.sku && <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 1 }}>{p.sku}</div>}
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <span style={{ display: "inline-block", padding: "2px 8px", background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 6, fontSize: 11, color: "#4a4a40" }}>
                        {p.category}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem", fontWeight: 500, color: "#141410" }}>
                      {formatCurrency(p.price)}
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <StockBadge stock={p.stock} />
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: p.status === "active" ? "#16a34a" : "#9a9a8e" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.status === "active" ? "#16a34a" : "#c8c6bc" }} />
                        {p.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40" }}>
                      {formatDate(p.created_at)}
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          onClick={() => { setPanelMode("edit"); setEditTarget(p); setPanelOpen(true); }}
                          style={{ padding: "5px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 6, fontSize: 12, color: "#141410", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(p)}
                          style={{ padding: "5px 10px", background: p.status === "active" ? "#fffbeb" : "#f0fdf4", border: `1px solid ${p.status === "active" ? "#fde68a" : "#bbf7d0"}`, borderRadius: 6, fontSize: 12, color: p.status === "active" ? "#d97706" : "#16a34a", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          {p.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          style={{ padding: "5px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          ) : (

            /* ── GRID VIEW ── */
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: "1rem", padding: "1.25rem" }}>
              {filtered.map(p => (
                <div key={p.id} style={{ border: "1px solid #e2e0d8", borderRadius: 10, overflow: "hidden", background: "#fafaf8", transition: "box-shadow 0.15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}
                >
                  {/* Thumb */}
                  <div style={{ height: 90, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #e2e0d8", position: "relative" }}>
                    <IconTag />
                    <div style={{ position: "absolute", top: 8, right: 8 }}>
                      <StockBadge stock={p.stock} />
                    </div>
                  </div>
                  {/* Info */}
                  <div style={{ padding: "0.75rem" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#141410", marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#9a9a8e", marginBottom: 6 }}>{p.category}{p.sku ? ` · ${p.sku}` : ""}</div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#141410", marginBottom: 10 }}>{formatCurrency(p.price)}</div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button
                        onClick={() => { setPanelMode("edit"); setEditTarget(p); setPanelOpen(true); }}
                        style={{ flex: 1, padding: "5px 0", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 6, fontSize: 11, color: "#141410", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        style={{ padding: "5px 8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 11, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        <IconX />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer count */}
          {!fetching && filtered.length > 0 && (
            <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid #e2e0d8", fontSize: 12, color: "#9a9a8e" }}>
              Showing {filtered.length} of {products.length} product{products.length !== 1 ? "s" : ""}
              {catFilter !== "All" && ` in ${catFilter}`}
            </div>
          )}
        </div>
      </main>
    </>
  );
}