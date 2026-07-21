"use client";

import React, { useState, useEffect } from "react";
import { useBulkSelect, HeaderCheckbox, RowCheckbox, BulkActionBar } from "@/app/admin/_components/BulkSelectBar";

interface Discount {
  id: string;
  name: string;
  description?: string;
  discount_type: "percentage" | "fixed" | "buy_x_get_y";
  discount_value: number;
  max_discount?: number;
  code?: string;
  usage_limit?: number;
  usage_count: number;
  is_active: boolean;
  valid_from?: string;
  valid_until?: string;
  created_at: string;
}

interface DiscountForm {
  name: string;
  description: string;
  discount_type: "percentage" | "fixed" | "buy_x_get_y";
  discount_value: string;
  max_discount: string;
  code: string;
  usage_limit: string;
  valid_from: string;
  valid_until: string;
}

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed Amount" },
  { value: "buy_x_get_y", label: "Buy X Get Y" },
];

function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const BLANK_FORM: DiscountForm = {
  name: "", description: "", discount_type: "percentage",
  discount_value: "", max_discount: "", code: "",
  usage_limit: "", valid_from: "", valid_until: "",
};

const field: React.CSSProperties = {
  width: "100%", background: "#f5f4f0", border: "1px solid #e2e0d8",
  borderRadius: 8, padding: "8px 12px", color: "#141410",
  fontFamily: "inherit", fontSize: 13, outline: "none",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 500,
  letterSpacing: "0.5px", textTransform: "uppercase",
  color: "#9a9a8e", marginBottom: 5,
};

export default function DiscountsPage() {
  const [adminUser] = useState(() => getStoredUser());
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DiscountForm>(BLANK_FORM);

  const admin_id = adminUser?.id || "";

  const dater = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(new Date());

  useEffect(() => { fetchDiscounts(); }, [admin_id]);

  const fetchDiscounts = async () => {
    if (!admin_id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/discounts?admin_id=${admin_id}`);
      const data = await res.json();
      setDiscounts(Array.isArray(data) ? data : []);
    } catch { setDiscounts([]); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      description: formData.description || null,
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value),
      max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
      code: formData.code || null,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      valid_from: formData.valid_from || null,
      valid_until: formData.valid_until || null,
      is_active: true, admin_id,
    };
    try {
      const url = editingId ? `/api/discounts?id=${editingId}` : "/api/discounts";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setShowForm(false); setEditingId(null); setFormData(BLANK_FORM); fetchDiscounts(); }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this discount?")) return;
    const res = await fetch(`/api/discounts?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchDiscounts();
  };

  const bulk = useBulkSelect(discounts.map(d => d.id));
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${bulk.count} selected discount${bulk.count === 1 ? "" : "s"}? This can't be undone.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...bulk.selected].map(id => fetch(`/api/discounts?id=${id}`, { method: "DELETE" })));
      bulk.clear();
      fetchDiscounts();
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleEdit = (d: Discount) => {
    setEditingId(d.id);
    setFormData({
      name: d.name, description: d.description || "",
      discount_type: d.discount_type,
      discount_value: d.discount_value.toString(),
      max_discount: d.max_discount?.toString() || "",
      code: d.code || "",
      usage_limit: d.usage_limit?.toString() || "",
      valid_from: d.valid_from?.slice(0, 10) || "",
      valid_until: d.valid_until?.slice(0, 10) || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeCount = discounts.filter(d => d.is_active).length;
  const totalSavings = discounts.reduce((s, d) => s + d.usage_count * (d.discount_type === "percentage" ? d.discount_value : d.discount_value), 0);

  const typeLabel = (d: Discount) =>
    d.discount_type === "percentage" ? `${d.discount_value}% off`
    : d.discount_type === "fixed" ? `Ksh ${d.discount_value} off`
    : "Buy X Get Y";

  const isExpired = (d: Discount) =>
    d.valid_until ? new Date(d.valid_until) < new Date() : false;

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header-title">Discounts & Promotions</div>
        <div className="header-date">{dater}</div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData(BLANK_FORM); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#141410", color: "#fff", border: "none", borderRadius: 7, fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {showForm ? "Cancel" : "New Discount"}
        </button>
      </header>

      <main className="main">

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Total Discounts", value: discounts.length, sub: "Created" },
            { label: "Active",          value: activeCount,       sub: "Running now" },
            { label: "Inactive",        value: discounts.length - activeCount, sub: "Paused" },
            { label: "Total Used",      value: discounts.reduce((s,d) => s + d.usage_count, 0), sub: "Times applied" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "1.1rem 1.25rem" }}>
              <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.5px" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        {showForm && (
          <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "1.5rem" }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: "1.25rem", color: "#141410" }}>
              {editingId ? "Edit Discount" : "Create New Discount"}
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={lbl}>Name *</label>
                  <input style={field} type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g. Labour Day Sale" />
                </div>
                <div>
                  <label style={lbl}>Discount Code</label>
                  <input style={field} type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. LABOUR2026" />
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={lbl}>Description</label>
                <textarea style={{...field, resize: "none"}} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} placeholder="Optional description…" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={lbl}>Type *</label>
                  <select style={field} value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value as DiscountForm["discount_type"]})}>
                    {DISCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Value ({formData.discount_type === "percentage" ? "%" : "Ksh"}) *</label>
                  <input style={field} type="number" step="0.01" value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: e.target.value})} required />
                </div>
                <div>
                  <label style={lbl}>Max Discount (Ksh)</label>
                  <input style={field} type="number" step="0.01" value={formData.max_discount} onChange={e => setFormData({...formData, max_discount: e.target.value})} placeholder="Optional cap" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={lbl}>Usage Limit</label>
                  <input style={field} type="number" value={formData.usage_limit} onChange={e => setFormData({...formData, usage_limit: e.target.value})} placeholder="Unlimited" />
                </div>
                <div>
                  <label style={lbl}>Valid From</label>
                  <input style={field} type="date" value={formData.valid_from} onChange={e => setFormData({...formData, valid_from: e.target.value})} />
                </div>
                <div>
                  <label style={lbl}>Valid Until</label>
                  <input style={field} type="date" value={formData.valid_until} onChange={e => setFormData({...formData, valid_until: e.target.value})} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" style={{ padding: "9px 20px", background: "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                  {editingId ? "Save Changes" : "Create Discount"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setFormData(BLANK_FORM); }} style={{ padding: "9px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #e2e0d8", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <BulkActionBar bulk={bulk} label="discount" onDelete={handleBulkDelete} deleting={bulkDeleting} />

        {/* Table */}
        <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e" }}>All Discounts</span>
            <span style={{ fontSize: 12, color: "#9a9a8e" }}>{discounts.length} total</span>
          </div>

          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>Loading discounts…</div>
          ) : discounts.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>No discounts yet. Create your first one above.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ padding: "0.6rem 0.85rem", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", width: 36 }}>
                    <HeaderCheckbox bulk={bulk} />
                  </th>
                  {["Discount", "Type / Value", "Code", "Usage", "Validity", "Status", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.6rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {discounts.map(d => {
                  const expired = isExpired(d);
                  const statusColor = !d.is_active ? "#9a9a8e" : expired ? "#d97706" : "#16a34a";
                  const statusBg   = !d.is_active ? "#f5f4f0"  : expired ? "#fffbeb"  : "#f0fdf4";
                  const statusText = !d.is_active ? "Inactive"  : expired ? "Expired"  : "Active";

                  return (
                    <tr key={d.id}
                      style={{ borderBottom: "1px solid #e2e0d8" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fafaf8"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                    >
                      <td style={{ padding: "0.85rem 0.85rem" }}>
                        <RowCheckbox id={d.id} bulk={bulk} />
                      </td>

                      {/* Name */}
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ fontWeight: 500, color: "#141410" }}>{d.name}</div>
                        {d.description && <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 2 }}>{d.description}</div>}
                      </td>

                      {/* Type */}
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, background: "#f5f4f0", border: "1px solid #e2e0d8", padding: "3px 10px", borderRadius: 100, color: "#141410", fontWeight: 500 }}>
                          {typeLabel(d)}
                        </span>
                      </td>

                      {/* Code */}
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        {d.code
                          ? <code style={{ fontFamily: "monospace", fontSize: 12, background: "#f5f4f0", border: "1px solid #e2e0d8", padding: "2px 8px", borderRadius: 4, color: "#141410" }}>{d.code}</code>
                          : <span style={{ color: "#c8c6bc", fontSize: 12 }}>—</span>
                        }
                      </td>

                      {/* Usage */}
                      <td style={{ padding: "0.85rem 1.25rem", color: "#141410" }}>
                        {d.usage_count}{d.usage_limit ? <span style={{ color: "#9a9a8e" }}>/{d.usage_limit}</span> : ""}
                      </td>

                      {/* Validity */}
                      <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40", fontSize: 12 }}>
                        {d.valid_from || d.valid_until
                          ? <>{d.valid_from?.slice(0,10) || "—"} → {d.valid_until?.slice(0,10) || "—"}</>
                          : <span style={{ color: "#c8c6bc" }}>No limit</span>
                        }
                      </td>

                      {/* Status */}
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: statusColor, background: statusBg, padding: "3px 10px", borderRadius: 100, fontWeight: 500 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor }} />
                          {statusText}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => handleEdit(d)} style={{ padding: "5px 10px", background: "#f5f4f0", border: "1px solid #e2e0d8", borderRadius: 6, fontSize: 12, color: "#141410", cursor: "pointer", fontFamily: "inherit" }}>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(d.id)} style={{ padding: "5px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!loading && discounts.length > 0 && (
            <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid #e2e0d8", fontSize: 12, color: "#9a9a8e", display: "flex", justifyContent: "space-between" }}>
              <span>{activeCount} active · {discounts.length - activeCount} inactive</span>
              <span>Total uses: <strong style={{ color: "#141410" }}>{discounts.reduce((s,d) => s + d.usage_count, 0)}</strong></span>
            </div>
          )}
        </div>
      </main>
    </>
  );
}