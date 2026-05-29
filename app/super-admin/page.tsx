"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TabKey = "overview" | "users" | "staff" | "orders" | "logs" | "billing" | "settings" | "support";

interface SupportConversation {
  admin_id: string;
  full_name: string;
  email: string;
  last_message: string;
  time: string;
  message_count: number;
}
interface SupportMessage {
  id: string;
  sender: "admin" | "super_admin";
  message: string;
  time: string;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "staff", label: "Staff" },
  { key: "orders", label: "Orders" },
  { key: "logs", label: "Logs" },
  { key: "billing", label: "Billing" },
  { key: "settings", label: "Settings" },
  { key: "support", label: "Support" },
];

function shortId(id?: unknown) {
  const s = String(id ?? "");
  if (!s) return "—";
  if (s.length <= 12) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Support state
  const [supportConversations, setSupportConversations] = useState<SupportConversation[]>([]);
  const [selectedSupportAdminId, setSelectedSupportAdminId] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportText, setSupportText] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || user.email !== "admin@postore.app") router.push("/login");
  }, [router]);

  const fetchSection = useCallback(async (section: string) => {
    if (section === "support") return;
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const res = await fetch(`/api/admin/super?section=${encodeURIComponent(section)}`, {
        headers: { Authorization: `Bearer ${user?.id}` },
      });
      const body = await res.json();
      if (section === "overview") {
        setStats(body || null);
        setData([]);
      } else if (Array.isArray(body)) {
        setData(body as Record<string, unknown>[]);
        setStats(null);
      } else {
        setData([]);
        setStats(null);
      }
    } catch (err) {
      setData([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "support") return;
    fetchSection(activeTab);
  }, [activeTab, fetchSection]);

  // Support helpers
  const loadSupportConversations = useCallback(async () => {
    setSupportLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const res = await fetch(`/api/support?super_admin=1`, { headers: { Authorization: `Bearer ${user?.id}` } });
      const body = await res.json();
      if (Array.isArray(body)) setSupportConversations(body as SupportConversation[]);
    } catch (err) {
      setSupportConversations([]);
    } finally {
      setSupportLoading(false);
    }
  }, []);

  const loadSupportConversation = useCallback(async (adminId: string) => {
    setSupportLoading(true);
    try {
      const res = await fetch(`/api/support?admin_id=${encodeURIComponent(adminId)}`);
      const body = await res.json();
      if (Array.isArray(body)) setSupportMessages(body as SupportMessage[]);
    } catch {
      setSupportMessages([]);
    } finally {
      setSupportLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "support") loadSupportConversations();
  }, [activeTab, loadSupportConversations]);

  useEffect(() => {
    if (!selectedSupportAdminId) return;
    loadSupportConversation(selectedSupportAdminId);
  }, [selectedSupportAdminId, loadSupportConversation]);

  const itemsPerPage = 10;
  const visible = data.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(r).some(v => String(v ?? "").toLowerCase().includes(s));
  });
  const pageCount = Math.max(1, Math.ceil(visible.length / itemsPerPage));
  const paginated = visible.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4f0" }}>
      <header style={{ padding: "12px 20px", background: "#141410", color: "#fff", display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 34, height: 34, background: "#d4522a", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>S</div>
          <div>
            <div style={{ fontWeight: 700 }}>Super Admin</div>
            <div style={{ fontSize: 12, color: "#cfcfcf" }}>postore</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { localStorage.removeItem("user"); router.push("/login"); }} style={{ background: "transparent", color: "#fff", border: "1px solid #444", padding: "6px 10px", borderRadius: 6 }}>Logout</button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "16px auto", padding: 12 }}>
        <div style={{ display: "flex", gap: 16 }}>
          <aside style={{ width: 260 }}>
            <div style={{ background: "#fff", padding: 12, borderRadius: 10, border: "1px solid #e5e7eb" }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => { setActiveTab(t.key); setSearch(""); setCurrentPage(1); }} style={{ display: "block", width: "100%", padding: 10, textAlign: "left", border: "none", background: activeTab === t.key ? "#fff0ef" : "transparent", borderRadius: 8, marginBottom: 6 }}>{t.label}</button>
              ))}
            </div>
          </aside>

          <section style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>{TABS.find(t => t.key === activeTab)?.label}</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder={`Search ${activeTab}...`} value={search} onChange={e => setSearch(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                <button onClick={() => activeTab === "support" ? loadSupportConversations() : fetchSection(activeTab)} style={{ padding: "8px 12px", borderRadius: 8 }}>Refresh</button>
              </div>
            </div>

            {loading && <div style={{ padding: 16, color: "#9ca3af" }}>Loading...</div>}

            {activeTab === "overview" && !loading && stats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
                {Object.entries(stats).map(([k, v]) => (
                  <div key={k} style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}>
                    <div style={{ fontWeight: 700 }}>{String(v ?? "-")}</div>
                    <div style={{ color: "#6b7280" }}>{k}</div>
                  </div>
                ))}
              </div>
            )}

            {(activeTab === "users" || activeTab === "staff" || activeTab === "billing") && !loading && (
              <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #e5e7eb", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {activeTab === "billing" ? (
                        <>
                          <th style={{ padding: 10 }}>Admin</th>
                          <th>Store</th>
                          <th>Domain</th>
                          <th>Plan</th>
                          <th>Amount</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </>
                      ) : (
                        <>
                          <th style={{ padding: 10 }}>{activeTab === "users" ? "Admin ID" : "Staff ID"}</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Store</th>
                          <th>Status</th>
                          <th>Joined</th>
                          <th>Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: 20, color: "#9ca3af" }}>No records</td></tr>
                    ) : paginated.map((r, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                        {activeTab === "billing" ? (
                          <>
                            <td style={{ padding: 10, fontWeight: 700 }}>{shortId(r.admin_id ?? r.id)}</td>
                            <td>{String(r.store_name ?? "-")}</td>
                            <td>{String(r.domain ?? "-")}</td>
                            <td>{String(r.plan ?? "-")}</td>
                            <td style={{ fontWeight: 700 }}>KES {Number(r.amount || 0).toLocaleString()}</td>
                            <td style={{ color: "#9ca3af" }}>{r.created_at ? new Date(String(r.created_at)).toLocaleString() : "-"}</td>
                            <td>Actions</td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: 10, fontWeight: 700 }}>{shortId(r.id)}</td>
                            <td style={{ fontWeight: 600 }}>{String(r.full_name ?? "-")}</td>
                            <td style={{ color: "#6b7280" }}>{String(r.email ?? "-")}</td>
                            <td>{String(r.store_name ?? "-")}</td>
                            <td>{String(r.status ?? r.subdomain_status ?? "-")}</td>
                            <td style={{ color: "#9ca3af" }}>{r.created_at ? new Date(String(r.created_at)).toLocaleDateString() : "-"}</td>
                            <td>Actions</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ color: "#6b7280" }}>Page {currentPage} of {pageCount}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setCurrentPage(p)} style={{ padding: "6px 8px", borderRadius: 6, background: p === currentPage ? "#d4522a" : "#fff", color: p === currentPage ? "#fff" : "#111" }}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "support" && (
              <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 12 }}>
                <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 700 }}>Conversations</div>
                    <button onClick={loadSupportConversations} style={{ padding: "6px 8px", borderRadius: 6 }}>Refresh</button>
                  </div>
                  <div style={{ maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                    {supportConversations.length === 0 ? <div style={{ color: "#9ca3af" }}>No conversations</div> : supportConversations.map(c => (
                      <button key={c.admin_id} onClick={() => setSelectedSupportAdminId(c.admin_id)} style={{ textAlign: "left", padding: 8, borderRadius: 8, border: selectedSupportAdminId === c.admin_id ? "1px solid #ef4444" : "1px solid transparent", background: selectedSupportAdminId === c.admin_id ? "#fff" : "transparent" }}>
                        <div style={{ fontWeight: 700 }}>{c.full_name}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{c.last_message}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontWeight: 700 }}>Messages</div>
                  <div style={{ flex: 1, overflowY: "auto", maxHeight: 420, padding: 8, background: "#f8fafc", borderRadius: 8 }}>
                    {selectedSupportAdminId ? (
                      supportMessages.length === 0 ? <div style={{ color: "#9ca3af" }}>No messages</div> : supportMessages.map(m => (
                        <div key={m.id} style={{ marginBottom: 8, alignSelf: m.sender === "super_admin" ? "flex-start" : "flex-end" }}>
                          <div style={{ background: m.sender === "super_admin" ? "#fff" : "#fee2e2", padding: 8, borderRadius: 8 }}>{m.message}</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>{m.time}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "#9ca3af" }}>Select a conversation</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={supportText} onChange={e => setSupportText(e.target.value)} placeholder={selectedSupportAdminId ? "Write a reply..." : "Select a conversation"} disabled={!selectedSupportAdminId} style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                    <button onClick={async () => {
                      if (!selectedSupportAdminId || !supportText.trim()) return;
                      try {
                        const user = JSON.parse(localStorage.getItem("user") || "null");
                        const res = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.id}` }, body: JSON.stringify({ admin_id: selectedSupportAdminId, sender: "super_admin", message: supportText.trim(), title: "Support Reply" }) });
                        const body = await res.json();
                        if (body.success) {
                          setSupportText("");
                          await loadSupportConversation(selectedSupportAdminId);
                          await loadSupportConversations();
                        } else {
                          alert(body.error || "Send failed");
                        }
                      } catch (err) { alert("Send failed"); }
                    }} disabled={!selectedSupportAdminId || !supportText.trim()} style={{ padding: "8px 12px", borderRadius: 8 }}>Send</button>
                  </div>
                </div>
              </div>
            )}

          </section>
        </div>
      </main>
    </div>
  );
}
