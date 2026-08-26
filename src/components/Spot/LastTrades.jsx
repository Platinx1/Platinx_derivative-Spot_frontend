

import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const BASE_URL = "wss://ws.coinswitch.co";
const NAMESPACE = "/coinswitchx";
const PAIR = "BTC,INR";
const EVENT_NAME = "FETCH_TRADES_CS_PRO";

const LastTrades = () => {
  const [trades, setTrades] = useState([]);
  const socketRef = useRef(null);

  const handleTrade = useCallback((data) => {
    try {
      if (!data?.p || !data?.q || data?.s !== PAIR) return;

      const newTrade = {
        price: Number(data.p),
        qty: Number(data.q),
        time: new Date(data.E).toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        tradeId: data.t,
        isBuyerMaker: data.m ?? false,  // "m" true = sell aggression (red), false = buy (green)
      };

      setTrades((prev) => {
        const updated = [newTrade, ...prev];
        return updated.slice(0, 30); // latest 30 trades
      });
    } catch (err) {
      console.error("Trade parse error:", err);
    }
  }, []);

  useEffect(() => {
    const socket = io(BASE_URL + NAMESPACE, {
      path: "/pro/realtime-rates-socket/spot/coinswitchx",
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Trades WS Connected:", socket.id);
      socket.emit(EVENT_NAME, {
        event: "subscribe",
        pair: PAIR,
      });
    });

    socket.on(EVENT_NAME, (data) => {
      console.log("📊 Trade received:", data);
      handleTrade(data);
    });

    socket.on("disconnect", (reason) => console.warn("Trades WS Disconnected:", reason));
    socket.on("connect_error", (err) => console.error("Trades WS error:", err.message));

    return () => {
      socket.disconnect();
    };
  }, [handleTrade]);

  return (
    <div className="bg-[#0b0e11] flex flex-col h-full w-full font-mono text-xs select-none leading-none border border-gray-800/40 rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex justify-between px-4 py-2 text-gray-500 text-[11px] bg-[#11151b] border-b border-gray-800/60 font-semibold">
        <span>Price (INR)</span>
        <span>Qty</span>
        <span>Time</span>
      </div>

      {/* Trades List */}
      <div className="flex-1 overflow-y-auto">
        {trades.map((trade, i) => {
          // Color based on "m" field
          const priceColor = trade.isBuyerMaker 
            ? "text-[#ff6b6b]"   // red = sell aggression (buyer maker)
            : "text-[#22c55e]";  // green = buy aggression

          return (
            <div
              key={`${trade.tradeId || i}-${trade.time}`}
              className="flex justify-between items-center px-4 py-1.5 hover:bg-[#1a1f25]/40 transition-colors"
            >
              {/* Price */}
              <span className={`w-32 text-left font-medium ${priceColor}`}>
                ₹{trade.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>

              {/* Quantity */}
              <span className="text-gray-300 w-24 text-right">
                {trade.qty.toFixed(trade.qty < 0.001 ? 6 : trade.qty < 0.01 ? 5 : 4)}
              </span>

              {/* Time */}
              <span className="text-gray-500 w-20 text-right">
                {trade.time}
              </span>
            </div>
          );
        })}

        {trades.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Waiting for trades...
          </div>
        )}
      </div>
    </div>
  );
};

export default LastTrades;