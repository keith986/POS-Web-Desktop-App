import React, { useState, useEffect } from "react";
import "./admin.css";

export default function Discounts() {
  const [discounts, setDiscounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    max_discount: "",
    code: "",
    usage_limit: "",
    valid_from: "",
    valid_until: "",
  });
  const [loading, setLoading] = useState(true);

  const DISCOUNT_TYPES = [
    { value: "percentage", label: "Percentage (%)" },
    { value: "fixed", label: "Fixed Amount ($)" },
    { value: "buy_x_get_y", label: "Buy X Get Y" },
  ];

  useEffect(() => {
    loadDiscounts();
  }, []);

  const loadDiscounts = () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem("postore-discounts") || "[]";
      setDiscounts(JSON.parse(stored));
    } catch (error) {
      console.error("Error loading discounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      description: formData.description || null,
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value),
      max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
      code: formData.code || null,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      usage_count: editingId ? (discounts.find(d => d.id === editingId)?.usage_count || 0) : 0,
      valid_from: formData.valid_from || null,
      valid_until: formData.valid_until || null,
      is_active: true,
      created_at: editingId ? discounts.find(d => d.id === editingId)?.created_at : new Date().toISOString(),
    };

    if (editingId) {
      const updated = discounts.map((d) => (d.id === editingId ? payload : d));
      setDiscounts(updated);
      localStorage.setItem("postore-discounts", JSON.stringify(updated));
      setEditingId(null);
    } else {
      const updated = [...discounts, payload];
      setDiscounts(updated);
      localStorage.setItem("postore-discounts", JSON.stringify(updated));
    }

    setShowForm(false);
    setFormData({
      name: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      max_discount: "",
      code: "",
      usage_limit: "",
      valid_from: "",
      valid_until: "",
    });
  };

  const handleDelete = (id) => {
    const updated = discounts.filter((d) => d.id !== id);
    setDiscounts(updated);
    localStorage.setItem("postore-discounts", JSON.stringify(updated));
  };

  const handleEdit = (discount) => {
    setEditingId(discount.id);
    setFormData({
      name: discount.name,
      description: discount.description || "",
      discount_type: discount.discount_type,
      discount_value: discount.discount_value.toString(),
      max_discount: discount.max_discount?.toString() || "",
      code: discount.code || "",
      usage_limit: discount.usage_limit?.toString() || "",
      valid_from: discount.valid_from?.slice(0, 10) || "",
      valid_until: discount.valid_until?.slice(0, 10) || "",
    });
    setShowForm(true);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Discounts & Promotions</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              name: "",
              description: "",
              discount_type: "percentage",
              discount_value: "",
              max_discount: "",
              code: "",
              usage_limit: "",
              valid_from: "",
              valid_until: "",
            });
          }}
        >
          {showForm ? "Cancel" : "+ New Discount"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2>{editingId ? "Edit Discount" : "Create New Discount"}</h2>
          <form onSubmit={handleSubmit} className="form-grid-2">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                required
              />
            </div>

            <div className="form-group">
              <label>Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="input"
                placeholder="e.g., SUMMER20"
              />
            </div>

            <div className="form-group form-group-full">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>Type *</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                className="input"
              >
                {DISCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Value ({formData.discount_type === "percentage" ? "%" : "$"}) *</label>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                className="input"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Max Discount</label>
              <input
                type="number"
                value={formData.max_discount}
                onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                className="input"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Usage Limit</label>
              <input
                type="number"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                className="input"
              />
            </div>

            <div className="form-group">
              <label>Valid From</label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                className="input"
              />
            </div>

            <div className="form-group">
              <label>Valid Until</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="input"
              />
            </div>

            <div className="form-group-full">
              <button type="submit" className="btn btn-success">
                {editingId ? "Update" : "Create"} Discount
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : discounts.length === 0 ? (
        <p className="text-muted">No discounts created yet</p>
      ) : (
        <div className="discounts-grid">
          {discounts.map((discount) => (
            <div key={discount.id} className="card">
              <div className="card-header">
                <h3>{discount.name}</h3>
                <span className={`badge ${discount.is_active ? "badge-success" : "badge-error"}`}>
                  {discount.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="card-body">
                {discount.description && <p className="text-muted">{discount.description}</p>}
                <div className="discount-info">
                  <strong>Type:</strong> {discount.discount_type}
                </div>
                <div className="discount-info">
                  <strong>Value:</strong>{" "}
                  {discount.discount_type === "percentage"
                    ? `${discount.discount_value}%`
                    : `$${discount.discount_value}`}
                </div>
                {discount.code && (
                  <div className="discount-info">
                    <strong>Code:</strong> <code>{discount.code}</code>
                  </div>
                )}
                <div className="discount-info">
                  <strong>Used:</strong> {discount.usage_count}
                  {discount.usage_limit ? `/${discount.usage_limit}` : ""}
                </div>
              </div>
              <div className="card-footer">
                <button
                  onClick={() => handleEdit(discount)}
                  className="btn btn-secondary btn-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(discount.id)}
                  className="btn btn-danger btn-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
