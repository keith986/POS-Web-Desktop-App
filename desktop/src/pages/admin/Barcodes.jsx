import React, { useState, useEffect } from "react";
import "./admin.css";

export default function Barcodes() {
  const [barcodes, setBarcodes] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeType, setBarcodeType] = useState("ean13");
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(true);

  const BARCODE_TYPES = ["ean13", "ean8", "code128", "qr", "upca"];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Get products from local DB
      const products = await window.electronAPI.getAllProducts?.() || [];
      setProducts(products);
      
      // Get barcodes from local storage
      const stored = localStorage.getItem("postore-barcodes") || "[]";
      setBarcodes(JSON.parse(stored));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedProduct || !barcodeInput) {
      alert("Please select a product and enter a barcode");
      return;
    }

    const newBarcode = {
      id: Date.now().toString(),
      product_id: selectedProduct,
      barcode: barcodeInput,
      barcode_type: barcodeType,
      is_primary: isPrimary,
      created_at: new Date().toISOString(),
    };

    if (isPrimary) {
      const updated = barcodes.map((b) =>
        b.product_id === selectedProduct ? { ...b, is_primary: false } : b
      );
      setBarcodes([...updated, newBarcode]);
    } else {
      setBarcodes([...barcodes, newBarcode]);
    }

    localStorage.setItem("postore-barcodes", JSON.stringify([...barcodes, newBarcode]));
    setBarcodeInput("");
    setSelectedProduct("");
    setBarcodeType("ean13");
    setIsPrimary(false);
    setShowForm(false);
  };

  const handleDelete = (id) => {
    const updated = barcodes.filter((b) => b.id !== id);
    setBarcodes(updated);
    localStorage.setItem("postore-barcodes", JSON.stringify(updated));
  };

  const handleScan = (barcode) => {
    const found = barcodes.find((b) => b.barcode === barcode);
    if (found) {
      const product = products.find((p) => p.id === found.product_id);
      if (product) {
        alert(`Found: ${product.name}\nPrice: $${product.price}\nStock: ${product.stock}`);
      }
    } else {
      alert("Barcode not found");
    }
  };

  const getProductName = (productId) => {
    return products.find((p) => p.id === productId)?.name || "Unknown";
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Barcode Management</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ New Barcode"}
        </button>
      </div>

      <div className="grid grid-2">
        {/* Scanner */}
        <div className="card">
          <h2>Quick Scan</h2>
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
            className="input"
            style={{ fontSize: "16px" }}
            autoFocus
          />
          <p className="text-muted">Press Enter after scanning</p>
        </div>

        {/* Form */}
        {showForm && (
          <div className="card">
            <h2>Add New Barcode</h2>
            <form onSubmit={handleSubmit} className="form-stack">
              <div className="form-group">
                <label>Product *</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select a product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Barcode *</label>
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="input"
                  placeholder="e.g., 5901234123457"
                  required
                />
              </div>

              <div className="form-group">
                <label>Type</label>
                <select
                  value={barcodeType}
                  onChange={(e) => setBarcodeType(e.target.value)}
                  className="input"
                >
                  {BARCODE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                  />
                  {" "}Set as primary
                </label>
              </div>

              <button type="submit" className="btn btn-success">
                Add Barcode
              </button>
            </form>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : barcodes.length === 0 ? (
        <p className="text-muted">No barcodes assigned yet</p>
      ) : (
        <div className="barcodes-grid">
          {barcodes.map((barcode) => (
            <div key={barcode.id} className="card">
              <div className="card-header">
                <h3>{getProductName(barcode.product_id)}</h3>
                {barcode.is_primary && <span className="badge badge-primary">Primary</span>}
              </div>
              <div className="card-body">
                <div className="barcode-info">
                  <strong>Barcode:</strong>
                  <code>{barcode.barcode}</code>
                </div>
                <div className="barcode-info">
                  <strong>Type:</strong> {barcode.barcode_type.toUpperCase()}
                </div>
              </div>
              <button
                onClick={() => handleDelete(barcode.id)}
                className="btn btn-danger btn-sm"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
