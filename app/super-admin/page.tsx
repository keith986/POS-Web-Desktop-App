"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "staff", label: "Staff" },
  { key: "orders", label: "Orders" },
  { key: "logs", label: "Logs" },
  { key: "settings", label: "Settings" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "billing", label: "Billing" },
  { key: "support", label: "Support" },
];

function safeString(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function GenericTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data || data.length === 0) return <div style={{ padding: 28, color: "#9ca3af" }}>No records</div>;
  const keys = Object.keys(data[0]);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
        <thead>
          <tr style={{ background: "#f9fafb" }}>
            {keys.map(k => (
              <th key={k} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, color: "#6b7280", textTransform: "capitalize" }}>{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
              {keys.map(k => (
                <td key={k} style={{ padding: "10px 14px", fontSize: 13, color: "#374151", maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{safeString(row[k])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || user.email !== "admin@postore.app") router.push("/login");
  }, [router]);

  const fetchSection = useCallback(async (section: string) => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const res = await fetch(`/api/admin/super?section=${encodeURIComponent(section)}`, { headers: { Authorization: `Bearer ${user?.id}` } });
      const body = await res.json();
      // Normalize common shapes
      if (section === "overview") {
        setStats(body || null);
        setData([]);
      } else if (Array.isArray(body)) {
        setData(body as Record<string, unknown>[]);
        setStats(null);
      } else if (body && typeof body === "object") {
        // If API returns { users: [...], staff: [...] } pick the first array property
        const arr = Object.values(body).find(v => Array.isArray(v)) as Record<string, unknown>[] | undefined;
        if (arr) setData(arr);
        else setData([]);
        setStats(null);
      } else {
        setData([]);
        setStats(null);
      }
    } catch {
      setStats(null);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSection(activeTab);
  }, [activeTab, fetchSection]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchSection(activeTab), 30000);
    return () => clearInterval(id);
  }, [autoRefresh, activeTab, fetchSection]);

  const flash = (text: string, ok = true) => {
    setActionMsg({ text, ok });
    setTimeout(() => setActionMsg(null), 3500);
  };

  async function adminAction(action: string, id?: string, extra?: Record<string, unknown>) {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const res = await fetch("/api/admin/super", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.id}` },
        body: JSON.stringify({ action, id, ...(extra || {}) }),
      });
      const body = await res.json();
      if (body.success) flash(body.message || "OK");
      else flash(body.error || "Failed", false);
      fetchSection(activeTab);
    } catch {
      flash("Network error", false);
    }
  }

  function askConfirm(message: string, fn: () => void) {
    if (window.confirm(message)) fn();
  }

  const filtered = data.filter(row => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(row).some(v => safeString(v).toLowerCase().includes(s));
  });

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", background: "#f5f4f0" }}>
      <header style={{ background: "#141410", color: "#fff", padding: "0.75rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 34, height: 34, background: "#d4522a", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>S</div>
          <div>
            <div style={{ fontWeight: 600 }}>Super Admin</div>
            <div style={{ fontSize: 12, color: "#9a9a8e" }}>upendoapps.com platform</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#9a9a8e" }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} /> Auto-refresh
          </label>
          <button onClick={() => fetchSection(activeTab)} style={{ background: "#2a2a22", color: "#fff", padding: "6px 12px", borderRadius: 6 }}>Refresh</button>
          <button onClick={() => { localStorage.removeItem("user"); router.push("/login"); }} style={{ background: "transparent", color: "#fff", border: "1px solid #444", padding: "6px 12px", borderRadius: 6 }}>Logout</button>
        </div>
      </header>

      <nav style={{ background: "#fff", borderBottom: "1px solid #e2e0d8", padding: "0 2rem", display: "flex", gap: 8, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setSearch(""); }} style={{ padding: "12px 14px", border: "none", background: "transparent", borderBottom: activeTab === t.key ? "2px solid #d4522a" : "2px solid transparent", color: activeTab === t.key ? "#d4522a" : "#6b7280", fontWeight: activeTab === t.key ? 700 : 500, cursor: "pointer" }}>{t.label}</button>
        ))}
      </nav>

      <main style={{ padding: "1.75rem 2rem", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>{TABS.find(t => t.key === activeTab)?.label}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input placeholder={`Search ${activeTab}...`} value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e0d8" }} />
          </div>
        </div>

        {loading && (
          <div style={{ padding: 28, color: "#9ca3af" }}>Loading {activeTab}…</div>
        )}

        {!loading && activeTab === "overview" && stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} style={{ background: "#fff", borderRadius: 10, padding: 12, border: "1px solid #e2e0d8" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{safeString(v)}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{k}</div>
              </div>
            ))}
          </div>
        )}

        {/* Users tab - show admin users */}
        {!loading && activeTab === "users" && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", overflow: "hidden" }}>
            <div style={{ padding: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#f9fafb" }}><th style={{ padding: 10 }}>Name</th><th>Email</th><th>Store</th><th>Domain</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.filter(u => String(u.role) === "admin").length === 0 ? <tr><td colSpan={7} style={{ padding: 28, color: "#9ca3af" }}>No admins</td></tr> : filtered.filter(u => String(u.role) === "admin").map((u, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: 10, fontWeight: 600 }}>{safeString(u.full_name)}</td>
                      <td style={{ color: "#6b7280" }}>{safeString(u.email)}</td>
                      <td>{safeString(u.store_name)}</td>
                      <td>{safeString(u.domain)}</td>
                      <td>{safeString(u.subdomain_status)}</td>
                      <td style={{ color: "#9ca3af" }}>{u.created_at ? new Date(String(u.created_at)).toLocaleDateString() : "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {String(u.subdomain_status) !== "active" ? (
                            <button onClick={() => askConfirm(`Activate ${safeString(u.full_name)}?`, () => adminAction("activate_user", String(u.id)))} style={{ padding: "6px 8px", background: "#16a34a", color: "#fff", borderRadius: 6, border: "none" }}>Activate</button>
                          ) : (
                            <button onClick={() => askConfirm(`Deactivate ${safeString(u.full_name)}?`, () => adminAction("deactivate_user", String(u.id)))} style={{ padding: "6px 8px", background: "#f59e0b", color: "#fff", borderRadius: 6, border: "none" }}>Deactivate</button>
                          )}
                          <button onClick={() => {
                            const np = window.prompt("Enter new password for user:", "");
                            if (np) adminAction("reset_user_password", String(u.id), { new_password: np });
                          }} style={{ padding: "6px 8px", background: "#7c3aed", color: "#fff", borderRadius: 6, border: "none" }}>Reset Password</button>
                          <button onClick={() => askConfirm(`Delete ${safeString(u.full_name)}?`, () => adminAction("delete_user", String(u.id)))} style={{ padding: "6px 8px", background: "#dc2626", color: "#fff", borderRadius: 6, border: "none" }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Staff tab */}
        {!loading && activeTab === "staff" && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", overflow: "hidden" }}>
            <div style={{ padding: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#f9fafb" }}><th style={{ padding: 10 }}>Name</th><th>Email</th><th>Role</th><th>Store</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={7} style={{ padding: 28, color: "#9ca3af" }}>No staff</td></tr> : filtered.map((s, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: 10, fontWeight: 600 }}>{safeString(s.full_name)}</td>
                      <td style={{ color: "#6b7280" }}>{safeString(s.email)}</td>
                      <td>{safeString(s.shift_role)}</td>
                      <td>{safeString(s.store_name)}</td>
                      <td>{safeString(s.status)}</td>
                      <td style={{ color: "#9ca3af" }}>{s.created_at ? new Date(String(s.created_at)).toLocaleDateString() : "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {String(s.status) !== "active" ? (
                            <button onClick={() => askConfirm(`Activate ${safeString(s.full_name)}?`, () => adminAction("activate_staff", String(s.id)))} style={{ padding: "6px 8px", background: "#16a34a", color: "#fff", borderRadius: 6, border: "none" }}>Activate</button>
                          ) : (
                            <button onClick={() => askConfirm(`Deactivate ${safeString(s.full_name)}?`, () => adminAction("deactivate_staff", String(s.id)))} style={{ padding: "6px 8px", background: "#f59e0b", color: "#fff", borderRadius: 6, border: "none" }}>Deactivate</button>
                          )}
                          <button onClick={() => {
                            const np = window.prompt("Enter new password for staff:", "");
                            if (np) adminAction("reset_staff_password", String(s.id), { new_password: np });
                          }} style={{ padding: "6px 8px", background: "#7c3aed", color: "#fff", borderRadius: 6, border: "none" }}>Reset Password</button>
                          <button onClick={() => askConfirm(`Delete ${safeString(s.full_name)}?`, () => adminAction("delete_staff", String(s.id)))} style={{ padding: "6px 8px", background: "#dc2626", color: "#fff", borderRadius: 6, border: "none" }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Billing tab (subscriptions across admins) */}
        {!loading && activeTab === "billing" && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", overflow: "hidden" }}>
            <div style={{ padding: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#f9fafb" }}><th style={{ padding: 10 }}>Store</th><th>Domain</th><th>Plan</th><th>Status</th><th>Amount</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={7} style={{ padding: 28, color: "#9ca3af" }}>No billing records</td></tr> : filtered.map((b, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: 10, fontWeight: 600 }}>{safeString(b.store_name)}</td>
                      <td style={{ color: "#6b7280" }}>{safeString(b.domain)}</td>
                      <td>{safeString(b.plan)}</td>
                      <td>{safeString(b.status)}</td>
                      <td style={{ fontWeight: 700, color: "#16a34a" }}>KES {Number(b.amount || 0).toLocaleString()}</td>
                      <td style={{ color: "#9ca3af" }}>{b.created_at ? new Date(String(b.created_at)).toLocaleString() : "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {String(b.status) !== "paid" && (
                            <button onClick={() => askConfirm(`Mark ${safeString(b.store_name)} payment as paid?`, () => adminAction("mark_billing_paid", String(b.id)))} style={{ padding: "6px 8px", background: "#16a34a", color: "#fff", borderRadius: 6, border: "none" }}>Mark Paid</button>
                          )}
                          <button onClick={() => askConfirm(`Refund ${safeString(b.store_name)}?`, () => adminAction("refund_billing", String(b.id)))} style={{ padding: "6px 8px", background: "#dc2626", color: "#fff", borderRadius: 6, border: "none" }}>Refund</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings tab - password and platform settings */}
        {!loading && activeTab === "settings" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 12 }}>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Change Super Admin Password</div>
              <PasswordChanger onSave={async (cur, nw) => {
                try {
                  await adminAction("change_super_password", undefined, { current_password: cur, new_password: nw });
                } catch {}
              }} />
            </div>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Platform Settings (JSON)</div>
              <SettingsEditor dataKey={activeTab} fetchReload={() => fetchSection("settings")} />
            </div>
          </div>
        )}

        {/* Generic fallback for other tabs */}
        {!loading && !["users","staff","billing","settings","overview"].includes(activeTab) && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", overflow: "hidden" }}>
            <div style={{ padding: 12 }}>
              <GenericTable data={filtered} />
            </div>
          </div>
        )}
      </main>
      {actionMsg && (
        <div style={{ position: "fixed", right: 20, bottom: 20, background: actionMsg.ok ? "#16a34a" : "#dc2626", color: "#fff", padding: "10px 14px", borderRadius: 8 }}>{actionMsg.text}</div>
      )}
    </div>
  );
}

function PasswordChanger({ onSave }: { onSave: (current: string, next: string) => Promise<void> }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input placeholder="Current password" type="password" value={current} onChange={e => setCurrent(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #e5e7eb" }} />
        <input placeholder="New password" type="password" value={next} onChange={e => setNext(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #e5e7eb" }} />
        <input placeholder="Confirm new password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #e5e7eb" }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={busy || !current || !next || next !== confirm} onClick={async () => { setBusy(true); await onSave(current, next); setBusy(false); }} style={{ padding: "8px 12px", borderRadius: 6, background: "#d4522a", color: "#fff", border: "none" }}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function SettingsEditor({ dataKey, fetchReload }: { dataKey: string; fetchReload: () => void }) {
  const [text, setText] = useState("");
  const [, setSettingsLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      setSettingsLoading(true);
      try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        const res = await fetch(`/api/admin/super?section=settings`, { headers: { Authorization: `Bearer ${user?.id}` } });
        const body = await res.json();
        if (mounted) setText(JSON.stringify(body || {}, null, 2));
      } catch {}
      finally { if (mounted) setSettingsLoading(false); }
    })();
    return () => { mounted = false; };
  }, [dataKey]);

  const save = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const payload = JSON.parse(text || "{}");
      const res = await fetch(`/api/admin/super`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.id}` }, body: JSON.stringify({ action: "update_settings", settings: payload }) });
      const body = await res.json();
      alert(body.success ? (body.message || "Saved") : (body.error || "Save failed"));
      fetchReload();
    } catch (err) { alert("Save failed: " + String(err)); }
  };

  return (
    <div>
      <textarea value={text} onChange={e => setText(e.target.value)} style={{ width: "100%", minHeight: 220, fontFamily: "monospace", fontSize: 13, padding: 10, borderRadius: 6, border: "1px solid #e5e7eb" }} />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={save} style={{ padding: "8px 12px", borderRadius: 6, background: "#d4522a", color: "#fff", border: "none" }}>Save</button>
        <button onClick={fetchReload} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb" }}>Reload</button>
      </div>
    </div>
  );
}
