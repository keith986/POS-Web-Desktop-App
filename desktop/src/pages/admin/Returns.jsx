import React, { useState, useEffect, useCallback } from "react";
import "./admin.css";

const STATUS_OPTIONS = ["pending", "approved", "rejected", "refunded", "exchanged"];

export default function Returns() {
  const [returns, setReturns] = useState([]);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadReturns = useCallback(() => {
    try {
      setLoading(true);
      const stored = localStorage.getItem("postore-returns") || "[]";
      let allReturns = JSON.parse(stored);
      
      if (filterStatus !== "all") {
        allReturns = allReturns.filter((r) => r.status === filterStatus);
      }
      
      setReturns(allReturns);
    } catch (error) {
      console.error("Error loading returns:", error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  /*
  const loadReturns = () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem("postore-returns") || "[]";
      let allReturns = JSON.parse(stored);
      
      if (filterStatus !== "all") {
        allReturns = allReturns.filter((r) => r.status === filterStatus);
      }
      
      setReturns(allReturns);
    } catch (error) {
      console.error("Error loading returns:", error);
    } finally {
      setLoading(false);
    }
  };
  */

  const handleUpdateStatus = (returnId, newStatus, approvedBy = "Local Admin") => {
    const updated = returns.map((r) =>
      r.id === returnId
        ? {
            ...r,
            status: newStatus,
            approved_by: approvedBy,
            approved_at: new Date().toISOString(),
            refunded_at: newStatus === "refunded" ? new Date().toISOString() : r.refunded_at,
          }
        : r
    );
    
    setReturns(updated);
    const allStored = JSON.parse(localStorage.getItem("postore-returns") || "[]");
    const allUpdated = allStored.map((r) =>
      r.id === returnId ? updated.find((u) => u.id === returnId) : r
    );
    localStorage.setItem("postore-returns", JSON.stringify(allUpdated));
    setSelectedReturn(null);
  };

  const handleDeleteReturn = (returnId) => {
    if (!window.confirm("Delete this return record?")) return;

    const allStored = JSON.parse(localStorage.getItem("postore-returns") || "[]");
    const updated = allStored.filter((r) => r.id !== returnId);
    localStorage.setItem("postore-returns", JSON.stringify(updated));
    loadReturns();
    setSelectedReturn(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
      case "refunded":
        return "badge-success";
      case "pending":
        return "badge-warning";
      case "rejected":
        return "badge-error";
      case "exchanged":
        return "badge-info";
      default:
        return "badge-default";
    }
  };

  return (
    <div className="page-container">
      <h1>Returns & Refunds</h1>

      <div className="filter-bar">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input"
        >
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-muted">Loading returns...</p>
      ) : returns.length === 0 ? (
        <p className="text-muted">No returns found</p>
      ) : (
        <div className="returns-grid">
          {returns.map((ret) => (
            <div key={ret.id} className="card clickable" onClick={() => setSelectedReturn(ret)}>
              <div className="card-header">
                <h3>{ret.return_number}</h3>
                <span className={`badge ${getStatusColor(ret.status)}`}>
                  {ret.status.toUpperCase()}
                </span>
              </div>
              <div className="card-body">
                <div className="return-info">
                  <strong>Order:</strong> {ret.order_number}
                </div>
                <div className="return-info">
                  <strong>Product:</strong> {ret.product_name}
                </div>
                <div className="return-info">
                  <strong>Qty:</strong> {ret.quantity}
                </div>
                <div className="return-info">
                  <strong>Refund:</strong> ${ret.refund_amount.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {selectedReturn && (
        <div className="modal-overlay" onClick={() => setSelectedReturn(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedReturn.return_number}</h2>
              <button className="close-btn" onClick={() => setSelectedReturn(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-row">
                <span className="label">Order:</span> {selectedReturn.order_number}
              </div>
              <div className="detail-row">
                <span className="label">Product:</span> {selectedReturn.product_name}
              </div>
              <div className="detail-row">
                <span className="label">Quantity:</span> {selectedReturn.quantity}
              </div>
              <div className="detail-row">
                <span className="label">Reason:</span> {selectedReturn.reason}
              </div>
              <div className="detail-row">
                <span className="label">Condition:</span> {selectedReturn.condition}
              </div>
              <div className="detail-row">
                <span className="label">Refund Amount:</span> ${selectedReturn.refund_amount.toFixed(2)}
              </div>
              <div className="detail-row">
                <span className="label">Refund Method:</span> {selectedReturn.refund_method}
              </div>
              <div className="detail-row">
                <span className="label">Status:</span>{" "}
                <span className={`badge ${getStatusColor(selectedReturn.status)}`}>
                  {selectedReturn.status.toUpperCase()}
                </span>
              </div>
              {selectedReturn.notes && (
                <div className="detail-row">
                  <span className="label">Notes:</span> {selectedReturn.notes}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedReturn.status === "pending" && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedReturn.id, "approved")}
                    className="btn btn-success"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedReturn.id, "rejected")}
                    className="btn btn-danger"
                  >
                    Reject
                  </button>
                </>
              )}

              {selectedReturn.status === "approved" && (
                <button
                  onClick={() => handleUpdateStatus(selectedReturn.id, "refunded")}
                  className="btn btn-success"
                >
                  Mark as Refunded
                </button>
              )}

              <button
                onClick={() => handleDeleteReturn(selectedReturn.id)}
                className="btn btn-error"
              >
                Delete
              </button>

              <button onClick={() => setSelectedReturn(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
