"use client";

import React, { useState, useEffect } from "react";
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
  { value: "fixed", label: "Fixed Amount ($)" },
  { value: "buy_x_get_y", label: "Buy X Get Y" },
];

function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function DiscountsPage() {
  const [adminUser] = useState(() => getStoredUser());
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DiscountForm>({
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

  const admin_id = adminUser?.id || "";

  useEffect(() => {
    fetchDiscounts();
  }, [admin_id]);

  const fetchDiscounts = async () => {
    if (!admin_id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/discounts?admin_id=${admin_id}`);
      const data = await res.json();
      setDiscounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching discounts:", error);
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
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
      is_active: true,
      admin_id,
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/discounts?id=${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setShowForm(false);
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
          fetchDiscounts();
        }
      } else {
        const res = await fetch("/api/discounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
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
          fetchDiscounts();
        }
      }
    } catch (error) {
      console.error("Error saving discount:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this discount?")) return;

    try {
      const res = await fetch(`/api/discounts?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchDiscounts();
      }
    } catch (error) {
      console.error("Error deleting discount:", error);
    }
  };

  const handleEdit = (discount: Discount) => {
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Discounts & Promotions</h1>
        <button
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
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showForm ? "Cancel" : "+ New Discount"}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? "Edit Discount" : "Create New Discount"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Discount Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., SUMMER20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as "percentage" | "fixed" | "buy_x_get_y" })}
                  className="w-full px-3 py-2 border rounded"
                >
                  {DISCOUNT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Value ({formData.discount_type === "percentage" ? "%" : "$"}) *
                </label>
                <input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Discount</label>
                <input
                  type="number"
                  value={formData.max_discount}
                  onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Usage Limit</label>
                <input
                  type="number"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Valid From</label>
                <input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valid Until</label>
                <input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                {editingId ? "Update Discount" : "Create Discount"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading discounts...</p>
      ) : discounts.length === 0 ? (
        <p className="text-gray-500">No discounts created yet</p>
      ) : (
        <div className="grid gap-4">
          {discounts.map((discount) => (
            <div key={discount.id} className="bg-white p-4 rounded border border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{discount.name}</h3>
                  {discount.description && <p className="text-sm text-gray-600">{discount.description}</p>}
                  <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                    <div>
                      <span className="font-semibold">Type:</span> {discount.discount_type}
                    </div>
                    <div>
                      <span className="font-semibold">Value:</span>{" "}
                      {discount.discount_type === "percentage" ? `${discount.discount_value}%` : `$${discount.discount_value}`}
                    </div>
                    {discount.code && (
                      <div>
                        <span className="font-semibold">Code:</span> <code className="bg-gray-100 px-2 py-1 rounded">{discount.code}</code>
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">Used:</span> {discount.usage_count}
                      {discount.usage_limit ? `/${discount.usage_limit}` : ""}
                    </div>
                  </div>
                  {(discount.valid_from || discount.valid_until) && (
                    <div className="text-xs text-gray-500 mt-2">
                      Valid: {discount.valid_from?.slice(0, 10) || "any time"} to{" "}
                      {discount.valid_until?.slice(0, 10) || "any time"}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(discount)}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(discount.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <span
                  className={`text-xs px-2 py-1 rounded ${discount.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                >
                  {discount.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
