"use client";

import React, { useState, useEffect, useCallback } from "react";

/* ── Types ── */
interface StaffMember {
  id:         string;
  full_name:  string;
  email:      string;
  role:       string;
  shift_role: string;
  status:     "active" | "inactive";
  created_at: string;
  last_login?: string;
  admin_id:   string;
}

interface InviteForm {
  full_name:  string;
  email:      string;
  shift_role: string;
  password:   string;
}

interface ConfirmState {
  open:      boolean;
  title:     string;
  message:   string;
  danger:    boolean;
  onConfirm: () => void;
}

interface StoredUser {
  id:         string;
  full_name:  string;
  email:      string;
  role:       string;
  store_name: string | null;
}

/* ── Get signed-in admin from localStorage ── */
function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/* ── SVG Icons ── */
function IconWarning() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
function IconUserPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  );
}

/* ── Shared styles ── */
const fieldStyle: React.CSSProperties = {
  width: "100%", background: "#f5f4f0",
  border: "1px solid #c8c6bc", borderRadius: 8,
  padding: "9px 12px", color: "#141410",
  fontFamily: "inherit", fontSize: 14, outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 500,
  letterSpacing: "0.5px", textTransform: "uppercase",
  color: "#4a4a40", marginBottom: 5,
};
const cardStyle: React.CSSProperties = {
  background: "#fff", border: "1px solid #e2e0d8",
  borderRadius: 12, overflow: "hidden",
};

/* ── Helpers ── */
function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "—"; }
}

/* ── Sub-components ── */
function Toast({ msg, type = "success" }: { msg: string; type?: "success" | "error" }) {
  return (
    <div style={{
      position: "fixed", bottom: "2rem", right: "2rem",
      background: type === "error" ? "#dc2626" : "#141410",
      color: "#fff", padding: "0.85rem 1.25rem", borderRadius: 10,
      fontSize: 13, display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
      animation: "toastIn 0.3s ease", zIndex: 1100,
    }}>
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        {type === "error"
          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        }
      </span> {msg}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

function ConfirmModal({ state, onCancel }: { state: ConfirmState; onCancel: () => void }) {
  if (!state.open) return null;
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, animation: "fadeIn 0.15s ease" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        background: "#fff", borderRadius: 14, padding: "1.75rem",
        width: "100%", maxWidth: 400, zIndex: 1001,
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        animation: "slideUp 0.2s ease",
      }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: state.danger ? "#fef2f2" : "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: "1rem" }}>
          {state.danger ? <IconWarning /> : <IconUser />}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#141410", marginBottom: 8 }}>{state.title}</div>
        <div style={{ fontSize: 13, color: "#9a9a8e", lineHeight: 1.6, marginBottom: "1.5rem" }}>{state.message}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "8px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => { state.onConfirm(); onCancel(); }} style={{ padding: "8px 18px", background: state.danger ? "#dc2626" : "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            {state.danger ? "Yes, proceed" : "Confirm"}
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{opacity:0;transform:translate(-50%,-46%)}to{opacity:1;transform:translate(-50%,-50%)}}`}</style>
    </>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", color: "#9a9a8e", fontSize: 13, gap: 10 }}>
      <div style={{ width: 18, height: 18, border: "2px solid #e2e0d8", borderTopColor: "#141410", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      Loading staff…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: active ? "#16a34a" : "#9a9a8e" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#16a34a" : "#c8c6bc" }} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* ── Slide-over panel ── */
function StaffPanel({
  open, onClose, mode, member, onSave, loading,
}: {
  open:    boolean;
  onClose: () => void;
  mode:    "add" | "edit";
  member?: StaffMember | null;
  onSave:  (form: InviteForm) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<InviteForm>(() =>
    mode === "edit" && member
      ? { full_name: member.full_name, email: member.email, shift_role: "cashier", password: "" }
      : { full_name: "", email: "", shift_role: "cashier", password: "" }
  );

  if (!open) return null;

  const set = (key: keyof InviteForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 900 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "100%", maxWidth: 420,
        background: "#fff", zIndex: 901,
        boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column",
        animation: "slideIn 0.25s ease",
      }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>
            {mode === "add" ? "Add Cashier" : "Edit Cashier"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9a9a8e", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {mode === "add" && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "0.75rem 1rem", fontSize: 12, color: "#1e40af" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IconInfo /> Staff members will be added as cashiers and can access the POS to record sales.
              </span>
            </div>
          )}

          <div>
            <label style={labelStyle}>Full Name</label>
            <input style={fieldStyle} placeholder="e.g. Kwame Asante" value={form.full_name} onChange={set("full_name")} />
          </div>

          <div>
            <label style={labelStyle}>Email Address</label>
            <input style={fieldStyle} type="email" placeholder="staff@yourstore.com" value={form.email} onChange={set("email")} />
          </div>

          {mode === "add" && (
            <div>
              <label style={labelStyle}>Temporary Password</label>
              <input style={fieldStyle} type="password" placeholder="Min. 8 characters" value={form.password} onChange={set("password")} />
              <p style={{ fontSize: 11, color: "#9a9a8e", marginTop: 4 }}>Staff can change this after first login.</p>
            </div>
          )}

          {mode === "edit" && (
            <div>
              <label style={labelStyle}>Reset Password (optional)</label>
              <input style={fieldStyle} type="password" placeholder="Leave blank to keep current" value={form.password} onChange={set("password")} />
            </div>
          )}
        </div>

        <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #e2e0d8", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "#fff", color: "#4a4a40", border: "1px solid #c8c6bc", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={loading}
            style={{ padding: "9px 20px", background: loading ? "#9a9a8e" : "#141410", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {loading ? "Saving…" : mode === "add" ? "Add Cashier" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function AdminStaffPage() {
  // Read the signed-in admin from localStorage — used as owner key for all API calls
  const [adminUser] = useState<StoredUser | null>(getStoredUser);

  const [staff,      setStaff]      = useState<StaffMember[]>([]);
  const [fetching,   setFetching]   = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState("");
  const [panelOpen,  setPanelOpen]  = useState(false);
  const [panelMode,  setPanelMode]  = useState<"add" | "edit">("add");
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirm,    setConfirm]    = useState<ConfirmState>({
    open: false, title: "", message: "", danger: false, onConfirm: () => {},
  });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openConfirm = (title: string, message: string, danger: boolean, onConfirm: () => void) =>
    setConfirm({ open: true, title, message, danger, onConfirm });
  const closeConfirm = () => setConfirm(c => ({ ...c, open: false }));

  /* ── Fetch only this admin's staff ── */
  const fetchStaff = useCallback(async () => {
    if (!adminUser?.id) return;
    setFetching(true);
    try {
      const res  = await fetch(`/api/staff?admin_id=${adminUser.id}`);
      const data = await res.json();
      setStaff(Array.isArray(data) ? data : []);
    } catch {
      showToast("Failed to load staff", "error");
    } finally {
      setFetching(false);
    }
  }, [adminUser?.id]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  /* ── Add / Edit staff ── */
  const handleSave = (form: InviteForm) => {
    if (!adminUser?.id) return showToast("Not logged in", "error");
    if (!form.full_name || !form.email) return showToast("Name and email are required", "error");
    if (panelMode === "add" && form.password.length < 8) return showToast("Password must be at least 8 characters", "error");

    openConfirm(
      panelMode === "add" ? "Add Cashier" : "Update Cashier",
      panelMode === "add"
        ? `Add ${form.full_name} as a cashier to your store? They will receive login credentials.`
        : `Save changes to ${form.full_name}'s profile?`,
      false,
      async () => {
        setSaving(true);
        try {
          const url    = panelMode === "add" ? "/api/staff" : `/api/staff/${editTarget?.id}`;
          const method = panelMode === "add" ? "POST" : "PUT";
          const res    = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            // admin_id sent in body to link/verify ownership
            body: JSON.stringify({ ...form, role: "staff", admin_id: adminUser.id }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          showToast(panelMode === "add" ? "Cashier added successfully" : "Cashier updated successfully");
          setPanelOpen(false);
          fetchStaff();
        } catch (err) {
          showToast((err as Error).message || "Failed to save", "error");
        } finally {
          setSaving(false);
        }
      }
    );
  };

  /* ── Toggle active/inactive ── */
  const handleToggleStatus = (member: StaffMember) => {
    if (!adminUser?.id) return;
    const next = member.status === "active" ? "inactive" : "active";
    openConfirm(
      `${next === "active" ? "Activate" : "Deactivate"} Cashier`,
      `Are you sure you want to ${next === "active" ? "activate" : "deactivate"} ${member.full_name}? ${
        next === "inactive"
          ? "They will lose access to the POS system."
          : "They will regain access to the POS system."
      }`,
      next === "inactive",
      async () => {
        try {
          const res = await fetch(`/api/staff/${member.id}/status`, {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ status: next, admin_id: adminUser.id }),
          });
          if (!res.ok) throw new Error("Failed");
          showToast(`${member.full_name} ${next === "active" ? "activated" : "deactivated"}`);
          fetchStaff();
        } catch {
          showToast("Failed to update status", "error");
        }
      }
    );
  };

  /* ── Delete staff ── */
  const handleDelete = (member: StaffMember) => {
    if (!adminUser?.id) return;
    openConfirm(
      "Remove Cashier",
      `Are you sure you want to permanently remove ${member.full_name} from your store? This cannot be undone.`,
      true,
      async () => {
        try {
          const res = await fetch(
            `/api/staff/${member.id}?admin_id=${adminUser.id}`,
            { method: "DELETE" }
          );
          if (!res.ok) throw new Error("Failed");
          showToast(`${member.full_name} removed`);
          fetchStaff();
        } catch {
          showToast("Failed to remove cashier", "error");
        }
      }
    );
  };

  /* ── Filtered list ── */
  const filtered = staff.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount   = staff.filter(s => s.status === "active").length;
  const inactiveCount = staff.filter(s => s.status === "inactive").length;

  const dater = new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).format(new Date());

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <ConfirmModal state={confirm} onCancel={closeConfirm} />
      <StaffPanel
        key={`${panelMode}-${editTarget?.id ?? "new"}`}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        mode={panelMode}
        member={editTarget}
        onSave={handleSave}
        loading={saving}
      />

      <header className="header">
        <div className="header-title">Staff</div>
        <div className="header-date">{dater}</div>
        <button
          onClick={() => { setPanelMode("add"); setEditTarget(null); setPanelOpen(true); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#141410", color: "#fff", border: "none", borderRadius: 7, fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          <IconUserPlus /> Add Staff
        </button>
      </header>

      <main className="main">

        {/* Admin context banner */}
        {adminUser && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #e2e0d8", borderRadius: 10, padding: "0.75rem 1.1rem", fontSize: 12, color: "#4a4a40" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#141410", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
              {getInitials(adminUser.full_name)}
            </div>
            <span>
              Managing staff for <strong style={{ color: "#141410" }}>{adminUser.store_name ?? adminUser.full_name}</strong>
              <span style={{ color: "#9a9a8e" }}> · Only your cashiers are shown</span>
            </span>
          </div>
        )}

        {/* Stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {[
            { label: "Total Cashiers", value: staff.length,   sub: "In your store"   },
            { label: "Active",         value: activeCount,    sub: "Currently on"    },
            { label: "Inactive",       value: inactiveCount,  sub: "Access revoked"  },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e0d8", borderRadius: 12, padding: "1.1rem 1.25rem" }}>
              <div style={{ fontSize: 11, color: "#9a9a8e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.5px" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Staff table */}
        <div style={cardStyle}>
          {/* Toolbar */}
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e0d8", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 8, padding: "0 10px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9a9a8e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                style={{ flex: 1, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: "#141410", outline: "none", padding: "7px 0" }}
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          {fetching ? <Spinner /> : filtered.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9a9a8e", fontSize: 13 }}>
              {search ? "No staff match your search." : "No cashiers yet. Add your first one."}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Cashier", "Status", "Joined", "Last Login", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.6rem 1.25rem", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9a9a8e", borderBottom: "1px solid #e2e0d8", background: "#f5f4f0", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(member => (
                  <tr key={member.id}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf8"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}
                    style={{ borderBottom: "1px solid #e2e0d8" }}
                  >
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#141410", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                          {getInitials(member.full_name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: "#141410" }}>{member.full_name}</div>
                          <div style={{ fontSize: 11, color: "#9a9a8e", marginTop: 1 }}>{member.email}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <StatusDot active={member.status === "active"} />
                    </td>

                    <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40" }}>
                      {formatDate(member.created_at)}
                    </td>

                    <td style={{ padding: "0.85rem 1.25rem", color: "#4a4a40" }}>
                      {member.last_login
                        ? formatDate(member.last_login)
                        : <span style={{ color: "#c8c6bc" }}>Never</span>
                      }
                    </td>

                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          onClick={() => { setPanelMode("edit"); setEditTarget(member); setPanelOpen(true); }}
                          style={{ padding: "5px 10px", background: "#f5f4f0", border: "1px solid #c8c6bc", borderRadius: 6, fontSize: 12, color: "#141410", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(member)}
                          style={{ padding: "5px 10px", background: member.status === "active" ? "#fffbeb" : "#f0fdf4", border: `1px solid ${member.status === "active" ? "#fde68a" : "#bbf7d0"}`, borderRadius: 6, fontSize: 12, color: member.status === "active" ? "#d97706" : "#16a34a", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          {member.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDelete(member)}
                          style={{ padding: "5px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!fetching && filtered.length > 0 && (
            <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid #e2e0d8", fontSize: 12, color: "#9a9a8e" }}>
              Showing {filtered.length} of {staff.length} cashier{staff.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

      </main>
    </>
  );
}