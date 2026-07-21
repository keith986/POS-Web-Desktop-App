"use client";

import { useState, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────
   Generic read-mostly list tab used for the
   vertical-specific staff tabs: Tables,
   Appointments, Pickup & Delivery, Prescriptions,
   Suppliers. Each "mode" knows its own endpoint,
   fields to show and (optionally) a status action.
───────────────────────────────────────── */

export type SimpleListMode = "tables" | "appointments" | "prescriptions" | "suppliers";

interface SimpleListTabProps {
  mode:     SimpleListMode;
  adminId:  string;
  onToast:  (msg: string, type: "ok" | "err") => void;
}

const MODE_META: Record<SimpleListMode, {
  endpoint: string;
  emptyText: string;
  searchPlaceholder: string;
}> = {
  tables:        { endpoint: "/api/tables",        emptyText: "No tables set up yet.",         searchPlaceholder: "Search tables…" },
  appointments:  { endpoint: "/api/appointments",   emptyText: "Nothing scheduled.",            searchPlaceholder: "Search by client or service…" },
  prescriptions: { endpoint: "/api/prescriptions",  emptyText: "No prescriptions on file.",     searchPlaceholder: "Search by patient or Rx number…" },
  suppliers:     { endpoint: "/api/suppliers",      emptyText: "No suppliers added yet.",       searchPlaceholder: "Search suppliers…" },
};

const TABLE_STATUSES = ["available", "occupied", "reserved", "cleaning"];
const APPT_STATUSES  = ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"];

function badgeColor(status: string): { bg: string; text: string } {
  const s = status.toLowerCase();
  if (["available", "completed", "dispensed", "active", "paid"].includes(s))
    return { bg: "#f0fdf4", text: "#16a34a" };
  if (["occupied", "in_progress", "confirmed", "scheduled"].includes(s))
    return { bg: "#eff6ff", text: "#2563eb" };
  if (["reserved", "pending", "verified", "deposit", "partial"].includes(s))
    return { bg: "#fffbeb", text: "#d97706" };
  if (["cancelled", "no_show", "blacklisted", "expired", "inactive"].includes(s))
    return { bg: "#fef2f2", text: "#dc2626" };
  return { bg: "#f5f4f0", text: "#6b6b60" };
}

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); }
  catch { return d; }
}

export default function SimpleListTab({ mode, adminId, onToast }: SimpleListTabProps) {
  const meta = MODE_META[mode];
  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!adminId) return;
    setLoading(true);
    fetch(`${meta.endpoint}?admin_id=${adminId}`)
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [adminId, meta.endpoint]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (row: any, status: string) => {
    setUpdating(row.id);
    try {
      const url = mode === "appointments"
        ? `/api/appointments/${row.id}/status`
        : `/api/tables/${row.id}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, admin_id: adminId }),
      });
      if (!res.ok) throw new Error();
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, status } : r));
      onToast("Updated", "ok");
    } catch {
      onToast("Couldn't update — try again", "err");
    } finally {
      setUpdating(null);
    }
  };

  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return JSON.stringify(r).toLowerCase().includes(s);
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={meta.searchPlaceholder}
            style={{
              width: "100%", padding: "0.6rem 0.85rem", borderRadius: 9,
              border: "1px solid var(--border, #e2e0d8)", fontSize: 13,
              fontFamily: "inherit", background: "var(--surface, #fff)", color: "var(--ink, #141410)",
            }}
          />
        </div>
        <button
          onClick={load}
          style={{ padding: "0.6rem 1rem", borderRadius: 9, border: "1px solid var(--border, #e2e0d8)", background: "var(--surface, #fff)", color: "var(--ink2, #4a4a40)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--muted, #9a9a8e)", fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--muted, #9a9a8e)", fontSize: 13 }}>{meta.emptyText}</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(row => (
            <div key={row.id} style={{
              background: "var(--surface, #fff)", border: "1px solid var(--border, #e2e0d8)",
              borderRadius: 12, padding: "0.9rem 1.1rem", display: "flex", alignItems: "center",
              gap: 12, flexWrap: "wrap",
            }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                {mode === "tables" && (<>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{row.label ?? `Table ${row.table_number}`}</div>
                  <div style={{ fontSize: 12, color: "var(--muted, #9a9a8e)" }}>{row.section || "No section"} · Seats {row.capacity}</div>
                </>)}
                {mode === "appointments" && (<>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{row.client_name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted, #9a9a8e)" }}>{row.service_name} · {fmtDate(row.date)} {row.start_time}</div>
                </>)}
                {mode === "prescriptions" && (<>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{row.patient_name} <span style={{ fontWeight: 400, color: "var(--muted, #9a9a8e)" }}>· {row.rx_number}</span></div>
                  <div style={{ fontSize: 12, color: "var(--muted, #9a9a8e)" }}>Dr. {row.doctor_name} · {Array.isArray(row.items) ? row.items.length : 0} item(s)</div>
                </>)}
                {mode === "suppliers" && (<>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{row.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted, #9a9a8e)" }}>{row.category || "—"} · {row.phone || "No phone"}</div>
                </>)}
              </div>

              {row.status && (() => {
                const c = badgeColor(row.status);
                return (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: c.bg, color: c.text, textTransform: "capitalize", flexShrink: 0 }}>
                    {String(row.status).replace(/_/g, " ")}
                  </span>
                );
              })()}

              {(mode === "tables" || mode === "appointments") && (
                <select
                  value={row.status}
                  disabled={updating === row.id}
                  onChange={e => updateStatus(row, e.target.value)}
                  style={{ fontSize: 12, padding: "5px 8px", borderRadius: 7, border: "1px solid var(--border, #e2e0d8)", background: "var(--surface, #fff)", color: "var(--ink, #141410)", fontFamily: "inherit", flexShrink: 0 }}
                >
                  {(mode === "tables" ? TABLE_STATUSES : APPT_STATUSES).map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
