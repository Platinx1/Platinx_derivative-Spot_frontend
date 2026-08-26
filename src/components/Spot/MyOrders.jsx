import React, { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useUser } from "../../context/UserContext"; // UserContext Import
import { useTradingContext } from "../../context/TradingContext";

const BASE_URL_API = import.meta.env.VITE_API_BASE_URL || "https://trade.platinx.exchange";
const BASE_URL_SOCKET = "wss://ws.coinswitch.co";
const NAMESPACE = "/coinswitchx";
const EVENT_NAME = "FETCH_TRADES_CS_PRO";

const getCoinIcon = (symbol) => {
  const base = symbol?.split("/")[0]?.toLowerCase() || "unknown";
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${base}.png`;
};

const CoinIcon = ({ symbol }) => {
  const [err, setErr] = useState(false);
  const base = symbol?.split("/")[0] || "";

  if (!err) {
    return (
      <img
        src={getCoinIcon(symbol)}
        alt={base}
        onError={() => setErr(true)}
        style={{ width: 20, height: 20, borderRadius: "50%" }}
      />
    );
  }

  const colors = ["#f97316", "#3b82f6", "#22c55e", "#eab308"];
  const bg = colors[base.charCodeAt(0) % colors.length];
  return (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: bg,
        fontSize: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
      }}
    >
      {base.slice(0, 2)}
    </div>
  );
};

const MyOrders = ({ openOnly = true, refreshOrders }) => {
  const { userId } = useUser(); // Futures pattern
  const { ordersRefresh } = useTradingContext();
  const socketRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // ── Fetch Orders ────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (isInitial = false) => {
    if (!userId) {
      setError("User ID not found");
      if (isInitial) setLoading(false);
      return;
    }

    if (isInitial) setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const apiUrl = `${BASE_URL_API}/api/coinswitch/spot/orders?user=${userId}`;
      const res = await fetch(apiUrl, { headers });
      const json = await res.json();

      if ((json.status || json.success) && Array.isArray(json.data)) {
        const formattedOrders = json.data
          .map((order) => {
            const id = String(order.order_id || order.orderId || order._id || order.id || "");
            const statusStr = (order.status || "OPEN").toUpperCase();
            return {
              ...order,
              order_id: id,
              orig_qty: Number(order.orig_qty || order.quantity || order.openOrderQty || 0),
              executed_qty: Number(order.executed_qty || order.executedQty || 0),
              symbol: order.symbol || "UNKNOWN/INR",
              side: (order.side || "BUY").toUpperCase(),
              type: (order.type || "LIMIT").toUpperCase(),
              price: Number(order.price || 0),
              created_time: order.created_time || order.createdAt || order.createdTime,
              status: statusStr,
            };
          })
          .filter((o) => o.status !== "CANCELLED" && o.status !== "CANCELED");

        setOrders(
          formattedOrders.sort(
            (a, b) => new Date(b.created_time) - new Date(a.created_time)
          )
        );
        setError(null);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Fetch spot orders error:", err);
      setError("Failed to load orders");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [userId]);

  // ── Initial Load & Auto Refresh ────────────────────────────────────────
  useEffect(() => {
    if (userId) {
      fetchOrders(true);
    }
  }, [userId, fetchOrders, ordersRefresh, refreshOrders]);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      fetchOrders(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [userId, fetchOrders]);

  // ── Cancel Order ───────────────────────────────────────────────────────
  const handleCancelClick = (order) => {
    setSelectedOrder(order);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!selectedOrder || !userId) return;

    setCancelling(true);
    const targetId = selectedOrder.order_id;

    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(
        `${BASE_URL_API}/api/coinswitch/spot/orders/${targetId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      const result = await response.json();

      if (response.ok || result.success === true || result.status === true) {
        toast.success(result.message || "Order cancelled successfully");
        setOrders((prev) => prev.filter((o) => o.order_id !== targetId));
        fetchOrders(false);
      } else {
        toast.error(result.message || "Failed to cancel order");
      }
    } catch (err) {
      console.error("Cancel error:", err);
      toast.error("Network error while cancelling order");
    } finally {
      setCancelling(false);
      setShowCancelModal(false);
      setSelectedOrder(null);
    }
  };

  // ── Socket Connection ──────────────────────────────────────────────────
  useEffect(() => {
    if (!orders.length) return;

    const activePairs = [
      ...new Set(orders.map((o) => o.symbol.replace("/", ","))),
    ];

    const socket = io(BASE_URL_SOCKET + NAMESPACE, {
      path: "/pro/realtime-rates-socket/spot/coinswitchx",
      transports: ["websocket"],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      activePairs.forEach((pair) =>
        socket.emit(EVENT_NAME, { event: "subscribe", pair })
      );
    });

    return () => socket.disconnect();
  }, [orders.length]);

  if (loading) {
    return (
      <div style={{ padding: 40, color: "#888", textAlign: "center" }}>
        Loading orders...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, color: "#ef4444", textAlign: "center" }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Mono', 'JetBrains Mono', monospace" }}>
      <div
        style={{
          background: "#131A28",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0px 10px 40px rgba(0,0,0,0.35)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                background: "linear-gradient(135deg, rgba(123, 47, 247, 0.18), rgba(168, 85, 247, 0.12))",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: "#C084FC" }}>Pair</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: "#C084FC" }}>Side</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: "#C084FC" }}>Type</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, color: "#C084FC" }}>Amount</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, color: "#C084FC" }}>Price</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, color: "#C084FC" }}>Total</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: "#C084FC" }}>Status</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 11, color: "#C084FC" }}>Filled</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, color: "#C084FC" }}>Time</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 11, color: "#C084FC" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ padding: 60, textAlign: "center", color: "#666" }}>
                  No open orders
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const isBuy = order.side === "BUY";
                const totalVal = (order.price * order.orig_qty).toFixed(2);
                const filledPercent =
                  order.orig_qty > 0
                    ? ((order.executed_qty / order.orig_qty) * 100).toFixed(1)
                    : "0.0";

                return (
                  <tr key={order.order_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <CoinIcon symbol={order.symbol} />
                        <span style={{ fontWeight: 600 }}>{order.symbol}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: isBuy ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                      {order.side}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#9ca3af" }}>{order.type}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>{order.orig_qty}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>₹{order.price}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>₹{totalVal}</td>
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
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>{filledPercent}%</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 12, color: "#C084FC" }}>
                      {new Date(order.created_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button
                        onClick={() => handleCancelClick(order)}
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

      {/* Cancel Modal */}
      {showCancelModal && selectedOrder && (
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
              padding: 24,
              borderRadius: 12,
              width: 320,
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <h3 style={{ color: "#ef4444", marginBottom: 8 }}>Cancel Order?</h3>
            <p style={{ color: "#9ca3af", margin: "16px 0" }}>
              {selectedOrder.side} {selectedOrder.symbol} @ ₹{selectedOrder.price}
              <br />
              Qty: {selectedOrder.orig_qty}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                style={{
                  flex: 1,
                  padding: 12,
                  background: "#1f2937",
                  color: "#e5e7eb",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                No
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelling}
                style={{
                  flex: 1,
                  padding: 12,
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: cancelling ? "not-allowed" : "pointer",
                  opacity: cancelling ? 0.6 : 1,
                }}
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;