import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { CheckCircleIcon, XCircleIcon } from "../../components/Icons";
import { SortTh, Pagination, FilterSelect, sortRows, toggleSort } from "../../components/TableControls";
import ExportMenu from "../../components/ExportMenu";
import { exportToExcel, exportToCSV } from "../../utils/excelUtils";
import { buildPdfReport } from "../../utils/pdfReport";

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { loadStaff(); }, []);

  const loadStaff = async () => {
    const result = await window.electronAPI.queryDatabase(
      "SELECT id, full_name, email, role, is_active, created_at FROM users WHERE role = 'staff' ORDER BY full_name"
    );
    if (result.success) {
      setStaff(result.data.map(u => ({ ...u, name: u.full_name })));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!form.name || !form.email || !form.password) {
        setError("All fields are required");
        setLoading(false);
        return;
      }
      const hash = await bcrypt.hash(form.password, 10);
      const result = await window.electronAPI.executeDatabase(
        "INSERT INTO users (id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
        [uuidv4(), form.name, form.email.toLowerCase(), hash, form.role]
      );
      if (!result.success) {
        setError(result.error || "Email already exists");
        setLoading(false);
        return;
      }
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "staff" });
      loadStaff();
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to create staff member");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (member) => {
    await window.electronAPI.executeDatabase(
      "UPDATE users SET is_active = ? WHERE id = ?",
      [member.is_active ? 0 : 1, member.id]
    );
    loadStaff();
  };

  const searched = staff.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(search.toLowerCase()) || member.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? !!member.is_active : !member.is_active);
    return matchesSearch && matchesStatus;
  });

  const filtered = sortRows(searched, sort);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [search, statusFilter, pageSize]);

  const handleSort = (key) => setSort((s) => toggleSort(s, key));

  /* ── EXPORT ── */
  const buildExportRows = (rows) => rows.map((m) => ({
    Name: m.name,
    Email: m.email,
    Role: m.role,
    Status: m.is_active ? "Active" : "Inactive",
    "Joined": m.created_at ? new Date(m.created_at).toLocaleDateString() : "",
  }));

  const handleExportExcel = () => exportToExcel("staff", [{ name: "Staff", rows: buildExportRows(filtered) }]);
  const handleExportCSV = () => exportToCSV("staff", buildExportRows(filtered));

  const handleExportPDF = async () => {
    const rows = filtered.length ? filtered : staff;
    const activeCount = rows.filter((m) => m.is_active).length;

    buildPdfReport({
      title: "Staff Report",
      subtitle: `POStore · ${rows.length} staff members · Generated ${new Date().toLocaleString()}`,
      filename: "staff-report",
      sections: [
        {
          type: "stats",
          items: [
            { label: "Total Staff", value: rows.length },
            { label: "Active", value: activeCount },
            { label: "Inactive", value: rows.length - activeCount },
          ],
        },
        {
          type: "table",
          title: "Staff Directory",
          head: ["Name", "Email", "Role", "Status", "Joined"],
          body: rows.map((m) => [m.name, m.email, m.role, m.is_active ? "Active" : "Inactive", m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"]),
        },
      ],
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Staff</h1>
        <div className="toolbar-actions">
          <ExportMenu onExportExcel={handleExportExcel} onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Staff</button>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">New Staff Member</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="staff">Staff</option>
                </select>
              </div>
              {error && <div className="form-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setError(""); }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Adding..." : "Add Staff"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search staff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <SortTh label="Name" sortKey="name" sort={sort} onSort={handleSort} />
            <SortTh label="Email" sortKey="email" sort={sort} onSort={handleSort} />
            <SortTh label="Role" sortKey="role" sort={sort} onSort={handleSort} />
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-3)" }}>
                {staff.length === 0 ? "No staff members yet." : "No staff match your filters."}
              </td>
            </tr>
          ) : paginated.map((member, i) => (
            <tr key={member.id}>
              <td className="row-number-cell">{(currentPage - 1) * pageSize + i + 1}</td>
              <td>
                <div className="staff-name">
                  <div className="staff-avatar">{member.name[0]}</div>
                  {member.name}
                </div>
              </td>
              <td>{member.email}</td>
              <td><span className={`badge ${member.role === "admin" ? "badge-blue" : "badge-gray"}`}>{member.role}</span></td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {member.is_active ? (
                    <>
                      <CheckCircleIcon size={18} style={{ color: "#10b981" }} />
                      <span style={{ color: "#10b981" }}>Active</span>
                    </>
                  ) : (
                    <>
                      <XCircleIcon size={18} style={{ color: "#ef4444" }} />
                      <span style={{ color: "#ef4444" }}>Inactive</span>
                    </>
                  )}
                </div>
              </td>
              <td>
                <button className="action-btn" onClick={() => handleToggle(member)}>
                  {member.is_active ? "Deactivate" : "Activate"}
                </button>
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
    </div>
  );
}
