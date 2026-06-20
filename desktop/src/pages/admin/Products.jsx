import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", price: "", stock: "", category: "", sku: "" });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [approvalReason, setApprovalReason] = useState("");
  const [inventoryMode, setInventoryMode] = useState("auto");

  useEffect(() => {
    loadProducts();
    loadInventoryMode();
  }, []);

  const loadInventoryMode = async () => {
    try {
      const stored = await window.electronAPI.getStoreData("inventoryMode");
      if (stored) setInventoryMode(stored);
    } catch (err) {
      console.error("Failed to load inventory mode:", err);
    }
  };

  const loadProducts = async () => {
    const result = await window.electronAPI.queryDatabase(
      "SELECT * FROM products ORDER BY name"
    );
    if (result.success) setProducts(result.data);
  };

  const createInventoryApproval = async (productId, productName, newQuantity, oldStock, reason) => {
    try {
      const approvals = await window.electronAPI.getStoreData("inventoryApprovals") || [];
      const delta = newQuantity - oldStock;
      const newApproval = {
        id: uuidv4(),
        productId,
        productName,
        quantity: delta, // positive = restock, negative = deduction
        reason: reason || "Stock adjustment",
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      const updated = [...approvals, newApproval];
      await window.electronAPI.setStoreData("inventoryApprovals", updated);
    } catch (err) {
      console.error("Failed to create approval:", err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!form.name || !form.price) {
        setError("Name and Price are required");
        setLoading(false);
        return;
      }

      const newStock = parseInt(form.stock || 0);
      const stockChanged = editing && newStock !== editing.stock;

      let result;

      if (editing) {
        if (stockChanged && inventoryMode === "manual") {
          // Manual mode: create approval but DO NOT change stock yet — keep old stock
          await createInventoryApproval(
            editing.id,
            form.name,
            newStock,
            editing.stock,
            approvalReason || `Stock change from ${editing.stock} to ${newStock}`
          );

          // Save everything except stock (keep old stock until approved)
          result = await window.electronAPI.executeDatabase(
            "UPDATE products SET name=?, price=?, category=?, sku=?, updated_at=datetime('now') WHERE id=?",
            [form.name, parseFloat(form.price), form.category, form.sku, editing.id]
          );
        } else {
          // Auto mode or no stock change: save everything including stock immediately
          if (stockChanged && inventoryMode === "auto") {
            // Still log the approval for record-keeping but auto-approve it
            await createInventoryApproval(
              editing.id,
              form.name,
              newStock,
              editing.stock,
              approvalReason || `Stock change from ${editing.stock} to ${newStock}`
            );
            // Auto-approve: mark the last approval as approved
            const approvals = await window.electronAPI.getStoreData("inventoryApprovals") || [];
            if (approvals.length > 0) {
              approvals[approvals.length - 1].status = "approved";
              await window.electronAPI.setStoreData("inventoryApprovals", approvals);
            }
          }

          result = await window.electronAPI.executeDatabase(
            "UPDATE products SET name=?, price=?, stock=?, category=?, sku=?, updated_at=datetime('now') WHERE id=?",
            [form.name, parseFloat(form.price), newStock, form.category, form.sku, editing.id]
          );
        }
      } else {
        // New product — always insert with given stock
        result = await window.electronAPI.executeDatabase(
          "INSERT INTO products (id, name, price, stock, category, sku) VALUES (?, ?, ?, ?, ?, ?)",
          [uuidv4(), form.name, parseFloat(form.price), newStock, form.category, form.sku]
        );
      }

      if (!result.success) {
        setError(result.error || "Failed to save product");
        setLoading(false);
        return;
      }

      setShowForm(false);
      setEditing(null);
      setForm({ name: "", price: "", stock: "", category: "", sku: "" });
      setApprovalReason("");
      loadProducts();
    } catch (err) {
      console.error("Save error:", err);
      setError(err.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      price: product.price,
      stock: product.stock,
      category: product.category || "",
      sku: product.sku || "",
    });
    setShowForm(true);
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const stockChanged = editing && parseInt(form.stock || 0) !== editing.stock;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setShowForm(true);
            setEditing(null);
            setForm({ name: "", price: "", stock: "", category: "", sku: "" });
            setError("");
            setApprovalReason("");
          }}
        >
          + Add Product
        </button>
      </div>

      <input
        type="text"
        className="search-input"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">{editing ? "Edit Product" : "New Product"}</h2>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Price (Ksh) *</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Stock
                    {editing && inventoryMode === "manual" && (
                      <span style={{ fontSize: "11px", color: "#d97706", marginLeft: "6px" }}>
                        (requires approval)
                      </span>
                    )}
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    className="form-input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input
                    className="form-input"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </div>
              </div>

              {/* Show approval reason field when stock changes */}
              {stockChanged && (
                <div className="form-group">
                  <label className="form-label">
                    Reason for stock change
                    {inventoryMode === "manual" && (
                      <span style={{ fontSize: "11px", color: "#d97706", marginLeft: "6px" }}>
                        — will be sent to admin for approval
                      </span>
                    )}
                  </label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g., Restock, damaged units, inventory adjustment"
                    value={approvalReason}
                    onChange={(e) => setApprovalReason(e.target.value)}
                  />
                </div>
              )}

              {/* Info banner for manual mode with stock change */}
              {stockChanged && inventoryMode === "manual" && (
                <div style={{
                  padding: "10px 12px",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#92400e",
                  marginBottom: "12px",
                }}>
                  ⚠ Stock will not change until approved by admin. Current stock ({editing.stock}) will remain until then.
                </div>
              )}

              {error && <div className="form-error">{error}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setShowForm(false); setError(""); setApprovalReason(""); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Category</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((product) => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>Ksh {Number(product.price).toLocaleString()}</td>
              <td className={product.stock <= 5 ? "low-stock" : ""}>{product.stock}</td>
              <td>{product.category || "—"}</td>
              <td>
                <span className={`badge ${product.is_active ? "badge-green" : "badge-red"}`}>
                  {product.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td>
                <button className="action-btn" onClick={() => handleEdit(product)}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}