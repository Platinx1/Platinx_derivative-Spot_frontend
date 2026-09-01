

// import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
// import { io } from "socket.io-client";
// import { useTradingContext } from "../../context/TradingContext";
// import { useUser } from "../../context/UserContext";
// import { toast } from "react-toastify";
// const BASE_URL = import.meta.env.VITE_API_BASE_URL;
// const WALLET_API_BASE = `${BASE_URL}/api/fno/futures-wallet/details`;
// const PLACE_ORDER_API = `${BASE_URL}/api/fno/place-order-with-leverage`;
// const PAIR_INFO_API = `${BASE_URL}/api/fno/pair-by-name`;
// const WS_URL = "https://pilot-fawss.pi42.com";
// const FEE_RATE = 0.004;

// function roundUp(num, precision) {
//   const factor = Math.pow(10, precision);
//   return Math.ceil(num * factor) / factor;
// }

// function calculateMinQuantity(notionalVal, marketPrice, quantityPrecision) {
//   if (!notionalVal || !marketPrice || marketPrice <= 0) return 0;
//   const minQty = notionalVal / marketPrice;
//   return roundUp(minQty, quantityPrecision);
// }

// const calculateMarginRequirement = ({
//   quantity,
//   price,
//   leverage,
//   marginBufferPercentage = 1,
//   pricePrecision = 0,
// }) => {
//   if (!quantity || quantity <= 0 || !price || price <= 0 || !leverage || leverage <= 0) {
//     return 0;
//   }
//   const contractVal = quantity * price;
//   const marginReq = (contractVal * (1 + marginBufferPercentage / 100)) / leverage;
//   const roundedMargin = Number(marginReq.toFixed(pricePrecision));
//   return roundedMargin;
// };

// function validatePrecision(value, precision) {
//   if (value === undefined || value === null || value === "") return true;
//   const valueStr = value.toString();
//   if (!valueStr.includes(".")) return true;
//   const decimalPart = valueStr.split(".")[1] || "";
//   return decimalPart.length <= precision;
// }

// function truncateToPrecision(valueStr, precision) {
//   if (!valueStr || !valueStr.toString().includes(".")) return valueStr;
//   const [intPart, decPart] = valueStr.toString().split(".");
//   if (precision === 0) return intPart;
//   return `${intPart}.${(decPart || "").slice(0, precision)}`;
// }

// function precisionLabel(precision) {
//   return precision === 0 ? "0dp (integers only)" : `${precision}dp`;
// }

// function precisionHint(precision) {
//   if (precision === 0) return "whole numbers only (0 decimals)";
//   return `up to ${precision} decimal place${precision === 1 ? "" : "s"}`;
// }

// const S = {
//   wrap: {
//     width: "100%",
//     background: "#0d1117",
//     fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
//     fontSize: 12,
//     color: "#c9d1d9",
//     display: "flex",
//     flexDirection: "column",
//     minHeight: 640,
//     userSelect: "none",
//   },
//   sideTabs: {
//     display: "grid",
//     gridTemplateColumns: "1fr 1fr",
//     borderBottom: "1px solid #21262d",
//   },
//   sideBtn: (active, color) => ({
//     padding: "10px 0",
//     fontSize: 13,
//     fontWeight: 700,
//     letterSpacing: "0.3px",
//     background: active ? color + "18" : "transparent",
//     color: active ? color : "#8b949e",
//     border: "none",
//     borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
//     cursor: "pointer",
//     transition: "all 0.15s",
//   }),
//   typeTabs: {
//     display: "flex",
//     gap: 0,
//     padding: "0 10px",
//     borderBottom: "1px solid #21262d",
//     background: "#0d1117",
//     overflowX: "auto",
//   },
//   typeBtn: (active) => ({
//     padding: "8px 9px",
//     fontSize: 10.5,
//     fontWeight: 600,
//     color: active ? "#e6edf3" : "#8b949e",
//     background: "transparent",
//     border: "none",
//     borderBottom: active ? "2px solid #7B2FF7" : "2px solid transparent",
//     cursor: "pointer",
//     letterSpacing: "0.3px",
//     transition: "color 0.15s",
//     whiteSpace: "nowrap",
//     flexShrink: 0,
//   }),
//   body: {
//     padding: "10px 12px",
//     display: "flex",
//     flexDirection: "column",
//     gap: 7,
//   },
//   inputWrap: (focused, error) => ({
//     background: "#161b22",
//     border: `1px solid ${error ? "#7B2FF7" : focused ? "rgba(240,185,11,0.5)" : "#21262d"}`,
//     borderRadius: 6,
//     padding: "0 10px",
//     display: "flex",
//     alignItems: "center",
//     height: 36,
//     gap: 6,
//     transition: "border-color 0.15s",
//   }),
//   inputLabel: {
//     fontSize: 10,
//     color: "#8b949e",
//     whiteSpace: "nowrap",
//     flexShrink: 0,
//   },
//   input: {
//     background: "transparent",
//     border: "none",
//     outline: "none",
//     fontSize: 13,
//     fontWeight: 600,
//     color: "#e6edf3",
//     width: "100%",
//     fontVariantNumeric: "tabular-nums",
//     fontFamily: "inherit",
//   },
//   inputUnit: { fontSize: 11, color: "#8b949e", flexShrink: 0 },
//   pctRow: { display: "flex", gap: 5 },
//   pctBtn: (active, color) => ({
//     flex: 1,
//     padding: "5px 0",
//     borderRadius: 4,
//     border: `1px solid ${active ? color : "#21262d"}`,
//     background: active ? color + "1a" : "transparent",
//     color: active ? color : "#8b949e",
//     fontSize: 11,
//     fontWeight: 700,
//     cursor: "pointer",
//     fontFamily: "inherit",
//     transition: "all 0.12s",
//   }),
//   track: {
//     height: 2,
//     background: "#21262d",
//     borderRadius: 2,
//     overflow: "hidden",
//     margin: "1px 0 3px",
//   },
//   placeBtn: (color, disabled, textColor) => ({
//     width: "100%",
//     padding: "11px 0",
//     fontSize: 13,
//     fontWeight: 700,
//     letterSpacing: "0.5px",
//     border: "none",
//     borderRadius: 6,
//     background: disabled ? color + "33" : color,
//     color: disabled ? color : textColor || "#000",
//     cursor: disabled ? "not-allowed" : "pointer",
//     opacity: disabled ? 0.7 : 1,
//     fontFamily: "inherit",
//     transition: "opacity 0.15s",
//   }),
//   dot: (connected) => ({
//     width: 5,
//     height: 5,
//     borderRadius: "50%",
//     background: connected ? "#0ecb81" : "#8b949e",
//     flexShrink: 0,
//   }),
//   precisionWarning: {
//     display: "flex",
//     flexDirection: "column",
//     gap: 3,
//     padding: "5px 8px",
//     borderRadius: 4,
//     background: "rgba(246,70,93,0.08)",
//     border: "1px solid rgba(246,70,93,0.35)",
//     fontSize: 10,
//     color: "#f6465d",
//   },
//   precisionFixBtn: (accentColor) => ({
//     marginTop: 2,
//     alignSelf: "flex-start",
//     background: "transparent",
//     border: `1px solid ${accentColor}`,
//     borderRadius: 4,
//     color: accentColor,
//     fontSize: 10,
//     fontWeight: 700,
//     padding: "2px 8px",
//     cursor: "pointer",
//     fontFamily: "inherit",
//   }),
// };

// const TinyInput = ({
//   label,
//   value,
//   onChange,
//   placeholder,
//   unit,
//   error,
//   readOnly,
//   action,
// }) => {
//   const [focused, setFocused] = useState(false);
//   return (
//     <div style={S.inputWrap(focused, error)}>
//       {label && <span style={S.inputLabel}>{label}</span>}
//       <input
//         style={{ ...S.input, color: error ? "#f6465d" : "#e6edf3" }}
//         value={value}
//         onChange={onChange}
//         placeholder={placeholder || "0"}
//         onFocus={() => setFocused(true)}
//         onBlur={() => setFocused(false)}
//         readOnly={readOnly}
//       />
//       {action ? (
//         <button
//           type="button"
//           onMouseDown={(e) => e.preventDefault()}
//           onClick={action.onClick}
//           style={{
//             background: "transparent",
//             border: "none",
//             color: "#a855f7",
//             fontSize: 11,
//             fontWeight: 700,
//             cursor: "pointer",
//             flexShrink: 0,
//             padding: 0,
//             fontFamily: "inherit",
//           }}
//         >
//           {action.label}
//         </button>
//       ) : (
//         unit && <span style={S.inputUnit}>{unit}</span>
//       )}
//     </div>
//   );
// };

// const fmtINR = (n) =>
//   "₹" +
//   Number(n).toLocaleString("en-IN", {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   });

// const fmtPrice = (n) => {
//   const v = Number(n);
//   if (!v) return "—";
//   const d = v >= 10000 ? 0 : v >= 100 ? 1 : 2;
//   return (
//     "₹" +
//     v.toLocaleString("en-IN", {
//       minimumFractionDigits: d,
//       maximumFractionDigits: d,
//     })
//   );
// };

// const fmtQty = (n, precision = 4) => {
//   if (!n || n === 0) return "—";
//   return Number(n).toFixed(precision);
// };

// const PRESET_LEVERAGES = [1, 2, 5, 10, 20, 50, 75, 100];

// const ORDER_TYPE_LABELS = {
//   market: "Market",
//   limit: "Limit",
//   stop_limit: "Stop Limit",
//   stop_market: "Stop Market",
// };

// const OrderSummaryTooltip = ({
//   orderValue,
//   reqMargin,
//   feeRate,
//   isTaker,
//   isOverMargin,
//   availableINR,
//   isBelowMinQty,
//   minQuantity,
//   quantityPrecision,
//   BASE_COIN,
//   displayMargin,
//   displayFee,
//   isMinQtyReference,
// }) => {
//   const [visible, setVisible] = useState(false);
//   const timerRef = useRef(null);

//   const show = () => {
//     clearTimeout(timerRef.current);
//     setVisible(true);
//   };
//   const hide = () => {
//     timerRef.current = setTimeout(() => setVisible(false), 120);
//   };

//   return (
//     <div
//       style={{ position: "relative" }}
//       onMouseEnter={show}
//       onMouseLeave={hide}
//       onTouchStart={show}
//       onTouchEnd={hide}
//     >
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           fontSize: 10,
//           color: "#8b949e",
//           padding: "2px 0",
//           cursor: "default",
//         }}
//       >
//         <span>
//           Margin{isMinQtyReference ? " (min)" : ""}:{" "}
//           <span
//             style={{
//               color: isOverMargin ? "#f6465d" : "#c9d1d9",
//               fontWeight: 600,
//             }}
//           >
//             {displayMargin > 0 ? fmtINR(displayMargin) : "—"}
//           </span>{" "}
//           <span style={{ color: "#444c56", fontSize: 9 }}>
//             ▲ hover for details
//           </span>
//         </span>
//         <span>
//           Fee{isMinQtyReference ? " (min)" : ""}:{" "}
//           <span style={{ color: "#c9d1d9" }}>
//             {displayFee > 0 ? fmtINR(displayFee) : "—"}
//           </span>
//         </span>
//       </div>

//       {visible && (orderValue > 0 || displayFee > 0) && (
//         <div
//           onMouseEnter={show}
//           onMouseLeave={hide}
//           style={{
//             position: "absolute",
//             top: "calc(100% + 6px)",
//             left: 0,
//             right: 0,
//             background: "#1c2128",
//             border: "1px solid #30363d",
//             borderRadius: 6,
//             padding: "8px 10px",
//             zIndex: 999,
//             display: "flex",
//             flexDirection: "column",
//             gap: 5,
//             boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
//             pointerEvents: "auto",
//           }}
//         >
//           <div
//             style={{
//               fontSize: 10,
//               color: "#8b949e",
//               fontWeight: 700,
//               marginBottom: 2,
//               letterSpacing: "0.4px",
//             }}
//           >
//             ORDER SUMMARY
//           </div>
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               fontSize: 11,
//             }}
//           >
//             <span style={{ color: "#8b949e" }}>Order Value</span>
//             <span style={{ color: "#c9d1d9", fontWeight: 600 }}>
//               {orderValue > 0 ? fmtINR(orderValue) : "—"}
//             </span>
//           </div>
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               fontSize: 11,
//             }}
//           >
//             <span style={{ color: "#8b949e" }}>Margin Req.</span>
//             <span
//               style={{
//                 color: isOverMargin ? "#f6465d" : "#c9d1d9",
//                 fontWeight: 600,
//               }}
//             >
//               {fmtINR(displayMargin)}
//             </span>
//           </div>
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               fontSize: 11,
//             }}
//           >
//             <span style={{ color: "#8b949e" }}>
//               Est. Fee ({isTaker ? "Taker" : "Maker"})
//             </span>
//             <span style={{ color: "#8b949e" }}>
//               {fmtINR(displayFee)}
//             </span>
//           </div>
//           {isBelowMinQty && (
//             <div
//               style={{
//                 fontSize: 10,
//                 color: "#f6465d",
//                 borderTop: "1px solid #21262d",
//                 paddingTop: 4,
//                 marginTop: 2,
//               }}
//             >
//               Min qty: {fmtQty(minQuantity, quantityPrecision)} {BASE_COIN}
//             </div>
//           )}
//           {isOverMargin && (
//             <div
//               style={{
//                 fontSize: 10,
//                 color: "#f6465d",
//                 borderTop: "1px solid #21262d",
//                 paddingTop: 4,
//                 marginTop: 2,
//               }}
//             >
//               Exceeds balance by {fmtINR(displayMargin - availableINR)}
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// const OrderPlacement = () => {
//   const { selectedPair, selectedPrice, updateSelectedPrice } =
//     useTradingContext();
//   const { userId, balanceVersion, refreshBalance } = useUser();

//   const rawSymbol = selectedPair?.symbol || "BTC/INR";
//   const BASE_COIN = rawSymbol.split("/")[0].toUpperCase();
//   const SYMBOL = BASE_COIN + "INR";

//   const [side, setSide] = useState("buy");
//   const [orderType, setOrderType] = useState("market");
//   const [price, setPrice] = useState("");
//   const [stopPrice, setStopPrice] = useState("");
//   const [quantity, setQuantity] = useState("");
//   const [leverage, setLeverage] = useState(1);
//   const [customLeverage, setCustomLeverage] = useState("");
//   const [levModalOpen, setLevModalOpen] = useState(false);

//   const [selectedWalletPct, setSelectedWalletPct] = useState(null);
//   const [customAmount, setCustomAmount] = useState("");

//   const [availableINR, setAvailableINR] = useState(0);
//   const [loadingBalance, setLoadingBalance] = useState(true);
//   const [placing, setPlacing] = useState(false);
//   const [placed, setPlaced] = useState(false);
//   const [error, setError] = useState(null);

//   const [markPrice, setMarkPrice] = useState(0);
//   const [priceDir, setPriceDir] = useState("up");
//   const [isConnected, setIsConnected] = useState(false);
//   const markPriceRef = useRef(0);
//   const currentSymbolRef = useRef(SYMBOL);

//   const [pairInfo, setPairInfo] = useState(null);
//   const [loadingPairInfo, setLoadingPairInfo] = useState(false);
//   const [isQuantityManual, setIsQuantityManual] = useState(false);

//   useEffect(() => {
//     currentSymbolRef.current = SYMBOL;
//   }, [SYMBOL]);

//   useEffect(() => {
//     markPriceRef.current = 0;
//     setMarkPrice(0);
//     setPriceDir("up");
//     setQuantity("");
//     setPrice("");
//     setStopPrice("");
//     setCustomLeverage("");
//     setSelectedWalletPct(null);
//     setCustomAmount("");
//     setPairInfo(null);
//     setIsQuantityManual(false);
//   }, [SYMBOL]);

//   useEffect(() => {
//     if (selectedPrice && selectedPrice > 0) {
//       setPrice(selectedPrice.toString());
//       setOrderType("limit");
//       setSelectedWalletPct(null);
//       setCustomAmount("");
//       setQuantity("");
//       setIsQuantityManual(false);
//       updateSelectedPrice(null);
//     }
//   }, [selectedPrice, updateSelectedPrice]);

//   const loadPairInfo = useCallback(async () => {
//     setLoadingPairInfo(true);
//     try {
//       const res = await fetch(`${PAIR_INFO_API}?name=${SYMBOL}`);
//       const json = await res.json();
//       if (json.status && json.data) {
//         const d = json.data;
//         setPairInfo({
//           notional: parseFloat(d.notional) || 0,
//           quantityPrecision: parseInt(d.quantityPrecision, 10),
//           maxLeverage: parseInt(d.maxLeverage, 10) || 100,
//           makerFee: d.makerFee ?? FEE_RATE * 100,
//           takerFee: d.takerFee ?? FEE_RATE * 100,
//           pricePrecision: parseInt(d.pricePrecision, 10),
//           marginBufferPercentage: parseFloat(d.marginBufferPercentage) || 0,
//         });
//       }
//     } catch (e) {
//       console.error("Failed to fetch pair info:", e);
//     } finally {
//       setLoadingPairInfo(false);
//     }
//   }, [SYMBOL]);

//   useEffect(() => {
//     loadPairInfo();
//   }, [loadPairInfo]);

//   useEffect(() => {
//     const symLower = SYMBOL.toLowerCase();
//     const socket = io(WS_URL, {
//       transports: ["websocket"],
//       reconnection: true,
//       reconnectionDelay: 3000,
//       forceNew: true,
//     });
//     socket.on("connect", () => {
//       setIsConnected(true);
//       socket.emit("subscribe", { params: [`${symLower}@markPrice`] });
//     });
//     socket.on("markPriceUpdate", (data) => {
//       if (!data?.p) return;
//       const evtSym = (data.s || "").toUpperCase();
//       if (evtSym && evtSym !== currentSymbolRef.current) return;
//       const newPrice = Number(data.p);
//       setPriceDir(
//         newPrice >= (markPriceRef.current || newPrice) ? "up" : "down",
//       );
//       markPriceRef.current = newPrice;
//       setMarkPrice(newPrice);
//     });
//     socket.on("disconnect", () => setIsConnected(false));
//     return () => socket.disconnect();
//   }, [SYMBOL]);

//   const loadBalance = useCallback(async () => {
//     if (!userId) return;
//     setLoadingBalance(true);
//     try {
//       const res = await fetch(
//         `${WALLET_API_BASE}?user=${userId}&marginAsset=INR`,
//       );
//       const json = await res.json();
//       if (json.status && json.data)
//         setAvailableINR(parseFloat(json.data.withdrawableBalance) || 0);
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setLoadingBalance(false);
//     }
//   }, [userId]);

//   useEffect(() => {
//     if (userId) loadBalance();
//   }, [userId, loadBalance]);

//   useEffect(() => {
//     if (userId && balanceVersion > 0) loadBalance();
//   }, [balanceVersion, userId, loadBalance]);

//   const currentLeverage = customLeverage
//     ? parseFloat(customLeverage) || 1
//     : leverage;

//   const requiresPrice = orderType === "limit" || orderType === "stop_limit";
//   const requiresStopPrice =
//     orderType === "stop_limit" || orderType === "stop_market";
//   const isTakerType = orderType === "market" || orderType === "stop_market";

//   const effectivePrice = requiresPrice ? parseFloat(price) || 0 : markPrice;

//   const quantityPrecision = Number.isFinite(pairInfo?.quantityPrecision)
//     ? pairInfo.quantityPrecision
//     : 4;
//   const pricePrecision = Number.isFinite(pairInfo?.pricePrecision)
//     ? pairInfo.pricePrecision
//     : 0;

//   const minQuantity =
//     pairInfo && effectivePrice > 0
//       ? calculateMinQuantity(
//         pairInfo.notional,
//         effectivePrice,
//         quantityPrecision,
//       )
//       : 0;
//   const marginBufferPercentage = pairInfo ? pairInfo.marginBufferPercentage : 0;

//   const qty = parseFloat(quantity) || 0;

//   const currentPrice = requiresPrice ? parseFloat(price) || 0 : markPrice;

//   // ── USER'S margin (based on entered quantity) ──
//   const reqMargin =
//     qty > 0 && currentPrice > 0
//       ? calculateMarginRequirement({
//         quantity: qty,
//         price: currentPrice,
//         leverage: currentLeverage,
//         marginBufferPercentage,
//         pricePrecision,
//       })
//       : 0;

//   // ── MIN QTY margin (shown when user hasn't entered quantity) ──
//   const minQtyMargin =
//     minQuantity > 0 && currentPrice > 0
//       ? calculateMarginRequirement({
//         quantity: minQuantity,
//         price: currentPrice,
//         leverage: currentLeverage,
//         marginBufferPercentage,
//         pricePrecision,
//       })
//       : 0;

//   // ── MIN QTY fee (shown when user hasn't entered quantity) ──
//   const minQtyFee = minQuantity > 0 && currentPrice > 0
//     ? minQuantity * currentPrice * (pairInfo
//       ? (isTakerType ? pairInfo.takerFee : pairInfo.makerFee) / 100
//       : FEE_RATE)
//     : 0;

//   // Precision validation
//   const qtyPrecisionOk = validatePrecision(quantity, quantityPrecision);
//   const pricePrecisionOk = requiresPrice
//     ? validatePrecision(price, pricePrecision)
//     : true;
//   const stopPricePrecisionOk = requiresStopPrice
//     ? validatePrecision(stopPrice, pricePrecision)
//     : true;

//   const qtyPrecisionError =
//     quantity && !qtyPrecisionOk
//       ? `Quantity: ${precisionHint(quantityPrecision)} for ${SYMBOL}`
//       : null;
//   const pricePrecisionError =
//     requiresPrice && price && !pricePrecisionOk
//       ? `Price: ${precisionHint(pricePrecision)} for ${SYMBOL}`
//       : null;
//   const stopPricePrecisionError =
//     requiresStopPrice && stopPrice && !stopPricePrecisionOk
//       ? `Stop Price: ${precisionHint(pricePrecision)} for ${SYMBOL}`
//       : null;

//   const handleFixQtyPrecision = () =>
//     setQuantity(truncateToPrecision(quantity, quantityPrecision));
//   const handleFixPricePrecision = () =>
//     setPrice(truncateToPrecision(price, pricePrecision));
//   const handleFixStopPricePrecision = () =>
//     setStopPrice(truncateToPrecision(stopPrice, pricePrecision));

//   // ── Directional stop-order validation ──
//   // Buy/Long: stopPrice > market price, and (for stop-limit) price > stopPrice
//   // Sell/Short: stopPrice < market price, and (for stop-limit) price < stopPrice
//   const isBuySide = side === "buy";
//   const tick = Math.pow(10, -pricePrecision);

//   const stopPriceVsMarketError =
//     requiresStopPrice && stopPrice && markPrice > 0
//       ? isBuySide
//         ? parseFloat(stopPrice) <= markPrice
//           ? `Stop price must be greater than current market price (${fmtPrice(markPrice)})`
//           : null
//         : parseFloat(stopPrice) >= markPrice
//           ? `Stop price must be less than current market price (${fmtPrice(markPrice)})`
//           : null
//       : null;

//   const priceVsStopPriceError =
//     orderType === "stop_limit" && price && stopPrice
//       ? isBuySide
//         ? parseFloat(price) <= parseFloat(stopPrice)
//           ? "Price must be greater than stop price"
//           : null
//         : parseFloat(price) >= parseFloat(stopPrice)
//           ? "Price must be less than stop price"
//           : null
//       : null;

//   const stopPriceFixSuggestion =
//     markPrice > 0
//       ? (isBuySide ? markPrice + tick : markPrice - tick).toFixed(
//         pricePrecision,
//       )
//       : null;

//   const priceFixSuggestion =
//     stopPrice && parseFloat(stopPrice) > 0
//       ? (isBuySide
//         ? parseFloat(stopPrice) + tick
//         : parseFloat(stopPrice) - tick
//       ).toFixed(pricePrecision)
//       : null;

//   const handleFixStopVsMarket = () => {
//     if (stopPriceFixSuggestion) setStopPrice(stopPriceFixSuggestion);
//   };
//   const handleFixPriceVsStop = () => {
//     if (priceFixSuggestion) setPrice(priceFixSuggestion);
//   };

//   const hasStopOrderError =
//     !!stopPriceVsMarketError || !!priceVsStopPriceError;

//   // ── FIXED: Auto-calculate Amount from Size (margin-based, not order value) ──
//   useEffect(() => {
//     if (
//       !selectedWalletPct ||
//       effectivePrice <= 0 ||
//       availableINR <= 0 ||
//       isQuantityManual
//     )
//       return;
//     const margin = (availableINR * selectedWalletPct) / 100;
//     const qty = (margin * currentLeverage) / effectivePrice;
//     setQuantity(
//       truncateToPrecision(
//         qty.toFixed(quantityPrecision + 2),
//         quantityPrecision,
//       ),
//     );
//   }, [
//     selectedWalletPct,
//     availableINR,
//     currentLeverage,
//     quantityPrecision,
//     isQuantityManual,
//     effectivePrice,
//   ]);

//   // ── FIXED: When user types in Amount, calculate Size from margin ──
//   useEffect(() => {
//     if (selectedWalletPct || effectivePrice <= 0 || isQuantityManual) return;
//     const amt = parseFloat(customAmount) || 0;
//     if (amt <= 0) {
//       if (!customAmount) setQuantity("");
//       return;
//     }
//     // amt is margin amount → qty = (margin * leverage) / price
//     const qty = (amt * currentLeverage) / effectivePrice;
//     setQuantity(
//       truncateToPrecision(
//         qty.toFixed(quantityPrecision + 2),
//         quantityPrecision,
//       ),
//     );
//   }, [
//     customAmount,
//     currentLeverage,
//     effectivePrice,
//     quantityPrecision,
//     selectedWalletPct,
//     isQuantityManual,
//   ]);

//   // ── NEW: When user types in Size, auto-update Amount to show MARGIN ──
//   const derivedAmountFromQty = useMemo(() => {
//     if (qty > 0 && currentPrice > 0) {
//       return reqMargin; // Show MARGIN in Amount field, not order value
//     }
//     return "";
//   }, [qty, currentPrice, reqMargin]);

//   const handleQuantityChange = (e) => {
//     const val = e.target.value;
//     setQuantity(val);
//     setIsQuantityManual(true);
//     // When user types in Size, clear customAmount so derivedAmountFromQty shows
//     setCustomAmount("");
//     setSelectedWalletPct(null);
//   };

//   const handleSelectPct = (pct) => {
//     setSelectedWalletPct(pct);
//     if (pct) setCustomAmount("");
//     setIsQuantityManual(false);
//   };

//   const handleCustomAmount = (val) => {
//     setCustomAmount(val);
//     setSelectedWalletPct(null);
//     setIsQuantityManual(false);
//   };

//   const resetForm = () => {
//     setQuantity("");
//     setPrice("");
//     setStopPrice("");
//     setCustomLeverage("");
//     setSelectedWalletPct(null);
//     setCustomAmount("");
//     setError(null);
//     setIsQuantityManual(false);
//   };

//   const quantityNum = parseFloat(quantity) || 0;

//   const orderValue = quantityNum * currentPrice;

//   const isOverMargin = reqMargin > availableINR;
//   const isBelowMinQty =
//     minQuantity > 0 && quantityNum > 0 && quantityNum < minQuantity;

//   const isBuy = side === "buy";
//   const accentColor = isBuy ? "#0ecb81" : "#f6465d";
//   const hasPrecisionError =
//     !!qtyPrecisionError || !!pricePrecisionError || !!stopPricePrecisionError;

//   const canPlace =
//     !placing &&
//     !isOverMargin &&
//     !isBelowMinQty &&
//     !hasPrecisionError &&
//     !hasStopOrderError &&
//     quantityNum > 0 &&
//     (!requiresPrice || (parseFloat(price) || 0) > 0) &&
//     (!requiresStopPrice || (parseFloat(stopPrice) || 0) > 0);

//   const customAmtNum = parseFloat(customAmount) || 0;
//   const progressPct = selectedWalletPct
//     ? selectedWalletPct
//     : availableINR > 0
//       ? Math.min((customAmtNum / availableINR) * 100, 100)
//       : 0;

//   const feeRate = pairInfo
//     ? (isTakerType ? pairInfo.takerFee : pairInfo.makerFee) / 100
//     : FEE_RATE;

//   const handlePlaceOrder = async () => {
//     if (!canPlace || !userId) return;
//     if (!validatePrecision(quantity, quantityPrecision)) {
//       setError(
//         `Quantity can have maximum ${quantityPrecision} decimal place(s) for ${SYMBOL}`,
//       );
//       return;
//     }
//     if (requiresPrice && !validatePrecision(price, pricePrecision)) {
//       setError(
//         `Price can have maximum ${pricePrecision} decimal place(s) for ${SYMBOL}`,
//       );
//       return;
//     }
//     if (requiresStopPrice && !validatePrecision(stopPrice, pricePrecision)) {
//       setError(
//         `Stop price can have maximum ${pricePrecision} decimal place(s) for ${SYMBOL}`,
//       );
//       return;
//     }
//     if (stopPriceVsMarketError) {
//       setError(stopPriceVsMarketError);
//       return;
//     }
//     if (priceVsStopPriceError) {
//       setError(priceVsStopPriceError);
//       return;
//     }
//     setPlacing(true);
//     setError(null);
//     const payload = {
//       user: userId.toString(),
//       placeType: "ORDER_FORM",
//       quantity: parseFloat(parseFloat(quantity).toFixed(quantityPrecision)),
//       reduceOnly: false,
//       side: side.toUpperCase(),
//       symbol: SYMBOL,
//       type: orderType.toUpperCase(), // MARKET | LIMIT | STOP_LIMIT | STOP_MARKET
//       price: requiresPrice
//         ? parseFloat(parseFloat(price).toFixed(pricePrecision))
//         : null,
//       stopPrice: requiresStopPrice
//         ? parseFloat(parseFloat(stopPrice).toFixed(pricePrecision))
//         : null,
//       leverage: currentLeverage,
//       marginAsset: "INR",
//       stopLossPrice: null,
//       takeProfitPrice: null,
//     };
//     try {
//       const res = await fetch(PLACE_ORDER_API, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });
//       const data = await res.json();
//       if (res.ok && data.status) {
//         toast.success("Order placed successfully!");
//         setPlaced(true);
//         resetForm();
//         setTimeout(() => setPlaced(false), 2500);
//         loadBalance();
//         refreshBalance();
//       } else {
//         setError(data.message || "Order failed");
//       }
//     } catch {
//       setError("Network error");
//     } finally {
//       setPlacing(false);
//     }
//   };

//   const placeBtnLabel = () => {
//     if (placing) return "Processing…";
//     if (placed) return "✓ Order Placed";
//     if (hasPrecisionError) return "Fix Precision Errors";
//     if (hasStopOrderError) return "Fix Stop Price";
//     if (isOverMargin) return "Insufficient Margin";
//     if (isBelowMinQty)
//       return `Min Qty: ${fmtQty(minQuantity, quantityPrecision)} ${BASE_COIN}`;
//     return isBuy ? "Buy / Long" : "Sell / Short";
//   };

//   const placeBtnColor = placed
//     ? "#0ecb81"
//     : hasPrecisionError || hasStopOrderError || isOverMargin || isBelowMinQty
//       ? "#f6465d"
//       : accentColor;

//   // ── Determine what to show in footer ──
//   const hasUserEnteredQty = quantityNum > 0;
//   const displayMargin = hasUserEnteredQty ? reqMargin : minQtyMargin;
//   const displayFee = hasUserEnteredQty ? orderValue * feeRate : minQtyFee;
//   const isMinQtyReference = !hasUserEnteredQty && minQuantity > 0;

//   // ── FIXED: Amount field shows margin when Size is typed, or customAmount when user types directly ──
//   const amountDisplayValue = customAmount !== ""
//     ? customAmount
//     : derivedAmountFromQty !== ""
//       ? derivedAmountFromQty.toFixed(2)
//       : "";

//   return (
//     <div style={S.wrap}>
//       {/* BUY / SELL */}
//       <div style={S.sideTabs}>
//         <button
//           style={S.sideBtn(isBuy, "#0ecb81")}
//           onClick={() => setSide("buy")}
//         >
//           Long
//         </button>
//         <button
//           style={S.sideBtn(!isBuy, "#f6465d")}
//           onClick={() => setSide("sell")}
//         >
//           Short
//         </button>
//       </div>

//       {/* ORDER TYPE */}
//       <div style={S.typeTabs}>
//         {Object.keys(ORDER_TYPE_LABELS).map((t) => (
//           <button
//             key={t}
//             style={S.typeBtn(orderType === t)}
//             onClick={() => {
//               setOrderType(t);
//               setSelectedWalletPct(null);
//               setCustomAmount("");
//               setQuantity("");
//               setIsQuantityManual(false);
//             }}
//           >
//             {ORDER_TYPE_LABELS[t]}
//           </button>
//         ))}
//       </div>

//       <div style={S.body}>
//         {/* Mark price + balance */}
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//           }}
//         >
//           <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
//             <div style={S.dot(isConnected)} />
//             <span style={{ fontSize: 11, color: "#8b949e" }}>Mark</span>
//             <span
//               style={{
//                 fontSize: 13,
//                 fontWeight: 700,
//                 color: priceDir === "up" ? "#0ecb81" : "#f6465d",
//                 fontVariantNumeric: "tabular-nums",
//               }}
//             >
//               {markPrice > 0 ? fmtPrice(markPrice) : "—"}
//             </span>
//             <span
//               style={{
//                 fontSize: 11,
//                 color: priceDir === "up" ? "#0ecb81" : "#f6465d",
//               }}
//             >
//               {priceDir === "up" ? "▲" : "▼"}
//             </span>
//           </div>
//           <div style={{ fontSize: 11, color: "#8b949e" }}>
//             Avbl:{" "}
//             <span style={{ color: "#c9d1d9", fontWeight: 600 }}>
//               {loadingBalance ? "..." : fmtINR(availableINR)}
//             </span>
//           </div>
//         </div>

//         {/* Min Order + Qty Precision */}
//         {pairInfo && !loadingPairInfo && (
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "space-between",
//               padding: "4px 8px",
//               borderRadius: 4,
//               background: "rgba(14,203,129,0.04)",
//               border: "1px solid #21262d",
//               fontSize: 10,
//             }}
//           >
//             <span style={{ color: "#8b949e" }}>
//               Min order:{" "}
//               <span
//                 style={{
//                   color: isBelowMinQty ? "#f6465d" : "#c9d1d9",
//                   fontWeight: 700,
//                   fontVariantNumeric: "tabular-nums",
//                 }}
//               >
//                 {loadingPairInfo
//                   ? "…"
//                   : `${fmtQty(minQuantity, quantityPrecision)} ${BASE_COIN}`}
//                 {isBelowMinQty && " ⚠"}
//               </span>
//             </span>
//             <span style={{ color: "#8b949e" }}>
//               Qty:{" "}
//               <span style={{ color: "#a855f7", fontWeight: 700 }}>
//                 {precisionLabel(quantityPrecision)}
//               </span>
//               {requiresPrice && (
//                 <span style={{ marginLeft: 6 }}>
//                   Price:{" "}
//                   <span style={{ color: "#a855f7", fontWeight: 700 }}>
//                     {precisionLabel(pricePrecision)}
//                   </span>
//                 </span>
//               )}
//             </span>
//           </div>
//         )}

//         {/* Quantity Precision Error */}
//         {qtyPrecisionError && (
//           <div style={S.precisionWarning}>
//             <span>⚠ {qtyPrecisionError}</span>
//             <button
//               style={S.precisionFixBtn(accentColor)}
//               onClick={handleFixQtyPrecision}
//             >
//               Fix → {truncateToPrecision(quantity, quantityPrecision) || "—"}
//             </button>
//           </div>
//         )}

//         {/* Price Precision Error */}
//         {pricePrecisionError && (
//           <div style={S.precisionWarning}>
//             <span>⚠ {pricePrecisionError}</span>
//             <button
//               style={S.precisionFixBtn(accentColor)}
//               onClick={handleFixPricePrecision}
//             >
//               Fix → {truncateToPrecision(price, pricePrecision) || "—"}
//             </button>
//           </div>
//         )}

//         {/* Stop Price Precision Error */}
//         {stopPricePrecisionError && (
//           <div style={S.precisionWarning}>
//             <span>⚠ {stopPricePrecisionError}</span>
//             <button
//               style={S.precisionFixBtn(accentColor)}
//               onClick={handleFixStopPricePrecision}
//             >
//               Fix → {truncateToPrecision(stopPrice, pricePrecision) || "—"}
//             </button>
//           </div>
//         )}

//         {/* Stop Price vs Market Price direction error */}
//         {stopPriceVsMarketError && (
//           <div style={S.precisionWarning}>
//             <span>⚠ {stopPriceVsMarketError}</span>
//             <button
//               style={S.precisionFixBtn(accentColor)}
//               onClick={handleFixStopVsMarket}
//             >
//               Fix → {stopPriceFixSuggestion || "—"}
//             </button>
//           </div>
//         )}

//         {/* Price vs Stop Price direction error */}
//         {priceVsStopPriceError && (
//           <div style={S.precisionWarning}>
//             <span>⚠ {priceVsStopPriceError}</span>
//             <button
//               style={S.precisionFixBtn(accentColor)}
//               onClick={handleFixPriceVsStop}
//             >
//               Fix → {priceFixSuggestion || "—"}
//             </button>
//           </div>
//         )}

//         {/* API error */}
//         {error && (
//           <div
//             style={{
//               fontSize: 11,
//               color: "#f6465d",
//               background: "rgba(246,70,93,0.1)",
//               borderRadius: 4,
//               padding: "4px 8px",
//             }}
//           >
//             {error}
//           </div>
//         )}

//         {/* Stop Price (Stop Limit / Stop Market) */}
//         {requiresStopPrice && (
//           <TinyInput
//             label="Stop price"
//             value={stopPrice}
//             onChange={(e) => setStopPrice(e.target.value)}
//             placeholder="0.00"
//             error={!!stopPricePrecisionError || !!stopPriceVsMarketError}
//             action={{
//               label: "Last",
//               onClick: () =>
//                 setStopPrice(markPrice > 0 ? markPrice.toString() : ""),
//             }}
//           />
//         )}

//         {/* Price (Limit / Stop Limit) */}
//         {requiresPrice && (
//           <TinyInput
//             label="Price"
//             value={price}
//             onChange={(e) => setPrice(e.target.value)}
//             placeholder="0.00"
//             unit="INR"
//             error={!!pricePrecisionError || !!priceVsStopPriceError}
//           />
//         )}

//         {/* Size Input */}
//         <TinyInput
//           label="Size"
//           value={quantity}
//           onChange={handleQuantityChange}
//           placeholder={
//             minQuantity > 0
//               ? `Min ${fmtQty(minQuantity, quantityPrecision)}`
//               : "0"
//           }
//           unit={BASE_COIN}
//           error={
//             isOverMargin
//               ? "Exceeds margin"
//               : isBelowMinQty
//                 ? "Below min qty"
//                 : qtyPrecisionError
//                   ? "Bad precision"
//                   : null
//           }
//         />

//         {/* ── FIXED: Amount Input now shows MARGIN when Size is typed ── */}
//         <TinyInput
//           label="Amount"
//           value={amountDisplayValue}
//           onChange={(e) => handleCustomAmount(e.target.value)}
//           placeholder="0.00"
//           unit="INR"
//           readOnly={customAmount === "" && derivedAmountFromQty !== ""} // Read-only when auto-derived
//         />

//         {/* Percentage Buttons */}
//         <div style={S.pctRow}>
//           {[10, 25, 50, 100].map((pct) => (
//             <button
//               key={pct}
//               style={S.pctBtn(selectedWalletPct === pct, accentColor)}
//               onClick={() =>
//                 handleSelectPct(selectedWalletPct === pct ? null : pct)
//               }
//             >
//               {pct}%
//             </button>
//           ))}
//         </div>

//         {/* Progress Bar */}
//         <div style={S.track}>
//           <div
//             style={{
//               height: "100%",
//               width: progressPct ? `${progressPct}%` : "0%",
//               background: progressPct > 0 ? accentColor : "transparent",
//               borderRadius: 2,
//               transition: "width 0.2s ease",
//             }}
//           />
//         </div>

//         {/* Leverage */}
//         <div
//           onClick={() => setLevModalOpen(true)}
//           style={{
//             background: "#161b22",
//             border: "1px solid #21262d",
//             borderRadius: 6,
//             padding: "7px 10px",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "space-between",
//             cursor: "pointer",
//           }}
//         >
//           <span style={{ fontSize: 11, color: "#8b949e" }}>Leverage</span>
//           <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//             <span style={{ fontSize: 12, fontWeight: 700, color: "#a855f7" }}>
//               {currentLeverage}x
//             </span>
//             {pairInfo && (
//               <span style={{ fontSize: 10, color: "#8b949e" }}>
//                 / {pairInfo.maxLeverage}x max
//               </span>
//             )}
//             <span style={{ fontSize: 10, color: "#8b949e" }}>▶</span>
//           </div>
//         </div>

//         {/* Place Order Button */}
//         <button
//           style={S.placeBtn(placeBtnColor, !canPlace, isBuy ? "#000" : "#fff")}
//           onClick={handlePlaceOrder}
//           disabled={!canPlace}
//         >
//           {placeBtnLabel()}
//         </button>

//         {/* Footer with hover tooltip */}
//         <OrderSummaryTooltip
//           orderValue={orderValue}
//           reqMargin={reqMargin}
//           feeRate={feeRate}
//           isTaker={isTakerType}
//           isOverMargin={isOverMargin}
//           availableINR={availableINR}
//           isBelowMinQty={isBelowMinQty}
//           minQuantity={minQuantity}
//           quantityPrecision={quantityPrecision}
//           BASE_COIN={BASE_COIN}
//           displayMargin={displayMargin}
//           displayFee={displayFee}
//           isMinQtyReference={isMinQtyReference}
//         />
//       </div>

//       {/* Leverage Modal */}
//       {levModalOpen && (
//         <div
//           onClick={(e) => {
//             if (e.target === e.currentTarget) setLevModalOpen(false);
//           }}
//           style={{
//             position: "fixed",
//             inset: 0,
//             background: "rgba(0,0,0,0.65)",
//             display: "flex",
//             alignItems: "flex-end",
//             justifyContent: "center",
//             zIndex: 9999,
//           }}
//         >
//           <div
//             style={{
//               background: "#161b22",
//               border: "1px solid #30363d",
//               borderRadius: "12px 12px 0 0",
//               padding: "20px 16px 32px",
//               width: "100%",
//               maxWidth: 420,
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 marginBottom: 16,
//               }}
//             >
//               <span style={{ fontSize: 14, fontWeight: 700, color: "#e6edf3" }}>
//                 Set Leverage
//               </span>
//               <button
//                 onClick={() => setLevModalOpen(false)}
//                 style={{
//                   background: "#21262d",
//                   border: "none",
//                   borderRadius: "50%",
//                   width: 28,
//                   height: 28,
//                   color: "#8b949e",
//                   fontSize: 16,
//                   cursor: "pointer",
//                 }}
//               >
//                 ✕
//               </button>
//             </div>
//             <div
//               style={{
//                 textAlign: "center",
//                 fontSize: 26,
//                 fontWeight: 700,
//                 color: "#7B2FF7",
//                 marginBottom: 4,
//               }}
//             >
//               {currentLeverage}x
//             </div>
//             {pairInfo && (
//               <div
//                 style={{
//                   textAlign: "center",
//                   fontSize: 10,
//                   color: "#8b949e",
//                   marginBottom: 14,
//                 }}
//               >
//                 Max leverage for {BASE_COIN}: {pairInfo.maxLeverage}x
//               </div>
//             )}
//             <div
//               style={{
//                 display: "flex",
//                 flexWrap: "wrap",
//                 gap: 6,
//                 marginBottom: 16,
//               }}
//             >
//               {PRESET_LEVERAGES.filter(
//                 (lev) => !pairInfo || lev <= pairInfo.maxLeverage,
//               ).map((lev) => {
//                 const isActive = leverage === lev && !customLeverage;
//                 return (
//                   <button
//                     key={lev}
//                     onClick={() => {
//                       setLeverage(lev);
//                       setCustomLeverage("");
//                     }}
//                     style={{
//                       padding: "6px 14px",
//                       borderRadius: 6,
//                       border: `1px solid ${isActive ? "#7B2FF7" : "#21262d"}`,
//                       background: isActive
//                         ? "rgba(123,47,247,0.12)"
//                         : "transparent",
//                       color: isActive ? "#7B2FF7" : "#8b949e",
//                       fontSize: 12,
//                       fontWeight: 700,
//                       cursor: "pointer",
//                     }}
//                   >
//                     {lev}x
//                   </button>
//                 );
//               })}
//             </div>
//             <input
//               type="range"
//               min="1"
//               max={pairInfo?.maxLeverage || 100}
//               step="1"
//               value={customLeverage || leverage}
//               onChange={(e) => {
//                 const val = parseInt(e.target.value);
//                 if (PRESET_LEVERAGES.includes(val)) {
//                   setLeverage(val);
//                   setCustomLeverage("");
//                 } else {
//                   setCustomLeverage(val.toString());
//                   setLeverage(1);
//                 }
//               }}
//               style={{
//                 width: "100%",
//                 accentColor: "#7B2FF7",
//                 cursor: "pointer",
//                 marginBottom: 4,
//               }}
//             />
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 fontSize: 10,
//                 color: "#8b949e",
//                 marginBottom: 14,
//               }}
//             >
//               <span>1x</span>
//               <span>{Math.round((pairInfo?.maxLeverage || 100) * 0.25)}x</span>
//               <span>{Math.round((pairInfo?.maxLeverage || 100) * 0.5)}x</span>
//               <span>{Math.round((pairInfo?.maxLeverage || 100) * 0.75)}x</span>
//               <span>{pairInfo?.maxLeverage || 100}x</span>
//             </div>
//             <div
//               style={{
//                 background: "#0d1117",
//                 border: "1px solid #21262d",
//                 borderRadius: 6,
//                 padding: "0 10px",
//                 display: "flex",
//                 alignItems: "center",
//                 height: 38,
//                 gap: 6,
//                 marginBottom: 18,
//               }}
//             >
//               <span style={{ fontSize: 10, color: "#8b949e" }}>Custom</span>
//               <input
//                 type="number"
//                 min="1"
//                 max={pairInfo?.maxLeverage || 100}
//                 placeholder="Leverage"
//                 value={customLeverage}
//                 onChange={(e) => {
//                   const val = e.target.value;
//                   const maxLev = pairInfo?.maxLeverage || 100;
//                   if (val && parseInt(val) > maxLev) return;
//                   setCustomLeverage(val);
//                   if (val) setLeverage(1);
//                 }}
//                 style={{
//                   background: "transparent",
//                   border: "none",
//                   outline: "none",
//                   fontSize: 13,
//                   fontWeight: 600,
//                   color: "#e6edf3",
//                   width: "100%",
//                 }}
//               />
//               <span style={{ fontSize: 11, color: "#8b949e" }}>x</span>
//             </div>
//             <button
//               onClick={() => setLevModalOpen(false)}
//               style={{
//                 width: "100%",
//                 padding: "12px 0",
//                 fontSize: 13,
//                 fontWeight: 700,
//                 border: "none",
//                 borderRadius: 6,
//                 background: "#7B2FF7",
//                 color: "#000",
//                 cursor: "pointer",
//               }}
//             >
//               Confirm
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default OrderPlacement;




import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { io } from "socket.io-client";
import { useTradingContext } from "../../context/TradingContext";
import { useUser } from "../../context/UserContext";
import { toast } from "react-toastify";
import Cookies from "js-cookie";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const WALLET_API_BASE = `${BASE_URL}/api/fno/futures-wallet/details`;
const PLACE_ORDER_API = `${BASE_URL}/api/fno/place-order-with-leverage`;
const PAIR_INFO_API = `${BASE_URL}/api/fno/pair-by-name`;
const WS_URL = "https://pilot-fawss.pi42.com";
const FEE_RATE = 0.004;

function roundUp(num, precision) {
  const factor = Math.pow(10, precision);
  return Math.ceil(num * factor) / factor;
}

function calculateMinQuantity(notionalVal, marketPrice, quantityPrecision) {
  if (!notionalVal || !marketPrice || marketPrice <= 0) return 0;
  const minQty = notionalVal / marketPrice;
  return roundUp(minQty, quantityPrecision);
}

const calculateMarginRequirement = ({
  quantity,
  price,
  leverage,
  marginBufferPercentage = 1,
  pricePrecision = 0,
}) => {
  if (!quantity || quantity <= 0 || !price || price <= 0 || !leverage || leverage <= 0) {
    return 0;
  }
  const contractVal = quantity * price;
  const marginReq = (contractVal * (1 + marginBufferPercentage / 100)) / leverage;
  const roundedMargin = Number(marginReq.toFixed(pricePrecision));
  return roundedMargin;
};

function validatePrecision(value, precision) {
  if (value === undefined || value === null || value === "") return true;
  const valueStr = value.toString();
  if (!valueStr.includes(".")) return true;
  const decimalPart = valueStr.split(".")[1] || "";
  return decimalPart.length <= precision;
}

function truncateToPrecision(valueStr, precision) {
  if (!valueStr || !valueStr.toString().includes(".")) return valueStr;
  const [intPart, decPart] = valueStr.toString().split(".");
  if (precision === 0) return intPart;
  return `${intPart}.${(decPart || "").slice(0, precision)}`;
}

function precisionLabel(precision) {
  return precision === 0 ? "0dp (integers only)" : `${precision}dp`;
}

function precisionHint(precision) {
  if (precision === 0) return "whole numbers only (0 decimals)";
  return `up to ${precision} decimal place${precision === 1 ? "" : "s"}`;
}

const S = {
  wrap: {
    width: "100%",
    background: "#0d1117",
    fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
    fontSize: 12,
    color: "#c9d1d9",
    display: "flex",
    flexDirection: "column",
    minHeight: 640,
    userSelect: "none",
    position: "relative",
  },
  sideTabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    borderBottom: "1px solid #21262d",
  },
  sideBtn: (active, color) => ({
    padding: "10px 0",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.3px",
    background: active ? color + "18" : "transparent",
    color: active ? color : "#8b949e",
    border: "none",
    borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
    cursor: "pointer",
    transition: "all 0.15s",
  }),
  typeTabs: {
    display: "flex",
    gap: 0,
    padding: "0 10px",
    borderBottom: "1px solid #21262d",
    background: "#0d1117",
    overflowX: "auto",
  },
  typeBtn: (active) => ({
    padding: "8px 9px",
    fontSize: 10.5,
    fontWeight: 600,
    color: active ? "#e6edf3" : "#8b949e",
    background: "transparent",
    border: "none",
    borderBottom: active ? "2px solid #7B2FF7" : "2px solid transparent",
    cursor: "pointer",
    letterSpacing: "0.3px",
    transition: "color 0.15s",
    whiteSpace: "nowrap",
    flexShrink: 0,
  }),
  body: {
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  inputWrap: (focused, error) => ({
    background: "#161b22",
    border: `1px solid ${error ? "#7B2FF7" : focused ? "rgba(240,185,11,0.5)" : "#21262d"}`,
    borderRadius: 6,
    padding: "0 10px",
    display: "flex",
    alignItems: "center",
    height: 36,
    gap: 6,
    transition: "border-color 0.15s",
  }),
  inputLabel: {
    fontSize: 10,
    color: "#8b949e",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  input: {
    background: "transparent",
    border: "none",
    outline: "none",
    fontSize: 13,
    fontWeight: 600,
    color: "#e6edf3",
    width: "100%",
    fontVariantNumeric: "tabular-nums",
    fontFamily: "inherit",
  },
  inputUnit: { fontSize: 11, color: "#8b949e", flexShrink: 0 },
  pctRow: { display: "flex", gap: 5 },
  pctBtn: (active, color) => ({
    flex: 1,
    padding: "5px 0",
    borderRadius: 4,
    border: `1px solid ${active ? color : "#21262d"}`,
    background: active ? color + "1a" : "transparent",
    color: active ? color : "#8b949e",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.12s",
  }),
  track: {
    height: 2,
    background: "#21262d",
    borderRadius: 2,
    overflow: "hidden",
    margin: "1px 0 3px",
  },
  placeBtn: (color, disabled, textColor) => ({
    width: "100%",
    padding: "11px 0",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.5px",
    border: "none",
    borderRadius: 6,
    background: disabled ? color + "33" : color,
    color: disabled ? color : textColor || "#000",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    fontFamily: "inherit",
    transition: "opacity 0.15s",
  }),
  dot: (connected) => ({
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: connected ? "#0ecb81" : "#8b949e",
    flexShrink: 0,
  }),
  precisionWarning: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: "5px 8px",
    borderRadius: 4,
    background: "rgba(246,70,93,0.08)",
    border: "1px solid rgba(246,70,93,0.35)",
    fontSize: 10,
    color: "#f6465d",
  },
  precisionFixBtn: (accentColor) => ({
    marginTop: 2,
    alignSelf: "flex-start",
    background: "transparent",
    border: `1px solid ${accentColor}`,
    borderRadius: 4,
    color: accentColor,
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  tpSlRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 2px",
    cursor: "pointer",
  },
  tpSlCheckbox: (checked) => ({
    width: 16,
    height: 16,
    borderRadius: 4,
    border: `1px solid ${checked ? "#a855f7" : "#3a4149"}`,
    background: checked ? "#a855f7" : "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.12s",
  }),
  tpSlLabel: {
    fontSize: 12,
    color: "#8b949e",
    fontWeight: 500,
  },
};

const TinyInput = ({
  label,
  value,
  onChange,
  placeholder,
  unit,
  error,
  readOnly,
  action,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={S.inputWrap(focused, error)}>
      {label && <span style={S.inputLabel}>{label}</span>}
      <input
        style={{ ...S.input, color: error ? "#f6465d" : "#e6edf3" }}
        value={value}
        onChange={onChange}
        placeholder={placeholder || "0"}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        readOnly={readOnly}
      />
      {action ? (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={action.onClick}
          style={{
            background: "transparent",
            border: "none",
            color: "#a855f7",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            flexShrink: 0,
            padding: 0,
            fontFamily: "inherit",
          }}
        >
          {action.label}
        </button>
      ) : (
        unit && <span style={S.inputUnit}>{unit}</span>
      )}
    </div>
  );
};

const fmtINR = (n) =>
  "₹" +
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtPrice = (n) => {
  const v = Number(n);
  if (!v) return "—";
  const d = v >= 10000 ? 0 : v >= 100 ? 1 : 2;
  return (
    "₹" +
    v.toLocaleString("en-IN", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    })
  );
};

const fmtQty = (n, precision = 4) => {
  if (!n || n === 0) return "—";
  return Number(n).toFixed(precision);
};

const PRESET_LEVERAGES = [1, 2, 5, 10, 20, 50, 75, 100];

const ORDER_TYPE_LABELS = {
  market: "Market",
  limit: "Limit",
  stop_limit: "Stop Limit",
  stop_market: "Stop Market",
};

const OrderSummaryTooltip = ({
  orderValue,
  reqMargin,
  feeRate,
  isTaker,
  isOverMargin,
  availableINR,
  isBelowMinQty,
  minQuantity,
  quantityPrecision,
  BASE_COIN,
  displayMargin,
  displayFee,
  isMinQtyReference,
}) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const show = () => {
    clearTimeout(timerRef.current);
    setVisible(true);
  };
  const hide = () => {
    timerRef.current = setTimeout(() => setVisible(false), 120);
  };

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onTouchStart={show}
      onTouchEnd={hide}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "#8b949e",
          padding: "2px 0",
          cursor: "default",
        }}
      >
        <span>
          Margin{isMinQtyReference ? " (min)" : ""}:{" "}
          <span
            style={{
              color: isOverMargin ? "#f6465d" : "#c9d1d9",
              fontWeight: 600,
            }}
          >
            {displayMargin > 0 ? fmtINR(displayMargin) : "—"}
          </span>{" "}
          <span style={{ color: "#444c56", fontSize: 9 }}>
            ▲ hover for details
          </span>
        </span>
        <span>
          Fee{isMinQtyReference ? " (min)" : ""}:{" "}
          <span style={{ color: "#c9d1d9" }}>
            {displayFee > 0 ? fmtINR(displayFee) : "—"}
          </span>
        </span>
      </div>

      {visible && (orderValue > 0 || displayFee > 0) && (
        <div
          onMouseEnter={show}
          onMouseLeave={hide}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#1c2128",
            border: "1px solid #30363d",
            borderRadius: 6,
            padding: "8px 10px",
            zIndex: 999,
            display: "flex",
            flexDirection: "column",
            gap: 5,
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#8b949e",
              fontWeight: 700,
              marginBottom: 2,
              letterSpacing: "0.4px",
            }}
          >
            ORDER SUMMARY
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
            }}
          >
            <span style={{ color: "#8b949e" }}>Order Value</span>
            <span style={{ color: "#c9d1d9", fontWeight: 600 }}>
              {orderValue > 0 ? fmtINR(orderValue) : "—"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
            }}
          >
            <span style={{ color: "#8b949e" }}>Margin Req.</span>
            <span
              style={{
                color: isOverMargin ? "#f6465d" : "#c9d1d9",
                fontWeight: 600,
              }}
            >
              {fmtINR(displayMargin)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
            }}
          >
            <span style={{ color: "#8b949e" }}>
              Est. Fee ({isTaker ? "Taker" : "Maker"})
            </span>
            <span style={{ color: "#8b949e" }}>
              {fmtINR(displayFee)}
            </span>
          </div>
          {isBelowMinQty && (
            <div
              style={{
                fontSize: 10,
                color: "#f6465d",
                borderTop: "1px solid #21262d",
                paddingTop: 4,
                marginTop: 2,
              }}
            >
              Min qty: {fmtQty(minQuantity, quantityPrecision)} {BASE_COIN}
            </div>
          )}
          {isOverMargin && (
            <div
              style={{
                fontSize: 10,
                color: "#f6465d",
                borderTop: "1px solid #21262d",
                paddingTop: 4,
                marginTop: 2,
              }}
            >
              Exceeds balance by {fmtINR(displayMargin - availableINR)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const OrderPlacement = () => {
  const { selectedPair, selectedPrice, updateSelectedPrice } =
    useTradingContext();
  const { userId, balanceVersion, refreshBalance } = useUser();

  const rawSymbol = selectedPair?.symbol || "BTC/INR";
  const BASE_COIN = rawSymbol.split("/")[0].toUpperCase();
  const SYMBOL = BASE_COIN + "INR";

  const [side, setSide] = useState("buy");
  const [orderType, setOrderType] = useState("market");
  const [price, setPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [leverage, setLeverage] = useState(1);
  const [customLeverage, setCustomLeverage] = useState("");
  const [levModalOpen, setLevModalOpen] = useState(false);

  const [selectedWalletPct, setSelectedWalletPct] = useState(null);
  const [customAmount, setCustomAmount] = useState("");

  const [availableINR, setAvailableINR] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState(null);

  const [markPrice, setMarkPrice] = useState(0);
  const [priceDir, setPriceDir] = useState("up");
  const [isConnected, setIsConnected] = useState(false);
  const markPriceRef = useRef(0);
  const currentSymbolRef = useRef(SYMBOL);

  const [pairInfo, setPairInfo] = useState(null);
  const [loadingPairInfo, setLoadingPairInfo] = useState(false);
  const [isQuantityManual, setIsQuantityManual] = useState(false);

  const [takeProfitPrice, setTakeProfitPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [tpSlModalOpen, setTpSlModalOpen] = useState(false);
  const [tpSlActiveTab, setTpSlActiveTab] = useState("takeProfit"); // "takeProfit" | "stopLoss"
  const [tpSlKeyNotesOpen, setTpSlKeyNotesOpen] = useState(false);
  const [tpSlQuantity, setTpSlQuantity] = useState("");
  const tpSlBodyRef = useRef(null);

  useEffect(() => {
    if (tpSlKeyNotesOpen && tpSlBodyRef.current) {
      const timer = setTimeout(() => {
        if (tpSlBodyRef.current) {
          tpSlBodyRef.current.scrollTo({
            top: tpSlBodyRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [tpSlKeyNotesOpen]);

  useEffect(() => {
    currentSymbolRef.current = SYMBOL;
  }, [SYMBOL]);

  useEffect(() => {
    markPriceRef.current = 0;
    setMarkPrice(0);
    setPriceDir("up");
    setQuantity("");
    setPrice("");
    setStopPrice("");
    setCustomLeverage("");
    setSelectedWalletPct(null);
    setCustomAmount("");
    setPairInfo(null);
    setIsQuantityManual(false);
    setTakeProfitPrice("");
    setStopLossPrice("");
    setTpSlModalOpen(false);
    setTpSlActiveTab("takeProfit");
    setTpSlQuantity("");
    setTpSlKeyNotesOpen(false);
  }, [SYMBOL]);

  useEffect(() => {
    if (selectedPrice && selectedPrice > 0) {
      setPrice(selectedPrice.toString());
      setOrderType("limit");
      setSelectedWalletPct(null);
      setCustomAmount("");
      setQuantity("");
      setIsQuantityManual(false);
      updateSelectedPrice(null);
    }
  }, [selectedPrice, updateSelectedPrice]);

  const loadPairInfo = useCallback(async () => {
    setLoadingPairInfo(true);
    try {
      const res = await fetch(`${PAIR_INFO_API}?name=${SYMBOL}`);
      const json = await res.json();
      if (json.status && json.data) {
        const d = json.data;
        setPairInfo({
          notional: parseFloat(d.notional) || 0,
          quantityPrecision: parseInt(d.quantityPrecision, 10),
          maxLeverage: parseInt(d.maxLeverage, 10) || 100,
          makerFee: d.makerFee ?? FEE_RATE * 100,
          takerFee: d.takerFee ?? FEE_RATE * 100,
          pricePrecision: parseInt(d.pricePrecision, 10),
          marginBufferPercentage: parseFloat(d.marginBufferPercentage) || 0,
        });
      }
    } catch (e) {
      console.error("Failed to fetch pair info:", e);
    } finally {
      setLoadingPairInfo(false);
    }
  }, [SYMBOL]);

  useEffect(() => {
    loadPairInfo();
  }, [loadPairInfo]);

  useEffect(() => {
    const symLower = SYMBOL.toLowerCase();
    const socket = io(WS_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 3000,
      forceNew: true,
    });
    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("subscribe", { params: [`${symLower}@markPrice`] });
    });
    socket.on("markPriceUpdate", (data) => {
      if (!data?.p) return;
      const evtSym = (data.s || "").toUpperCase();
      if (evtSym && evtSym !== currentSymbolRef.current) return;
      const newPrice = Number(data.p);
      setPriceDir(
        newPrice >= (markPriceRef.current || newPrice) ? "up" : "down",
      );
      markPriceRef.current = newPrice;
      setMarkPrice(newPrice);
    });
    socket.on("disconnect", () => setIsConnected(false));
    return () => socket.disconnect();
  }, [SYMBOL]);

  const loadBalance = useCallback(async () => {
    const activeUserId = userId || localStorage.getItem("user_id") || Cookies.get("user_id");
    if (!activeUserId) return;
    setLoadingBalance(true);
    try {
      const res = await fetch(
        `${WALLET_API_BASE}?user=${activeUserId}&marginAsset=INR`,
      );
      const json = await res.json();
      if (json.status && json.data) {
        const bal =
          json.data.withdrawableBalance ??
          json.data.availableBalance ??
          json.data.totalBalance ??
          0;
        setAvailableINR(parseFloat(bal) || 0);
      }
    } catch (e) {
      console.error("Failed to load balance:", e);
    } finally {
      setLoadingBalance(false);
    }
  }, [userId]);

  useEffect(() => {
    loadBalance();
  }, [userId, loadBalance]);

  useEffect(() => {
    if (balanceVersion > 0) loadBalance();
  }, [balanceVersion, loadBalance]);

  const currentLeverage = customLeverage
    ? parseFloat(customLeverage) || 1
    : leverage;

  const requiresPrice = orderType === "limit" || orderType === "stop_limit";
  const requiresStopPrice =
    orderType === "stop_limit" || orderType === "stop_market";
  const isTakerType = orderType === "market" || orderType === "stop_market";

  const effectivePrice = requiresPrice ? parseFloat(price) || 0 : markPrice;

  const quantityPrecision = Number.isFinite(pairInfo?.quantityPrecision)
    ? pairInfo.quantityPrecision
    : 4;
  const pricePrecision = Number.isFinite(pairInfo?.pricePrecision)
    ? pairInfo.pricePrecision
    : 0;

  const minQuantity =
    pairInfo && effectivePrice > 0
      ? calculateMinQuantity(
        pairInfo.notional,
        effectivePrice,
        quantityPrecision,
      )
      : 0;
  const marginBufferPercentage = pairInfo ? pairInfo.marginBufferPercentage : 0;

  const qty = parseFloat(quantity) || 0;

  const currentPrice = requiresPrice ? parseFloat(price) || 0 : markPrice;

  // ── Take Profit / Stop Loss (modal-driven) ──
  const showTpSl =
    parseFloat(takeProfitPrice) > 0 || parseFloat(stopLossPrice) > 0;

  const tpSlQtyNum = parseFloat(tpSlQuantity) || 0;
  const tpSlActivePriceStr =
    tpSlActiveTab === "takeProfit" ? takeProfitPrice : stopLossPrice;
  const tpSlActivePriceNum = parseFloat(tpSlActivePriceStr) || 0;

  // Reference entry price used for Est. P&L / Liquidation estimate in the TP/SL modal
  const tpSlEntryPrice = requiresPrice ? parseFloat(price) || 0 : markPrice;

  const tpSlEstPnl =
    tpSlQtyNum > 0 && tpSlActivePriceNum > 0 && tpSlEntryPrice > 0
      ? (side === "buy"
        ? tpSlActivePriceNum - tpSlEntryPrice
        : tpSlEntryPrice - tpSlActivePriceNum) * tpSlQtyNum
      : null;

  // Rough isolated-margin liquidation price estimate (informational only)
  const tpSlLiqPriceEstimate =
    tpSlEntryPrice > 0 && currentLeverage > 0
      ? side === "buy"
        ? tpSlEntryPrice * (1 - 1 / currentLeverage)
        : tpSlEntryPrice * (1 + 1 / currentLeverage)
      : null;

  // ── USER'S margin (based on entered quantity) ──
  const reqMargin =
    qty > 0 && currentPrice > 0
      ? calculateMarginRequirement({
        quantity: qty,
        price: currentPrice,
        leverage: currentLeverage,
        marginBufferPercentage,
        pricePrecision,
      })
      : 0;

  // ── MIN QTY margin (shown when user hasn't entered quantity) ──
  const minQtyMargin =
    minQuantity > 0 && currentPrice > 0
      ? calculateMarginRequirement({
        quantity: minQuantity,
        price: currentPrice,
        leverage: currentLeverage,
        marginBufferPercentage,
        pricePrecision,
      })
      : 0;

  // ── MIN QTY fee (shown when user hasn't entered quantity) ──
  const minQtyFee = minQuantity > 0 && currentPrice > 0
    ? minQuantity * currentPrice * (pairInfo
      ? (isTakerType ? pairInfo.takerFee : pairInfo.makerFee) / 100
      : FEE_RATE)
    : 0;

  // Precision validation
  const qtyPrecisionOk = validatePrecision(quantity, quantityPrecision);
  const pricePrecisionOk = requiresPrice
    ? validatePrecision(price, pricePrecision)
    : true;
  const stopPricePrecisionOk = requiresStopPrice
    ? validatePrecision(stopPrice, pricePrecision)
    : true;

  const qtyPrecisionError =
    quantity && !qtyPrecisionOk
      ? `Quantity: ${precisionHint(quantityPrecision)} for ${SYMBOL}`
      : null;
  const pricePrecisionError =
    requiresPrice && price && !pricePrecisionOk
      ? `Price: ${precisionHint(pricePrecision)} for ${SYMBOL}`
      : null;
  const stopPricePrecisionError =
    requiresStopPrice && stopPrice && !stopPricePrecisionOk
      ? `Stop Price: ${precisionHint(pricePrecision)} for ${SYMBOL}`
      : null;

  const handleFixQtyPrecision = () =>
    setQuantity(truncateToPrecision(quantity, quantityPrecision));
  const handleFixPricePrecision = () =>
    setPrice(truncateToPrecision(price, pricePrecision));
  const handleFixStopPricePrecision = () =>
    setStopPrice(truncateToPrecision(stopPrice, pricePrecision));

  // ── Directional stop-order validation ──
  // Buy/Long: stopPrice > market price, and (for stop-limit) price > stopPrice
  // Sell/Short: stopPrice < market price, and (for stop-limit) price < stopPrice
  const isBuySide = side === "buy";
  const tick = Math.pow(10, -pricePrecision);

  const stopPriceVsMarketError =
    requiresStopPrice && stopPrice && markPrice > 0
      ? isBuySide
        ? parseFloat(stopPrice) <= markPrice
          ? `Stop price must be greater than current market price (${fmtPrice(markPrice)})`
          : null
        : parseFloat(stopPrice) >= markPrice
          ? `Stop price must be less than current market price (${fmtPrice(markPrice)})`
          : null
      : null;

  const priceVsStopPriceError =
    orderType === "stop_limit" && price && stopPrice
      ? isBuySide
        ? parseFloat(price) <= parseFloat(stopPrice)
          ? "Price must be greater than stop price"
          : null
        : parseFloat(price) >= parseFloat(stopPrice)
          ? "Price must be less than stop price"
          : null
      : null;

  const stopPriceFixSuggestion =
    markPrice > 0
      ? (isBuySide ? markPrice + tick : markPrice - tick).toFixed(
        pricePrecision,
      )
      : null;

  const priceFixSuggestion =
    stopPrice && parseFloat(stopPrice) > 0
      ? (isBuySide
        ? parseFloat(stopPrice) + tick
        : parseFloat(stopPrice) - tick
      ).toFixed(pricePrecision)
      : null;

  const handleFixStopVsMarket = () => {
    if (stopPriceFixSuggestion) setStopPrice(stopPriceFixSuggestion);
  };
  const handleFixPriceVsStop = () => {
    if (priceFixSuggestion) setPrice(priceFixSuggestion);
  };

  const hasStopOrderError =
    !!stopPriceVsMarketError || !!priceVsStopPriceError;

  // ── FIXED: Auto-calculate Amount from Size (margin-based, not order value) ──
  useEffect(() => {
    if (
      !selectedWalletPct ||
      effectivePrice <= 0 ||
      availableINR <= 0 ||
      isQuantityManual
    )
      return;
    const margin = (availableINR * selectedWalletPct) / 100;
    const qty = (margin * currentLeverage) / effectivePrice;
    setQuantity(
      truncateToPrecision(
        qty.toFixed(quantityPrecision + 2),
        quantityPrecision,
      ),
    );
  }, [
    selectedWalletPct,
    availableINR,
    currentLeverage,
    quantityPrecision,
    isQuantityManual,
    effectivePrice,
  ]);

  // ── FIXED: When user types in Amount, calculate Size from margin ──
  useEffect(() => {
    if (selectedWalletPct || effectivePrice <= 0 || isQuantityManual) return;
    const amt = parseFloat(customAmount) || 0;
    if (amt <= 0) {
      if (!customAmount) setQuantity("");
      return;
    }
    // amt is margin amount → qty = (margin * leverage) / price
    const qty = (amt * currentLeverage) / effectivePrice;
    setQuantity(
      truncateToPrecision(
        qty.toFixed(quantityPrecision + 2),
        quantityPrecision,
      ),
    );
  }, [
    customAmount,
    currentLeverage,
    effectivePrice,
    quantityPrecision,
    selectedWalletPct,
    isQuantityManual,
  ]);

  // ── NEW: When user types in Size, auto-update Amount to show MARGIN ──
  const derivedAmountFromQty = useMemo(() => {
    if (qty > 0 && currentPrice > 0) {
      return reqMargin; // Show MARGIN in Amount field, not order value
    }
    return "";
  }, [qty, currentPrice, reqMargin]);

  const handleQuantityChange = (e) => {
    const val = e.target.value;
    setQuantity(val);
    setIsQuantityManual(true);
    // When user types in Size, clear customAmount so derivedAmountFromQty shows
    setCustomAmount("");
    setSelectedWalletPct(null);
  };

  const handleSelectPct = (pct) => {
    setSelectedWalletPct(pct);
    if (pct) setCustomAmount("");
    setIsQuantityManual(false);
  };

  const handleCustomAmount = (val) => {
    setCustomAmount(val);
    setSelectedWalletPct(null);
    setIsQuantityManual(false);
  };

  // ── Take Profit / Stop Loss modal handlers ──
  // const handleOpenTpSlModal = () => {
  //   setTpSlQuantity((prev) => prev || quantity || "");
  //   setTpSlActiveTab((prev) =>
  //     takeProfitPrice || !stopLossPrice ? "takeProfit" : prev,
  //   );
  //   setTpSlModalOpen(true);
  // };


  const handleOpenTpSlModal = () => {
    // Modal khulte hi dialog ki quantity ko outer Size field se sync karo
    setTpSlQuantity(quantity || "");
    setTpSlActiveTab((prev) =>
      takeProfitPrice || !stopLossPrice ? "takeProfit" : prev,
    );
    setTpSlModalOpen(true);
  };

  const handleTpSlAddMax = () => {
    setTpSlQuantity(quantity || fmtQty(minQuantity, quantityPrecision));
  };

  const handleTpSlPriceChange = (e) => {
    const val = e.target.value;
    if (tpSlActiveTab === "takeProfit") setTakeProfitPrice(val);
    else setStopLossPrice(val);
  };

  // const handleConfirmTpSl = () => {
  //   const val =
  //     tpSlActiveTab === "takeProfit" ? takeProfitPrice : stopLossPrice;
  //   if (!val || parseFloat(val) <= 0) return;
  //   setTpSlModalOpen(false);
  // };


  const handleConfirmTpSl = () => {
    const val =
      tpSlActiveTab === "takeProfit" ? takeProfitPrice : stopLossPrice;
    if (!val || parseFloat(val) <= 0) return;

    // Confirm hone par dialog ki quantity wapas outer Size field me sync karo
    if (tpSlQuantity && parseFloat(tpSlQuantity) > 0) {
      setQuantity(tpSlQuantity);
      setIsQuantityManual(true);
      setCustomAmount("");
      setSelectedWalletPct(null);
    }

    setTpSlModalOpen(false);
  };
  // const handleRemoveTpSl = () => {
  //   if (tpSlActiveTab === "takeProfit") setTakeProfitPrice("");
  //   else setStopLossPrice("");
  // };

  const resetForm = () => {
    setQuantity("");
    setPrice("");
    setStopPrice("");
    setCustomLeverage("");
    setSelectedWalletPct(null);
    setCustomAmount("");
    setError(null);
    setIsQuantityManual(false);
    setTakeProfitPrice("");
    setStopLossPrice("");
    setTpSlModalOpen(false);
    setTpSlActiveTab("takeProfit");
    setTpSlQuantity("");
    setTpSlKeyNotesOpen(false);
  };

  const quantityNum = parseFloat(quantity) || 0;

  const orderValue = quantityNum * currentPrice;

  const isOverMargin = reqMargin > availableINR;
  const isBelowMinQty =
    minQuantity > 0 && quantityNum > 0 && quantityNum < minQuantity;

  const isBuy = side === "buy";
  const accentColor = isBuy ? "#0ecb81" : "#f6465d";
  const hasPrecisionError =
    !!qtyPrecisionError || !!pricePrecisionError || !!stopPricePrecisionError;

  const canPlace =
    !placing &&
    !isOverMargin &&
    !isBelowMinQty &&
    !hasPrecisionError &&
    !hasStopOrderError &&
    quantityNum > 0 &&
    (!requiresPrice || (parseFloat(price) || 0) > 0) &&
    (!requiresStopPrice || (parseFloat(stopPrice) || 0) > 0);

  const customAmtNum = parseFloat(customAmount) || 0;
  const progressPct = selectedWalletPct
    ? selectedWalletPct
    : availableINR > 0
      ? Math.min((customAmtNum / availableINR) * 100, 100)
      : 0;

  const feeRate = pairInfo
    ? (isTakerType ? pairInfo.takerFee : pairInfo.makerFee) / 100
    : FEE_RATE;

  const handlePlaceOrder = async () => {
    if (!canPlace || !userId) return;
    if (!validatePrecision(quantity, quantityPrecision)) {
      setError(
        `Quantity can have maximum ${quantityPrecision} decimal place(s) for ${SYMBOL}`,
      );
      return;
    }
    if (requiresPrice && !validatePrecision(price, pricePrecision)) {
      setError(
        `Price can have maximum ${pricePrecision} decimal place(s) for ${SYMBOL}`,
      );
      return;
    }
    if (requiresStopPrice && !validatePrecision(stopPrice, pricePrecision)) {
      setError(
        `Stop price can have maximum ${pricePrecision} decimal place(s) for ${SYMBOL}`,
      );
      return;
    }
    if (stopPriceVsMarketError) {
      setError(stopPriceVsMarketError);
      return;
    }
    if (priceVsStopPriceError) {
      setError(priceVsStopPriceError);
      return;
    }
    setPlacing(true);
    setError(null);
    const payload = {
      user: userId.toString(),
      placeType: "ORDER_FORM",
      quantity: parseFloat(parseFloat(quantity).toFixed(quantityPrecision)),
      reduceOnly: false,
      side: side.toUpperCase(),
      symbol: SYMBOL,
      type: orderType.toUpperCase(), // MARKET | LIMIT | STOP_LIMIT | STOP_MARKET
      price: requiresPrice
        ? parseFloat(parseFloat(price).toFixed(pricePrecision))
        : null,
      stopPrice: requiresStopPrice
        ? parseFloat(parseFloat(stopPrice).toFixed(pricePrecision))
        : null,
      leverage: currentLeverage,
      marginAsset: "INR",
      stopLossPrice:
        stopLossPrice && parseFloat(stopLossPrice) > 0
          ? parseFloat(parseFloat(stopLossPrice).toFixed(pricePrecision))
          : null,
      takeProfitPrice:
        takeProfitPrice && parseFloat(takeProfitPrice) > 0
          ? parseFloat(parseFloat(takeProfitPrice).toFixed(pricePrecision))
          : null,
    };
    try {
      const res = await fetch(PLACE_ORDER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.status) {
        toast.success("Order placed successfully!");
        setPlaced(true);
        resetForm();
        setTimeout(() => setPlaced(false), 2500);
        loadBalance();
        refreshBalance();
      } else {
        setError(data.message || "Order failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setPlacing(false);
    }
  };

  const placeBtnLabel = () => {
    if (placing) return "Processing…";
    if (placed) return "✓ Order Placed";
    if (hasPrecisionError) return "Fix Precision Errors";
    if (hasStopOrderError) return "Fix Stop Price";
    if (isOverMargin) return "Insufficient Margin";
    if (isBelowMinQty)
      return `Min Qty: ${fmtQty(minQuantity, quantityPrecision)} ${BASE_COIN}`;
    return isBuy ? "Buy / Long" : "Sell / Short";
  };

  const placeBtnColor = placed
    ? "#0ecb81"
    : hasPrecisionError || hasStopOrderError || isOverMargin || isBelowMinQty
      ? "#f6465d"
      : accentColor;

  // ── Determine what to show in footer ──
  const hasUserEnteredQty = quantityNum > 0;
  const displayMargin = hasUserEnteredQty ? reqMargin : minQtyMargin;
  const displayFee = hasUserEnteredQty ? orderValue * feeRate : minQtyFee;
  const isMinQtyReference = !hasUserEnteredQty && minQuantity > 0;

  // ── FIXED: Amount field shows margin when Size is typed, or customAmount when user types directly ──
  const amountDisplayValue = customAmount !== ""
    ? customAmount
    : derivedAmountFromQty !== ""
      ? derivedAmountFromQty.toFixed(2)
      : "";

  return (
    <div style={S.wrap}>
      {/* BUY / SELL */}
      <div style={S.sideTabs}>
        <button
          style={S.sideBtn(isBuy, "#0ecb81")}
          onClick={() => setSide("buy")}
        >
          Long
        </button>
        <button
          style={S.sideBtn(!isBuy, "#f6465d")}
          onClick={() => setSide("sell")}
        >
          Short
        </button>
      </div>

      {/* ORDER TYPE */}
      <div style={S.typeTabs}>
        {Object.keys(ORDER_TYPE_LABELS).map((t) => (
          <button
            key={t}
            style={S.typeBtn(orderType === t)}
            onClick={() => {
              setOrderType(t);
              setSelectedWalletPct(null);
              setCustomAmount("");
              setQuantity("");
              setIsQuantityManual(false);
            }}
          >
            {ORDER_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div style={S.body}>
        {/* Mark price + balance */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={S.dot(isConnected)} />
            <span style={{ fontSize: 11, color: "#8b949e" }}>Mark</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: priceDir === "up" ? "#0ecb81" : "#f6465d",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {markPrice > 0 ? `₹${Number(markPrice).toFixed(3)}` : "—"}
            </span>
            <span
              style={{
                fontSize: 11,
                color: priceDir === "up" ? "#0ecb81" : "#f6465d",
              }}
            >
              {priceDir === "up" ? "▲" : "▼"}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#8b949e" }}>
            Avbl:{" "}
            <span style={{ color: "#c9d1d9", fontWeight: 600 }}>
              {loadingBalance ? "..." : fmtINR(availableINR)}
            </span>
          </div>
        </div>

        {/* Min Order + Qty Precision */}
        {pairInfo && !loadingPairInfo && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 8px",
              borderRadius: 4,
              background: "rgba(14,203,129,0.04)",
              border: "1px solid #21262d",
              fontSize: 10,
            }}
          >
            <span style={{ color: "#8b949e" }}>
              Min order:{" "}
              <span
                style={{
                  color: isBelowMinQty ? "#f6465d" : "#c9d1d9",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {loadingPairInfo
                  ? "…"
                  : `${fmtQty(minQuantity, quantityPrecision)} ${BASE_COIN}`}
                {isBelowMinQty && " ⚠"}
              </span>
            </span>
            <span style={{ color: "#8b949e" }}>
              Qty:{" "}
              <span style={{ color: "#a855f7", fontWeight: 700 }}>
                {precisionLabel(quantityPrecision)}
              </span>
              {requiresPrice && (
                <span style={{ marginLeft: 6 }}>
                  Price:{" "}
                  <span style={{ color: "#a855f7", fontWeight: 700 }}>
                    {precisionLabel(pricePrecision)}
                  </span>
                </span>
              )}
            </span>
          </div>
        )}

        {/* Quantity Precision Error */}
        {qtyPrecisionError && (
          <div style={S.precisionWarning}>
            <span>⚠ {qtyPrecisionError}</span>
            <button
              style={S.precisionFixBtn(accentColor)}
              onClick={handleFixQtyPrecision}
            >
              Fix → {truncateToPrecision(quantity, quantityPrecision) || "—"}
            </button>
          </div>
        )}

        {/* Price Precision Error */}
        {pricePrecisionError && (
          <div style={S.precisionWarning}>
            <span>⚠ {pricePrecisionError}</span>
            <button
              style={S.precisionFixBtn(accentColor)}
              onClick={handleFixPricePrecision}
            >
              Fix → {truncateToPrecision(price, pricePrecision) || "—"}
            </button>
          </div>
        )}

        {/* Stop Price Precision Error */}
        {stopPricePrecisionError && (
          <div style={S.precisionWarning}>
            <span>⚠ {stopPricePrecisionError}</span>
            <button
              style={S.precisionFixBtn(accentColor)}
              onClick={handleFixStopPricePrecision}
            >
              Fix → {truncateToPrecision(stopPrice, pricePrecision) || "—"}
            </button>
          </div>
        )}

        {/* Stop Price vs Market Price direction error */}
        {stopPriceVsMarketError && (
          <div style={S.precisionWarning}>
            <span>⚠ {stopPriceVsMarketError}</span>
            <button
              style={S.precisionFixBtn(accentColor)}
              onClick={handleFixStopVsMarket}
            >
              Fix → {stopPriceFixSuggestion || "—"}
            </button>
          </div>
        )}

        {/* Price vs Stop Price direction error */}
        {priceVsStopPriceError && (
          <div style={S.precisionWarning}>
            <span>⚠ {priceVsStopPriceError}</span>
            <button
              style={S.precisionFixBtn(accentColor)}
              onClick={handleFixPriceVsStop}
            >
              Fix → {priceFixSuggestion || "—"}
            </button>
          </div>
        )}

        {/* API error */}
        {error && (
          <div
            style={{
              fontSize: 11,
              color: "#f6465d",
              background: "rgba(246,70,93,0.1)",
              borderRadius: 4,
              padding: "4px 8px",
            }}
          >
            {error}
          </div>
        )}

        {/* Stop Price (Stop Limit / Stop Market) */}
        {requiresStopPrice && (
          <TinyInput
            label="Stop price"
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
            placeholder="0.00"
            error={!!stopPricePrecisionError || !!stopPriceVsMarketError}
            action={{
              label: "Last",
              onClick: () =>
                setStopPrice(markPrice > 0 ? markPrice.toString() : ""),
            }}
          />
        )}

        {/* Price (Limit / Stop Limit) */}
        {requiresPrice && (
          <TinyInput
            label="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            unit="INR"
            error={!!pricePrecisionError || !!priceVsStopPriceError}
          />
        )}

        {/* Size Input */}
        <TinyInput
          label="Size"
          value={quantity}
          onChange={handleQuantityChange}
          placeholder={
            minQuantity > 0
              ? `Min ${fmtQty(minQuantity, quantityPrecision)}`
              : "0"
          }
          unit={BASE_COIN}
          error={
            isOverMargin
              ? "Exceeds margin"
              : isBelowMinQty
                ? "Below min qty"
                : qtyPrecisionError
                  ? "Bad precision"
                  : null
          }
        />

        {/* ── FIXED: Amount Input now shows MARGIN when Size is typed ── */}
        <TinyInput
          label="Amount"
          value={amountDisplayValue}
          onChange={(e) => handleCustomAmount(e.target.value)}
          placeholder="0.00"
          unit="INR"
          readOnly={customAmount === "" && derivedAmountFromQty !== ""} // Read-only when auto-derived
        />

        {/* Percentage Buttons */}
        <div style={S.pctRow}>
          {[10, 25, 50, 100].map((pct) => (
            <button
              key={pct}
              style={S.pctBtn(selectedWalletPct === pct, accentColor)}
              onClick={() =>
                handleSelectPct(selectedWalletPct === pct ? null : pct)
              }
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Progress Bar */}
        <div style={S.track}>
          <div
            style={{
              height: "100%",
              width: progressPct ? `${progressPct}%` : "0%",
              background: progressPct > 0 ? accentColor : "transparent",
              borderRadius: 2,
              transition: "width 0.2s ease",
            }}
          />
        </div>

        {/* Leverage */}
        <div
          onClick={() => setLevModalOpen(true)}
          style={{
            background: "#161b22",
            border: "1px solid #21262d",
            borderRadius: 6,
            padding: "7px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 11, color: "#8b949e" }}>Leverage</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#a855f7" }}>
              {currentLeverage}x
            </span>
            {pairInfo && (
              <span style={{ fontSize: 10, color: "#8b949e" }}>
                / {pairInfo.maxLeverage}x max
              </span>
            )}
            <span style={{ fontSize: 10, color: "#8b949e" }}>▶</span>
          </div>
        </div>

        {/* Set Take Profit / Stop Loss */}
        <div style={S.tpSlRow} onClick={handleOpenTpSlModal}>
          <div style={S.tpSlCheckbox(showTpSl)}>
            {showTpSl && (
              <span style={{ fontSize: 10, color: "#000", lineHeight: 1 }}>
                ✓
              </span>
            )}
          </div>
          <span style={S.tpSlLabel}>Set Take Profit/ Stop Loss</span>
        </div>

        {showTpSl && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 10,
              color: "#8b949e",
              padding: "0 2px",
            }}
          >
            <span>
              TP:{" "}
              <span style={{ color: "#0ecb81", fontWeight: 700 }}>
                {parseFloat(takeProfitPrice) > 0
                  ? fmtPrice(takeProfitPrice)
                  : "—"}
              </span>
            </span>
            <span>
              SL:{" "}
              <span style={{ color: "#f6465d", fontWeight: 700 }}>
                {parseFloat(stopLossPrice) > 0 ? fmtPrice(stopLossPrice) : "—"}
              </span>
            </span>
          </div>
        )}

        {/* Place Order Button */}
        <button
          style={S.placeBtn(placeBtnColor, !canPlace, isBuy ? "#000" : "#fff")}
          onClick={handlePlaceOrder}
          disabled={!canPlace}
        >
          {placeBtnLabel()}
        </button>

        {/* Footer with hover tooltip */}
        <OrderSummaryTooltip
          orderValue={orderValue}
          reqMargin={reqMargin}
          feeRate={feeRate}
          isTaker={isTakerType}
          isOverMargin={isOverMargin}
          availableINR={availableINR}
          isBelowMinQty={isBelowMinQty}
          minQuantity={minQuantity}
          quantityPrecision={quantityPrecision}
          BASE_COIN={BASE_COIN}
          displayMargin={displayMargin}
          displayFee={displayFee}
          isMinQtyReference={isMinQtyReference}
        />
      </div>

      {/* Leverage Modal */}
      {levModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setLevModalOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#161b22",
              border: "1px solid #30363d",
              borderRadius: "12px 12px 0 0",
              padding: "20px 16px 32px",
              width: "100%",
              maxWidth: 420,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: "#e6edf3" }}>
                Set Leverage
              </span>
              <button
                onClick={() => setLevModalOpen(false)}
                style={{
                  background: "#21262d",
                  border: "none",
                  borderRadius: "50%",
                  width: 28,
                  height: 28,
                  color: "#8b949e",
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                textAlign: "center",
                fontSize: 26,
                fontWeight: 700,
                color: "#7B2FF7",
                marginBottom: 4,
              }}
            >
              {currentLeverage}x
            </div>
            {pairInfo && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: 10,
                  color: "#8b949e",
                  marginBottom: 14,
                }}
              >
                Max leverage for {BASE_COIN}: {pairInfo.maxLeverage}x
              </div>
            )}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 16,
              }}
            >
              {PRESET_LEVERAGES.filter(
                (lev) => !pairInfo || lev <= pairInfo.maxLeverage,
              ).map((lev) => {
                const isActive = leverage === lev && !customLeverage;
                return (
                  <button
                    key={lev}
                    onClick={() => {
                      setLeverage(lev);
                      setCustomLeverage("");
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: `1px solid ${isActive ? "#7B2FF7" : "#21262d"}`,
                      background: isActive
                        ? "rgba(123,47,247,0.12)"
                        : "transparent",
                      color: isActive ? "#7B2FF7" : "#8b949e",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {lev}x
                  </button>
                );
              })}
            </div>
            <input
              type="range"
              min="1"
              max={pairInfo?.maxLeverage || 100}
              step="1"
              value={customLeverage || leverage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (PRESET_LEVERAGES.includes(val)) {
                  setLeverage(val);
                  setCustomLeverage("");
                } else {
                  setCustomLeverage(val.toString());
                  setLeverage(1);
                }
              }}
              style={{
                width: "100%",
                accentColor: "#7B2FF7",
                cursor: "pointer",
                marginBottom: 4,
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "#8b949e",
                marginBottom: 14,
              }}
            >
              <span>1x</span>
              <span>{Math.round((pairInfo?.maxLeverage || 100) * 0.25)}x</span>
              <span>{Math.round((pairInfo?.maxLeverage || 100) * 0.5)}x</span>
              <span>{Math.round((pairInfo?.maxLeverage || 100) * 0.75)}x</span>
              <span>{pairInfo?.maxLeverage || 100}x</span>
            </div>
            <div
              style={{
                background: "#0d1117",
                border: "1px solid #21262d",
                borderRadius: 6,
                padding: "0 10px",
                display: "flex",
                alignItems: "center",
                height: 38,
                gap: 6,
                marginBottom: 18,
              }}
            >
              <span style={{ fontSize: 10, color: "#8b949e" }}>Custom</span>
              <input
                type="number"
                min="1"
                max={pairInfo?.maxLeverage || 100}
                placeholder="Leverage"
                value={customLeverage}
                onChange={(e) => {
                  const val = e.target.value;
                  const maxLev = pairInfo?.maxLeverage || 100;
                  if (val && parseInt(val) > maxLev) return;
                  setCustomLeverage(val);
                  if (val) setLeverage(1);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#e6edf3",
                  width: "100%",
                }}
              />
              <span style={{ fontSize: 11, color: "#8b949e" }}>x</span>
            </div>
            <button
              onClick={() => setLevModalOpen(false)}
              style={{
                width: "100%",
                padding: "12px 0",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                borderRadius: 6,
                background: "#7B2FF7",
                color: "#000",
                cursor: "pointer",
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Add TP/SL Modal */}
      {tpSlModalOpen && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
            maxHeight: "100%",
            background: "#0d1117",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
            color: "#c9d1d9",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: "1px solid #21262d",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: "#e6edf3" }}>
              Add TP/SL
            </span>
            <button
              onClick={() => setTpSlModalOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#8b949e",
                fontSize: 18,
                cursor: "pointer",
                lineHeight: 1,
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>

          {/* Scrollable body */}
          <div
            ref={tpSlBodyRef}
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
              padding: "14px 16px 70px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              scrollbarWidth: "thin",
              scrollbarColor: "#30363d transparent",
            }}
          >
            {/* Symbol / margin mode / side / leverage */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#f7931a",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  ₿
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e6edf3" }}>
                  {BASE_COIN}-{rawSymbol.split("/")[1]?.toUpperCase() || "INR"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                <span style={{ color: "#8b949e" }}>Isolated</span>
                <span style={{ color: isBuy ? "#0ecb81" : "#f6465d", fontWeight: 700 }}>
                  {isBuy ? "Long" : "Short"}
                </span>
                <span style={{ color: "#8b949e" }}>{currentLeverage}x</span>
              </div>
            </div>

            {/* Side tabs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                onClick={() => setSide("buy")}
                style={{
                  padding: "10px 0",
                  textAlign: "center",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: isBuy ? "#0ecb81" : "#161b22",
                  color: isBuy ? "#08120d" : "#8b949e",
                  border: `1px solid ${isBuy ? "#0ecb81" : "#21262d"}`,
                  fontFamily: "inherit",
                }}
              >
                Buy/Long
              </button>
              <button
                onClick={() => setSide("sell")}
                style={{
                  padding: "10px 0",
                  textAlign: "center",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: !isBuy ? "#f6465d" : "#161b22",
                  color: !isBuy ? "#1a0709" : "#8b949e",
                  border: `1px solid ${!isBuy ? "#f6465d" : "#21262d"}`,
                  fontFamily: "inherit",
                }}
              >
                Sell/Short
              </button>
            </div>

            {/* Order info grid */}
            <div
              style={{
                background: "#161b22",
                border: "1px solid #21262d",
                borderRadius: 8,
                padding: "12px 14px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                rowGap: 14,
                columnGap: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 3, whiteSpace: "nowrap" }}>
                  Order Type
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#e6edf3" }}>
                  {ORDER_TYPE_LABELS[orderType]}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 3, whiteSpace: "nowrap" }}>
                  Required Margin
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#e6edf3" }}>
                  {reqMargin > 0 ? reqMargin.toFixed(2) : "0.00"}{" "}
                  {SYMBOL.endsWith("USDT") ? "USDT" : "INR"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 3, whiteSpace: "nowrap" }}>
                  Mark Price
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#e6edf3" }}>
                  {markPrice > 0 ? markPrice.toFixed(1) : "—"}
                </div>
              </div>
              {/* <div>
                <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 3, whiteSpace: "nowrap" }}>
                  Liquidation Price
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#f0b90b" }}>
                  {tpSlLiqPriceEstimate ? tpSlLiqPriceEstimate.toFixed(1) : "—"}
                </div>
              </div> */}
              {requiresPrice && (
                <div>
                  <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 3, whiteSpace: "nowrap" }}>
                    Limit Price
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#e6edf3" }}>
                    {tpSlEntryPrice > 0 ? tpSlEntryPrice.toFixed(1) : "—"}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 3, whiteSpace: "nowrap" }}>
                  Position Qty
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#e6edf3" }}>
                  {fmtQty(quantityNum || minQuantity, quantityPrecision)} {BASE_COIN}
                </div>
              </div>
            </div>

            {/* Take Profit / Stop Loss tabs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                onClick={() => setTpSlActiveTab("takeProfit")}
                style={{
                  padding: "10px 0",
                  textAlign: "center",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: tpSlActiveTab === "takeProfit" ? "#0ecb81" : "#161b22",
                  color: tpSlActiveTab === "takeProfit" ? "#08120d" : "#8b949e",
                  border: `1px solid ${tpSlActiveTab === "takeProfit" ? "#0ecb81" : "#21262d"}`,
                }}
              >
                Take Profit
              </button>
              <button
                onClick={() => setTpSlActiveTab("stopLoss")}
                style={{
                  padding: "10px 0",
                  textAlign: "center",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: tpSlActiveTab === "stopLoss" ? "#f6465d" : "#161b22",
                  color: tpSlActiveTab === "stopLoss" ? "#1a0709" : "#8b949e",
                  border: `1px solid ${tpSlActiveTab === "stopLoss" ? "#f6465d" : "#21262d"}`,
                }}
              >
                Stop Loss
              </button>
            </div>

            {/* Quantity */}
            <TinyInput
              value={tpSlQuantity}
              onChange={(e) => setTpSlQuantity(e.target.value)}
              placeholder={fmtQty(minQuantity, quantityPrecision)}
              unit={BASE_COIN}
              action={{ label: "Add max", onClick: handleTpSlAddMax }}
            />

            {/* Price */}
            <TinyInput
              value={tpSlActivePriceStr}
              onChange={handleTpSlPriceChange}
              placeholder={
                tpSlActiveTab === "takeProfit"
                  ? "Set Take Profit Price"
                  : "Set Stop Loss Price"
              }
              unit={SYMBOL.endsWith("USDT") ? "USDT" : "INR"}
            />

            {/* {(tpSlActiveTab === "takeProfit" ? takeProfitPrice : stopLossPrice) && (
              <button
                // onClick={handleRemoveTpSl}
                style={{
                  alignSelf: "flex-start",
                  background: "transparent",
                  border: "none",
                  color: "#f6465d",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                  marginTop: -6,
                }}
              >
                Remove {tpSlActiveTab === "takeProfit" ? "Take Profit" : "Stop Loss"}
              </button>
            )} */}

            {/* Est. P&L */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
                padding: "2px 0",
              }}
            >
              <span style={{ color: "#8b949e" }}>Est. P&L</span>
              <span
                style={{
                  fontWeight: 700,
                  color:
                    tpSlEstPnl === null ? "#0ecb81" : tpSlEstPnl >= 0 ? "#0ecb81" : "#f6465d",
                }}
              >
                {tpSlEstPnl === null
                  ? "N/A"
                  : `${tpSlEstPnl >= 0 ? "+" : ""}${tpSlEstPnl.toFixed(2)} ${SYMBOL.endsWith("USDT") ? "USDT" : "INR"
                  }`}
              </span>
            </div>

            {/* Key Notes — collapsible */}
            <div
              style={{
                background: "rgba(240, 185, 11, 0.03)",
                border: "1px solid rgba(240, 185, 11, 0.18)",
                borderRadius: 8,
                transition: "all 0.2s ease",
              }}
            >
              <button
                type="button"
                onClick={() => setTpSlKeyNotesOpen((v) => !v)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "rgba(240, 185, 11, 0.15)",
                      color: "#f0b90b",
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    ℹ
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#f0b90b", letterSpacing: "0.2px" }}>
                    Key Notes
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: "#f0b90b",
                    transform: tpSlKeyNotesOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    display: "inline-block",
                  }}
                >
                  ▼
                </span>
              </button>

              {tpSlKeyNotesOpen && (
                <div
                  style={{
                    padding: "0 12px 12px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    borderTop: "1px solid rgba(240, 185, 11, 0.1)",
                    marginTop: 2,
                    paddingTop: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: "#8b949e", lineHeight: 1.45 }}>
                    <span style={{ color: "#f0b90b", fontWeight: 700, marginTop: 1 }}>•</span>
                    <span>
                      TP/SL orders are <strong style={{ color: "#e6edf3", fontWeight: 600 }}>executed as Market Orders</strong> once the market price reaches target.
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: "#8b949e", lineHeight: 1.45 }}>
                    <span style={{ color: "#f0b90b", fontWeight: 700, marginTop: 1 }}>•</span>
                    <span>
                      Slippage may occur during high market volatility. <strong style={{ color: "#e6edf3", fontWeight: 600 }}>Actual P&L may differ.</strong>
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: "#8b949e", lineHeight: 1.45 }}>
                    <span style={{ color: "#f0b90b", fontWeight: 700, marginTop: 1 }}>•</span>
                    <span>
                      If TP/SL is set <strong style={{ color: "#e6edf3", fontWeight: 600 }}>too close to current Mark Price</strong>, order may trigger immediately.
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: "#8b949e", lineHeight: 1.45 }}>
                    <span style={{ color: "#f0b90b", fontWeight: 700, marginTop: 1 }}>•</span>
                    <span>
                      Execution cannot be guaranteed in extreme market conditions. Please monitor carefully.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Confirm button (fixed footer) */}
          <div
            style={{
              flexShrink: 0,
              padding: "12px 16px 16px",
              borderTop: "1px solid #21262d",
              background: "#0d1117",
            }}
          >
            <button
              onClick={handleConfirmTpSl}
              disabled={!(parseFloat(tpSlActivePriceStr) > 0)}
              style={{
                width: "100%",
                padding: "13px 0",
                fontSize: 14,
                fontWeight: 700,
                border: "none",
                borderRadius: 8,
                background: "#3d5ce0",
                color: "#fff",
                cursor: parseFloat(tpSlActivePriceStr) > 0 ? "pointer" : "not-allowed",
                opacity: parseFloat(tpSlActivePriceStr) > 0 ? 1 : 0.55,
              }}
            >
              Confirm {tpSlActiveTab === "takeProfit" ? "Take Profit" : "Stop Loss"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPlacement;