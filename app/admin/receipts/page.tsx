"use client";

import React, { useState, useEffect } from "react";

interface Receipt {
  id: string;
  order_id: string;
  receipt_number: string;
  printed_at?: string;
  email_sent_at?: string;
  sent_to?: string;
  created_at: string;
}

function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}


export default function ReceiptsPage() {
  const [adminUser] = useState(() => getStoredUser());
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [receiptHTML, setReceiptHTML] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);

  const admin_id = adminUser?.id || "";

  useEffect(() => {
    if (admin_id) {
      fetchReceipts();
    }
  }, [admin_id]);

  const fetchReceipts = async () => {
    if (!admin_id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/receipts?admin_id=${admin_id}`);
      const data = await res.json();
      setReceipts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (receipt: Receipt) => {
    try {
      const res = await fetch(`/api/receipts?id=${receipt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "print" }),
      });

      if (res.ok) {
        alert("Receipt marked as printed");
        fetchReceipts();
      }
    } catch (error) {
      console.error("Error printing receipt:", error);
    }
  };

  const handleEmail = async (receipt: Receipt, email: string) => {
    try {
      const res = await fetch(`/api/receipts?id=${receipt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "email", sent_to: email }),
      });

      if (res.ok) {
        alert("Receipt marked as emailed");
        fetchReceipts();
        setSelectedReceipt(null);
      }
    } catch (error) {
      console.error("Error emailing receipt:", error);
    }
  };

  const handlePreview = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowPreview(true);
    // In a real app, you'd fetch the receipt HTML from the database
    // For now, we'll just show it's loaded
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Receipt Management</h1>

      {loading ? (
        <p className="text-gray-500">Loading receipts...</p>
      ) : receipts.length === 0 ? (
        <p className="text-gray-500">No receipts found</p>
      ) : (
        <div className="grid gap-4">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="bg-white p-4 rounded border border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{receipt.receipt_number}</h3>
                  <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                    <div>
                      <span className="font-semibold">Order:</span> {receipt.order_id}
                    </div>
                    <div>
                      <span className="font-semibold">Created:</span>{" "}
                      {new Date(receipt.created_at).toLocaleString()}
                    </div>
                    <div>
                      {receipt.printed_at && (
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          ✓ Printed
                        </span>
                      )}
                      {receipt.email_sent_at && (
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded ml-2">
                          ✓ Emailed to {receipt.sent_to}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePreview(receipt)}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handlePrint(receipt)}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                  >
                    Print
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedReceipt.receipt_number}</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded mb-6 border border-gray-200">
              <p className="text-sm text-gray-600">
                Receipt preview would be displayed here. The HTML content is stored in the database.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handlePrint(selectedReceipt)}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
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
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Email
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
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
