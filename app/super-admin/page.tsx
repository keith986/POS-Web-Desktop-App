"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SupportConversation {
  admin_id: string;
  full_name: string;
  email: string;
  last_message: string;
  last_sender: "admin" | "super_admin";
  last_at: string;
  time: string;
  message_count: number;
}
interface SupportMessage {
  id: string;
  sender: "admin" | "super_admin";
  message: string;
  title: string;
  time: string;
  created_at: string;
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "staff", label: "Staff" },
  { key: "orders", label: "Orders" },
  { key: "logs", label: "Logs" },
  { key: "billing", label: "Billing" },
  { key: "settings", label: "Settings" },
  { key: "support", label: "Support" },
];

function safeString(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function displayValue(key: string, value: unknown) {
  const text = safeString(value);
  if (/(?:^|_)id$|id$|receipt|checkout_request_id|token/i.test(key) && text.length > 14) {
    return `${text.slice(0, 8)}…${text.slice(-4)}`;
  }
  return text;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [supportConversations, setSupportConversations] = useState<SupportConversation[]>([]);
  const [selectedSupportAdminId, setSelectedSupportAdminId] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportText, setSupportText] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportChatLoading, setSupportChatLoading] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || user.email !== "admin@postore.app") router.push("/login");
  }, [router]);

  const fetchSection = useCallback(async (section: string) => {
    if (section === "support") {
      setStats(null);
      setData([]);
      return;
    }

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const res = await fetch(`/api/admin/super?section=${encodeURIComponent(section)}`, { headers: { Authorization: `Bearer ${user?.id}` } });
      const body = await res.json();
      if (section === "overview") {
        setStats(body || null);
        setData([]);
      } else if (Array.isArray(body)) {
        setData(body as Record<string, unknown>[]);
        setStats(null);
      } else if (body && typeof body === "object") {
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

  const loadSupportConversations = useCallback(async () => {
    setSupportLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const res = await fetch(`/api/support?super_admin=1`, { headers: { Authorization: `Bearer ${user?.id}` } });
      const body = await res.json();
      if (Array.isArray(body)) {
        setSupportConversations(body);
        if (!selectedSupportAdminId && body.length > 0) {
          setSelectedSupportAdminId(body[0].admin_id);
        }
      }
    } catch {
      setSupportConversations([]);
    } finally {
      setSupportLoading(false);
    }
  }, [selectedSupportAdminId]);

  const loadSupportConversation = useCallback(async (adminId: string) => {
    setSupportChatLoading(true);
    try {
      const res = await fetch(`/api/support?admin_id=${encodeURIComponent(adminId)}`);
      const body = await res.json();
      if (Array.isArray(body)) {
        setSupportMessages(body as SupportMessage[]);
      }
    } catch {
      setSupportMessages([]);
    } finally {
      setSupportChatLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "support") {
      loadSupportConversations();
    } else {
      fetchSection(activeTab);
    }
  }, [activeTab, fetchSection, loadSupportConversations]);

  useEffect(() => {
    if (!selectedSupportAdminId) return;
    loadSupportConversation(selectedSupportAdminId);
  }, [selectedSupportAdminId, loadSupportConversation]);

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
  const visibleRows = activeTab === "users" ? filtered.filter(u => String(u.role) === "admin") : filtered;
  const itemsPerPage = 10;
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / itemsPerPage));
  const paginatedData = visibleRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, data.length]);

  const paginationControls = pageCount > 1 ? (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
      <span style={{ color: "#6b7280", fontSize: 13 }}>Page {currentPage} of {pageCount}</span>
      {Array.from({ length: pageCount }, (_, idx) => idx + 1).map(page => (
        <button
          key={page}
          onClick={() => setCurrentPage(page)}
          style={{
            minWidth: 34,
            padding: "8px 10px",
            borderRadius: 6,
            border: page === currentPage ? "1px solid #d4522a" : "1px solid #e2e0d8",
            background: page === currentPage ? "#d4522a" : "#fff",
            color: page === currentPage ? "#fff" : "#374151",
            cursor: "pointer",
          }}
        >
          {page}
        </button>
      ))}
    </div>
  ) : null;

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
          <button onClick={() => activeTab === "support" ? loadSupportConversations() : fetchSection(activeTab)} style={{ background: "#2a2a22", color: "#fff", padding: "6px 12px", borderRadius: 6 }}>Refresh</button>
          <button onClick={() => { localStorage.removeItem("user"); router.push("/login"); }} style={{ background: "transparent", color: "#fff", border: "1px solid #444", padding: "6px 12px", borderRadius: 6 }}>Logout</button>
        </div>
      </header>

      <main style={{ padding: "1.75rem 2rem", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
          <aside style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e0d8", padding: 16, boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#111827" }}>Navigation</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setActiveTab(t.key); setSearch(""); }}
                  style={{
                    textAlign: "left",
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "none",
                    background: activeTab === t.key ? "#fef2f2" : "transparent",
                    color: activeTab === t.key ? "#b91c1c" : "#374151",
                    fontWeight: activeTab === t.key ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </aside>

          <section>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>{TABS.find(t => t.key === activeTab)?.label}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 220 }}>
            <input placeholder={`Search ${activeTab}...`} value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e0d8" }} />
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
                <thead><tr style={{ background: "#f9fafb" }}><th style={{ padding: 10 }}>Admin ID</th><th>Name</th><th>Email</th><th>Store</th><th>Domain</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.filter(u => String(u.role) === "admin").length === 0 ? <tr><td colSpan={8} style={{ padding: 28, color: "#9ca3af" }}>No admins</td></tr> : paginatedData.filter(u => String(u.role) === "admin").map((u, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: 10, fontWeight: 600 }}>{displayValue("id", u.id)}</td>
                      <td style={{ padding: 10, fontWeight: 600 }}>{displayValue("full_name", u.full_name)}</td>
                      <td style={{ color: "#6b7280" }}>{displayValue("email", u.email)}</td>
                      <td>{displayValue("store_name", u.store_name)}</td>
                      <td>{displayValue("domain", u.domain)}</td>
                      <td>{displayValue("subdomain_status", u.subdomain_status)}</td>
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
              {paginationControls}
            </div>
          </div>
        )}

        {/* Staff tab */}
        {!loading && activeTab === "staff" && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", overflow: "hidden" }}>
            <div style={{ padding: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#f9fafb" }}><th style={{ padding: 10 }}>Staff ID</th><th>Name</th><th>Email</th><th>Role</th><th>Store</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={8} style={{ padding: 28, color: "#9ca3af" }}>No staff</td></tr> : paginatedData.map((s, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: 10, fontWeight: 600 }}>{displayValue("id", s.id)}</td>
                      <td style={{ padding: 10, fontWeight: 600 }}>{displayValue("full_name", s.full_name)}</td>
                      <td style={{ color: "#6b7280" }}>{displayValue("email", s.email)}</td>
                      <td>{displayValue("shift_role", s.shift_role)}</td>
                      <td>{displayValue("store_name", s.store_name)}</td>
                      <td>{displayValue("status", s.status)}</td>
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
              {paginationControls}
            </div>
          </div>
        )}

        {/* Billing tab (subscriptions across admins) */}
        {!loading && activeTab === "billing" && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", overflow: "hidden" }}>
            <div style={{ padding: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#f9fafb" }}><th style={{ padding: 10 }}>Admin</th><th>Store</th><th>Domain</th><th>Plan</th><th>Status</th><th>Amount</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={8} style={{ padding: 28, color: "#9ca3af" }}>No billing records</td></tr> : paginatedData.map((b, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: 10, fontWeight: 600 }}>{displayValue("admin_id", b.admin_id ?? b.id)}</td>
                      <td style={{ padding: 10, fontWeight: 600 }}>{displayValue("store_name", b.store_name)}</td>
                      <td style={{ color: "#6b7280" }}>{displayValue("domain", b.domain)}</td>
                      <td>{displayValue("plan", b.plan)}</td>
                      <td>{displayValue("status", b.status)}</td>
                      <td style={{ fontWeight: 700, color: "#16a34a" }}>KES {Number(b.amount || 0).toLocaleString()}</td>
                      <td style={{ color: "#9ca3af" }}>{b.created_at ? new Date(String(b.created_at)).toLocaleString() : "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {String(((b as unknown) as Record<string, unknown>).charge_id || "") && String(b.status) !== "paid" && (
                            <button onClick={() => askConfirm(`Mark ${displayValue("store_name", b.store_name)} payment as paid?`, () => adminAction("mark_billing_paid", String(((b as unknown) as Record<string, unknown>).charge_id)))} style={{ padding: "6px 8px", background: "#16a34a", color: "#fff", borderRadius: 6, border: "none" }}>Mark Paid</button>
                          )}
                          {String(((b as unknown) as Record<string, unknown>).charge_id || "") && (
                            <button onClick={() => askConfirm(`Refund ${displayValue("store_name", b.store_name)}?`, () => adminAction("refund_billing", String(((b as unknown) as Record<string, unknown>).charge_id)))} style={{ padding: "6px 8px", background: "#dc2626", color: "#fff", borderRadius: 6, border: "none" }}>Refund</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paginationControls}
            </div>
          </div>
        )}

        {/* Support tab - super-admin chat */}
        {!loading && activeTab === "support" && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", overflow: "hidden", minHeight: 440 }}>
            <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 1, minHeight: 440 }}>
              <div style={{ background: "#f8fafc", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Support Conversations</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{supportConversations.length} active thread{supportConversations.length === 1 ? "" : "s"}</div>
                  </div>
                  <button onClick={loadSupportConversations} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e0d8", background: "#fff", cursor: "pointer" }}>Refresh</button>
                </div>
                {supportLoading ? (
                  <div style={{ padding: 14, color: "#9ca3af" }}>Loading conversations…</div>
                ) : supportConversations.length === 0 ? (
                  <div style={{ padding: 14, color: "#9ca3af" }}>No support conversations yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: 420 }}>
                    {supportConversations.map(conv => (
                      <button key={conv.admin_id} onClick={() => setSelectedSupportAdminId(conv.admin_id)} style={{ textAlign: "left", width: "100%", padding: 12, borderRadius: 10, border: selectedSupportAdminId === conv.admin_id ? "1px solid #ef4444" : "1px solid transparent", background: selectedSupportAdminId === conv.admin_id ? "#fff" : "transparent", cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{conv.full_name}</div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>{conv.email}</div>
                          </div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>{conv.time}</div>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 13, color: "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{conv.last_message}</div>
                        <div style={{ marginTop: 6, fontSize: 11, color: "#9ca3af" }}>{conv.message_count} message{conv.message_count === 1 ? "" : "s"}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Conversation</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{selectedSupportAdminId ? `Admin ${displayValue("admin_id", selectedSupportAdminId)}` : "Select a thread to view messages"}</div>
                  </div>
                  {selectedSupportAdminId && (
                    <button onClick={() => selectedSupportAdminId && loadSupportConversation(selectedSupportAdminId)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}>Reload</button>
                  )}
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                  {supportChatLoading ? (
                    <div style={{ padding: 24, color: "#9ca3af" }}>Loading messages…</div>
                  ) : !selectedSupportAdminId ? (
                    <div style={{ padding: 24, color: "#9ca3af" }}>Select a support thread to read messages and reply.</div>
                  ) : supportMessages.length === 0 ? (
                    <div style={{ padding: 24, color: "#9ca3af" }}>No messages in this conversation yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {supportMessages.map(msg => (
                        <div key={msg.id} style={{ alignSelf: msg.sender === "super_admin" ? "flex-start" : "flex-end", maxWidth: "80%", padding: 12, borderRadius: 16, background: msg.sender === "super_admin" ? "#fff" : "#fee2e2", border: msg.sender === "super_admin" ? "1px solid #e5e7eb" : "1px solid #fca5a5" }}>
                          <div style={{ fontSize: 13, color: "#111827", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.message}</div>
                          <div style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>{msg.time}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input value={supportText} onChange={e => setSupportText(e.target.value)} disabled={!selectedSupportAdminId} placeholder={selectedSupportAdminId ? "Write a reply to the admin..." : "Select a thread first"} style={{ flex: 1, minWidth: 0, padding: "12px 14px", borderRadius: 10, border: "1px solid #e5e7eb" }} />
                  <button onClick={async () => {
                    if (!selectedSupportAdminId || !supportText.trim()) return;
                    try {
                      const user = JSON.parse(localStorage.getItem("user") || "null");
                      const res = await fetch("/api/support", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.id}` },
                        body: JSON.stringify({ admin_id: selectedSupportAdminId, sender: "super_admin", message: supportText.trim(), title: "Support Reply" }),
                      });
                      const body = await res.json();
                      if (body.success) {
                        setSupportText("");
                        await loadSupportConversation(selectedSupportAdminId);
                        await loadSupportConversations();
                      } else {
                        flash(body.error || "Send failed", false);
                      }
                    } catch {
                      flash("Send failed", false);
                    }
                  }} disabled={!selectedSupportAdminId || !supportText.trim()} style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: selectedSupportAdminId && supportText.trim() ? "#d4522a" : "#f3f4f6", color: selectedSupportAdminId && supportText.trim() ? "#fff" : "#9ca3af", cursor: selectedSupportAdminId && supportText.trim() ? "pointer" : "not-allowed" }}>Send</button>
                </div>
              </div>
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
        {!loading && !["users","staff","billing","settings","overview","support"].includes(activeTab) && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e0d8", overflow: "hidden" }}>
            <div style={{ padding: 12 }}>
              <GenericTable data={paginatedData} />
              {paginationControls}
            </div>
          </div>
        )}
        </section>
      </div>
      </main>
      {actionMsg && (
        <div style={{ position: "fixed", right: 20, bottom: 20, background: actionMsg?.ok ? "#16a34a" : "#dc2626", color: "#fff", padding: "10px 14px", borderRadius: 8 }}>{actionMsg?.text}</div>
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
