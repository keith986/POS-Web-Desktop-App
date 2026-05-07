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
  } catch {
    return null;
  }
}

export default function BarcodesPage() {
  const [adminUser] = useState(() => getStoredUser());
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
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
      const res = await fetch(`/api/barcodes?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchBarcodes();
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
        alert(`Found: ${product.name}\nPrice: Ksh ${product.price}\nStock: ${product.stock}`);
      } else {
        alert("Barcode not found");
      }
    } catch (error) {
      console.error("Error scanning barcode:", error);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#1a1a1a",
        color: "#e5e5e5",
        fontFamily: "'Inter', sans-serif",
        padding: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
            Barcode management
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#888" }}>
            Assign and scan product barcodes
          </p>
        </div>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#2a2a2a",
            border: "1px solid #3a3a3a",
            borderRadius: "8px",
            color: "#e5e5e5",
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
          }}
          onClick={() => {
            // scroll to form
            document.getElementById("barcode-form")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <span style={{ fontSize: "16px" }}>⊞</span> New barcode
        </button>
      </div>

      {/* Two-panel row: Quick Scan + Add Barcode */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        {/* Quick Scan */}
        <div
          style={{
            backgroundColor: "#222",
            border: "1px solid #333",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "20px",
            }}
          >
            <span style={{ fontSize: "12px", color: "#888" }}>⊞</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Quick Scan
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                border: "1px solid #444",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#666",
                fontSize: "12px",
                flexShrink: 0,
              }}
            >
              ⊞
            </div>
            <input
              type="text"
              placeholder="Scan or type barcode, press Enter"
              value={scannedBarcode}
              onChange={(e) => setScannedBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && scannedBarcode.trim()) {
                  handleScan(scannedBarcode.trim());
                  setScannedBarcode("");
                }
              }}
              autoFocus
              style={{
                flex: 1,
                backgroundColor: "#2a2a2a",
                border: "1px solid #3a3a3a",
                borderRadius: "8px",
                color: "#e5e5e5",
                fontSize: "15px",
                padding: "10px 14px",
                outline: "none",
              }}
            />
          </div>
          <p style={{ fontSize: "13px", color: "#666", margin: 0 }}>
            Press Enter after scanning to look up the product
          </p>
        </div>

        {/* Add Barcode Form */}
        <div
          id="barcode-form"
          style={{
            backgroundColor: "#222",
            border: "1px solid #333",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "20px",
            }}
          >
            <span style={{ fontSize: "12px", color: "#888" }}>⊞</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Add Barcode
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Product */}
            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#888",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                Product
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                required
                style={{
                  width: "100%",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  borderRadius: "8px",
                  color: selectedProduct ? "#e5e5e5" : "#666",
                  fontSize: "14px",
                  padding: "10px 14px",
                  outline: "none",
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  paddingRight: "32px",
                }}
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Barcode Number */}
            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#888",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                Barcode Number
              </label>
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="e.g. 5901234123457"
                required
                style={{
                  width: "100%",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  borderRadius: "8px",
                  color: "#e5e5e5",
                  fontSize: "14px",
                  padding: "10px 14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Type + Primary row */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#888",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                  }}
                >
                  Type
                </label>
                <select
                  value={barcodeType}
                  onChange={(e) => setBarcodeType(e.target.value)}
                  style={{
                    width: "100%",
                    backgroundColor: "#2a2a2a",
                    border: "1px solid #3a3a3a",
                    borderRadius: "8px",
                    color: "#e5e5e5",
                    fontSize: "14px",
                    padding: "10px 14px",
                    outline: "none",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px center",
                    paddingRight: "32px",
                  }}
                >
                  {BARCODE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "20px", whiteSpace: "nowrap" }}>
                <input
                  type="checkbox"
                  id="primary"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  style={{ accentColor: "#4a9eff", width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="primary" style={{ fontSize: "13px", color: "#aaa", cursor: "pointer" }}>
                  Set as primary
                </label>
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
                backgroundColor: "#2a2a2a",
                border: "1px solid #3a3a3a",
                borderRadius: "8px",
                color: "#e5e5e5",
                fontSize: "14px",
                fontWeight: 500,
                padding: "11px",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#333")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2a2a2a")}
            >
              Add barcode
            </button>
          </form>
        </div>
      </div>

      {/* Assigned Barcodes List */}
      <div>
        <p
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#888",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "14px",
          }}
        >
          Assigned Barcodes · {barcodes.length}
        </p>

        {loading ? (
          <p style={{ color: "#666", fontSize: "14px" }}>Loading barcodes...</p>
        ) : barcodes.length === 0 ? (
          <p style={{ color: "#666", fontSize: "14px" }}>No barcodes assigned yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {barcodes.map((barcode) => (
              <div
                key={barcode.id}
                style={{
                  backgroundColor: "#222",
                  border: "1px solid #333",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                {/* Icon placeholder */}
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    border: "1px solid #3a3a3a",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#555",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  ⊞
                </div>

                {/* Name + barcode + type */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: "15px", color: "#fff" }}>
                    {barcode.name}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <code
                      style={{
                        backgroundColor: "#2a2a2a",
                        border: "1px solid #3a3a3a",
                        borderRadius: "6px",
                        padding: "3px 8px",
                        fontSize: "12px",
                        color: "#ccc",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {barcode.barcode}
                    </code>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          width: "14px",
                          height: "14px",
                          border: "1px solid #3a3a3a",
                          borderRadius: "3px",
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontSize: "12px", color: "#888" }}>
                        {barcode.barcode_type.toUpperCase()}
                      </span>
                    </div>
                    {barcode.is_primary && (
                      <span
                        style={{
                          backgroundColor: "#1a3a5c",
                          color: "#6ab0f5",
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 10px",
                          borderRadius: "999px",
                          border: "1px solid #2a5080",
                        }}
                      >
                        Primary
                      </span>
                    )}
                  </div>
                </div>

                {/* Price + Stock */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: 600, color: "#fff" }}>
                    Ksh {barcode.price.toFixed(2)}
                  </p>
                  <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>Price</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, minWidth: "48px" }}>
                  <p style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: 600, color: "#fff" }}>
                    {barcode.stock}
                  </p>
                  <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>Stock</p>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(barcode.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#2a2a2a",
                    border: "1px solid #3a3a3a",
                    borderRadius: "8px",
                    color: "#e5e5e5",
                    fontSize: "13px",
                    padding: "8px 14px",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#3a2020")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2a2a2a")}
                >
                  <span style={{ fontSize: "14px" }}>⊞</span> Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}