import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", price: "", stock: "", category: "", sku: "", image: null });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [approvalReason, setApprovalReason] = useState("");
  const [inventoryMode, setInventoryMode] = useState("auto");
  const [imgError, setImgError] = useState("");
  const [viewing, setViewing] = useState(null);

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setImgError("Please choose an image file"); return; }
    if (file.size > 8 * 1024 * 1024) { setImgError("Image is too large (max 8MB)"); return; }
    setImgError("");
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();   
      img.onload = () => {
        const maxDim = 640;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        setForm((f) => ({ ...f, image: canvas.toDataURL("image/jpeg", 0.75) }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

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
            "UPDATE products SET name=?, price=?, category=?, sku=?, image=?, updated_at=datetime('now') WHERE id=?",
            [form.name, parseFloat(form.price), form.category, form.sku, form.image, editing.id]
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
            "UPDATE products SET name=?, price=?, stock=?, category=?, sku=?, image=?, updated_at=datetime('now') WHERE id=?",
            [form.name, parseFloat(form.price), newStock, form.category, form.sku, form.image, editing.id]
          );
        }
      } else {
        // New product — always insert with given stock
        result = await window.electronAPI.executeDatabase(
          "INSERT INTO products (id, name, price, stock, category, sku, image) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [uuidv4(), form.name, parseFloat(form.price), newStock, form.category, form.sku, form.image]
        );
      }

      if (!result.success) {
        setError(result.error || "Failed to save product");
        setLoading(false);
        return;
      }

      setShowForm(false);
      setEditing(null);
      setForm({ name: "", price: "", stock: "", category: "", sku: "", image: null });
      setApprovalReason("");
      setImgError("");
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
      image: product.image || null,
    });
    setImgError("");
    setShowForm(true);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    const result = await window.electronAPI.executeDatabase(
      "DELETE FROM products WHERE id = ?",
      [product.id]
    );
    if (result.success) {
      if (viewing?.id === product.id) setViewing(null);
      if (editing?.id === product.id) { setShowForm(false); setEditing(null); }
      await loadProducts();
    } else {
      setError(result.error || "Failed to delete product.");
    }
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
            setForm({ name: "", price: "", stock: "", category: "", sku: "", image: null });
            setError("");
            setApprovalReason("");
            setImgError("");
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
              <div className="form-group">
                <label className="form-label">Product Photo (optional)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 8, background: "#f5f4f0", border: "1px solid #c8c6bc", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {form.image ? (
                      <img src={form.image} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 11, color: "#9a9a8e" }}>No photo</span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label className="btn-secondary" style={{ width: "fit-content", cursor: "pointer" }}>
                      {form.image ? "Change photo" : "Upload photo"}
                      <input type="file" accept="image/*" onChange={handleImagePick} style={{ display: "none" }} />
                    </label>
                    {form.image && (
                      <button type="button" className="btn-secondary" style={{ width: "fit-content" }} onClick={() => setForm({ ...form, image: null })}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                {imgError && <div className="form-error">{imgError}</div>}
              </div>
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
                  onClick={() => { setShowForm(false); setError(""); setApprovalReason(""); setImgError(""); }}
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
            <th></th>
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
              <td style={{ width: 44 }}>
                <div
                  onClick={() => setViewing(product)}
                  title="View details"
                  style={{ width: 34, height: 34, borderRadius: 6, background: "#f5f4f0", border: "1px solid #c8c6bc", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}
                >
                  {product.image ? (
                    <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 14 }}>📦</span>
                  )}
                </div>
              </td>
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
                <button className="action-btn" onClick={() => setViewing(product)}>View</button>
                <button className="action-btn" onClick={() => handleEdit(product)}>Edit</button>
                <button className="btn-danger" style={{ padding: "6px 10px" }} onClick={() => handleDelete(product)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {viewing && (
        <div className="modal-overlay" onClick={() => setViewing(null)}>
          <div className="modal" style={{ maxWidth: 380, padding: 0, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 200, background: "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {viewing.image ? (
                <img src={viewing.image} alt={viewing.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 36 }}>📦</span>
              )}
            </div>
            <div style={{ padding: "1.25rem" }}>
              <h2 className="modal-title" style={{ marginBottom: 4 }}>{viewing.name}</h2>
              <div style={{ fontSize: 12, color: "#9a9a8e", marginBottom: 12 }}>
                {viewing.category || "Uncategorized"}{viewing.sku ? ` · ${viewing.sku}` : ""}
              </div>
              <div style={{ display: "flex", gap: 24, marginBottom: viewing.description ? 12 : 0 }}>
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#9a9a8e", marginBottom: 3 }}>Price</div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>Ksh {Number(viewing.price).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#9a9a8e", marginBottom: 3 }}>Stock</div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{viewing.stock} units</div>
                </div>
              </div>
              {viewing.description && (
                <div style={{ fontSize: 13, color: "#4a4a40", lineHeight: 1.5, paddingTop: 10, borderTop: "1px solid #e2e0d8" }}>
                  {viewing.description}
                </div>
              )}
              <div className="modal-actions" style={{ marginTop: 16 }}>
                <button className="btn-secondary" onClick={() => setViewing(null)}>Close</button>
                <button className="btn-danger" onClick={() => handleDelete(viewing)}>Delete</button>
                <button className="btn-primary" onClick={() => { setViewing(null); handleEdit(viewing); }}>Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}