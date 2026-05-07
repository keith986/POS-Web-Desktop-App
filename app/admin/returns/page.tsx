"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "@/app/_lib/StoreContext";

interface Return {
  id: string;
  return_number: string;
  order_number: string;
  product_name: string;
  quantity: number;
  reason: string;
  condition: "unopened" | "opened" | "damaged" | "defective";
  refund_amount: number;
  refund_method: "full" | "partial" | "exchange";
  status: "pending" | "approved" | "rejected" | "refunded" | "exchanged";
  approved_by?: string;
  approved_at?: string;
  refunded_at?: string;
  notes?: string;
  created_at: string;
}

const CONDITION_OPTIONS = ["unopened", "opened", "damaged", "defective"];
const STATUS_OPTIONS = ["pending", "approved", "rejected", "refunded", "exchanged"];
const REFUND_METHODS = ["full", "partial", "exchange"];

export default function ReturnsPage() {
  const { user } = useStore();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const admin_id = user?.id || "";

  useEffect(() => {
    fetchReturns();
  }, [admin_id, filterStatus]);

  const fetchReturns = async () => {
    if (!admin_id) return;
    try {
      setLoading(true);
      let url = `/api/returns?admin_id=${admin_id}`;
      if (filterStatus !== "all") {
        url += `&status=${filterStatus}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setReturns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching returns:", error);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (returnId: string, newStatus: string, approvedBy?: string) => {
    try {
      const res = await fetch(`/api/returns?id=${returnId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          approved_by: approvedBy || user?.full_name || "Admin",
        }),
      });

      if (res.ok) {
        setSelectedReturn(null);
        fetchReturns();
      }
    } catch (error) {
      console.error("Error updating return status:", error);
    }
  };

  const handleDeleteReturn = async (returnId: string) => {
    if (!confirm("Delete this return record?")) return;

    try {
      const res = await fetch(`/api/returns?id=${returnId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchReturns();
        setSelectedReturn(null);
      }
    } catch (error) {
      console.error("Error deleting return:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "refunded":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "exchanged":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Returns & Refunds</h1>

      <div className="mb-6 flex gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded"
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
        <p className="text-gray-500">Loading returns...</p>
      ) : returns.length === 0 ? (
        <p className="text-gray-500">No returns found</p>
      ) : (
        <div className="grid gap-4">
          {returns.map((ret) => (
            <div key={ret.id} className="bg-white p-4 rounded border border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-lg">{ret.return_number}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(ret.status)}`}>
                      {ret.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                    <div>
                      <span className="font-semibold">Order:</span> {ret.order_number}
                    </div>
                    <div>
                      <span className="font-semibold">Product:</span> {ret.product_name}
                    </div>
                    <div>
                      <span className="font-semibold">Qty:</span> {ret.quantity}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                    <div>
                      <span className="font-semibold">Reason:</span> {ret.reason}
                    </div>
                    <div>
                      <span className="font-semibold">Condition:</span> {ret.condition}
                    </div>
                    <div>
                      <span className="font-semibold">Refund Method:</span> {ret.refund_method}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Refund Amount:</span> ${ret.refund_amount.toFixed(2)}
                  </div>
                  {ret.notes && <p className="text-sm text-gray-600 mt-2">Notes: {ret.notes}</p>}
                  <div className="text-xs text-gray-500 mt-2">
                    Created: {new Date(ret.created_at).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReturn(ret)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">{selectedReturn.return_number}</h2>

            <div className="space-y-3 mb-6">
              <div>
                <span className="font-semibold">Order:</span> {selectedReturn.order_number}
              </div>
              <div>
                <span className="font-semibold">Product:</span> {selectedReturn.product_name}
              </div>
              <div>
                <span className="font-semibold">Quantity:</span> {selectedReturn.quantity}
              </div>
              <div>
                <span className="font-semibold">Reason:</span> {selectedReturn.reason}
              </div>
              <div>
                <span className="font-semibold">Condition:</span> {selectedReturn.condition}
              </div>
              <div>
                <span className="font-semibold">Refund Amount:</span> ${selectedReturn.refund_amount.toFixed(2)}
              </div>
              <div>
                <span className="font-semibold">Refund Method:</span> {selectedReturn.refund_method}
              </div>
              {selectedReturn.notes && (
                <div>
                  <span className="font-semibold">Notes:</span> {selectedReturn.notes}
                </div>
              )}
            </div>

            {selectedReturn.status === "pending" && (
              <div className="space-y-2 mb-6">
                <button
                  onClick={() => handleUpdateStatus(selectedReturn.id, "approved")}
                  className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Approve Return
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedReturn.id, "rejected")}
                  className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Reject Return
                </button>
              </div>
            )}

            {selectedReturn.status === "approved" && (
              <div className="mb-6">
                <button
                  onClick={() => handleUpdateStatus(selectedReturn.id, "refunded")}
                  className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Mark as Refunded
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteReturn(selectedReturn.id)}
                className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedReturn(null)}
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
