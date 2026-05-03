import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { CheckCircleIcon, XCircleIcon } from "../../components/Icons";

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Staff</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Staff</button>
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

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id}>
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
    </div>
  );
}
