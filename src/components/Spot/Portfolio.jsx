import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { useTradingContext } from "../../context/TradingContext";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const BASE_URL_API = import.meta.env.VITE_API_BASE_URL;
const PORTFOLIO_API_URL = `${BASE_URL_API}/api/spot/portfolio`;
const PLACE_ORDER_API_URL = `${BASE_URL_API}/api/spot/order`;

const BASE_URL = "wss://ws.coinswitch.co";
const NAMESPACE = "/coinswitchx";
const EVENT_NAME = "FETCH_TRADES_CS_PRO";

// ── Coin Icon Component ──────────────────────────────────────────────────────
const getCoinIcon = (symbol) => {
  const base = (symbol || "").split("/")[0].toLowerCase();
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${base}.png`;
};

const CoinIcon = ({ symbol }) => {
  const [err, setErr] = useState(false);
  const base = (symbol || "").split("/")[0] || "CR";

  if (!err) {
    return (
      <img
        src={getCoinIcon(symbol)}
        alt={base}
        onError={() => setErr(true)}
        style={{ width: 24, height: 24, borderRadius: "50%" }}
      />
    );
  }

  const colors = ["#f97316", "#3b82f6", "#22c55e", "#eab308"];
  const bg = colors[base.charCodeAt(0) % colors.length];

  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: bg,
        fontSize: 9,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
      }}
    >
      {base.slice(0, 2).toUpperCase()}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const Portfolio = () => {
  const socketRef = useRef(null);
  const [portfolioData, setPortfolioData] = useState(null);
  const [tickerPrices, setTickerPrices] = useState({});
  const { selectedPair, selectedPrice, refreshWallet, ordersRefresh, walletRefresh } = useTradingContext();
  const exchange = selectedPair?.exchange || "coinswitchx";

  const userId = localStorage.getItem("user_id") || "1128";
  const token = localStorage.getItem("token");

  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [sellPrice, setSellPrice] = useState("");
  const [sellQty, setSellQty] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selectedPrice from context for active pair
  useEffect(() => {
    if (selectedPair?.symbol && selectedPrice != null && selectedPrice !== "" && !isNaN(Number(selectedPrice))) {
      setTickerPrices((prev) => ({
        ...prev,
        [selectedPair.symbol]: parseFloat(selectedPrice),
      }));
    }
  }, [selectedPair?.symbol, selectedPrice]);

  // Fetch Portfolio API
  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch(`${PORTFOLIO_API_URL}?user=${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (json && json.status) {
        setPortfolioData(json);
      }
    } catch (e) {
      console.error("Portfolio Fetch Error:", e);
    }
  }, [userId, token]);

  // Trigger portfolio reload on mount, order placement, or wallet refresh
  useEffect(() => {
    fetchPortfolio();

    const t1 = setTimeout(() => fetchPortfolio(), 600);
    const t2 = setTimeout(() => fetchPortfolio(), 1500);
    const t3 = setTimeout(() => fetchPortfolio(), 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [fetchPortfolio, ordersRefresh, walletRefresh]);

  // Periodic polling every 5 seconds for live portfolio updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPortfolio();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchPortfolio]);

  // Seed prices from REST ticker (both /all and /single)
  useEffect(() => {
    if (!portfolioData?.data?.length) return;

    let cancelled = false;

    const seedPrices = async () => {
      try {
        let priceMap = {};
        // 1. Try ticker/all first
        const allRes = await fetch(`${BASE_URL_API}/api/spot/ticker/all`).catch(() => null);
        const allJson = allRes ? await allRes.json().catch(() => null) : null;
        if (allJson?.success && allJson?.data?.data) {
          const raw = allJson.data.data;
          Object.values(raw).forEach((item) => {
            if (item?.symbol && (item.lastPrice || item.price)) {
              priceMap[item.symbol] = parseFloat(item.lastPrice || item.price);
            }
          });
        }

        // 2. Fetch single ticker for any portfolio coin missing in ticker/all
        await Promise.all(
          portfolioData.data.map(async (d) => {
            const symbol = d.symbol || "";
            if (!symbol || priceMap[symbol] !== undefined) return;
            try {
              const res = await fetch(
                `${BASE_URL_API}/api/spot/ticker/single?symbol=${encodeURIComponent(
                  symbol
                )}&exchange=${exchange}`
              );
              const json = await res.json().catch(() => null);
              let last = null;
              if (json?.data) {
                if (json.data[symbol]?.lastPrice) last = json.data[symbol].lastPrice;
                else if (json.data.data?.[exchange]?.lastPrice) last = json.data.data[exchange].lastPrice;
                else if (json.data.data?.[symbol]?.lastPrice) last = json.data.data[symbol].lastPrice;
                else if (json.data.lastPrice) last = json.data.lastPrice;
                else if (typeof json.data === "object") {
                  const val = Object.values(json.data)[0];
                  last = val?.lastPrice || val?.price || (typeof val === "number" ? val : null);
                }
              }
              if (last != null && !isNaN(Number(last))) {
                priceMap[symbol] = parseFloat(last);
              }
            } catch (e) {
              console.error("Ticker seed error for", symbol, e);
            }
          })
        );

        if (cancelled) return;

        if (Object.keys(priceMap).length > 0) {
          setTickerPrices((prev) => ({
            ...prev,
            ...priceMap,
          }));
        }
      } catch (err) {
        console.error("Failed to seed prices in Portfolio:", err);
      }
    };

    seedPrices();

    const intervalId = setInterval(() => {
      seedPrices();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [portfolioData?.data, exchange]);

  // Connect WebSocket for real-time trade price updates for portfolio coins
  useEffect(() => {
    if (!portfolioData?.data?.length) return;

    const socket = io("wss://ws.coinswitch.co/coinswitchx", {
      path: "/pro/realtime-rates-socket/spot/coinswitchx",
      transports: ["websocket"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      portfolioData.data.forEach((item) => {
        const symbol = item.symbol || "";
        if (symbol) {
          const pair = symbol.replace("/", ",");
          socket.emit("FETCH_TRADES_CS_PRO", { event: "subscribe", pair });
        }
      });
    });

    socket.on("FETCH_TRADES_CS_PRO", (data) => {
      if (data?.s && data?.p) {
        const symbol = data.s.replace(",", "/");
        const cleanSym = symbol.toUpperCase();
        setTickerPrices((prev) => ({
          ...prev,
          [symbol]: parseFloat(data.p),
          [cleanSym]: parseFloat(data.p),
        }));
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [portfolioData?.data]);

  // Parse holdings with dynamic live current price calculations
  const HOLDINGS = useMemo(() => {
    if (!portfolioData?.data || !Array.isArray(portfolioData.data)) return [];

    return portfolioData.data.map((d) => {
      const symbol = d.symbol || "";
      const availableBal = parseFloat(
        d.main_balance || d.availableBalance || d.totalQuantity || 0
      );
      const lockedBal = parseFloat(
        d.blocked_balance_order || d.lockedBalance || 0
      );
      const totalHolding = parseFloat(
        d.totalQuantity || availableBal + lockedBal
      );

      const avgBuyPrice = parseFloat(d.averageBuyPrice || 0);
      const investedValue = parseFloat(d.totalInvested) || totalHolding * avgBuyPrice;

      const hasLivePrice = tickerPrices[symbol] !== undefined;
      const currentPrice = hasLivePrice ? tickerPrices[symbol] : null;
      const currentValue = totalHolding * currentPrice;

      let gainLoss = currentValue - investedValue;
      if (!hasLivePrice || Math.abs(gainLoss) < 0.009) {
        gainLoss = 0;
      }

      const gainLossPercent =
        investedValue > 0 ? ((gainLoss / investedValue) * 100).toFixed(2) : "0.00";

      return {
        pair: symbol,
        availableBal,
        lockedBal,
        totalHolding,
        avgBuyPrice,
        currentPrice,
        hasLivePrice,
        investedValue,
        currentValue,
        gainLoss,
        gainLossPercent,
        minQty: d.minQty || d.min_quantity || d.minNotional || d.minOrderQty || null,
      };
    });
  }, [portfolioData, tickerPrices]);

  if (!portfolioData) {
    return <div style={{ color: "#fff", padding: 20 }}>Loading...</div>;
  }

  // ── Place Sell Order Handler ────────────────────────────────────────────────
  const placeSellOrder = async () => {
    if (!sellPrice || Number(sellPrice) <= 0) {
      alert("Please enter a valid price");
      return;
    }
    if (!sellQty || Number(sellQty) <= 0) {
      alert("Please enter a valid quantity");
      return;
    }
    const maxAllowed = Math.max(
      Number(selectedCoin?.availableBal || 0),
      Number(selectedCoin?.totalHolding || 0)
    );
    if (Number(sellQty) > maxAllowed) {
      alert("Quantity exceeds available balance");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        user: userId,
        side: "sell",
        symbol: selectedCoin.pair,
        type: "limit",
        price: Number(sellPrice),
        quantity: Number(sellQty),
        exchange: exchange,
      };

      const res = await fetch(PLACE_ORDER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && (data.status || data.success)) {
        toast.success("Sell Order Placed Successfully");
        setShowSellModal(false);
        if (typeof refreshWallet === "function") refreshWallet();
        fetchPortfolio();
        setTimeout(() => fetchPortfolio(), 800);
        setTimeout(() => fetchPortfolio(), 2000);
      } else {
        toast.error(data.message || "Failed to place sell order");
      }
    } catch (err) {
      console.error("Sell Order Error:", err);
      toast.error("Something went wrong while placing order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Portfolio Totals
  const totalInvested = HOLDINGS.reduce((sum, item) => sum + item.investedValue, 0);
  const totalCurrent = HOLDINGS.reduce((sum, item) => sum + item.currentValue, 0);
  let totalGainLoss = totalCurrent - totalInvested;
  if (Math.abs(totalGainLoss) < 0.009) totalGainLoss = 0;

  const totalGainLossPercent =
    totalInvested > 0 ? ((totalGainLoss / totalInvested) * 100).toFixed(2) : "0.00";
  const isOverallNegative = totalGainLoss < 0;

  return (
    <div
      style={{
        fontFamily: "'DM Mono','JetBrains Mono',monospace",
        color: "#e5e7eb",
      }}
    >
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Left Stats Card */}
        <div
          style={{
            width: 200,
            background: "#0b0e17",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            padding: "20px",
            flexShrink: 0,
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
              Current Value
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#e5e7eb" }}>
              ₹{totalCurrent.toFixed(2)}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
              Invested Value
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#e5e7eb" }}>
              ₹{totalInvested.toFixed(2)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
              Gain/Loss
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: isOverallNegative ? "#ef4444" : "#22c55e",
                display: "flex",
                alignItems: "baseline",
                gap: 4,
              }}
            >
              {isOverallNegative ? "▼" : "▲"} ₹
              {Math.abs(totalGainLoss).toFixed(2)}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: isOverallNegative ? "#ef4444" : "#22c55e",
                marginTop: 4,
              }}
            >
              {isOverallNegative ? "▼" : "▲"} {Math.abs(totalGainLossPercent)}%
            </div>
          </div>
        </div>

        {/* Right Table */}
        <div
          style={{
            flex: 1,
            background: "#0b0e17",
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: "#080b12",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <th style={thStyle}>Pair</th>
                <th style={thStyle}>Average Buy Price</th>
                <th style={thStyle}>Market Price</th>
                <th style={thStyle}>Total Quantity</th>
                <th style={thStyle}>Invested Value</th>
                <th style={thStyle}>Current Value</th>
                <th style={thStyle}>Gain/Loss</th>
                <th style={thStyle}>Gain/Loss %</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {HOLDINGS.map((h, i) => {
                const isNeg = h.gainLoss < 0;
                return (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <CoinIcon symbol={h.pair} />
                        <span
                          style={{
                            fontSize: 13,
                            color: "#e5e7eb",
                            fontWeight: 600,
                          }}
                        >
                          {h.pair}
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}>₹{Number(h.avgBuyPrice || 0).toFixed(2)}</td>
                    <td style={{ ...tdStyle, color: "#3b82f6", fontWeight: 700 }}>
                      {h.currentPrice !== null
                        ? `₹${Number(h.currentPrice).toFixed(2)}`
                        : "--"}
                    </td>
                    <td style={tdStyle}>{h.totalHolding}</td>
                    <td style={tdStyle}>₹{h.investedValue.toFixed(2)}</td>
                    <td style={tdStyle}>₹{h.currentValue.toFixed(2)}</td>
                    <td
                      style={{
                        ...tdStyle,
                        color: isNeg ? "#ef4444" : "#22c55e",
                        fontWeight: 700,
                      }}
                    >
                      ₹{h.gainLoss.toFixed(2)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: isNeg ? "#ef4444" : "#22c55e",
                        fontWeight: 700,
                      }}
                    >
                      {h.gainLossPercent}%
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => {
                          setSelectedCoin(h);
                          const currentMktPrice =
                            tickerPrices[h.pair] || h.currentPrice || h.avgBuyPrice;
                          setSellPrice(currentMktPrice ? String(currentMktPrice) : "");
                          const qty = h.totalHolding || h.availableBal || 0;
                          setSellQty(qty ? String(qty) : "");
                          setShowSellModal(true);
                        }}
                        style={{
                          padding: "6px 14px",
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Sell
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Sell Modal */}
          {showSellModal && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,.6)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
              }}
            >
              <div
                style={{
                  width: 400,
                  background: "#111827",
                  padding: 25,
                  borderRadius: 10,
                  color: "#fff",
                }}
              >
                <div
                  style={{
                    marginBottom: 15,
                    padding: "10px 12px",
                    background: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: 6,
                  }}
                >
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    Current Market Price
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 20,
                      fontWeight: "bold",
                      color: "#22c55e",
                    }}
                  >
                    ₹
                    {(
                      tickerPrices[selectedCoin?.pair] ||
                      selectedCoin?.currentPrice ||
                      0
                    ).toFixed(2)}
                  </div>
                </div>
                <h3>Sell {selectedCoin?.pair}</h3>

                <div style={{ marginTop: 20 }}>
                  <label style={{ fontSize: 12, color: "#9ca3af" }}>Price (INR)</label>
                  <input
                    type="number"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 10,
                      marginTop: 6,
                      marginBottom: 15,
                      borderRadius: 6,
                      border: "1px solid #374151",
                      background: "#0b0e17",
                      color: "#fff",
                      outline: "none",
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <label style={{ fontSize: 12, color: "#9ca3af" }}>Quantity</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {selectedCoin?.minQty && (
                        <span style={{ fontSize: 11, color: "#6b7280" }}>
                          Min: {selectedCoin.minQty}
                        </span>
                      )}
                      <button
                        onClick={() =>
                          setSellQty(String(selectedCoin?.totalHolding || selectedCoin?.availableBal || 0))
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "#3b82f6",
                          fontSize: 11,
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <input
                    type="number"
                    value={sellQty}
                    placeholder={selectedCoin?.minQty ? `Min: ${selectedCoin.minQty}` : String(selectedCoin?.totalHolding || 0)}
                    max={selectedCoin?.totalHolding || selectedCoin?.availableBal}
                    onChange={(e) => setSellQty(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 10,
                      marginTop: 6,
                      borderRadius: 6,
                      border: "1px solid #374151",
                      background: "#0b0e17",
                      color: "#fff",
                      outline: "none",
                    }}
                  />

                  <p style={{ marginTop: 8, fontSize: 11, color: "#9ca3af" }}>
                    Available: {selectedCoin?.availableBal}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 20,
                  }}
                >
                  <button
                    onClick={() => setShowSellModal(false)}
                    style={{
                      padding: "8px 16px",
                      background: "#374151",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={placeSellOrder}
                    disabled={isSubmitting}
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      padding: "8px 18px",
                      borderRadius: 6,
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      opacity: isSubmitting ? 0.6 : 1,
                    }}
                  >
                    {isSubmitting ? "Selling..." : "Sell"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Common Styles
const thStyle = {
  padding: "12px 16px",
  textAlign: "center",
  fontSize: 11,
  fontWeight: 700,
  color: "#6b7280",
  letterSpacing: "0.5px",
};

const tdStyle = {
  padding: "14px 16px",
  fontSize: 12,
  color: "#d1d5db",
  textAlign: "center",
  fontWeight: 600,
};

export default Portfolio;