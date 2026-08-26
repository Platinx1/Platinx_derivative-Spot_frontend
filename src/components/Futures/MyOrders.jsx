

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "../../context/UserContext";
import { toast } from "react-toastify";
// ─── APIs ───────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const OPEN_ORDERS_API_BASE = `${BASE_URL}/api/pi42/open-orders`;
const CANCEL_ORDER_API = `${BASE_URL}/api/pi42/delete-order`;
const EDIT_ORDER_API = `${BASE_URL}/api/pi42/edit-order`;

const MyOrders = ({ openOnly = true }) => {
  const { userId } = useUser();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Edit Form State
  const [editQuantity, setEditQuantity] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStopPrice, setEditStopPrice] = useState("");
  const [editing, setEditing] = useState(false);

  // ── Fetch Open Orders ─────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (isInitial = false) => {
    if (!userId) {
      setError("User ID not found");
      if (isInitial) setLoading(false);
      return;
    }

    if (isInitial) setLoading(true);

    try {
      const url = `${OPEN_ORDERS_API_BASE}?user=${userId}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.status && json.data) {
        const formatted = json.data.map((order) => ({
          ...order,
          order_id: order.id.toString(),
          created_time: new Date(order.time).getTime(),
        }));
        formatted.sort((a, b) => b.created_time - a.created_time);
        setOrders(formatted);
        setError(null);
      } else {
        setError(json.message || "No orders found");
      }
    } catch (err) {
      console.error("Orders fetch error:", err);
      setError("Failed to load orders");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [userId]);

  // ── Cancel Order ─────────────────────────────────────────────────────────
  const handleCancel = (order) => {
    setSelectedOrder(order);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!selectedOrder || !userId) return;

    try {
      const payload = {
        user: userId.toString(),
        clientOrderId: selectedOrder.clientOrderId,
      };

      const res = await fetch(CANCEL_ORDER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.status) {
        toast.success("Order cancelled successfully");
        fetchOrders();
      } else {
        toast.error(data.message || "Cancel failed");

      }
    } catch {
      alert("Network error");
    } finally {
      setShowCancelModal(false);
      setSelectedOrder(null);
    }
  };

  // ── Edit Order ───────────────────────────────────────────────────────────
  const handleEdit = (order) => {
    setSelectedOrder(order);
    setEditQuantity(order.orderAmount?.toString() || "");
    setEditPrice(order.price ? order.price.toString() : "");
    setEditStopPrice(order.stopPrice ? order.stopPrice.toString() : "");
    setShowEditModal(true);
  };

  const confirmEdit = async () => {
    if (!selectedOrder || !userId) return;
    setEditing(true);

    const payload = {
      user: userId.toString(),
      clientOrderId: selectedOrder.clientOrderId,
      type: selectedOrder.type,
      quantity: parseFloat(editQuantity),
    };

    if (selectedOrder.type === "LIMIT") {
      payload.price = parseFloat(editPrice);
    } else if (selectedOrder.type === "STOP_LIMIT") {
      payload.price = parseFloat(editPrice);
      payload.stopPrice = parseFloat(editStopPrice);
    } else if (selectedOrder.type === "STOP_MARKET") {
      payload.stopPrice = parseFloat(editStopPrice);
    }

    try {
      const res = await fetch(EDIT_ORDER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.status) {
        toast.success("Order updated successfully");
        setShowEditModal(false);
        fetchOrders();
      } else {
        toast.error(data.message || "Failed to update order");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setEditing(false);
    }
  };

  // Load orders when userId is available
  useEffect(() => {
    if (userId) {
      fetchOrders(true);
    }
  }, [userId, fetchOrders]);

  // Auto refresh every 5 seconds
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      fetchOrders(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [userId, fetchOrders]);

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#888", textAlign: "center" }}>
        Loading orders...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: "#ef4444", textAlign: "center" }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Mono','JetBrains Mono',monospace" }}>
      <div
        style={{
          background: "#131A28",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0px 10px 40px rgba(0,0,0,0.35)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                background: "linear- gradient(135deg, rgba(123, 47, 247, 0.18), rgba(168, 85, 247, 0.12))",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: 11,
                  color: "#C084FC",
                }}
              >
                Pair
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: 11,
                  color: "#C084FC",
                }}
              >
                Side
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: 11,
                  color: "#C084FC",
                }}
              >
                Type
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: 11,
                  color: "#C084FC",
                }}
              >
                Sub Type
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "right",
                  fontSize: 11,
                  color: "#C084FC",
                }}
              >
                Price
              </th>
              {/* <th
                style={{
                  padding: "12px 16px",
                  textAlign: "right",
                  fontSize: 11,
                  color: "#C084FC",
                }}
              >
                Stop Price
              </th> */}
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "right",
                  fontSize: 11,
                  color: "#C084FC",
                }}
              >
                Quantity
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "right",
                  fontSize: 11,
                  color: "#C084FC",
                }}
              >
                Filled
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "right",
                  fontSize: 11,
                  color: "#C084FC",
                }}
              >
                Locked Margin
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: 11,
                  color: "#C084FC",
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "right",
                  fontSize: 11,
                  color: "#C084FC",
                }}
              >
                Time
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "center",
                  fontSize: 11,
                  color: "#C084FC",
                }}
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan="12"
                  style={{ padding: 60, textAlign: "center", color: "#666" }}
                >
                  No open orders
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const time = new Date(order.time).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <tr
                    key={order.id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                      {order.symbol}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: order.side === "BUY" ? "#22c55e" : "#ef4444",
                        fontWeight: 700,
                      }}
                    >
                      {order.side}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#9ca3af" }}>
                      {order.type}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#9ca3af" }}>
                      {order.subType || order.sub_type || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      ₹{parseFloat(order.price || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: order.stopPrice ? "#f59e0b" : "inherit" }}>
                      {order.stopPrice ? `₹${parseFloat(order.stopPrice).toFixed(2)}` : "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {order.orderAmount}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {order.filledAmount}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      ₹{parseFloat(order.lockedMargin || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "20px",
                          background: "rgba(34,197,94,0.15)",
                          color: "#22C55E",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        OPEN
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        color: "#C084FC",
                        fontSize: 12,
                      }}
                    >
                      {time}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button
                        onClick={() => handleEdit(order)}
                        style={{
                          marginRight: 12,
                          color: "#fff",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Modify
                      </button>
                      <button
                        onClick={() => handleCancel(order)}
                        style={{
                          color: "#ef4444",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#0b0e17",
              borderRadius: 12,
              width: 380,
              padding: 24,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <h3 style={{ color: "#e5e7eb", marginBottom: 20 }}>Edit Order</h3>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: "#C084FC", fontSize: 12, marginBottom: 4 }}>
                Symbol
              </div>
              <div style={{ fontWeight: 600 }}>
                {selectedOrder.symbol} • {selectedOrder.side}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  color: "#C084FC",
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Quantity
              </label>
              <input
                type="text"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                style={{
                  width: "100%",
                  padding: 12,
                  background: "#111827",
                  border: "1px solid #374151",
                  borderRadius: 6,
                  color: "#e5e7eb",
                }}
              />
            </div>

            {(selectedOrder.type === "LIMIT" || selectedOrder.type === "STOP_LIMIT") && (
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    color: "#C084FC",
                    fontSize: 12,
                    marginBottom: 6,
                  }}
                >
                  Price
                </label>
                <input
                  type="text"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 12,
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: 6,
                    color: "#e5e7eb",
                  }}
                />
              </div>
            )}

            {(selectedOrder.type === "STOP_MARKET" || selectedOrder.type === "STOP_LIMIT") && (
              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: "block",
                    color: "#C084FC",
                    fontSize: 12,
                    marginBottom: 6,
                  }}
                >
                  Stop Price
                </label>
                <input
                  type="text"
                  value={editStopPrice}
                  onChange={(e) => setEditStopPrice(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 12,
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: 6,
                    color: "#e5e7eb",
                  }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 6,
                  background: "#7b2ff7",
                  color: "#e5e7eb",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmEdit}
                disabled={editing || !editQuantity}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 6,
                  background: "#7b2ff7",
                  color: "#e5e7eb",
                  fontWeight: 700,
                  border: "none",
                  cursor: editing ? "not-allowed" : "pointer",
                }}
              >
                {editing ? "Updating..." : "Update Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#0b0e17",
              padding: 24,
              borderRadius: 12,
              width: 320,
              textAlign: "center",
            }}
          >
            <h3 style={{ color: "#ef4444" }}>Cancel Order?</h3>
            <p style={{ color: "#9ca3af", margin: "16px 0" }}>
              {selectedOrder.side} {selectedOrder.symbol} @ ₹
              {selectedOrder.price}
              <br />
              Qty: {selectedOrder.orderAmount}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  background: "#1f2937",
                  borderRadius: 6,
                }}
              >
                No
              </button>
              <button
                onClick={confirmCancel}
                style={{
                  flex: 1,
                  padding: 12,
                  background: "#ef4444",
                  color: "white",
                  borderRadius: 6,
                }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;

