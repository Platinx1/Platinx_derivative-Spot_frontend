

import React, { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useTradingContext } from "../../context/TradingContext";

// ─── TIMEFRAMES ─────────────────────────────────────────────────────────────
const TIMEFRAMES = [
  { label: "1m", interval: "1" },
  { label: "5m", interval: "5" },
  { label: "15m", interval: "15" },
  { label: "30m", interval: "30" },
  { label: "1H", interval: "60" },
  { label: "4H", interval: "240" },
  { label: "1D", interval: "D" },
  { label: "1W", interval: "W" },
];

// ─── DYNAMIC SYMBOL MAPPING ─────────────────────────────────────────────────
const TV_SYMBOL_MAP = {
  BTC: "BINANCE:BTCUSDT",
  ETH: "BINANCE:ETHUSDT",
  SOL: "BINANCE:SOLUSDT",
  BNB: "BINANCE:BNBUSDT",
  XRP: "BINANCE:XRPUSDT",
  ADA: "BINANCE:ADAUSDT",
  DOGE: "BINANCE:DOGEUSDT",
  USDT: "FX_IDC:USDINR",

  // Indian Stocks & Indices
  NIFTY: "NSE:NIFTY",
  BANKNIFTY: "NSE:BANKNIFTY",
  SENSEX: "BSE:SENSEX",
  RELIANCE: "NSE:RELIANCE",
  TCS: "NSE:TCS",
  INFY: "NSE:INFY",
  HDFCBANK: "NSE:HDFCBANK",
};

const getTVSymbol = (symbol) => {
  if (!symbol) return "BINANCE:BTCUSDT";
  const cleanSymbol = symbol.replace("/", "").toUpperCase();
  const base = symbol.split("/")[0]?.toUpperCase();

  if (TV_SYMBOL_MAP[cleanSymbol]) return TV_SYMBOL_MAP[cleanSymbol];
  if (TV_SYMBOL_MAP[base]) return TV_SYMBOL_MAP[base];
  if (symbol.includes(":")) return symbol;

  return `BINANCE:${base}USDT`;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const TradingChart = ({ selectedCoin }) => {
  const { selectedPair, selectedPrice, updateSelectedPrice } = useTradingContext();

  // Fallback check against localStorage if Context was not initialized
  const activePair = selectedCoin || selectedPair || (() => {
    try {
      return JSON.parse(localStorage.getItem("selected_trading_pair")) || {};
    } catch {
      return {};
    }
  })();

  const SYMBOL = activePair?.symbol || "BTC/INR";
  const EXCHANGE = activePair?.exchange || "coinswitchx";
  const BASE_PAIR = SYMBOL.replace("/", ",");

  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const socketRef = useRef(null);
  const scriptLoadedRef = useRef(false);
  const prevSymbolRef = useRef(SYMBOL);

  const [currentPrice, setCurrentPrice] = useState("0");
  const [priceFlash, setPriceFlash] = useState("");
  const [activeTimeframe, setActiveTimeframe] = useState("60");
  const [, setIsConnected] = useState(false);

  const [tickerData, setTickerData] = useState({
    percentageChange: "0.00",
    highPrice: "0",
    lowPrice: "0",
    openPrice: "0",
    quoteVolume: "0",
    baseVolume: "0",
  });

  const tvSymbol = getTVSymbol(SYMBOL);

  useEffect(() => {
    if (selectedPrice != null && selectedPrice !== "" && !isNaN(Number(selectedPrice))) {
      setCurrentPrice(String(selectedPrice));
    }
  }, [selectedPrice]);

  // Fetch Ticker Data from /spot/ticker/single API
  const fetchTicker = useCallback(async () => {
    try {
      const primaryUrl = `${BASE_URL}/api/spot/ticker/single?symbol=${encodeURIComponent(SYMBOL)}&exchange=${EXCHANGE}`;
      const fallbackUrl = `${BASE_URL}/api/spot/ticker/single?symbol=${encodeURIComponent(SYMBOL)}`;

      let res = await fetch(primaryUrl);
      let json = await res.json().catch(() => null);

      if (!json || (!json.data && !json.success)) {
        res = await fetch(fallbackUrl);
        json = await res.json().catch(() => null);
      }

      let d = null;
      if (json?.data) {
        if (json.data[SYMBOL]) {
          d = json.data[SYMBOL];
        } else if (json.data[SYMBOL.toUpperCase()]) {
          d = json.data[SYMBOL.toUpperCase()];
        } else if (json.data.data?.[SYMBOL]) {
          d = json.data.data[SYMBOL];
        } else if (json.data.data?.[EXCHANGE]) {
          d = json.data.data[EXCHANGE];
        } else if (typeof json.data === "object") {
          const firstVal = Object.values(json.data)[0];
          if (firstVal && (firstVal.openPrice !== undefined || firstVal.lastPrice !== undefined || firstVal.price !== undefined)) {
            d = firstVal;
          } else if (json.data.data) {
            const subVal = Object.values(json.data.data)[0];
            if (subVal) d = subVal;
          }
        }
      }

      if (d) {
        setTickerData({
          percentageChange: d.percentageChange != null ? String(d.percentageChange) : "0.00",
          highPrice: d.highPrice != null ? String(d.highPrice) : "0",
          lowPrice: d.lowPrice != null ? String(d.lowPrice) : "0",
          openPrice: d.openPrice != null ? String(d.openPrice) : "0",
          quoteVolume: d.quoteVolume != null ? String(d.quoteVolume) : "0",
          baseVolume: d.baseVolume != null ? String(d.baseVolume) : "0",
        });
        const newP = d.lastPrice || d.price;
        if (newP) {
          setCurrentPrice(String(newP));
        }
      }
    } catch (e) {
      console.error("Ticker fetch error:", e);
    }
  }, [BASE_URL, SYMBOL, EXCHANGE]);

  // Handle Trade Socket Logic
  const handleTrade = useCallback(
    (data) => {
      const clean = (s) => (s || "").replace(/[/,_]/g, "").toUpperCase();
      if (clean(data?.s) === clean(SYMBOL) && data?.p) {
        setCurrentPrice((prev) => {
          const dir = Number(data.p) >= Number(prev) ? "up" : "down";
          setPriceFlash(dir);
          setTimeout(() => setPriceFlash(""), 600);
          return String(data.p);
        });
        fetchTicker();
      }
    },
    [SYMBOL, fetchTicker]
  );

  // WebSocket Connection Lifecycle
  // Poll ticker every 2s so price stays live even with no trade activity
  useEffect(() => {
    fetchTicker();
    const interval = setInterval(fetchTicker, 2000);
    return () => clearInterval(interval);
  }, [fetchTicker]);

  // WebSocket Connection Lifecycle (for instant flash on real trades)
  useEffect(() => {
    const socket = io("wss://ws.coinswitch.co/coinswitchx", {
      path: "/pro/realtime-rates-socket/spot/coinswitchx",
      transports: ["websocket"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("FETCH_TRADES_CS_PRO", { event: "subscribe", pair: BASE_PAIR });
    });

    socket.on("FETCH_TRADES_CS_PRO", handleTrade);
    socket.on("disconnect", () => setIsConnected(false));

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [BASE_PAIR, handleTrade]);

  // Build TradingView Chart Widget
  const buildWidget = useCallback(
    (interval) => {
      if (!containerRef.current || !window.TradingView) return;

      if (widgetRef.current?.remove) widgetRef.current.remove();
      widgetRef.current = null;

      const container = document.getElementById("tradingview_chart_container");
      if (container) container.innerHTML = "";

      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval,
        timezone: "Asia/Kolkata",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#0b0e17",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        backgroundColor: "#0b0e17",
        gridColor: "rgba(255,255,255,0.03)",
        container_id: "tradingview_chart_container",
      });
    },
    [tvSymbol]
  );

  useEffect(() => {
    if (scriptLoadedRef.current) {
      buildWidget(activeTimeframe);
      return;
    }

    const existing = document.getElementById("tv-script");
    if (!existing) {
      const script = document.createElement("script");
      script.id = "tv-script";
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        buildWidget(activeTimeframe);
      };
      document.body.appendChild(script);
    } else {
      scriptLoadedRef.current = true;
      buildWidget(activeTimeframe);
    }
  }, [buildWidget, activeTimeframe]);

  useEffect(() => {
    if (prevSymbolRef.current !== SYMBOL) {
      prevSymbolRef.current = SYMBOL;
      if (scriptLoadedRef.current) buildWidget(activeTimeframe);
    }
  }, [SYMBOL, activeTimeframe, buildWidget]);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  const fmtVol = (n) => Number(n || 0).toLocaleString("en-IN");
  const isUp = Number(tickerData.percentageChange) >= 0;
  const priceColor =
    priceFlash === "up"
      ? "#22c55e"
      : priceFlash === "down"
        ? "#ef4444"
        : "#ffffff";

  const baseCoin = SYMBOL.split("/")[0] || "BTC";

  const stats = [
    { label: "24H High", value: fmt(tickerData.highPrice), color: "#22c55e" },
    { label: "24H Low", value: fmt(tickerData.lowPrice), color: "#ef4444" },
    { label: "Open", value: fmt(tickerData.openPrice), color: "#9ca3af" },
    { label: "Vol INR", value: fmtVol(tickerData.quoteVolume), color: "#9ca3af" },
    ...(tickerData.baseVolume && tickerData.baseVolume !== "0"
      ? [{ label: "Vol Base", value: fmtVol(tickerData.baseVolume), color: "#9ca3af" }]
      : []),
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#0b0e17",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        height: "100%",
        width: "100%",
        overflow: "hidden",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {/* ── HEADER (Futures INR Style) ────────────────────────────────── */}
      <div
        style={{
          padding: "10px 14px 8px",
          background: "#080b12",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "nowrap",
          minWidth: 0,
        }}
      >
        {/* Coin Icon & Symbol */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              background: "linear-gradient(135deg,#f7931a,#e07b10)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 700,
              color: "#fff",
              boxShadow: "0 0 10px rgba(247,147,26,0.35)",
            }}
          >
            {baseCoin[0]}
          </div>
          <div>
            <div
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.4px",
                whiteSpace: "nowrap",
              }}
            >
              {SYMBOL}
              <span
                style={{
                  marginLeft: 7,
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#10b981",
                  background: "rgba(16,185,129,0.15)",
                  border: "1px solid rgba(16,185,129,0.35)",
                  borderRadius: 4,
                  padding: "1px 5px",
                  letterSpacing: "0.5px",
                  verticalAlign: "middle",
                }}
              >
                SPOT
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 28,
            background: "rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}
        />

        {/* Live price + 24h Pct */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 7,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: priceColor,
              transition: "color 0.3s ease",
              letterSpacing: "-0.5px",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmt(currentPrice)}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: isUp ? "#22c55e" : "#ef4444",
              background: isUp ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              padding: "2px 7px",
              borderRadius: 5,
              border: `1px solid ${isUp ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              whiteSpace: "nowrap",
            }}
          >
            {isUp ? "▲" : "▼"}{" "}
            {Math.abs(Number(tickerData.percentageChange)).toFixed(2)}%
          </span>
        </div>

        {/* Scrollable stats strip */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              overflowX: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
              minWidth: 0,
              paddingLeft: 4,
            }}
          >
            {stats.map(({ label, value, color }, i) => (
              <React.Fragment key={label}>
                <div
                  style={{
                    textAlign: "center",
                    padding: "0 10px",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: "#4b5563",
                      marginBottom: 2,
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {value}
                  </div>
                </div>
                {i < stats.length - 1 && (
                  <div
                    style={{
                      width: 1,
                      height: 22,
                      background: "rgba(255,255,255,0.06)",
                      flexShrink: 0,
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Live dot */}
        <div
          title="Live"
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            flexShrink: 0,
            background: "#22c55e",
            boxShadow: "0 0 6px #22c55e",
          }}
        />
      </div>

      {/* TOOLBAR */}
      <div
        style={{
          padding: "6px 14px",
          background: "#080b12",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          gap: 6,
        }}
      >
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.interval}
            onClick={() => setActiveTimeframe(tf.interval)}
            style={{
              padding: "3px 8px",
              fontSize: 11,
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
              background: activeTimeframe === tf.interval ? "rgba(245,158,11,0.2)" : "transparent",
              color: activeTimeframe === tf.interval ? "#f59e0b" : "#6b7280",
            }}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* FULL WIDTH CHART */}
      <div ref={containerRef} style={{ flex: 1, minWidth: 0, height: "100%" }}>
        <div id="tradingview_chart_container" style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
};

export default TradingChart;