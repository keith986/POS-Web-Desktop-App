"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Sidebar from "@/app/staff/component/Sidebar";
import staffCss from "@/app/staff/component/staffStyles";
import StaffSettingsTab from "@/app/staff/component/StaffSettingsTab";

/* ─── Types ─────────────────────────────────────────────────── */
interface StoredStaff {
  id:         string;
  full_name:  string;
  email:      string;
  role:       string;
  admin_id:   string;
  shift_role: string | null;
  status:     "active" | "inactive";
}

interface Product {
  id:       string;
  name:     string;
  category: string;
  price:    number;
  stock:    number;
  sku:      string | null;
  status:   "active" | "inactive";
  admin_id: string;
}

interface CartItem extends Product {
  qty: number;
}

interface SaleItem {
  name:     string;
  quantity: number;
  price:    number;
}

interface Sale {
  id:              string;
  order_number:    string;
  items:           SaleItem[] | string;
  subtotal:        number;
  discount_amount: number;
  discount_code?:  string | null;
  tax:             number;
  total:           number;
  payment_method:  string;
  status:          string;
  staff_name:      string | null;
  created_at:      string;
}

interface StoreSettings {
  tax_enabled:   boolean;
  tax_rate:      number;
  tax_name:      string;
  tax_inclusive: boolean;
  currency:      string;
}

interface Discount {
  id:             string;
  name:           string;
  description?:   string;
  discount_type:  "percentage" | "fixed" | "buy_x_get_y";
  discount_value: number;
  max_discount?:  number;
  code?:          string;
  usage_limit?:   number;
  usage_count:    number;
  is_active:      boolean;
  valid_from?:    string;
  valid_until?:   string;
  created_at:     string;
}

function formatCurrency(n: number, currency = "KES"): string {
  return `${currency} ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ─── Safe items parser ── */
function parseItems(raw: SaleItem[] | string): SaleItem[] {
  try {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") return JSON.parse(raw);
    return [];
  } catch { return []; }
}

/* ─── Category SVG icons ── */
function IcoCatDefault()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>; }
function IcoCatFootwear()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18l4-8 4 4 4-6 4 10H2z"/><line x1="2" y1="18" x2="22" y2="18"/></svg>; }
function IcoCatApparel()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>; }
function IcoCatSkincare()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 007-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 007 7z"/></svg>; }
function IcoCatKitchen()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>; }
function IcoCatBags()       { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>; }
function IcoCatElectronics(){ return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>; }
function IcoCatHealth()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 19H5a2 2 0 01-2-2V7a2 2 0 012-2h3m8 0h3a2 2 0 012 2v10a2 2 0 01-2 2h-3m-5-1V3m0 18a2 2 0 002-2V5a2 2 0 00-2-2 2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>; }
function IcoCatStationery() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>; }
function IcoCatHome()       { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function IcoCatFood()       { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>; }
function IcoCatSports()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>; }

const CATEGORY_ICON_MAP: Record<string, () => React.ReactElement> = {
  footwear: IcoCatFootwear, shoes: IcoCatFootwear,
  accessories: IcoCatBags, bags: IcoCatBags,
  skincare: IcoCatSkincare, beauty: IcoCatSkincare,
  kitchen: IcoCatKitchen, food: IcoCatFood, beverage: IcoCatKitchen,
  apparel: IcoCatApparel, clothing: IcoCatApparel, caps: IcoCatApparel,
  stationery: IcoCatStationery, books: IcoCatStationery,
  home: IcoCatHome,
  electronics: IcoCatElectronics,
  health: IcoCatHealth, pharmacy: IcoCatHealth,
  sports: IcoCatSports, toys: IcoCatSports,
};

const CATEGORY_COLOR_MAP: Record<string, { bg: string; color: string }> = {
  footwear:    { bg: "#eff6ff", color: "#2563eb" }, shoes:       { bg: "#eff6ff", color: "#2563eb" },
  accessories: { bg: "#fdf4ff", color: "#9333ea" }, bags:        { bg: "#fdf4ff", color: "#9333ea" },
  skincare:    { bg: "#f0fdf4", color: "#16a34a" }, beauty:      { bg: "#f0fdf4", color: "#16a34a" },
  kitchen:     { bg: "#fffbeb", color: "#d97706" }, food:        { bg: "#f0fdf4", color: "#16a34a" },
  beverage:    { bg: "#fffbeb", color: "#d97706" },
  apparel:     { bg: "#fff7ed", color: "#ea580c" }, clothing:    { bg: "#fff7ed", color: "#ea580c" },
  caps:        { bg: "#fff7ed", color: "#ea580c" },
  stationery:  { bg: "#f0f9ff", color: "#0284c7" }, books:       { bg: "#f0f9ff", color: "#0284c7" },
  home:        { bg: "#fdf2f8", color: "#c026d3" },
  electronics: { bg: "#eff6ff", color: "#2563eb" },
  health:      { bg: "#fef2f2", color: "#dc2626" }, pharmacy:    { bg: "#fef2f2", color: "#dc2626" },
  sports:      { bg: "#f0fdf4", color: "#16a34a" }, toys:        { bg: "#fffbeb", color: "#d97706" },
};

function getCategoryIcon(category: string): () => React.ReactElement {
  const key = category.toLowerCase().replace(/[^a-z]/g, "");
  return CATEGORY_ICON_MAP[key] ?? IcoCatDefault;
}
function getCategoryColor(category: string): { bg: string; color: string } {
  const key = category.toLowerCase().replace(/[^a-z]/g, "");
  return CATEGORY_COLOR_MAP[key] ?? { bg: "#f5f4f0", color: "#4a4a40" };
}
function CategoryIcon({ category, size = 18 }: { category: string; size?: number }) {
  const iconFn = getCategoryIcon(category);
  const color  = getCategoryColor(category);
  return (
    <div style={{ width: size + 12, height: size + 12, borderRadius: 8, background: color.bg, color: color.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {iconFn()}
    </div>
  );
}

const TABS = ["Dashboard", "Record Sale", "Products", "Sales History", "Settings"];
const HEADER_TITLES: Record<string, string> = {
  "Dashboard":     "Staff Dashboard",
  "Record Sale":   "Record a Sale",
  "Products":      "Product Catalogue",
  "Sales History": "Sales History",
  "Settings":      "My Settings",
};

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
  </svg>
);

/* ── Print receipt after checkout ── */
const printReceipt = (order: {
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  discount_amount: number;
  discount_code?: string | null;
  tax: number;
  total: number;
  paymentMethod?: string;
  staffName?: string;
}) => {
  const win = window.open("", "_blank", "width=320,height=600");
  if (!win) return;

  const itemLines = order.items.map(item =>
    `<tr>
      <td style="padding:2px 0;font-size:12px;">${item.name}</td>
      <td style="text-align:center;padding:2px 4px;font-size:12px;">${item.qty}</td>
      <td style="text-align:right;padding:2px 0;font-size:12px;">KES ${(item.price * item.qty).toLocaleString()}</td>
    </tr>`
  ).join("");

  const html = buildReceiptHtml({
    orderNumber: order.orderNumber,
    dateStr: new Date().toLocaleString(),
    itemLines,
    subtotal: order.subtotal,
    discountAmount: order.discount_amount,
    discountCode: order.discount_code,
    tax: order.tax,
    total: order.total,
    paymentMethod: order.paymentMethod,
    staffName: order.staffName,
  });

  win.document.write(html);
  win.document.close();
};

/* ── Print receipt from sales history ── */
const printSaleReceipt = (sale: Sale, staffName: string) => {
  const win = window.open("", "_blank", "width=320,height=600");
  if (!win) return;

  // Safe parse — handles pre-parsed arrays, JSON strings, and empty/null
  const items: SaleItem[] = parseItems(sale.items);

  if (items.length === 0) {
    win.document.write(`<html><body style="font-family:monospace;padding:20px;text-align:center;">
      <h3>POStore Receipt</h3>
      <p>${sale.order_number}</p>
      <p>Total: KES ${Number(sale.total).toFixed(2)}</p>
      <p style="color:#888;font-size:11px;">Item details unavailable</p>
      <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script>
    </body></html>`);
    win.document.close();
    return;
  }

  const itemLines = items.map(item =>
    `<tr>
      <td style="padding:2px 0;font-size:12px;">${item.name}</td>
      <td style="text-align:center;padding:2px 4px;font-size:12px;">${item.quantity}</td>
      <td style="text-align:right;padding:2px 0;font-size:12px;">KES ${(item.price * item.quantity).toLocaleString()}</td>
    </tr>`
  ).join("");

  const html = buildReceiptHtml({
    orderNumber: sale.order_number,
    dateStr: new Date(sale.created_at).toLocaleString(),
    itemLines,
    subtotal: sale.subtotal,
    discountAmount: sale.discount_amount,
    discountCode: sale.discount_code,
    tax: sale.tax,
    total: sale.total,
    paymentMethod: sale.payment_method,
    staffName,
  });

  win.document.write(html);
  win.document.close();
};

/* ── Shared receipt HTML builder ── */
function buildReceiptHtml(opts: {
  orderNumber: string;
  dateStr: string;
  itemLines: string;
  subtotal: number;
  discountAmount?: number;
  discountCode?: string | null;
  tax: number;
  total: number;
  paymentMethod?: string;
  staffName?: string;
}): string {
  const { orderNumber, dateStr, itemLines, subtotal, discountAmount = 0, discountCode, tax, total, paymentMethod, staffName } = opts;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Receipt - ${orderNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'DM Mono', 'Courier New', monospace; font-size: 12px; color: #111; background: #fff; width: 280px; margin: 0 auto; padding: 16px 8px; }
    .center { text-align: center; }
    .divider { border: none; border-top: 1px dashed #aaa; margin: 8px 0; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: 2px; margin-bottom: 2px; }
    .sub { font-size: 10px; color: #555; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 10px; color: #888; text-transform: uppercase; padding: 4px 0; border-bottom: 1px dashed #ccc; }
    .total-row td { font-size: 13px; font-weight: 700; padding-top: 6px; }
    .tax-row td { font-size: 11px; color: #555; }
    .discount-row td { font-size: 11px; color: #d946ef; }
    .footer { font-size: 10px; color: #888; margin-top: 12px; }
    .payment-badge { display: inline-block; background: #111; color: #fff; font-size: 10px; padding: 2px 8px; border-radius: 3px; letter-spacing: 1px; margin-top: 4px; }
    @media print { body { width: 280px; } button { display: none; } }
  </style>
</head>
<body>
  <div class="center">
    <div class="brand">POStore</div>
    <div class="sub">Point of Sale Receipt</div>
    <div class="sub">${dateStr}</div>
    <div class="sub">${orderNumber}</div>
  </div>
  <hr class="divider"/>
  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Item</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>${itemLines}</tbody>
  </table>
  <hr class="divider"/>
  <table>
    <tr class="tax-row">
      <td>Subtotal</td>
      <td style="text-align:right;">KES ${Number(subtotal).toLocaleString()}</td>
    </tr>
    ${discountAmount > 0 ? `
    <tr class="discount-row">
      <td>Discount${discountCode ? ` (${discountCode})` : ""}</td>
      <td style="text-align:right;">-KES ${Number(discountAmount).toLocaleString()}</td>
    </tr>` : ""}
    <tr class="tax-row">
      <td>VAT</td>
      <td style="text-align:right;">KES ${Number(tax).toFixed(2)}</td>
    </tr>
    <tr class="total-row">
      <td>TOTAL</td>
      <td style="text-align:right;">KES ${Number(total).toFixed(2)}</td>
    </tr>
  </table>
  <hr class="divider"/>
  <div class="center">
    ${staffName ? `<div class="sub">Served by: <strong>${staffName}</strong></div>` : ""}
    ${paymentMethod ? `<div><span class="payment-badge">${paymentMethod.toUpperCase()}</span></div>` : ""}
    <div class="footer" style="margin-top:10px;">Thank you for shopping with us!</div>
    <div class="footer">POStore &bull; pos.upendoapps.com</div>
  </div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body>
</html>`;
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function StaffDashboard() {
  const [staff,  setStaff]  = useState<StoredStaff | null>(null);
  const [ready,  setReady]  = useState(false);

  const [activeTab,        setActiveTab]        = useState("Dashboard");
  const [products,         setProducts]         = useState<Product[]>([]);
  const [sales,            setSales]            = useState<Sale[]>([]);
  const [discounts,        setDiscounts]        = useState<Discount[]>([]);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [settings,         setSettings]         = useState<StoreSettings>({ tax_enabled: true, tax_rate: 16, tax_name: "VAT", tax_inclusive: false, currency: "KES" });
  const [cart,             setCart]             = useState<CartItem[]>([]);
  const [payMethod,        setPayMethod]        = useState("Card");
  const [search,           setSearch]           = useState("");
  const [catFilter,        setCatFilter]        = useState("All");
  const [fetching,         setFetching]         = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [toast,            setToast]            = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  /* ── Auth guard ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get("session");

    if (sessionParam) {
      try {
        const user = JSON.parse(decodeURIComponent(sessionParam));
        localStorage.setItem("user", JSON.stringify(user));
        window.history.replaceState({}, "", window.location.pathname);
      } catch {
        window.location.href = "https://pos.upendoapps.com";
        return;
      }
    }

    const stored = localStorage.getItem("user");
    if (!stored) { window.location.href = "https://pos.upendoapps.com"; return; }

    try {
      const user = JSON.parse(stored);
      if (!user || user.role !== "staff") { window.location.href = "https://pos.upendoapps.com"; return; }

    fetch(`/api/subscription/status?admin_id=${user.admin_id}`)
     .then(r => r.json())
     .then(d => {
     if (d.status !== "active") { 
       window.location.href = "/suspended"; 
       return; 
    }
      setStaff(user);
      setReady(true);
    })
    .catch(() => { 
      // Network error — allow through
      setStaff(user); 
      setReady(true); 
    });

    } catch {
      window.location.href = "https://pos.upendoapps.com";
    }
  }, []);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Fetch all data ── */
  const fetchAll = useCallback(async () => {
    if (!staff?.admin_id) return;
    setFetching(true);
    try {
      const [prodRes, settRes, salesRes, discRes] = await Promise.all([
        fetch(`/api/products?admin_id=${staff.admin_id}`),
        fetch(`/api/settings?admin_id=${staff.admin_id}`),
        fetch(`/api/orders?admin_id=${staff.admin_id}&staff_id=${staff.id}&today=true`),
        fetch(`/api/discounts?admin_id=${staff.admin_id}`),
      ]);

      const [prodData, settData, salesData, discData] = await Promise.all([
        prodRes.json(), settRes.json(), salesRes.json(), discRes.json(),
      ]);

      if (Array.isArray(prodData))
        setProducts(prodData.filter((p: Product) => p.status === "active"));

      if (settData && !settData.error)
        setSettings({
          tax_enabled:   Boolean(settData.tax_enabled),
          tax_rate:      Number(settData.tax_rate) || 16,
          tax_name:      settData.tax_name || "VAT",
          tax_inclusive: Boolean(settData.tax_inclusive),
          currency:      settData.currency || "KES",
        });

      if (Array.isArray(discData))
        setDiscounts(discData.filter((d: Discount) => d.is_active));

      if (Array.isArray(salesData)) {
        setSales(salesData.map((s: Sale) => ({
          ...s,
          items:           parseItems(s.items),
          discount_amount: Number(s.discount_amount) || 0,
        })));
      }
    } catch { showToast("Failed to load data", "err"); }
    finally  { setFetching(false); }
  }, [staff?.admin_id, staff?.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Categories ── */
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category))).sort();
    return ["All", ...cats];
  }, [products]);

  /* ── Filtered products ── */
  const filtered = useMemo(() => products.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "All" || p.category === catFilter;
    return matchSearch && matchCat;
  }), [products, search, catFilter]);

  /* ── Cart helpers ── */
  const addToCart = (product: Product) => {
    if (product.stock === 0) return;
    setCart(c => {
      const ex = c.find(i => i.id === product.id);
      if (ex) return c.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { ...product, qty: 1 }];
    });
    setActiveTab("Record Sale");
  };

  const updateQty  = (id: string, delta: number) =>
    setCart(c => c.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  const removeItem = (id: string) => setCart(c => c.filter(i => i.id !== id));

  /* ── Totals ── */
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  let discountAmount = 0;
  if (selectedDiscount) {
    discountAmount = selectedDiscount.discount_type === "percentage"
      ? subtotal * (selectedDiscount.discount_value / 100)
      : selectedDiscount.discount_value;
    if (selectedDiscount.max_discount && discountAmount > selectedDiscount.max_discount)
      discountAmount = selectedDiscount.max_discount;
  }
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = settings.tax_enabled && !settings.tax_inclusive
    ? discountedSubtotal * (settings.tax_rate / 100) : 0;
  const total     = discountedSubtotal + taxAmount;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  /* ── Complete sale ── */
  const completeSale = async () => {
    if (!cart.length || !staff) return;
    setSaving(true);
    try {
      const items = cart.map(i => ({ id: i.id, name: i.name, quantity: i.qty, price: i.price }));
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          subtotal,
          discount_amount: discountAmount,
          discount_code:   selectedDiscount?.code || null,
          tax:             taxAmount,
          total,
          payment_method:  payMethod.toLowerCase(),
          payment_status:  "paid",
          status:          "completed",
          customer_name:   "Walk-in Customer",
          customer_email:  "",
          staff_name:      staff.full_name,
          admin_id:        staff.admin_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Sale ${data.order_number} completed — ${formatCurrency(total, settings.currency)}`);

      printReceipt({
        orderNumber:     data.order_number,
        items:           cart,
        subtotal,
        discount_amount: discountAmount,
        discount_code:   selectedDiscount?.code || null,
        tax:             taxAmount,
        total,
        paymentMethod:   payMethod,
        staffName:       staff.full_name,
      });

      setCart([]);
      setSelectedDiscount(null);
      fetchAll();
    } catch (err) {
      showToast((err as Error).message || "Failed to complete sale", "err");
    } finally {
      setSaving(false);
    }
  };

  /* ── Stock helpers ── */
  const stockClass = (s: number) => s === 0 ? "badge bad" : s <= 8 ? "badge warn" : "badge ok";
  const stockLabel = (s: number) => s === 0 ? "Out of stock" : s <= 8 ? `Low — ${s} left` : `${s} in stock`;

  const shiftTotal = sales.reduce((s, r) => s + r.total, 0);
  const lowStockCt = products.filter(p => p.stock > 0 && p.stock <= 8).length;

  if (!ready || !staff) return null;

  const dater = new Intl.DateTimeFormat("en-US", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  }).format(new Date());

  return (
    <>
      <style>{staffCss}</style>

      {/* Toast */}
      {toast && (
        <div className="staff-toast" style={{ background: toast.type === "err" ? "#dc2626" : "#141410" }}>
          <span style={{ display: "inline-flex" }}>
            {toast.type === "err"
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
          </span>
          {toast.msg}
        </div>
      )}

      <div className="staff-shell">

        {/* ── SIDEBAR ── */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} cartCount={cartCount} />

        {/* ── HEADER ── */}
        <header className="staff-header">
          <div className="hdr-title">{HEADER_TITLES[activeTab]}</div>
          <div className="hdr-shift-pill">
            <div className="hdr-shift-dot" />
            {staff.full_name} · On Shift
          </div>
          <div className="hdr-time">{dater}</div>
          <button className="hdr-btn" onClick={() => setActiveTab("Record Sale")}>+ New Sale</button>
        </header>

        {/* ── MAIN ── */}
        <main className="staff-main">

          {/* Tab bar */}
          <div className="staff-tabs">
            {TABS.map(t => (
              <button key={t} className={`staff-tab-btn ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                {t}
                {t === "Record Sale" && cartCount > 0 && <span className="staff-tab-count">{cartCount}</span>}
              </button>
            ))}
          </div>

          {/* ══ DASHBOARD ══ */}
          {activeTab === "Dashboard" && (
            <>
              <div className="stat-strip">
                {[
                  { label: "Shift Sales",   value: fetching ? "…" : formatCurrency(shiftTotal, settings.currency), sub: "Today on your shift" },
                  { label: "Transactions",  value: fetching ? "…" : String(sales.length),  sub: "This shift"   },
                  { label: "Items in Cart", value: String(cartCount),                       sub: "Pending sale" },
                  { label: "Low Stock",     value: fetching ? "…" : String(lowStockCt),     sub: "Products"     },
                ].map(s => (
                  <div className="stat-card" key={s.label}>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Recent Sales</span>
                    <span className="card-meta">{sales.length} this shift</span>
                  </div>
                  {fetching ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading…</div>
                  ) : sales.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No sales yet today.</div>
                  ) : (
                    <table className="tbl">
                      <thead><tr><th>Order</th><th>Items</th><th>Total</th><th>Method</th></tr></thead>
                      <tbody>
                        {sales.slice(0, 4).map(s => {
                          const items = parseItems(s.items);
                          const itemStr = items.length > 0
                            ? items.map(i => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")
                            : "—";
                          return (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 500, color: "var(--ink)" }}>{s.order_number}</td>
                              <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{itemStr}</td>
                              <td style={{ fontWeight: 500, color: "var(--ink)" }}>{formatCurrency(s.total, settings.currency)}</td>
                              <td><span className="badge info"><span className="badge-dot" />{s.payment_method}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Stock Alerts</span>
                    <span className="card-meta">View only</span>
                  </div>
                  {fetching ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading…</div>
                  ) : products.filter(p => p.stock <= 8).length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      All products well stocked
                    </div>
                  ) : (
                    <div style={{ paddingBottom: "0.5rem" }}>
                      {products.filter(p => p.stock <= 8).map(p => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.7rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
                          <CategoryIcon category={p.category} size={16} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.sku ?? p.category}</div>
                          </div>
                          <span className={stockClass(p.stock)}><span className="badge-dot" />{stockLabel(p.stock)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══ RECORD SALE ══ */}
          {activeTab === "Record Sale" && (
            <div className="sale-layout">
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Add Products to Sale</span>
                    <span className="card-meta">Click a product to add</span>
                  </div>
                  <div className="toolbar">
                    <div className="search-wrap">
                      <SearchIcon />
                      <input placeholder="Search by name or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {categories.map(c => (
                        <button key={c} className={`filter-btn ${catFilter === c ? "active" : ""}`} onClick={() => setCatFilter(c)}>{c}</button>
                      ))}
                    </div>
                  </div>
                  {fetching ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading products…</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: "0.75rem", padding: "1rem" }}>
                      {filtered.filter(p => p.stock > 0).map(p => (
                        <button key={p.id} onClick={() => addToCart(p)} style={{
                          background: cart.find(i => i.id === p.id) ? "var(--accent-bg)" : "var(--bg)",
                          border: cart.find(i => i.id === p.id) ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                          borderRadius: 10, padding: "0.75rem", cursor: "pointer",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                          transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif",
                        }}>
                          <CategoryIcon category={p.category} size={22} />
                          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)", textAlign: "center" }}>{p.name}</span>
                          <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>{formatCurrency(p.price, settings.currency)}</span>
                        </button>
                      ))}
                      {filtered.filter(p => p.stock > 0).length === 0 && (
                        <div style={{ gridColumn: "1/-1", padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No products found.</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Current Sale</span>
                    <span className="card-meta">{cart.length} item{cart.length !== 1 ? "s" : ""}</span>
                  </div>
                  {cart.length === 0 ? (
                    <div className="empty-cart">
                      <div className="empty-cart-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--border2)" }}>
                          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                        </svg>
                      </div>
                      No items yet — add products above
                    </div>
                  ) : (
                    cart.map(item => (
                      <div className="sale-item-row" key={item.id}>
                        <CategoryIcon category={item.category} size={16} />
                        <div style={{ flex: 1 }}>
                          <div className="sale-item-name">{item.name}</div>
                          <div className="sale-item-price">{formatCurrency(item.price, settings.currency)} each</div>
                        </div>
                        <div className="qty-ctrl">
                          <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                          <span className="qty-num">{item.qty}</span>
                          <button className="qty-btn" onClick={() => updateQty(item.id, +1)}>+</button>
                        </div>
                        <div style={{ fontWeight: 500, minWidth: 70, textAlign: "right", fontSize: 13 }}>
                          {formatCurrency(item.price * item.qty, settings.currency)}
                        </div>
                        <button className="remove-btn" onClick={() => removeItem(item.id)}>×</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Summary panel */}
              <div className="summary-card">
                <div className="summary-header">Sale Summary</div>
                <div className="summary-body">
                  <div className="summary-row">
                    <span className="label">Subtotal</span>
                    <span>{formatCurrency(subtotal, settings.currency)}</span>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 500 }}>Apply Discount</div>
                    <select className="payment-select" value={selectedDiscount?.id || ""} onChange={e => {
                      const disc = discounts.find(d => d.id === e.target.value);
                      setSelectedDiscount(disc || null);
                    }}>
                      <option value="">No discount</option>
                      {discounts.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.discount_type === "percentage" ? `(${d.discount_value}%)` : `(KES ${d.discount_value})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {discountAmount > 0 && (
                    <div className="summary-row" style={{ color: "#d946ef" }}>
                      <span className="label">Discount {selectedDiscount?.code ? `(${selectedDiscount.code})` : ""}</span>
                      <span>-{formatCurrency(discountAmount, settings.currency)}</span>
                    </div>
                  )}

                  {settings.tax_enabled && !settings.tax_inclusive && (
                    <div className="summary-row">
                      <span className="label">{settings.tax_name} ({settings.tax_rate}%)</span>
                      <span>{formatCurrency(taxAmount, settings.currency)}</span>
                    </div>
                  )}
                  {settings.tax_enabled && settings.tax_inclusive && (
                    <div className="summary-row">
                      <span className="label">{settings.tax_name} (inclusive)</span>
                      <span style={{ color: "var(--muted)", fontSize: 11 }}>included</span>
                    </div>
                  )}

                  <div className="summary-row total">
                    <span>Total</span>
                    <span>{formatCurrency(total, settings.currency)}</span>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 500 }}>Payment Method</div>
                    <select className="payment-select" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                      <option>Card</option><option>Cash</option><option>Mobile</option>
                    </select>
                  </div>

                  <div style={{ fontSize: 11, color: "var(--muted)", background: "var(--bg)", borderRadius: 7, padding: "0.6rem 0.75rem", lineHeight: 1.6 }}>
                    Staff: <strong style={{ color: "var(--ink)" }}>{staff.full_name}</strong><br />
                    Time: <strong style={{ color: "var(--ink)" }}>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                  </div>

                  <button className="complete-btn" onClick={completeSale} disabled={cart.length === 0 || saving}>
                    {saving ? "Processing…" : cart.length === 0 ? "Add items to complete" : `Complete Sale — ${formatCurrency(total, settings.currency)}`}
                  </button>

                  {cart.length > 0 && (
                    <button onClick={() => setCart([])} style={{ width: "100%", padding: "8px", background: "none", border: "1px solid var(--border2)", borderRadius: 8, fontSize: 12, color: "var(--muted)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      Clear cart
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ PRODUCTS ══ */}
          {activeTab === "Products" && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Product Catalogue</span>
                <span className="card-meta">View only — contact admin to add/edit</span>
              </div>
              <div className="toolbar" style={{ flexWrap: "wrap" }}>
                <div className="search-wrap" style={{ minWidth: 200 }}>
                  <SearchIcon />
                  <input placeholder="Search name or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {categories.map(c => (
                    <button key={c} className={`filter-btn ${catFilter === c ? "active" : ""}`} onClick={() => setCatFilter(c)}>{c}</button>
                  ))}
                </div>
              </div>
              {fetching ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading products…</div>
              ) : (
                <div className="product-grid">
                  {filtered.map(p => (
                    <div className="product-card" key={p.id}>
                      <div className="product-thumb">
                        <CategoryIcon category={p.category} size={28} />
                        <span className={`${stockClass(p.stock)} product-stock-badge`}>{stockLabel(p.stock)}</span>
                      </div>
                      <div className="product-info">
                        <div className="product-name">{p.name}</div>
                        <div className="product-cat">{p.category}{p.sku ? ` · ${p.sku}` : ""}</div>
                        <div className="product-price">{formatCurrency(p.price, settings.currency)}</div>
                        <div className="product-stock-row">
                          <span className="product-stock-num">{p.stock} units</span>
                          <button className="add-to-sale-btn" disabled={p.stock === 0} onClick={() => addToCart(p)}>
                            {p.stock === 0 ? "Out" : "+ Sale"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "2rem", color: "var(--muted)", fontSize: 13 }}>No products match your search.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══ SALES HISTORY ══ */}
          {activeTab === "Sales History" && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Sales History — Today</span>
                <span className="card-meta">{sales.length} transactions · {formatCurrency(shiftTotal, settings.currency)}</span>
              </div>
              {fetching ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading…</div>
              ) : sales.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No sales recorded today.</div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr><th>Order</th><th>Time</th><th>Items</th><th>Total</th><th>Method</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {sales.map(s => {
                      const items = parseItems(s.items);
                      const itemStr = items.length > 0
                        ? items.map(i => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")
                        : "—";
                      return (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 500, color: "var(--ink)" }}>{s.order_number}</td>
                          <td>{formatTime(s.created_at)}</td>
                          <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{itemStr}</td>
                          <td style={{ fontWeight: 500, color: "var(--ink)" }}>{formatCurrency(s.total, settings.currency)}</td>
                          <td><span className="badge info"><span className="badge-dot" />{s.payment_method}</span></td>
                          <td>
                            <span className={`badge ${s.status === "completed" ? "ok" : "warn"}`}>
                              <span className="badge-dot" />
                              {s.status === "completed" ? "Completed" : s.status}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => printSaleReceipt(s, staff?.full_name || "Staff")}
                              style={{ fontSize: 11, padding: "4px 10px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "inherit" }}
                            >
                              Print
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ══ SETTINGS ══ */}
          {activeTab === "Settings" && (
            <StaffSettingsTab staff={staff} settings={settings} formatCurrency={formatCurrency} />
          )}

        </main>
      </div>
    </>
  );
}