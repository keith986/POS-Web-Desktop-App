"use client";

import React, { useState, useEffect } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku?: string;
}

interface Barcode {
  id: string;
  product_id: string;
  barcode: string;
  barcode_type: string;
  is_primary: boolean;
  name: string;
  price: number;
  stock: number;
}

const BARCODE_TYPES = ["ean13", "ean8", "code128", "qr", "upca"];

function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function BarcodesPage() {
  const [adminUser] = useState(() => getStoredUser());
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [barcodeInput, setBarcodeInput] = useState<string>("");
  const [barcodeType, setBarcodeType] = useState<string>("ean13");
  const [isPrimary, setIsPrimary] = useState(false);

  const admin_id = adminUser?.id || "";

  useEffect(() => {
    if (admin_id) {
      fetchBarcodes();
      fetchProducts();
    }
  }, [admin_id]);

  const fetchBarcodes = async () => {
    if (!admin_id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/barcodes?admin_id=${admin_id}`);
      const data = await res.json();
      setBarcodes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching barcodes:", error);
      setBarcodes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (!admin_id) return;
    try {
      const res = await fetch(`/api/products?admin_id=${admin_id}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || !barcodeInput) {
      alert("Please select a product and enter a barcode");
      return;
    }

    try {
      const res = await fetch("/api/barcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProduct,
          barcode: barcodeInput,
          barcode_type: barcodeType,
          is_primary: isPrimary,
          admin_id,
        }),
      });

      if (res.ok) {
        setBarcodeInput("");
        setSelectedProduct("");
        setBarcodeType("ean13");
        setIsPrimary(false);
        setShowForm(false);
        fetchBarcodes();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating barcode:", error);
      alert("Error creating barcode");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this barcode?")) return;

    try {
      const res = await fetch(`/api/barcodes?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchBarcodes();
      }
    } catch (error) {
      console.error("Error deleting barcode:", error);
    }
  };

  const handleScan = async (barcode: string) => {
    try {
      const res = await fetch(`/api/barcodes?admin_id=${admin_id}&barcode=${barcode}`);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const product = data[0];
        alert(`Found: ${product.name}\nPrice: $${product.price}\nStock: ${product.stock}`);
      } else {
        alert("Barcode not found");
      }
    } catch (error) {
      console.error("Error scanning barcode:", error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Barcode Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showForm ? "Cancel" : "+ New Barcode"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Barcode Scanner */}
        <div className="bg-white p-6 rounded border border-gray-200">
          <h2 className="text-xl font-bold mb-4">Quick Scan</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Scan barcode here..."
              value={scannedBarcode}
              onChange={(e) => setScannedBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleScan(scannedBarcode);
                  setScannedBarcode("");
                }
              }}
              className="w-full px-4 py-2 border rounded text-lg"
              autoFocus
            />
            <p className="text-sm text-gray-600">
              Press Enter after scanning to look up the product
            </p>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-gray-50 p-6 rounded border border-gray-200">
            <h2 className="text-xl font-bold mb-4">Add New Barcode</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product *</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="">Select a product...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Barcode *</label>
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="e.g., 5901234123457"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={barcodeType}
                  onChange={(e) => setBarcodeType(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  {BARCODE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="primary"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="primary" className="text-sm">
                  Set as primary barcode
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Add Barcode
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Barcodes List */}
      {loading ? (
        <p className="text-gray-500">Loading barcodes...</p>
      ) : barcodes.length === 0 ? (
        <p className="text-gray-500">No barcodes assigned yet</p>
      ) : (
        <div className="grid gap-4">
          {barcodes.map((barcode) => (
            <div key={barcode.id} className="bg-white p-4 rounded border border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{barcode.name}</h3>
                  <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                    <div>
                      <span className="font-semibold">Barcode:</span>
                      <br />
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">{barcode.barcode}</code>
                    </div>
                    <div>
                      <span className="font-semibold">Type:</span> {barcode.barcode_type.toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold">Price:</span> ${barcode.price.toFixed(2)}
                      <br />
                      <span className="font-semibold">Stock:</span> {barcode.stock}
                    </div>
                  </div>
                  {barcode.is_primary && (
                    <span className="inline-block mt-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      Primary
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(barcode.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
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
