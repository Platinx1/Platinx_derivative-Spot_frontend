
import React, { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useTradingContext } from "../../context/TradingContext";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const WS_URL = "https://pilot-fawss.pi42.com";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const PAIR_API_BASE = `${BASE_URL}/api/fno/pair-by-name`;

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  // Backgrounds
  bg: "#131A28",
  bgDeep: "#070B14",

  // Borders
  border: "rgba(255,255,255,0.06)",

  // Brand Colors
  accent: "#7B2FF7",
  primary: "#7B2FF7",
  primaryLight: "#A855F7",
  secondary: "#C084FC",

  gradient:
    "linear-gradient(135deg,#7B2FF7 0%,#A855F7 50%,#C084FC 100%)",

  // Trading Colors
  green: "#22C55E",
  red: "#EF4444",

  greenDim: "rgba(34,197,94,0.15)",
  redDim: "rgba(239,68,68,0.15)",

  // Text
  text: "#F8FAFC",
  textDim: "#64748B",
  label: "#94A3B8",

  // Panels
  spreadBg: "#0F1725",

  // Effects
  shadow: "0 10px 40px rgba(0,0,0,0.35)",
  radius: "12px",

  // Font
  mono: "'Inter', sans-serif",
};





// ─── FORMATTERS ───────────────────────────────────────────────────────────────
const fmtPrice = (n) => {
  const v = Number(n);
  if (!v) return "—";
  let d;
  if (v >= 1000000) d = 0;
  else if (v >= 10000) d = 0;
  else if (v >= 100) d = 1;
  else if (v >= 1) d = 2;
  else if (v >= 0.01) d = 4;
  else d = 6;
  return (
    "₹" +
    v.toLocaleString("en-IN", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    })
  );
};

const fmtQty = (n) => {
  const v = Number(n);
  if (v < 0.001) return v.toFixed(6);
  if (v < 0.01) return v.toFixed(5);
  if (v < 1) return v.toFixed(4);
  return v.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ─── ORDER ROW ────────────────────────────────────────────────────────────────
// ✅ FIX: onClick prop add kiya destructure mein
const OrderRow = React.memo(({ price, qty, side, maxQ, flash, depth, onClick }) => {
  const [hov, setHov] = useState(false);
  const [lit, setLit] = useState(false);

  useEffect(() => {
    if (flash) {
      setLit(true);
      const t = setTimeout(() => setLit(false), 500);
      return () => clearTimeout(t);
    }
  }, [flash]);

  const color = side === "ask" ? C.red : C.green;
  const pct = maxQ > 0 ? qty / maxQ : 0;
  const bg = lit
    ? side === "ask"
      ? "rgba(246,70,93,0.14)"
      : "rgba(14,203,129,0.14)"
    : hov
      ? side === "ask"
        ? "rgba(246,70,93,0.05)"
        : "rgba(14,203,129,0.05)"
      : "transparent";

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onClick && onClick(price)} // ✅ FIX: onClick handler add kiya
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "3px 12px",
        position: "relative",
        cursor: "pointer",
        minHeight: 22,
        background: bg,
        transition: "background 0.3s",
      }}
    >
      {depth && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: `${pct * 100}%`,
            background: color,
            opacity: 0.13,
            pointerEvents: "none",
            transition: "width .2s",
          }}
        />
      )}
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color,
          zIndex: 1,
          letterSpacing: "0.3px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmtPrice(price)}
      </span>
      <span
        style={{
          fontSize: 11,
          color: C.text,
          zIndex: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmtQty(qty)}
      </span>
    </div>
  );
});

// ─── TRADE ROW ────────────────────────────────────────────────────────────────
const TradeRow = React.memo(({ price, qty, time, side, isNew }) => {
  const color = side === "buy" ? C.green : C.red;
  const [lit, setLit] = useState(isNew);

  useEffect(() => {
    if (isNew) {
      setLit(true);
      const t = setTimeout(() => setLit(false), 800);
      return () => clearTimeout(t);
    }
  }, [isNew]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "3px 12px",
        minHeight: 22,
        background: lit
          ? side === "buy"
            ? "rgba(14,203,129,0.08)"
            : "rgba(246,70,93,0.08)"
          : "transparent",
        transition: "background 0.6s",
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.3px",
        }}
      >
        {fmtPrice(price)}
      </span>
      <span
        style={{
          fontSize: 11,
          color: C.text,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmtQty(qty)}
      </span>
      <span
        style={{
          fontSize: 10,
          color: C.label,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {time}
      </span>
    </div>
  );
});

// ─── ICONS ────────────────────────────────────────────────────────────────────
const SplitIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="1" width="12" height="2.5" rx=".5" fill={C.red} opacity=".9" />
    <rect x="1" y="4.5" width="12" height="2.5" rx=".5" fill={C.red} opacity=".4" />
    <rect x="1" y="8" width="12" height="2.5" rx=".5" fill={C.green} opacity=".9" />
    <rect x="1" y="11" width="12" height="2.5" rx=".5" fill={C.green} opacity=".4" />
  </svg>
);

const AskIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="1" width="12" height="2.5" rx=".5" fill={C.red} opacity=".9" />
    <rect x="1" y="4.5" width="12" height="2.5" rx=".5" fill={C.red} opacity=".5" />
    <rect x="1" y="8" width="12" height="2.5" rx=".5" fill={C.red} opacity=".25" />
    <rect x="1" y="11" width="12" height="2.5" rx=".5" fill={C.red} opacity=".1" />
  </svg>
);

const BidIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="1" width="12" height="2.5" rx=".5" fill={C.green} opacity=".9" />
    <rect x="1" y="4.5" width="12" height="2.5" rx=".5" fill={C.green} opacity=".5" />
    <rect x="1" y="8" width="12" height="2.5" rx=".5" fill={C.green} opacity=".25" />
    <rect x="1" y="11" width="12" height="2.5" rx=".5" fill={C.green} opacity=".1" />
  </svg>
);

const ModeBtn = ({ active, onClick, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 26,
      height: 22,
      borderRadius: 4,
      cursor: "pointer",
      border: active ? "1px solid rgba(240,185,11,.3)" : "1px solid transparent",
      background: active ? "rgba(240,185,11,.12)" : "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
      transition: "all .15s",
    }}
  >
    {children}
  </button>
);

const DepthToggle = ({ value, onChange }) => (
  <div
    onClick={() => onChange(!value)}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      cursor: "pointer",
      userSelect: "none",
    }}
  >
    <span style={{ fontSize: 10, color: C.label, letterSpacing: ".5px" }}>DEPTH</span>
    <div
      style={{
        width: 30,
        height: 16,
        borderRadius: 8,
        position: "relative",
        background: value ? C.accent : C.textDim,
        transition: "background .2s",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: value ? 16 : 2,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "#fff",
          transition: "left .2s",
          boxShadow: "0 1px 3px rgba(0,0,0,.4)",
        }}
      />
    </div>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const OrderBookTrades = () => {
  const { selectedPair, updateSelectedPrice } = useTradingContext();

  const rawSymbol = selectedPair?.symbol || "BTC/INR";
  const BASE_COIN = rawSymbol.includes("/")
    ? rawSymbol.split("/")[0].toUpperCase()
    : rawSymbol.replace(/INR$/i, "").toUpperCase();
  const SYMBOL = BASE_COIN + "INR";

  const ROWS_BOTH = 10;
  const ROWS_SINGLE = 20;

  const [activeTab, setActiveTab] = useState("orderbook");
  const [viewMode, setViewMode] = useState("both");
  const [depth, setDepth] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const [depthGrouping, setDepthGrouping] = useState("0.1");
  const [pairMetaLoading, setPairMetaLoading] = useState(false);

  const asksMapRef = useRef(new Map());
  const bidsMapRef = useRef(new Map());
  const prevAsksRef = useRef({});
  const prevBidsRef = useRef({});

  const [asks, setAsks] = useState([]);
  const [bids, setBids] = useState([]);
  const [flashAsks, setFlashAsks] = useState({});
  const [flashBids, setFlashBids] = useState({});

  const markPriceRef = useRef(0);
  const [markPrice, setMarkPrice] = useState(0);
  const [priceDir, setPriceDir] = useState("up");

  const [trades, setTrades] = useState([]);

  const currentSymbolRef = useRef(SYMBOL);
  useEffect(() => {
    currentSymbolRef.current = SYMBOL;
  }, [SYMBOL]);

  const handlePriceClick = async (price) => {
    console.log("ROW CLICKED:", price);
    updateSelectedPrice(price);

    try {
      const res = await fetch(`${PAIR_API_BASE}?name=${SYMBOL}`);
      const json = await res.json();
      console.log("Pair API Call on Click:", json);
    } catch (err) {
      console.error("Failed to fetch pair API on click:", err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setPairMetaLoading(true);

    const fetchPairMeta = async () => {
      try {
        const res = await fetch(`${PAIR_API_BASE}?name=${SYMBOL}`);
        const json = await res.json();
        if (!cancelled && json?.status && json?.data?.depthGrouping) {
          setDepthGrouping(json.data.depthGrouping);
        }
      } catch (err) {
        console.warn("[PairMeta] Failed to fetch pair meta:", err.message);
      } finally {
        if (!cancelled) setPairMetaLoading(false);
      }
    };

    fetchPairMeta();
    return () => { cancelled = true; };
  }, [SYMBOL]);

  useEffect(() => {
    asksMapRef.current = new Map();
    bidsMapRef.current = new Map();
    prevAsksRef.current = {};
    prevBidsRef.current = {};
    markPriceRef.current = 0;
    setAsks([]);
    setBids([]);
    setFlashAsks({});
    setFlashBids({});
    setTrades([]);
    setMarkPrice(0);
    setPriceDir("up");
  }, [SYMBOL]);

  const rebuildDisplay = useCallback(() => {
    const rowCount = viewMode === "both" ? ROWS_BOTH : ROWS_SINGLE;

    const sortedAsks = [...asksMapRef.current.entries()]
      .map(([p, q]) => ({ price: Number(p), qty: Number(q) }))
      .filter((o) => o.qty > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, rowCount)
      .reverse();

    const sortedBids = [...bidsMapRef.current.entries()]
      .map(([p, q]) => ({ price: Number(p), qty: Number(q) }))
      .filter((o) => o.qty > 0)
      .sort((a, b) => b.price - a.price)
      .slice(0, rowCount);

    const fA = {}, fB = {};
    sortedAsks.forEach((o) => {
      if (prevAsksRef.current[o.price] !== undefined && prevAsksRef.current[o.price] !== o.qty)
        fA[o.price] = true;
    });
    sortedBids.forEach((o) => {
      if (prevBidsRef.current[o.price] !== undefined && prevBidsRef.current[o.price] !== o.qty)
        fB[o.price] = true;
    });

    prevAsksRef.current = Object.fromEntries(sortedAsks.map((o) => [o.price, o.qty]));
    prevBidsRef.current = Object.fromEntries(sortedBids.map((o) => [o.price, o.qty]));

    setAsks(sortedAsks);
    setBids(sortedBids);

    if (Object.keys(fA).length) {
      setFlashAsks(fA);
      setTimeout(() => setFlashAsks({}), 550);
    }
    if (Object.keys(fB).length) {
      setFlashBids(fB);
      setTimeout(() => setFlashBids({}), 550);
    }
  }, [viewMode]);

  const rebuildDisplayRef = useRef(rebuildDisplay);
  useEffect(() => {
    rebuildDisplayRef.current = rebuildDisplay;
  }, [rebuildDisplay]);

  useEffect(() => {
    rebuildDisplay();
  }, [viewMode, rebuildDisplay]);

  useEffect(() => {
    if (pairMetaLoading) return;

    const symLower = SYMBOL.toLowerCase();
    const depthStream = `${symLower}@depth_${depthGrouping}`;
    const tradeStream = `${symLower}@aggTrade`;
    const markStream = `${symLower}@markPrice`;
    const allStreams = [depthStream, tradeStream, markStream];

    const socket = io(WS_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 3000,
      forceNew: true,
    });

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("subscribe", { params: allStreams });
    });

    socket.on("depthUpdate", (data) => {
      if (!data) return;
      const evtSym = (data.s || "").toUpperCase().trim();
      const curSym = currentSymbolRef.current.toUpperCase().trim();
      if (evtSym && evtSym !== curSym) return;
      if (!evtSym) {
        const streamSym = (data.stream || "").toUpperCase().replace(/@.*/, "").trim();
        if (streamSym && streamSym !== curSym) return;
      }
      if (data.b?.length) {
        bidsMapRef.current = new Map(
          data.b.filter(([, q]) => Number(q) > 0).map(([p, q]) => [p, q])
        );
      }
      if (data.a?.length) {
        asksMapRef.current = new Map(
          data.a.filter(([, q]) => Number(q) > 0).map(([p, q]) => [p, q])
        );
      }
      rebuildDisplayRef.current();
    });

    socket.on("aggTrade", (data) => {
      if (!data?.p) return;
      const evtSym = (data.s || "").toUpperCase().trim();
      const curSym = currentSymbolRef.current.toUpperCase().trim();
      if (evtSym && evtSym !== curSym) return;
      const trade = {
        price: Number(data.p),
        qty: Number(data.q || 0),
        time: new Date(data.T || Date.now()).toLocaleTimeString("en-IN", {
          hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
        }),
        side: data.m === true ? "sell" : "buy",
        id: data.a || Date.now(),
      };
      setTrades((prev) => [trade, ...prev].slice(0, 40));
    });

    socket.on("markPriceUpdate", (data) => {
      if (!data?.p) return;
      const evtSym = (data.s || "").toUpperCase().trim();
      const curSym = currentSymbolRef.current.toUpperCase().trim();
      if (evtSym && evtSym !== curSym) return;
      const newPrice = Number(data.p);
      setPriceDir(newPrice >= (markPriceRef.current || newPrice) ? "up" : "down");
      markPriceRef.current = newPrice;
      setMarkPrice(newPrice);
    });

    socket.on("disconnect", () => setIsConnected(false));
    socket.on("connect_error", (e) => console.warn("Pi42 OB WS error:", e.message));

    return () => { socket.disconnect(); };
  }, [SYMBOL, depthGrouping, pairMetaLoading]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const nearestAsk = asks.length ? asks[asks.length - 1].price : 0;
  const nearestBid = bids.length ? bids[0].price : 0;
  const midPrice = markPrice > 0 ? markPrice : nearestAsk > 0 && nearestBid > 0 ? (nearestAsk + nearestBid) / 2 : 0;
  const spread = nearestAsk > 0 && nearestBid > 0 ? nearestAsk - nearestBid : 0;
  const spreadPct = nearestBid > 0 && spread > 0 ? ((spread / nearestBid) * 100).toFixed(2) : "—";

  const bidTotal = [...bidsMapRef.current.values()].reduce((s, q) => s + Number(q), 0);
  const askTotal = [...asksMapRef.current.values()].reduce((s, q) => s + Number(q), 0);
  const totalVol = bidTotal + askTotal;
  const bidPct = totalVol > 0 ? Math.round((bidTotal / totalVol) * 100) : 50;
  const askPct = 100 - bidPct;

  const askMaxQ = asks.length ? Math.max(...asks.map((o) => o.qty)) : 1;
  const bidMaxQ = bids.length ? Math.max(...bids.map((o) => o.qty)) : 1;

  const tBuyVol = trades.filter((t) => t.side === "buy").reduce((a, t) => a + t.qty, 0);
  const tSellVol = trades.filter((t) => t.side === "sell").reduce((a, t) => a + t.qty, 0);
  const tTotal = tBuyVol + tSellVol;
  const tBuyPct = tTotal > 0 ? Math.round((tBuyVol / tTotal) * 100) : 50;
  const tSellPct = 100 - tBuyPct;

  const colLabel = {
    fontSize: 10,
    color: C.label,
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    fontWeight: 600,
  };

  const scrollBox = {
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    scrollbarWidth: "thin",
    scrollbarColor: `${C.textDim} transparent`,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        overflow: "hidden",
        fontFamily: C.mono,
        boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
      }}
    >
      {/* ── TABS ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderBottom: `1px solid ${C.border}`,
          background: C.bgDeep,
          padding: "0 4px",
          flexShrink: 0,
        }}
      >
        {[["orderbook", "Order Book"], ["trades", "Last Trades"]].map(([id, lbl]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              padding: "10px 16px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.6px",
              border: "none",
              cursor: "pointer",
              background: "transparent",
              fontFamily: C.mono,
              color: activeTab === id ? C.accent : C.label,
              borderBottom: `2px solid ${activeTab === id ? C.accent : "transparent"}`,
              transition: "all .18s",
              textTransform: "uppercase",
              marginBottom: -1,
            }}
          >
            {lbl}
          </button>
        ))}

        <span
          style={{
            marginLeft: 8,
            fontSize: 9,
            fontWeight: 700,
            color: "#7c3aed",
            background: "rgba(124,58,237,0.15)",
            border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: 3,
            padding: "1px 5px",
            letterSpacing: "0.5px",
          }}
        >
          FUTURES
        </span>

        <div style={{ marginLeft: "auto", marginRight: 10, fontSize: 11, color: "#a78bfa", fontWeight: 600 }}>
          {BASE_COIN}/INR
        </div>

        <div
          style={{
            fontSize: 9,
            color: pairMetaLoading ? C.label : C.accent,
            background: pairMetaLoading ? "rgba(90,100,120,0.12)" : "rgba(240,185,11,0.1)",
            border: `1px solid ${pairMetaLoading ? "rgba(90,100,120,0.25)" : "rgba(240,185,11,0.25)"}`,
            borderRadius: 3,
            padding: "1px 6px",
            marginRight: 8,
            letterSpacing: "0.4px",
            fontWeight: 600,
            transition: "all .3s",
          }}
          title="Depth grouping from API"
        >
          {pairMetaLoading ? "…" : `±${depthGrouping}`}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5, marginRight: 4 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isConnected ? C.green : C.textDim,
              boxShadow: isConnected ? `0 0 5px ${C.green}` : "none",
              transition: "all .3s",
            }}
          />
          <span style={{ fontSize: 9, color: isConnected ? C.green : C.textDim, letterSpacing: ".5px" }}>
            {isConnected ? "LIVE" : "CONNECTING"}
          </span>
        </div>
      </div>

      {/* ════════ ORDER BOOK ════════════════════════════════════════════ */}
      {activeTab === "orderbook" && (
        <>
          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 12px",
              background: C.bgDeep,
              borderBottom: `1px solid ${C.border}`,
              flexShrink: 0,
              gap: 8,
            }}
          >
            <div style={{ display: "flex", gap: 4 }}>
              <ModeBtn active={viewMode === "both"} onClick={() => setViewMode("both")} title="Both">
                <SplitIcon />
              </ModeBtn>
              <ModeBtn active={viewMode === "asks"} onClick={() => setViewMode("asks")} title="Asks only">
                <AskIcon />
              </ModeBtn>
              <ModeBtn active={viewMode === "bids"} onClick={() => setViewMode("bids")} title="Bids only">
                <BidIcon />
              </ModeBtn>
            </div>
            {depth && (
              <span style={{ fontSize: 9, color: C.label }}>
                <span style={{ color: C.red }}>█</span> ASK &nbsp;
                <span style={{ color: C.green }}>█</span> BID
              </span>
            )}
            <DepthToggle value={depth} onChange={setDepth} />
          </div>

          {/* Column headers */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "5px 12px",
              background: C.bgDeep,
              borderBottom: `1px solid ${C.border}`,
              flexShrink: 0,
            }}
          >
            <span style={colLabel}>Price (INR)</span>
            <span style={colLabel}>Quantity ({BASE_COIN})</span>
          </div>

          {/* Book rows */}
          <div
            style={{
              ...scrollBox,
              maxHeight: viewMode === "both" ? 450 : 480,
              minHeight: viewMode === "both" ? 450 : 480,
            }}
          >
            {(viewMode === "both" || viewMode === "asks") && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {asks.map((row) => (
                  <OrderRow
                    key={row.price}
                    {...row}
                    side="ask"
                    maxQ={depth ? askMaxQ : 1}
                    flash={!!flashAsks[row.price]}
                    depth={depth}
                    onClick={(price) => handlePriceClick(price)}
                  />
                ))}
              </div>
            )}

            {/* Spread row */}
            {viewMode === "both" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 12px",
                  background: C.spreadBg,
                  flexShrink: 0,
                  borderTop: `1px solid ${C.border}`,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: priceDir === "up" ? C.green : C.red,
                      letterSpacing: "-0.3px",
                      fontVariantNumeric: "tabular-nums",
                      transition: "color .3s",
                    }}
                  >
                    {midPrice > 0 ? fmtPrice(midPrice) : "—"}
                  </span>
                  <span style={{ fontSize: 13, color: priceDir === "up" ? C.green : C.red }}>
                    {priceDir === "up" ? "↑" : "↓"}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: C.label,
                      background: "rgba(168,85,247,0.1)",
                      border: "1px solid rgba(168,85,247,0.25)",
                      borderRadius: 3,
                      padding: "1px 5px",
                    }}
                  >
                    MARK
                  </span>
                </div>
                <span style={{ fontSize: 10, color: C.label }}>
                  Spread <span style={{ color: C.text, fontWeight: 600 }}>{spreadPct}%</span>
                </span>
              </div>
            )}

            {(viewMode === "both" || viewMode === "bids") && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {bids.map((row) => (
                  <OrderRow
                    key={row.price}
                    {...row}
                    side="bid"
                    maxQ={depth ? bidMaxQ : 1}
                    flash={!!flashBids[row.price]}
                    depth={depth}
                    onClick={(price) => handlePriceClick(price)}
                  />
                ))}
              </div>
            )}

            {asks.length === 0 && bids.length === 0 && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: C.label,
                  fontSize: 12,
                }}
              >
                {pairMetaLoading
                  ? `Fetching ${BASE_COIN}/INR config…`
                  : isConnected
                    ? `Loading ${BASE_COIN}/INR order book…`
                    : "Connecting to Pi42…"}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "7px 12px",
              borderTop: `1px solid ${C.border}`,
              background: C.bgDeep,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <div>
                <div style={{ fontSize: 9, color: C.label, marginBottom: 2 }}>BID TOTAL</div>
                <div style={{ fontSize: 11, color: C.green, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {bidTotal > 0 ? bidTotal.toFixed(4) : "—"} {BASE_COIN}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: C.label, marginBottom: 2 }}>ASK TOTAL</div>
                <div style={{ fontSize: 11, color: C.red, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {askTotal > 0 ? askTotal.toFixed(4) : "—"} {BASE_COIN}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: C.green, fontWeight: 700, minWidth: 28 }}>{bidPct}%</span>
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: C.redDim, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${bidPct}%`,
                    background: C.green,
                    borderRadius: 2,
                    transition: "width .5s ease",
                  }}
                />
              </div>
              <span style={{ fontSize: 10, color: C.red, fontWeight: 700, minWidth: 28, textAlign: "right" }}>
                {askPct}%
              </span>
            </div>
          </div>
        </>
      )}

      {/* ════════ LAST TRADES ═══════════════════════════════════════════ */}
      {activeTab === "trades" && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "7px 12px",
              background: C.bgDeep,
              borderBottom: `1px solid ${C.border}`,
              flexShrink: 0,
            }}
          >
            <span style={colLabel}>Price (INR)</span>
            <span style={colLabel}>Qty ({BASE_COIN})</span>
            <span style={colLabel}>Time</span>
          </div>

          <div style={{ ...scrollBox, maxHeight: 450, minHeight: 450 }}>
            {trades.map((t, i) => (
              <TradeRow key={`${t.id}-${i}`} {...t} isNew={i === 0} />
            ))}
            {trades.length === 0 && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: C.label,
                  fontSize: 12,
                }}
              >
                {isConnected ? "Waiting for trades…" : "Connecting…"}
              </div>
            )}
          </div>

          <div
            style={{
              padding: "7px 12px",
              borderTop: `1px solid ${C.border}`,
              background: C.bgDeep,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div>
                <div style={{ fontSize: 9, color: C.label, marginBottom: 2 }}>BUY</div>
                <div style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>{tBuyPct}%</div>
              </div>
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: C.redDim, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${tBuyPct}%`,
                    background: C.green,
                    borderRadius: 2,
                    transition: "width .5s ease",
                  }}
                />
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: C.label, marginBottom: 2 }}>SELL</div>
                <div style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>{tSellPct}%</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OrderBookTrades;








