/*
  ─────────────────────────────────────────────────────
  DROP THIS CARD into your AdminSettingsPage

  1. Add "inventory_mode" to your settings state:
       const [inventoryMode, setInventoryMode] = useState<"auto" | "manual">("manual");

  2. In fetchSettings(), after setTax(...) add:
       setInventoryMode(data.auto_deduct_inventory ? "auto" : "manual");

  3. In doSave(), include it in the PUT body:
       auto_deduct_inventory: inventoryMode === "auto" ? 1 : 0,

  4. Add a new TABS entry — or place inside your existing "Store" tab.
     Recommended: add "Inventory" to the TABS array and render this card there.
  ─────────────────────────────────────────────────────
*/

/* ── Inventory Settings Card ──
   Paste inside your Settings page JSX wherever you want it.
   Requires: inventoryMode state + setInventoryMode setter
── */

// inventoryMode card — paste between your existing cards:
const InventorySettingsCard = ({
  inventoryMode,
  setInventoryMode,
}: {
  inventoryMode:    "auto" | "manual";
  setInventoryMode: (v: "auto" | "manual") => void;
}) => (
  <div style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, overflow: "hidden" }}>
    <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>Inventory Deduction Mode</div>
        <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 2 }}>
          Controls how stock is deducted when an order is completed
        </div>
      </div>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600,
        background: inventoryMode === "auto" ? "#f0fdf4" : "#fffbeb",
        color:      inventoryMode === "auto" ? "#16a34a" : "#d97706",
        border:     `1px solid ${inventoryMode === "auto" ? "#bbf7d0" : "#fde68a"}`,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: inventoryMode === "auto" ? "#16a34a" : "#d97706" }} />
        {inventoryMode === "auto" ? "Auto" : "Manual"}
      </span>
    </div>

    {/* Mode selector */}
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>

      {/* Auto card */}
      <div
        onClick={() => setInventoryMode("auto")}
        style={{
          padding: "1rem", borderRadius: 10, cursor: "pointer",
          border: `2px solid ${inventoryMode === "auto" ? "#16a34a" : "#e2e0d8"}`,
          background: inventoryMode === "auto" ? "#f0fdf4" : "#f5f4f0",
          transition: "all 0.15s",
          display: "flex", alignItems: "flex-start", gap: 12,
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: "50%", border: `2px solid ${inventoryMode === "auto" ? "#16a34a" : "#c8c6bc"}`,
          background: inventoryMode === "auto" ? "#16a34a" : "transparent",
          flexShrink: 0, marginTop: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {inventoryMode === "auto" && (
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: inventoryMode === "auto" ? "#16a34a" : "#141410" }}>
            Automatic
          </div>
          <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 3, lineHeight: 1.5 }}>
            Stock is deducted automatically the moment an order is marked as <strong>Completed</strong>.
            If the order is later reversed to Cancelled or Refunded, stock is restored.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
            {["Instant deduction on complete", "Auto-restock on reversal", "Logged to stock movements"].map(t => (
              <span key={t} style={{ fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 100, background: inventoryMode === "auto" ? "#dcfce7" : "#e2e0d8", color: inventoryMode === "auto" ? "#16a34a" : "#9a9a8e" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Manual card */}
      <div
        onClick={() => setInventoryMode("manual")}
        style={{
          padding: "1rem", borderRadius: 10, cursor: "pointer",
          border: `2px solid ${inventoryMode === "manual" ? "#d97706" : "#e2e0d8"}`,
          background: inventoryMode === "manual" ? "#fffbeb" : "#f5f4f0",
          transition: "all 0.15s",
          display: "flex", alignItems: "flex-start", gap: 12,
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: "50%", border: `2px solid ${inventoryMode === "manual" ? "#d97706" : "#c8c6bc"}`,
          background: inventoryMode === "manual" ? "#d97706" : "transparent",
          flexShrink: 0, marginTop: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {inventoryMode === "manual" && (
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: inventoryMode === "manual" ? "#d97706" : "#141410" }}>
            Manual
          </div>
          <div style={{ fontSize: 12, color: "#9a9a8e", marginTop: 3, lineHeight: 1.5 }}>
            Stock is <strong>never automatically changed</strong> by order status. Use the
            Inventory page to manually adjust stock levels using the Adjust panel.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
            {["Full control over stock", "No automatic changes", "Adjust via Inventory page"].map(t => (
              <span key={t} style={{ fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 100, background: inventoryMode === "manual" ? "#fef3c7" : "#e2e0d8", color: inventoryMode === "manual" ? "#d97706" : "#9a9a8e" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Info box */}
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "0.75rem 1rem", fontSize: 12, color: "#1e40af", display: "flex", alignItems: "flex-start", gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>
          {inventoryMode === "auto"
            ? "In Auto mode, stock is deducted when any order is marked Completed — including sales made by staff on the POS. Every deduction is logged to the stock movements history."
            : "In Manual mode, the Inventory Adjust panel is your only way to change stock. This gives you full audit control — nothing changes without your direct input."}
        </span>
      </div>
    </div>
  </div>
);

export default InventorySettingsCard;