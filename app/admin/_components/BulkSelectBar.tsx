"use client";

import { useState, useMemo } from "react";

/*
  Reusable bulk-select for admin list pages (Suppliers, Discounts,
  Prescriptions, Tables, Appointments, ...).

  Usage in a page:
    const bulk = useBulkSelect(discounts.map(d => d.id));
    ...
    <th><HeaderCheckbox bulk={bulk} /></th>          // in <thead>
    <td><RowCheckbox id={d.id} bulk={bulk} /></td>   // in each <tr>
    <BulkActionBar bulk={bulk} label="discount" onDelete={handleBulkDelete} />
*/

export interface BulkSelect {
  selected:    Set<string>;
  isSelected:  (id: string) => boolean;
  toggle:      (id: string) => void;
  toggleAll:   () => void;
  clear:       () => void;
  allSelected: boolean;
  someSelected: boolean;
  count:       number;
}

export function useBulkSelect(ids: string[]): BulkSelect {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isSelected = (id: string) => selected.has(id);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => {
      const allIn = ids.length > 0 && ids.every(id => prev.has(id));
      return allIn ? new Set() : new Set(ids);
    });
  };

  const clear = () => setSelected(new Set());

  const allSelected  = ids.length > 0 && ids.every(id => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  return useMemo(() => ({
    selected, isSelected, toggle, toggleAll, clear, allSelected, someSelected, count: selected.size,
  }), [selected, ids.join(",")]);
}

/* ── Checkbox cell for <thead> — select/clear all ── */
export function HeaderCheckbox({ bulk }: { bulk: BulkSelect }) {
  return (
    <input
      type="checkbox"
      checked={bulk.allSelected}
      ref={el => { if (el) el.indeterminate = bulk.someSelected; }}
      onChange={bulk.toggleAll}
      style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#d4522a" }}
      aria-label="Select all rows"
    />
  );
}

/* ── Checkbox cell for a single row ── */
export function RowCheckbox({ id, bulk }: { id: string; bulk: BulkSelect }) {
  return (
    <input
      type="checkbox"
      checked={bulk.isSelected(id)}
      onChange={() => bulk.toggle(id)}
      onClick={e => e.stopPropagation()}
      style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#d4522a" }}
      aria-label="Select row"
    />
  );
}

/* ── Floating bar shown once at least one row is selected ── */
export function BulkActionBar({
  bulk, label, onDelete, deleting,
}: {
  bulk: BulkSelect;
  label: string;              // e.g. "discount", "supplier"
  onDelete: () => void;
  deleting?: boolean;
}) {
  if (bulk.count === 0) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, padding: "0.7rem 1.1rem", marginBottom: "0.75rem",
      background: "#fff4f0", border: "1px solid #f3c8b8", borderRadius: 10,
    }}>
      <span style={{ fontSize: 13, color: "#7a3418", fontWeight: 500 }}>
        {bulk.count} {label}{bulk.count === 1 ? "" : "s"} selected
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={bulk.clear}
          style={{ padding: "6px 12px", background: "transparent", border: "1px solid #e2e0d8", borderRadius: 7, fontSize: 12, color: "#4a4a40", cursor: "pointer", fontFamily: "inherit" }}
        >
          Clear
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          style={{ padding: "6px 12px", background: "#dc2626", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#fff", cursor: deleting ? "wait" : "pointer", fontFamily: "inherit", opacity: deleting ? 0.7 : 1 }}
        >
          {deleting ? "Deleting…" : `Delete ${bulk.count} selected`}
        </button>
      </div>
    </div>
  );
}
