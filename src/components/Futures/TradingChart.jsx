// import React, { useEffect, useRef, useState, useCallback } from "react";
// import { io } from "socket.io-client";
// import { useTradingContext } from "../../context/TradingContext";

// // ─── TIMEFRAMES & CHART TYPES ────────────────────────────────────────────────
// const TIMEFRAMES = [
//   { label: "1m", interval: "1" },
//   { label: "5m", interval: "5" },
//   { label: "15m", interval: "15" },
//   { label: "30m", interval: "30" },
//   { label: "1H", interval: "60" },
//   { label: "4H", interval: "240" },
//   { label: "1D", interval: "D" },
//   { label: "1W", interval: "W" },
// ];

// const CHART_TYPES = [
//   { label: "Candles", style: "1" },
//   { label: "Line", style: "2" },
//   { label: "Area", style: "3" },
//   { label: "Bars", style: "0" },
// ];

// const S = {
//   bg: "#131A28",
//   bgBar: "#0F1725",

//   border: "1px solid rgba(255,255,255,0.06)",

//   primary: "#7B2FF7",
//   primaryLight: "#A855F7",
//   secondary: "#C084FC",

//   gradient:
//     "linear-gradient(135deg,#7B2FF7 0%,#A855F7 50%,#C084FC 100%)",

//   text: "#F8FAFC",
//   muted: "#94A3B8",

//   shadow: "0 10px 40px rgba(0,0,0,0.35)",
//   radius: "12px",

//   mono: "'Inter', sans-serif",
// };
// const TradingChart = () => {
//   const { selectedPair } = useTradingContext();

//   // ─── Dynamic Symbol Logic ─────────────────────────────────────
//   const rawSymbol = selectedPair?.symbol || "BTC/INR";
//   const BASE_COIN = rawSymbol.split("/")[0];
//   const SYMBOL = BASE_COIN + "INR";

//   const TV_SYMBOL = `BITSTAMP:${BASE_COIN}USD * FX_IDC:USDINR`;
//   const STREAM_KEY = `${SYMBOL.toLowerCase()}@markPrice`;
//   const BASE_URL = import.meta.env.VITE_API_BASE_URL;

//   const TICKER_API = `${BASE_URL}/api/pi42/ticker24Hr/${SYMBOL}`;

//   const WS_URL = "https://pilot-fawss.pi42.com";
//   const COIN_ICON_BG = "linear-gradient(135deg,#f7931a,#e07b10)"; // You can make dynamic later

//   const containerRef = useRef(null);
//   const widgetRef = useRef(null);
//   const socketRef = useRef(null);
//   const scriptLoadedRef = useRef(false);

//   const [currentPrice, setCurrentPrice] = useState("0");
//   const [priceFlash, setPriceFlash] = useState("");
//   const [activeTimeframe, setActiveTimeframe] = useState("60");
//   const [activeStyle, setActiveStyle] = useState("1");
//   const [isConnected, setIsConnected] = useState(false);

//   const [ticker, setTicker] = useState({
//     percentageChange: "0.00",
//     highPrice: "0",
//     lowPrice: "0",
//     quoteVolume: "0",
//     baseVolume: "0",
//     openPrice: "0",
//     fundingRate: "0.00000",
//     markPrice: "0",
//     indexPrice: "0",
//   });

//   // ── Fetch Ticker ──────────────────────────────────────────────────────
//   const fetchTicker = useCallback(async () => {
//     try {
//       const res = await fetch(TICKER_API);
//       const json = await res.json();
//       if (json.status && json.data?.data) {
//         const d = json.data.data;
//         setTicker((prev) => ({
//           ...prev,
//           percentageChange: d.P != null ? String(d.P) : prev.percentageChange,
//           highPrice: d.h != null ? String(d.h) : prev.highPrice,
//           lowPrice: d.l != null ? String(d.l) : prev.lowPrice,
//           quoteVolume: d.q != null ? String(d.q) : prev.quoteVolume,
//           baseVolume: d.v != null ? String(d.v) : prev.baseVolume,
//           openPrice: d.o != null ? String(d.o) : prev.openPrice,
//         }));
//         if (d.c) setCurrentPrice(String(d.c));
//       }
//     } catch (e) {
//       console.error("Ticker fetch error:", e);
//     }
//   }, [TICKER_API]);

//   // ── Build TradingView Widget ───────────────────────────────────────────
//   const buildWidget = useCallback(
//     (interval, style) => {
//       if (!containerRef.current || !window.TradingView) return;

//       // Cleanup old widget
//       if (widgetRef.current?.remove) widgetRef.current.remove();
//       widgetRef.current = null;

//       const el = document.getElementById("tv_futures_chart");
//       if (el) el.innerHTML = "";

//       widgetRef.current = new window.TradingView.widget({
//         autosize: true,
//         symbol: TV_SYMBOL,
//         interval,
//         timezone: "Asia/Kolkata",
//         theme: "dark",
//         style,
//         locale: "en",
//         toolbar_bg: "#0b0e17",
//         enable_publishing: false,
//         hide_top_toolbar: true,
//         hide_legend: false,
//         save_image: false,
//         backgroundColor: "#0b0e17",
//         gridColor: "rgba(255,255,255,0.03)",
//         studies: [
//           "MAExp@tv-basicstudies",
//           "MASimple@tv-basicstudies",
//           "Volume@tv-basicstudies",
//         ],
//         studies_overrides: {
//           "moving average exponential.length": 9,
//           "moving average exponential.plot.color": "#a855f7",
//           "moving average simple.length": 30,
//           "moving average simple.plot.color": "#9821fa",
//         },
//         overrides: {
//           /* your existing overrides */
//         },
//         container_id: "tv_futures_chart",
//         withdateranges: true,
//         allow_symbol_change: false,
//       });
//     },
//     [TV_SYMBOL],
//   );

//   // ── Load TradingView Script + Initial Build ─────────────────────────────
//   useEffect(() => {
//     fetchTicker();

//     if (scriptLoadedRef.current) {
//       buildWidget(activeTimeframe, activeStyle);
//       return;
//     }

//     const script = document.createElement("script");
//     script.id = "tv-futures-script";
//     script.src = "https://s3.tradingview.com/tv.js";
//     script.async = true;
//     script.onload = () => {
//       scriptLoadedRef.current = true;
//       buildWidget(activeTimeframe, activeStyle);
//     };
//     document.body.appendChild(script);

//     return () => {
//       if (script.parentNode) script.parentNode.removeChild(script);
//     };
//   }, []); // Only once

//   // ── Rebuild Widget when Symbol, Timeframe or Style changes ─────────────
//   useEffect(() => {
//     if (scriptLoadedRef.current) {
//       buildWidget(activeTimeframe, activeStyle);
//     }
//   }, [TV_SYMBOL, activeTimeframe, activeStyle, buildWidget]);

//   // ── Pi42 WebSocket (Dynamic Subscription) ───────────────────────────────
//   useEffect(() => {
//     // Cleanup previous socket
//     if (socketRef.current) {
//       socketRef.current.disconnect();
//     }

//     const socket = io(WS_URL, {
//       transports: ["websocket"],
//       reconnection: true,
//       reconnectionDelay: 3000,
//       forceNew: true,
//     });

//     socketRef.current = socket;

//     socket.on("connect", () => {
//       setIsConnected(true);
//       socket.emit("subscribe", { params: [STREAM_KEY] });
//       console.log(`✅ Subscribed to ${STREAM_KEY}`);
//     });

//     socket.on("markPriceUpdate", (data) => {
//       if (!data?.p) return;

//       const newPrice = String(data.p);
//       setCurrentPrice((prev) => {
//         setPriceFlash(Number(newPrice) >= Number(prev) ? "up" : "down");
//         setTimeout(() => setPriceFlash(""), 800);
//         return newPrice;
//       });

//       setTicker((prev) => ({
//         ...prev,
//         markPrice: data.p != null ? String(data.p) : prev.markPrice,
//         indexPrice: data.i != null ? String(data.i) : prev.indexPrice,
//         fundingRate: data.r != null ? String(data.r) : prev.fundingRate,
//       }));

//       fetchTicker();
//     });

//     socket.on("disconnect", () => setIsConnected(false));
//     socket.on("connect_error", (e) => console.warn("WS Error:", e.message));

//     return () => {
//       socket.disconnect();
//     };
//   }, [STREAM_KEY, fetchTicker]); // ← Important: Re-run when symbol changes

//   // ── Resize Observer ─────────────────────────────────────────────────────
//   useEffect(() => {
//     const ro = new ResizeObserver(() => {
//       widgetRef.current?.activeChart?.().resize?.();
//     });
//     if (containerRef.current) ro.observe(containerRef.current);
//     return () => ro.disconnect();
//   }, []);

//   // ── Formatters & Stats ───────────────────────────────────────────────────
//   const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
//   const fmtVol = (n) => Number(n || 0).toLocaleString("en-IN");
//   const fmtRate = (r) => `${Number(r || 0).toFixed(5)}%`;

//   const isUp = Number(ticker.percentageChange) >= 0;
//   const priceColor =
//     priceFlash === "up"
//       ? "#22c55e"
//       : priceFlash === "down"
//         ? "#ef4444"
//         : "#ffffff";

//   const stats = [
//     {
//       label: "Mark",
//       value: fmt(ticker.markPrice || currentPrice),
//       color: "#a855f7",
//     },
//     {
//       label: "Index",
//       value: fmt(ticker.indexPrice || currentPrice),
//       color: "#6366f1",
//     },
//     { label: "24H High", value: fmt(ticker.highPrice), color: "#22c55e" },
//     { label: "24H Low", value: fmt(ticker.lowPrice), color: "#ef4444" },
//     { label: "Open", value: fmt(ticker.openPrice), color: "#9ca3af" },
//     {
//       label: "Funding",
//       value: fmtRate(ticker.fundingRate),
//       color: Number(ticker.fundingRate) >= 0 ? "#22c55e" : "#ef4444",
//     },
//     { label: "Vol INR", value: fmtVol(ticker.quoteVolume), color: "#9ca3af" },
//     { label: "Vol Base", value: fmtVol(ticker.baseVolume), color: "#9ca3af" },
//   ];

//   // ── Render ─────────────────────────────────────────────────────────────────
//   return (
//     <div
//       style={{
//         display: "flex",
//         flexDirection: "column",
//         background: S.bg,
//         border: "1px solid rgba(255,255,255,0.07)",
//         borderRadius: 12,
//         overflow: "hidden",
//         height: "100%",
//         fontFamily: S.mono,
//         boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
//         width: "100%",
//       }}
//     >
//       {/* ── HEADER ──────────────────────────────────────────────────── */}
//       <div
//         style={{
//           padding: "10px 14px 8px",
//           background: S.bgBar,
//           borderBottom: S.border,
//           display: "flex",
//           alignItems: "center",
//           gap: 12,
//           flexWrap: "nowrap",
//           minWidth: 0,
//         }}
//       >
//         {/* Coin icon */}
//         <div
//           style={{
//             display: "flex",
//             alignItems: "center",
//             gap: 9,
//             flexShrink: 0,
//           }}
//         >
//           <div
//             style={{
//               width: 32,
//               height: 32,
//               flexShrink: 0,
//               background: COIN_ICON_BG,
//               borderRadius: "50%",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               fontSize: 15,
//               fontWeight: 700,
//               color: "#fff",
//               boxShadow: "0 0 10px rgba(247,147,26,0.35)",
//             }}
//           >
//             {BASE_COIN[0]}
//           </div>
//           <div>
//             <div
//               style={{
//                 color: "#fff",
//                 fontWeight: 700,
//                 fontSize: 14,
//                 letterSpacing: "0.4px",
//                 whiteSpace: "nowrap",
//               }}
//             >
//               {BASE_COIN}/INR
//               <span
//                 style={{
//                   marginLeft: 7,
//                   fontSize: 9,
//                   fontWeight: 700,
//                   color: "#7c3aed",
//                   background: "rgba(124,58,237,0.15)",
//                   border: "1px solid rgba(124,58,237,0.35)",
//                   borderRadius: 4,
//                   padding: "1px 5px",
//                   letterSpacing: "0.5px",
//                   verticalAlign: "middle",
//                 }}
//               >
//                 PERP
//               </span>
//             </div>
//             {/* <div style={{ color: "#4b5563", fontSize: 10, marginTop: 1 }}>
//               PI42 · Futures
//             </div> */}
//           </div>
//         </div>

//         {/* Divider */}
//         <div
//           style={{
//             width: 1,
//             height: 28,
//             background: "rgba(255,255,255,0.07)",
//             flexShrink: 0,
//           }}
//         />

//         {/* Live price + pct */}
//         <div
//           style={{
//             display: "flex",
//             alignItems: "baseline",
//             gap: 7,
//             flexShrink: 0,
//           }}
//         >
//           <span
//             style={{
//               fontSize: 20,
//               fontWeight: 700,
//               color: priceColor,
//               transition: "color 0.3s ease",
//               letterSpacing: "-0.5px",
//               fontVariantNumeric: "tabular-nums",
//             }}
//           >
//             {fmt(currentPrice)}
//           </span>
//           <span
//             style={{
//               fontSize: 12,
//               fontWeight: 600,
//               color: isUp ? "#22c55e" : "#ef4444",
//               background: isUp ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
//               padding: "2px 7px",
//               borderRadius: 5,
//               border: `1px solid ${isUp ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
//               whiteSpace: "nowrap",
//             }}
//           >
//             {isUp ? "▲" : "▼"}{" "}
//             {Math.abs(Number(ticker.percentageChange)).toFixed(2)}%
//           </span>
//         </div>

//         {/* Scrollable stats strip */}
//         <div
//           style={{
//             flex: 1,
//             display: "flex",
//             alignItems: "center",
//             overflow: "hidden",
//             minWidth: 0,
//           }}
//         >
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: 4,
//               overflowX: "auto",
//               scrollbarWidth: "none",
//               msOverflowStyle: "none",
//               WebkitOverflowScrolling: "touch",
//               minWidth: 0,
//               paddingLeft: 4,
//             }}
//           >
//             {stats.map(({ label, value, color }, i) => (
//               <React.Fragment key={label}>
//                 <div
//                   style={{
//                     textAlign: "center",
//                     padding: "0 10px",
//                     flexShrink: 0,
//                   }}
//                 >
//                   <div
//                     style={{
//                       fontSize: 9,
//                       color: "#4b5563",
//                       marginBottom: 2,
//                       letterSpacing: "0.5px",
//                       textTransform: "uppercase",
//                       whiteSpace: "nowrap",
//                     }}
//                   >
//                     {label}
//                   </div>
//                   <div
//                     style={{
//                       fontSize: 11,
//                       color,
//                       fontWeight: 600,
//                       whiteSpace: "nowrap",
//                       fontVariantNumeric: "tabular-nums",
//                     }}
//                   >
//                     {value}
//                   </div>
//                 </div>
//                 {i < stats.length - 1 && (
//                   <div
//                     style={{
//                       width: 1,
//                       height: 22,
//                       background: "rgba(255,255,255,0.06)",
//                       flexShrink: 0,
//                     }}
//                   />
//                 )}
//               </React.Fragment>
//             ))}
//           </div>
//         </div>

//         {/* Live dot */}
//         <div
//           title={isConnected ? "Live" : "Reconnecting…"}
//           style={{
//             width: 7,
//             height: 7,
//             borderRadius: "50%",
//             flexShrink: 0,
//             background: isConnected ? "#22c55e" : "#6b7280",
//             boxShadow: isConnected ? "0 0 6px #22c55e" : "none",
//           }}
//         />
//       </div>

//       {/* ── TOOLBAR ─────────────────────────────────────────────────── */}
//       <div
//         style={{
//           padding: "5px 14px",
//           borderBottom: S.border,
//           background: S.bgBar,
//           display: "flex",
//           alignItems: "center",
//           gap: 2,
//           flexWrap: "wrap",
//         }}
//       >
//         {TIMEFRAMES.map((tf) => (
//           <button
//             key={tf.interval}
//             onClick={() => setActiveTimeframe(tf.interval)}
//             style={{
//               padding: "4px 9px",
//               fontSize: 11,
//               fontWeight: 600,
//               fontFamily: "inherit",
//               borderRadius: 5,
//               border: "none",
//               cursor: "pointer",
//               transition: "all 0.15s",
//               background:
//                 activeTimeframe === tf.interval
//                   ? "rgba(245,158,11,0.18)"
//                   : "transparent",
//               color: activeTimeframe === tf.interval ? "rgb(159, 11, 245)" : "#6b7280",
//               outline:
//                 activeTimeframe === tf.interval
//                   ? "1px solid rgba(245,158,11,0.35)"
//                   : "none",
//             }}
//           >
//             {tf.label}
//           </button>
//         ))}

//         <div
//           style={{
//             width: 1,
//             height: 16,
//             background: "rgba(255,255,255,0.08)",
//             margin: "0 4px",
//           }}
//         />

//         {CHART_TYPES.map((ct) => (
//           <button
//             key={ct.style}
//             onClick={() => setActiveStyle(ct.style)}
//             style={{
//               padding: "4px 9px",
//               fontSize: 11,
//               fontWeight: 600,
//               fontFamily: "inherit",
//               borderRadius: 5,
//               border: "none",
//               cursor: "pointer",
//               transition: "all 0.15s",
//               background:
//                 activeStyle === ct.style
//                   ? "rgba(168,85,247,0.18)"
//                   : "transparent",
//               color: activeStyle === ct.style ? "#a855f7" : "#6b7280",
//               outline:
//                 activeStyle === ct.style
//                   ? "1px solid rgba(168,85,247,0.35)"
//                   : "none",
//             }}
//           >
//             {ct.label}
//           </button>
//         ))}

//         <div
//           style={{
//             marginLeft: "auto",
//             display: "flex",
//             gap: 12,
//             alignItems: "center",
//           }}
//         >
//           <span
//             style={{ fontSize: 10, color: "#6b7280", whiteSpace: "nowrap" }}
//           >
//             MA 30 <span style={{ color: "#f59e0b", fontWeight: 700 }}>—</span>
//           </span>
//           <span
//             style={{ fontSize: 10, color: "#6b7280", whiteSpace: "nowrap" }}
//           >
//             EMA 9 <span style={{ color: "#a855f7", fontWeight: 700 }}>—</span>
//           </span>
//         </div>
//       </div>

//       {/* ── CHART ───────────────────────────────────────────────────── */}
//       <div ref={containerRef} style={{ flex: 1, minHeight: 0 }}>
//         <div id="tv_futures_chart" style={{ width: "100%", height: "100%" }} />
//       </div>

//       {/* ── FOOTER ──────────────────────────────────────────────────── */}
//       <div
//         style={{
//           padding: "5px 14px",
//           borderTop: S.border,
//           background: S.bgBar,
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           fontSize: 10,
//           color: "#374151",
//           flexWrap: "nowrap",
//           gap: 8,
//         }}
//       >
//         <span
//           style={{
//             overflow: "hidden",
//             textOverflow: "ellipsis",
//             whiteSpace: "nowrap",
//           }}
//         >
//           Powered by TradingView · BTC/INR Perpetual via PI42
//         </span>
//         <span style={{ flexShrink: 0 }}>
//           {isConnected ? (
//             <span style={{ color: "#22c55e" }}>● LIVE</span>
//           ) : (
//             <span style={{ color: "#6b7280" }}>○ Reconnecting…</span>
//           )}
//         </span>
//       </div>
//     </div>
//   );
// };

// export default TradingChart;





import React, { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useTradingContext } from "../../context/TradingContext";

// ─── TIMEFRAMES & CHART TYPES ────────────────────────────────────────────────
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

const CHART_TYPES = [
  { label: "Candles", style: "1" },
  { label: "Line", style: "2" },
  { label: "Area", style: "3" },
  { label: "Bars", style: "0" },
];

const S = {
  bg: "#131A28",
  bgBar: "#0F1725",

  border: "1px solid rgba(255,255,255,0.06)",

  primary: "#7B2FF7",
  primaryLight: "#A855F7",
  secondary: "#C084FC",

  gradient:
    "linear-gradient(135deg,#7B2FF7 0%,#A855F7 50%,#C084FC 100%)",

  text: "#F8FAFC",
  muted: "#94A3B8",

  shadow: "0 10px 40px rgba(0,0,0,0.35)",
  radius: "12px",

  mono: "'Inter', sans-serif",
};
const TradingChart = () => {
  const { selectedPair } = useTradingContext();

  // ─── Dynamic Symbol Logic ─────────────────────────────────────
  const rawSymbol = selectedPair?.symbol || "BTC/INR";
  const BASE_COIN = rawSymbol.split("/")[0]?.toUpperCase() || "BTC";
  const SYMBOL = BASE_COIN + "INR";

  // TradingView free iframe widget restricts intraday resolution (1m, 5m, 15m, 30m, 1H, 4H)
  // for synthetic spread expressions (* FX_IDC:USDINR) and forces them to 1D.
  // Using direct Binance USDT pair allows full intraday timeframe switching.
  const TV_SYMBOL =
    BASE_COIN === "USDT" ? "FX_IDC:USDINR" : `BINANCE:${BASE_COIN}USDT`;

  const STREAM_KEY = `${SYMBOL.toLowerCase()}@markPrice`;
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const TICKER_API = `${BASE_URL}/api/fno/ticker24Hr/${SYMBOL}`;

  const WS_URL = "https://pilot-fawss.pi42.com";
  const COIN_ICON_BG = "linear-gradient(135deg,#f7931a,#e07b10)"; // You can make dynamic later

  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const socketRef = useRef(null);
  const scriptLoadedRef = useRef(false);

  const [currentPrice, setCurrentPrice] = useState("0");
  const [priceFlash, setPriceFlash] = useState("");
  const [activeTimeframe, setActiveTimeframe] = useState("60");
  const [activeStyle, setActiveStyle] = useState("1");
  const [isConnected, setIsConnected] = useState(false);

  const [ticker, setTicker] = useState({
    percentageChange: "0.00",
    highPrice: "0",
    lowPrice: "0",
    quoteVolume: "0",
    baseVolume: "0",
    openPrice: "0",
    fundingRate: "0.00000",
    markPrice: "0",
    indexPrice: "0",
  });

  // ── Fetch Ticker ──────────────────────────────────────────────────────
  const fetchTicker = useCallback(async () => {
    try {
      const res = await fetch(TICKER_API);
      const json = await res.json();
      if (json.status && json.data?.data) {
        const d = json.data.data;
        setTicker((prev) => ({
          ...prev,
          percentageChange: d.P != null ? String(d.P) : prev.percentageChange,
          highPrice: d.h != null ? String(d.h) : prev.highPrice,
          lowPrice: d.l != null ? String(d.l) : prev.lowPrice,
          quoteVolume: d.q != null ? String(d.q) : prev.quoteVolume,
          baseVolume: d.v != null ? String(d.v) : prev.baseVolume,
          openPrice: d.o != null ? String(d.o) : prev.openPrice,
        }));
        if (d.c) setCurrentPrice(String(d.c));
      }
    } catch (e) {
      console.error("Ticker fetch error:", e);
    }
  }, [TICKER_API]);

  // ── Build TradingView Widget ───────────────────────────────────────────
  const buildWidget = useCallback(
    (interval, style) => {
      if (!containerRef.current || !window.TradingView) return;

      // Cleanup old widget
      if (widgetRef.current?.remove) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          /* ignore */
        }
      }
      widgetRef.current = null;

      const el = document.getElementById("tv_futures_chart");
      if (el) el.innerHTML = "";

      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: TV_SYMBOL,
        interval,
        timezone: "Asia/Kolkata",
        theme: "dark",
        style,
        locale: "en",
        toolbar_bg: "#0b0e17",
        enable_publishing: false,
        hide_top_toolbar: true,
        hide_legend: false,
        save_image: false,
        backgroundColor: "#0b0e17",
        gridColor: "rgba(255,255,255,0.03)",
        studies: [
          "MAExp@tv-basicstudies",
          "MASimple@tv-basicstudies",
          "Volume@tv-basicstudies",
        ],
        studies_overrides: {
          "moving average exponential.length": 9,
          "moving average exponential.plot.color": "#a855f7",
          "moving average simple.length": 30,
          "moving average simple.plot.color": "#9821fa",
        },
        overrides: {},
        container_id: "tv_futures_chart",
        withdateranges: true,
        allow_symbol_change: false,
      });
    },
    [TV_SYMBOL],
  );

  // ── Load TradingView Script + Initial Build ─────────────────────────────
  useEffect(() => {
    fetchTicker();

    if (scriptLoadedRef.current) {
      buildWidget(activeTimeframe, activeStyle);
      return;
    }

    const script = document.createElement("script");
    script.id = "tv-futures-script";
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      buildWidget(activeTimeframe, activeStyle);
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []); // Only once

  // ── Rebuild Widget when Symbol, Timeframe or Style changes ─────────────
  useEffect(() => {
    if (scriptLoadedRef.current) {
      buildWidget(activeTimeframe, activeStyle);
    }
  }, [TV_SYMBOL, activeTimeframe, activeStyle, buildWidget]);

  // ── Pi42 WebSocket (Dynamic Subscription) ───────────────────────────────
  useEffect(() => {
    // Cleanup previous socket
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(WS_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 3000,
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("subscribe", { params: [STREAM_KEY] });
      console.log(`✅ Subscribed to ${STREAM_KEY}`);
    });

    socket.on("markPriceUpdate", (data) => {
      if (!data?.p) return;

      // Symbol verification check
      const evtSym = (data.s || "").toUpperCase().trim();
      const curSym = SYMBOL.toUpperCase().trim();
      if (evtSym && evtSym !== curSym) return;

      const newPrice = String(data.p);
      setCurrentPrice((prev) => {
        setPriceFlash(Number(newPrice) >= Number(prev) ? "up" : "down");
        setTimeout(() => setPriceFlash(""), 800);
        return newPrice;
      });

      setTicker((prev) => ({
        ...prev,
        markPrice: data.p != null ? String(data.p) : prev.markPrice,
        indexPrice: data.i != null ? String(data.i) : prev.indexPrice,
        fundingRate: data.r != null ? String(data.r) : prev.fundingRate,
      }));

      // OLD CODE (commented out to prevent REST API lag from overriding real-time socket price):
      // fetchTicker();
    });

    socket.on("disconnect", () => setIsConnected(false));
    socket.on("connect_error", (e) => console.warn("WS Error:", e.message));

    return () => {
      socket.disconnect();
    };
  }, [STREAM_KEY, fetchTicker]); // ← Important: Re-run when symbol changes

  // ── Resize Observer ─────────────────────────────────────────────────────
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      widgetRef.current?.activeChart?.().resize?.();
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Formatters & Stats ───────────────────────────────────────────────────
  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  const fmtVol = (n) => Number(n || 0).toLocaleString("en-IN");
  const fmtRate = (r) => `${Number(r || 0).toFixed(5)}%`;

  const isUp = Number(ticker.percentageChange) >= 0;
  const priceColor =
    priceFlash === "up"
      ? "#22c55e"
      : priceFlash === "down"
        ? "#ef4444"
        : "#ffffff";

  const stats = [
    {
      label: "Mark",
      // OLD CODE: value: fmt(ticker.markPrice || currentPrice),
      value: fmt(currentPrice && Number(currentPrice) > 0 ? currentPrice : ticker.markPrice),
      color: "#a855f7",
    },
    {
      label: "Index",
      value: fmt(ticker.indexPrice || currentPrice),
      color: "#6366f1",
    },
    { label: "24H High", value: fmt(ticker.highPrice), color: "#22c55e" },
    { label: "24H Low", value: fmt(ticker.lowPrice), color: "#ef4444" },
    { label: "Open", value: fmt(ticker.openPrice), color: "#9ca3af" },
    {
      label: "Funding",
      value: fmtRate(ticker.fundingRate),
      color: Number(ticker.fundingRate) >= 0 ? "#22c55e" : "#ef4444",
    },
    { label: "Vol INR", value: fmtVol(ticker.quoteVolume), color: "#9ca3af" },
    { label: "Vol Base", value: fmtVol(ticker.baseVolume), color: "#9ca3af" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: S.bg,
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        overflow: "hidden",
        height: "100%",
        fontFamily: S.mono,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        width: "100%",
      }}
    >
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "10px 14px 8px",
          background: S.bgBar,
          borderBottom: S.border,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "nowrap",
          minWidth: 0,
        }}
      >
        {/* Coin icon */}
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
              background: COIN_ICON_BG,
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
            {BASE_COIN[0]}
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
              {BASE_COIN}/INR
              <span
                style={{
                  marginLeft: 7,
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#7c3aed",
                  background: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.35)",
                  borderRadius: 4,
                  padding: "1px 5px",
                  letterSpacing: "0.5px",
                  verticalAlign: "middle",
                }}
              >
                PERP
              </span>
            </div>
            {/* <div style={{ color: "#4b5563", fontSize: 10, marginTop: 1 }}>
              PI42 · Futures
            </div> */}
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

        {/* Live price + pct */}
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
            {Math.abs(Number(ticker.percentageChange)).toFixed(2)}%
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
          title={isConnected ? "Live" : "Reconnecting…"}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            flexShrink: 0,
            background: isConnected ? "#22c55e" : "#6b7280",
            boxShadow: isConnected ? "0 0 6px #22c55e" : "none",
          }}
        />
      </div>

      {/* ── TOOLBAR ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "5px 14px",
          borderBottom: S.border,
          background: S.bgBar,
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.interval}
            onClick={() => setActiveTimeframe(tf.interval)}
            style={{
              padding: "4px 9px",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "inherit",
              borderRadius: 5,
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
              background:
                activeTimeframe === tf.interval
                  ? "rgba(245,158,11,0.18)"
                  : "transparent",
              color: activeTimeframe === tf.interval ? "rgb(159, 11, 245)" : "#6b7280",
              outline:
                activeTimeframe === tf.interval
                  ? "1px solid rgba(245,158,11,0.35)"
                  : "none",
            }}
          >
            {tf.label}
          </button>
        ))}

        <div
          style={{
            width: 1,
            height: 16,
            background: "rgba(255,255,255,0.08)",
            margin: "0 4px",
          }}
        />

        {CHART_TYPES.map((ct) => (
          <button
            key={ct.style}
            onClick={() => setActiveStyle(ct.style)}
            style={{
              padding: "4px 9px",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "inherit",
              borderRadius: 5,
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
              background:
                activeStyle === ct.style
                  ? "rgba(168,85,247,0.18)"
                  : "transparent",
              color: activeStyle === ct.style ? "#a855f7" : "#6b7280",
              outline:
                activeStyle === ct.style
                  ? "1px solid rgba(168,85,247,0.35)"
                  : "none",
            }}
          >
            {ct.label}
          </button>
        ))}

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <span
            style={{ fontSize: 10, color: "#6b7280", whiteSpace: "nowrap" }}
          >
            MA 30 <span style={{ color: "#f59e0b", fontWeight: 700 }}>—</span>
          </span>
          <span
            style={{ fontSize: 10, color: "#6b7280", whiteSpace: "nowrap" }}
          >
            EMA 9 <span style={{ color: "#a855f7", fontWeight: 700 }}>—</span>
          </span>
        </div>
      </div>

      {/* ── CHART ───────────────────────────────────────────────────── */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }}>
        <div id="tv_futures_chart" style={{ width: "100%", height: "100%" }} />
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "5px 14px",
          borderTop: S.border,
          background: S.bgBar,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 10,
          color: "#374151",
          flexWrap: "nowrap",
          gap: 8,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          Powered by TradingView · BTC/INR Perpetual via PI42
        </span>
        <span style={{ flexShrink: 0 }}>
          {isConnected ? (
            <span style={{ color: "#22c55e" }}>● LIVE</span>
          ) : (
            <span style={{ color: "#6b7280" }}>○ Reconnecting…</span>
          )}
        </span>
      </div>
    </div>
  );
};

export default TradingChart;
