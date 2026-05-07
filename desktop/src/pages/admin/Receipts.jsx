import React, { useState, useEffect } from "react";
import "./admin.css";

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem("postore-receipts") || "[]";
      setReceipts(JSON.parse(stored));
    } catch (error) {
      console.error("Error loading receipts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (receipt) => {
    const allStored = JSON.parse(localStorage.getItem("postore-receipts") || "[]");
    const updated = allStored.map((r) =>
      r.id === receipt.id
        ? { ...r, printed_at: new Date().toISOString() }
        : r
    );
    localStorage.setItem("postore-receipts", JSON.stringify(updated));
    setReceipts(updated);
    alert("Receipt marked as printed");
  };

  const handleEmail = (receipt, email) => {
    const allStored = JSON.parse(localStorage.getItem("postore-receipts") || "[]");
    const updated = allStored.map((r) =>
      r.id === receipt.id
        ? {
            ...r,
            email_sent_at: new Date().toISOString(),
            sent_to: email,
          }
        : r
    );
    localStorage.setItem("postore-receipts", JSON.stringify(updated));
    setReceipts(updated);
    alert("Receipt marked as emailed");
    setSelectedReceipt(null);
  };

  const handlePreview = (receipt) => {
    setSelectedReceipt(receipt);
    setShowPreview(true);
  };

  return (
    <div className="page-container">
      <h1>Receipt Management</h1>

      {loading ? (
        <p className="text-muted">Loading receipts...</p>
      ) : receipts.length === 0 ? (
        <p className="text-muted">No receipts found</p>
      ) : (
        <div className="receipts-grid">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="card">
              <div className="card-header">
                <h3>{receipt.receipt_number}</h3>
              </div>
              <div className="card-body">
                <div className="receipt-info">
                  <strong>Order:</strong> {receipt.order_id}
                </div>
                <div className="receipt-info">
                  <strong>Created:</strong>{" "}
                  {new Date(receipt.created_at).toLocaleString()}
                </div>
                <div className="receipt-status">
                  {receipt.printed_at && (
                    <span className="badge badge-success">✓ Printed</span>
                  )}
                  {receipt.email_sent_at && (
                    <span className="badge badge-info">✓ Emailed</span>
                  )}
                </div>
              </div>
              <div className="card-footer">
                <button
                  onClick={() => handlePreview(receipt)}
                  className="btn btn-secondary btn-sm"
                >
                  Preview
                </button>
                <button
                  onClick={() => handlePrint(receipt)}
                  className="btn btn-success btn-sm"
                >
                  Print
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedReceipt && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedReceipt.receipt_number}</h2>
              <button className="close-btn" onClick={() => setShowPreview(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="receipt-preview">
                <p className="text-muted">
                  Receipt content would be displayed here.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => handlePrint(selectedReceipt)}
                className="btn btn-success"
              >
                Print
              </button>
              <button
                onClick={() => {
                  const email = prompt("Enter customer email:");
                  if (email) {
                    handleEmail(selectedReceipt, email);
                  }
                }}
                className="btn btn-info"
              >
                Email
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
