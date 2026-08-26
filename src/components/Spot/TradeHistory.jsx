import React, { useState, useEffect, useCallback } from "react";

const BASE_URL_API = import.meta.env.VITE_API_BASE_URL || "https://trade.platinx.exchange";

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

const TradeHistory = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dynamic User ID Resolution
  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);

      let userId = null;
      const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
      userId = authUser?.id || authUser?._id || authUser?.userId;

      if (!userId) {
        userId =
          localStorage.getItem("userId") ||
          localStorage.getItem("user_id") ||
          localStorage.getItem("id");
      }

      if (!userId) {
        userId = "1126"; // Default Fallback
      }

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${BASE_URL_API}/api/coinswitch/spot/trades?user=${userId}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const json = await res.json();

      if (json.status && Array.isArray(json.data)) {
        const formattedTrades = json.data.map((trade) => ({
          id: trade._id || trade.id || trade.tradeId,
          symbol: trade.symbol || "UNKNOWN/INR",
          side: trade.side?.toUpperCase() || "BUY",
          price: Number(trade.price || 0),
          quantity: Number(trade.quantity || trade.qty || 0),
          fee: Number(trade.fee || trade.commission || 0),
          realizedPnl: Number(trade.realizedPnl || 0),
          created_time: trade.createdAt || trade.createdTime || trade.time,
        }));

        setTrades(
          formattedTrades.sort(
            (a, b) => new Date(b.created_time) - new Date(a.created_time)
          )
        );
      } else {
        setTrades([]);
      }
    } catch (err) {
      console.error("Fetch trades error:", err);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  if (loading) {
    return (
      <div style={{ color: "#e5e7eb", padding: "40px", textAlign: "center" }}>
        Loading trade history...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Mono', 'JetBrains Mono', monospace" }}>
      <div
        style={{
          background: "#0b0e17",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.1)" }}>
              <th style={thStyleLeft}>Pair</th>
              <th style={thStyleLeft}>Side</th>
              <th style={thStyleRight}>Price</th>
              <th style={thStyleRight}>Executed Qty</th>
              <th style={thStyleRight}>Total (INR)</th>
              <th style={thStyleRight}>Fee</th>
              <th style={thStyleRight}>Realized PNL</th>
              <th style={thStyleRight}>Date & Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: "60px",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  No completed trades found
                </td>
              </tr>
            ) : (
              trades.map((trade) => {
                const isBuy = trade.side === "BUY";
                const total = (trade.price * trade.quantity).toFixed(2);

                return (
                  <tr
                    key={trade.id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <CoinIcon symbol={trade.symbol} />
                        <span style={{ fontWeight: 600 }}>{trade.symbol}</span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: isBuy ? "#22c55e" : "#ef4444",
                        fontWeight: 700,
                      }}
                    >
                      {trade.side}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      ₹{trade.price}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {trade.quantity}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      ₹{total}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        color: "#9ca3af",
                      }}
                    >
                      ₹{trade.fee.toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        color: trade.realizedPnl > 0 ? "#22c55e" : trade.realizedPnl < 0 ? "#ef4444" : "#c4cbd9",
                      }}
                    >
                      ₹{trade.realizedPnl.toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      {trade.created_time
                        ? new Date(trade.created_time).toLocaleString("en-IN")
                        : "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const thStyleLeft = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: 12,
  color: "#9ca3af",
};

const thStyleRight = {
  padding: "12px 16px",
  textAlign: "right",
  fontSize: 12,
  color: "#9ca3af",
};

export default TradeHistory;