import React, { useState, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { BoxIcon, AlertIcon } from "../../components/Icons";
import { SortTh, Pagination, FilterSelect, sortRows, toggleSort } from "../../components/TableControls";
import ExportMenu from "../../components/ExportMenu";
import ImportButton from "../../components/ImportButton";
import ImportPreviewModal from "../../components/ImportPreviewModal";
import { exportToExcel, exportToCSV, readImportFile, downloadTemplate } from "../../utils/excelUtils";
import { buildPdfReport } from "../../utils/pdfReport";
import { renderChartImage, CHART_COLORS } from "../../utils/chartImage";
import BarcodeScanner from "../../components/BarcodeScanner";

const ScanIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);

export default function Products() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", price: "", buying_price: "", stock: "", category: "", sku: "", image: null });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [approvalReason, setApprovalReason] = useState("");
  const [inventoryMode, setInventoryMode] = useState("auto");
  const [imgError, setImgError] = useState("");
  const [viewing, setViewing] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [importRows, setImportRows] = useState(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState("");
  const [scannerMode, setScannerMode] = useState(null); // "lookup" | "sku" | null
  const [scanNotice, setScanNotice] = useState("");

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
            "UPDATE products SET name=?, price=?, buying_price=?, category=?, sku=?, image=?, updated_at=datetime('now') WHERE id=?",
            [form.name, parseFloat(form.price), parseFloat(form.buying_price || 0), form.category, form.sku, form.image, editing.id]
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
            "UPDATE products SET name=?, price=?, buying_price=?, stock=?, category=?, sku=?, image=?, updated_at=datetime('now') WHERE id=?",
            [form.name, parseFloat(form.price), parseFloat(form.buying_price || 0), newStock, form.category, form.sku, form.image, editing.id]
          );
        }
      } else {
        // New product — always insert with given stock
        result = await window.electronAPI.executeDatabase(
          "INSERT INTO products (id, name, price, buying_price, stock, category, sku, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [uuidv4(), form.name, parseFloat(form.price), parseFloat(form.buying_price || 0), newStock, form.category, form.sku, form.image]
        );
      }

      if (!result.success) {
        setError(result.error || "Failed to save product");
        setLoading(false);
        return;
      }

      setShowForm(false);
      setEditing(null);
      setForm({ name: "", price: "", buying_price: "", stock: "", category: "", sku: "", image: null });
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
      buying_price: product.buying_price ?? "",
      stock: product.stock,
      category: product.category || "",
      sku: product.sku || "",
      image: product.image || null,
    });
    setImgError("");
    setShowForm(true);
  };

  const handleScanResult = (code) => {
    const trimmed = code.trim();
    if (scannerMode === "sku") {
      setForm((f) => ({ ...f, sku: trimmed }));
      setScannerMode(null);
      return;
    }
    // lookup mode: find an existing product by SKU
    const match = products.find((p) => (p.sku || "").toLowerCase() === trimmed.toLowerCase());
    if (match) {
      handleEdit(match);
      setScannerMode(null);
    } else {
      setScanNotice(`No product found for code ${trimmed}`);
      setTimeout(() => setScanNotice(""), 2500);
    }
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

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const searched = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? !!p.is_active : !p.is_active);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filtered = sortRows(searched, sort);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [search, categoryFilter, statusFilter, pageSize]);

  const handleSort = (key) => setSort((s) => toggleSort(s, key));

  const stockChanged = editing && parseInt(form.stock || 0) !== editing.stock;

  /* ── EXPORT ── */
  const buildExportRows = (rows) => rows.map((p) => {
    const buy = Number(p.buying_price || 0);
    const sell = Number(p.price || 0);
    return {
      Name: p.name,
      SKU: p.sku || "",
      Category: p.category || "",
      "Buying Price (Ksh)": buy,
      "Selling Price (Ksh)": sell,
      "Profit / Unit (Ksh)": +(sell - buy).toFixed(2),
      "Margin %": buy > 0 ? +(((sell - buy) / buy) * 100).toFixed(1) : "",
      Stock: p.stock,
      "Stock Value (Ksh)": +(sell * p.stock).toFixed(2),
      Status: p.is_active ? "Active" : "Inactive",
    };
  });

  const handleExportExcel = () => {
    exportToExcel("products", [{ name: "Products", rows: buildExportRows(filtered) }]);
  };

  const handleExportCSV = () => {
    exportToCSV("products", buildExportRows(filtered));
  };

  const handleExportPDF = async () => {
    const rows = filtered.length ? filtered : products;
    const withProfit = rows.map((p) => ({ ...p, profit: Number(p.price || 0) - Number(p.buying_price || 0) }));
    const topByProfit = [...withProfit].sort((a, b) => b.profit - a.profit).slice(0, 8);

    const chartImage = topByProfit.length
      ? await renderChartImage({
          type: "bar",
          labels: topByProfit.map((p) => p.name),
          datasets: [{ label: "Profit per unit (Ksh)", data: topByProfit.map((p) => p.profit), backgroundColor: CHART_COLORS[0] }],
        })
      : null;

    const totalStockValue = rows.reduce((s, p) => s + Number(p.price || 0) * Number(p.stock || 0), 0);
    const avgMargin = rows.length
      ? rows.reduce((s, p) => {
          const buy = Number(p.buying_price || 0);
          const sell = Number(p.price || 0);
          return s + (buy > 0 ? ((sell - buy) / buy) * 100 : 0);
        }, 0) / rows.length
      : 0;

    buildPdfReport({
      title: "Products Report",
      subtitle: `POStore · ${rows.length} products · Generated ${new Date().toLocaleString()}`,
      filename: "products-report",
      sections: [
        {
          type: "stats",
          items: [
            { label: "Total Products", value: rows.length },
            { label: "Total Stock Value", value: `Ksh ${Math.round(totalStockValue).toLocaleString()}` },
            { label: "Avg. Margin", value: `${avgMargin.toFixed(1)}%` },
          ],
        },
        chartImage ? { type: "chart", title: "Most Profitable Products (per unit)", image: chartImage, height: 220 } : null,
        {
          type: "table",
          title: "Product Inventory",
          head: ["Name", "SKU", "Category", "Buying (Ksh)", "Selling (Ksh)", "Profit (Ksh)", "Stock", "Status"],
          body: rows.map((p) => [
            p.name,
            p.sku || "—",
            p.category || "—",
            Number(p.buying_price || 0).toLocaleString(),
            Number(p.price).toLocaleString(),
            (Number(p.price) - Number(p.buying_price || 0)).toLocaleString(),
            p.stock,
            p.is_active ? "Active" : "Inactive",
          ]),
        },
      ].filter(Boolean),
    });
  };

  /* ── IMPORT ── */
  const handleImportFile = async (file) => {
    try {
      const rows = await readImportFile(file);
      setImportResult("");
      setImportRows(rows);
    } catch (err) {
      setImportResult("Could not read that file. Please use a .csv or .xlsx file.");
    }
  };

  const getField = (row, ...names) => {
    for (const key of Object.keys(row)) {
      if (names.some((n) => n.toLowerCase() === key.toLowerCase().trim())) return row[key];
    }
    return undefined;
  };

  const mapImportRow = (raw) => {
    const name = String(getField(raw, "name", "product", "product name") ?? "").trim();
    const priceRaw = getField(raw, "price", "selling price", "selling_price");
    const buyingRaw = getField(raw, "buying price", "buying_price", "cost", "cost price");
    const stockRaw = getField(raw, "stock", "quantity", "qty");
    const category = String(getField(raw, "category") ?? "").trim();
    const sku = String(getField(raw, "sku") ?? "").trim();

    const price = parseFloat(priceRaw);
    const buying_price = buyingRaw !== undefined && buyingRaw !== "" ? parseFloat(buyingRaw) : 0;
    const stock = stockRaw !== undefined && stockRaw !== "" ? parseInt(stockRaw, 10) : 0;

    const errors = [];
    if (!name) errors.push("Missing name");
    if (isNaN(price) || price < 0) errors.push("Invalid selling price");
    if (stockRaw !== undefined && isNaN(stock)) errors.push("Invalid stock");
    if (buyingRaw !== undefined && buyingRaw !== "" && isNaN(buying_price)) errors.push("Invalid buying price");

    return { row: { name, sku, category, price: isNaN(price) ? 0 : price, buying_price: isNaN(buying_price) ? 0 : buying_price, stock: isNaN(stock) ? 0 : stock }, errors };
  };

  const handleConfirmImport = async (rows) => {
    setImportBusy(true);
    let created = 0, updated = 0;
    for (const row of rows) {
      const existing = row.sku ? products.find((p) => (p.sku || "").toLowerCase() === row.sku.toLowerCase()) : null;
      if (existing) {
        await window.electronAPI.executeDatabase(
          "UPDATE products SET name=?, price=?, buying_price=?, stock=?, category=?, sku=?, updated_at=datetime('now') WHERE id=?",
          [row.name, row.price, row.buying_price, row.stock, row.category, row.sku, existing.id]
        );
        updated++;
      } else {
        await window.electronAPI.executeDatabase(
          "INSERT INTO products (id, name, price, buying_price, stock, category, sku) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [uuidv4(), row.name, row.price, row.buying_price, row.stock, row.category, row.sku]
        );
        created++;
      }
    }
    setImportBusy(false);
    setImportRows(null);
    setImportResult(`Imported ${created} new product${created !== 1 ? "s" : ""}${updated ? `, updated ${updated} existing` : ""}.`);
    loadProducts();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <div className="toolbar-actions">
          <button className="scan-btn" onClick={() => setScannerMode("lookup")}><ScanIcon size={15} /> Scan</button>
          <ImportButton label="Import" onFile={handleImportFile} />
          <ExportMenu onExportExcel={handleExportExcel} onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />
          <button
            className="btn-primary"
            onClick={() => {
              setShowForm(true);
              setEditing(null);
              setForm({ name: "", price: "", buying_price: "", stock: "", category: "", sku: "", image: null });
              setError("");
              setApprovalReason("");
              setImgError("");
            }}
          >
            + Add Product
          </button>
        </div>
      </div>

      {scanNotice && (
        <div className="badge badge-error" style={{ display: "inline-flex", marginBottom: 14, padding: "8px 12px" }}>
          {scanNotice}
        </div>
      )}

      {importResult && (
        <div className="badge badge-green" style={{ display: "inline-flex", marginBottom: 14, padding: "8px 12px" }} onAnimationEnd={() => {}}>
          {importResult}
          <button onClick={() => setImportResult("")} style={{ marginLeft: 10, background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700 }}>×</button>
        </div>
      )}

      <div className="table-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search products or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FilterSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={[{ value: "all", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]}
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}
        />
        <button
          type="button"
          className="table-toolbar-group"
          style={{ background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          onClick={() => downloadTemplate("products-import-template", ["name", "sku", "category", "buying_price", "price", "stock"])}
        >
          Download import template
        </button>
      </div>

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
                  <label className="form-label">Buying Price (Ksh)</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="Cost from supplier"
                    value={form.buying_price}
                    onChange={(e) => setForm({ ...form, buying_price: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Selling Price (Ksh) *</label>
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
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      className="form-input"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    />
                    <button type="button" className="scan-btn scan-btn-icon-only" title="Scan barcode" onClick={() => setScannerMode("sku")}>
                      <ScanIcon size={15} />
                    </button>
                  </div>
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
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <AlertIcon size={13} /> Stock will not change until approved by admin. Current stock ({editing.stock}) will remain until then.
                  </span>
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
            <th>#</th>
            <th></th>
            <SortTh label="Name" sortKey="name" sort={sort} onSort={handleSort} />
            <SortTh label="Buying Price" sortKey="buying_price" sort={sort} onSort={handleSort} />
            <SortTh label="Selling Price" sortKey="price" sort={sort} onSort={handleSort} />
            <SortTh label="Stock" sortKey="stock" sort={sort} onSort={handleSort} />
            <SortTh label="Category" sortKey="category" sort={sort} onSort={handleSort} />
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-3)" }}>
                {products.length === 0 ? "No products yet." : "No products match your filters."}
              </td>
            </tr>
          ) : paginated.map((product, i) => (
            <tr key={product.id}>
              <td className="row-number-cell">{(currentPage - 1) * pageSize + i + 1}</td>
              <td style={{ width: 44 }}>
                <div
                  onClick={() => setViewing(product)}
                  title="View details"
                  style={{ width: 34, height: 34, borderRadius: 6, background: "#f5f4f0", border: "1px solid #c8c6bc", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer", color: "#9a9a8e" }}
                >
                  {product.image ? (
                    <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <BoxIcon size={15} />
                  )}
                </div>
              </td>
              <td>{product.name}</td>
              <td>Ksh {Number(product.buying_price || 0).toLocaleString()}</td>
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

      <Pagination
        page={currentPage}
        pageSize={pageSize}
        totalItems={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {viewing && (
        <div className="modal-overlay" onClick={() => setViewing(null)}>
          <div className="modal" style={{ maxWidth: 380, padding: 0, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 200, background: "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {viewing.image ? (
                <img src={viewing.image} alt={viewing.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <BoxIcon size={40} style={{ color: "#9a9a8e" }} />
              )}
            </div>
            <div style={{ padding: "1.25rem" }}>
              <h2 className="modal-title" style={{ marginBottom: 4 }}>{viewing.name}</h2>
              <div style={{ fontSize: 12, color: "#9a9a8e", marginBottom: 12 }}>
                {viewing.category || "Uncategorized"}{viewing.sku ? ` · ${viewing.sku}` : ""}
              </div>
              <div style={{ display: "flex", gap: 24, marginBottom: viewing.description ? 12 : 0, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#9a9a8e", marginBottom: 3 }}>Buying Price</div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>Ksh {Number(viewing.buying_price || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#9a9a8e", marginBottom: 3 }}>Selling Price</div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>Ksh {Number(viewing.price).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#9a9a8e", marginBottom: 3 }}>Margin</div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>
                    Ksh {(Number(viewing.price) - Number(viewing.buying_price || 0)).toLocaleString()}
                  </div>
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

      {importRows && (
        <ImportPreviewModal
          title="Import Products"
          rawRows={importRows}
          mapRow={mapImportRow}
          columns={[
            { key: "name", label: "Name" },
            { key: "sku", label: "SKU" },
            { key: "category", label: "Category" },
            { key: "buying_price", label: "Buying Price" },
            { key: "price", label: "Selling Price" },
            { key: "stock", label: "Stock" },
          ]}
          importing={importBusy}
          onConfirm={handleConfirmImport}
          onClose={() => setImportRows(null)}
        />
      )}

      <BarcodeScanner
        open={!!scannerMode}
        onClose={() => setScannerMode(null)}
        onDetect={handleScanResult}
        continuous={false}
        title={scannerMode === "sku" ? "Scan to fill SKU" : "Scan to find product"}
      />
    </div>
  );
}