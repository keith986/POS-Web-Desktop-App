import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

const blankSupplier = {
  name: "",
  category: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  tax_number: "",
  payment_terms: "Net 30",
  credit_limit: "0",
  balance_due: "0",
  status: "active",
  notes: "",
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankSupplier);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const result = await window.electronAPI.queryDatabase(
      "SELECT * FROM suppliers ORDER BY name"
    );
    if (result.success) {
      setSuppliers(result.data || []);
    }
  };

  const resetForm = () => {
    setForm(blankSupplier);
    setEditing(null);
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }

    const creditLimit = Number(form.credit_limit) || 0;
    const balanceDue = Number(form.balance_due) || 0;
    const values = [
      form.name.trim(),
      form.category.trim(),
      form.contact_name.trim(),
      form.email.trim(),
      form.phone.trim(),
      form.address.trim(),
      form.city.trim(),
      form.country.trim(),
      form.tax_number.trim(),
      form.payment_terms.trim(),
      creditLimit,
      balanceDue,
      form.status,
      form.notes.trim(),
    ];

    setLoading(true);
    try {
      if (editing) {
        const result = await window.electronAPI.executeDatabase(
          `UPDATE suppliers SET
             name = ?, category = ?, contact_name = ?, email = ?, phone = ?,
             address = ?, city = ?, country = ?, tax_number = ?, payment_terms = ?,
             credit_limit = ?, balance_due = ?, status = ?, notes = ?,
             updated_at = datetime('now')
           WHERE id = ?`,
          [...values, editing.id]
        );
        if (!result.success) {
          setError(result.error || "Unable to save supplier.");
          return;
        }
      } else {
        const id = uuidv4();
        const result = await window.electronAPI.executeDatabase(
          `INSERT INTO suppliers (
             id, name, category, contact_name, email, phone,
             address, city, country, tax_number, payment_terms,
             credit_limit, balance_due, status, notes, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [id, ...values]
        );
        if (!result.success) {
          setError(result.error || "Unable to create supplier.");
          return;
        }
      }
      resetForm();
      setShowForm(false);
      await loadSuppliers();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supplier) => {
    setEditing(supplier);
    setForm({
      name: supplier.name || "",
      category: supplier.category || "",
      contact_name: supplier.contact_name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      city: supplier.city || "",
      country: supplier.country || "",
      tax_number: supplier.tax_number || "",
      payment_terms: supplier.payment_terms || "Net 30",
      credit_limit: String(supplier.credit_limit ?? 0),
      balance_due: String(supplier.balance_due ?? 0),
      status: supplier.status || "active",
      notes: supplier.notes || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (supplier) => {
    if (!window.confirm(`Delete supplier "${supplier.name}"? This cannot be undone.`)) return;
    const result = await window.electronAPI.executeDatabase(
      "DELETE FROM suppliers WHERE id = ?",
      [supplier.id]
    );
    if (result.success) {
      await loadSuppliers();
    } else {
      setError(result.error || "Failed to delete supplier.");
    }
  };

  const filtered = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(search.toLowerCase()) ||
    String(supplier.email || "").toLowerCase().includes(search.toLowerCase()) ||
    String(supplier.phone || "").toLowerCase().includes(search.toLowerCase()) ||
    String(supplier.category || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 className="page-title">Suppliers</h1>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Supplier
        </button>
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 220, flex: 1, maxWidth: 380 }}
        />
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--surface-border)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {[
                "Supplier", "Contact", "Phone", "Status", "Balance", "Terms", "Actions"
              ].map((heading) => (
                <th key={heading} style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color: "var(--text-2)", borderBottom: "1px solid var(--surface-border)", background: "var(--surface-alt)" }}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--text-2)", fontSize: 13 }}>
                  {suppliers.length === 0 ? "No suppliers added yet." : `No suppliers match "${search}".`}
                </td>
              </tr>
            ) : filtered.map((supplier) => (
              <tr key={supplier.id} style={{ borderBottom: "1px solid var(--surface-border)" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: 600, color: "var(--text)" }}>{supplier.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>{supplier.category || "General"}</div>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text-2)" }}>
                  {supplier.contact_name || "—"}
                  <div style={{ fontSize: 12, marginTop: 4 }}>{supplier.email || "—"}</div>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text-2)" }}>{supplier.phone || "—"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: supplier.status === "active" ? "rgba(34,197,94,0.12)" : supplier.status === "blacklisted" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.12)", color: supplier.status === "active" ? "#16a34a" : supplier.status === "blacklisted" ? "#dc2626" : "#475569", border: supplier.status === "active" ? "1px solid rgba(34,197,94,0.25)" : supplier.status === "blacklisted" ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(148,163,184,0.25)" }}>
                    {supplier.status || "active"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text)" }}>Ksh {Number(supplier.balance_due || 0).toLocaleString()}</td>
                <td style={{ padding: "12px 16px", color: "var(--text-2)" }}>{supplier.payment_terms || "Net 30"}</td>
                <td style={{ padding: "12px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn-secondary" style={{ padding: "6px 10px" }} onClick={() => handleEdit(supplier)}>Edit</button>
                  <button className="btn-danger" style={{ padding: "6px 10px" }} onClick={() => handleDelete(supplier)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => { resetForm(); setShowForm(false); }}>
          <div className="modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 700 }}>
            <h2 className="modal-title">{editing ? "Edit Supplier" : "New Supplier"}</h2>
            <form onSubmit={handleSave}>
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
                <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Category</label><input className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Contact Name</label><input className="form-input" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option><option value="blacklisted">Blacklisted</option></select></div>
                <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Country</label><input className="form-input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Tax Number</label><input className="form-input" value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Payment Terms</label><input className="form-input" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Credit Limit</label><input className="form-input" type="number" step="0.01" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Balance Due</label><input className="form-input" type="number" step="0.01" value={form.balance_due} onChange={(e) => setForm({ ...form, balance_due: e.target.value })} /></div>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}><label className="form-label">Notes</label><textarea className="form-input" rows="4" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}
              <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving..." : editing ? "Save Supplier" : "Add Supplier"}</button>
                <button type="button" className="btn-secondary" onClick={() => { resetForm(); setShowForm(false); }} style={{ borderColor: "#d1d5db", color: "#374151" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
