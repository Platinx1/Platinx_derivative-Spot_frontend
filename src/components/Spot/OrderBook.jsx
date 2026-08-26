

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { io } from "socket.io-client";

// // ─── CONFIG ──────────────────────────────────────────────────────────────────
// const BASE_URL = "wss://ws.coinswitch.co";
// const NAMESPACE = "/coinswitchx";
// const PAIR = "LIGHT,INR";
// const EVENT_NAME = "FETCH_ORDER_BOOK_CS_PRO";

// const OrderBook = () => {
//   const [asks, setAsks] = useState([]);
//   const [bids, setBids] = useState([]);
//   const socketRef = useRef(null);

//   const handleMessage = useCallback((data) => {
//     try {
//       if (!data?.bids || !data?.asks) return;

//       const newAsks = [...data.asks]
//         .sort((a, b) => Number(b[0]) - Number(a[0]))
//         .slice(0, 10)
//         .map(([price, qty]) => ({ price: Number(price), qty: Number(qty) }));

//       const newBids = [...data.bids]
//         .sort((a, b) => Number(b[0]) - Number(a[0]))
//         .slice(0, 10)
//         .map(([price, qty]) => ({ price: Number(price), qty: Number(qty) }));

//       setAsks(newAsks);
//       setBids(newBids);
//     } catch (err) {
//       console.error("OrderBook parse error:", err);
//     }
//   }, []);

//   useEffect(() => {
//     const socket = io(BASE_URL + NAMESPACE, {
//       path: "/pro/realtime-rates-socket/spot/coinswitchx",
//       transports: ["websocket"],
//       reconnection: true,
//       reconnectionDelay: 3000,
//     });

//     socketRef.current = socket;

//     socket.on("connect", () => {
//       console.log("Connected:", socket.id);
//       socket.emit(EVENT_NAME, { event: "subscribe", pair: PAIR });
//     });

//     socket.on(EVENT_NAME, handleMessage);

//     socket.on("disconnect", (reason) => console.warn("Disconnected:", reason));
//     socket.on("connect_error", (err) =>
//       console.error("Connect error:", err.message),
//     );

//     return () => socket.disconnect();
//   }, [handleMessage]);

//   // Derived
//   const allQtys = [...asks.map((o) => o.qty), ...bids.map((o) => o.qty)];
//   const maxQty = allQtys.length ? Math.max(...allQtys) : 1;

//   const bestAsk = asks[0]?.price || 0; // First ask after sort (lowest ask)
//   const bestBid = bids[0]?.price || 0; // First bid (highest bid)
//   const spread =
//     bestBid > 0 ? (((bestAsk - bestBid) / bestBid) * 100).toFixed(2) : "—";
//   const midPrice = (bestAsk + bestBid) / 2 || 0;

//   const formatQty = (qty) => {
//     if (qty < 0.01) return qty.toFixed(6); // Show more decimals for tiny amounts
//     if (qty < 1) return qty.toFixed(4);
//     return qty.toLocaleString("en-US", {
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2,
//     });
//   };

//   return (
//     <div className="bg-[#0b0e11] text-gray-300 font-mono text-xs select-none flex flex-col h-full w-full max-w-[420px] overflow-hidden border border-gray-800/40 rounded-md shadow-2xl">
//       {/* Header */}
//       <div className="flex justify-between items-center px-4 py-2 bg-[#11151b] border-b border-gray-800/60 text-gray-400 text-[11px] font-semibold">
//         <span>Price (INR)</span>
//         <span>Size (BTC)</span>
//       </div>

//       {/* Asks */}
//       <div className="flex-1 flex flex-col justify-end bg-gradient-to-b from-[#1a0f0f]/20 to-transparent">
//         {asks.map((order, i) => {
//           const width = (order.qty / maxQty) * 100;
//           const isBest = i === 0;
//           return (
//             <div
//               key={`ask-${i}`}
//               className={`relative flex justify-between items-center px-4 h-7 text-[#f87171] ${isBest ? "font-bold bg-[#3a1a1a]/40" : ""}`}
//             >
//               <div
//                 className="absolute inset-0 bg-[#f87171]/10"
//                 style={{ width: `${width}%`, right: 0 }}
//               />
//               <span className="z-10">
//                 ₹{order.price.toLocaleString("en-US")}
//               </span>
//               <span className="z-10 text-right">{formatQty(order.qty)}</span>
//             </div>
//           );
//         })}
//       </div>

//       {/* Center: Mid + Spread */}
//       <div className="py-3 px-4 bg-[#0f141a] border-y border-gray-800/70 flex justify-between items-center text-sm">
//         <div className="font-bold text-white">
//           ₹{midPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}
//         </div>
//         <div className="text-gray-400 text-xs">Spread {spread}%</div>
//       </div>

//       {/* Bids */}
//       <div className="flex-1 flex flex-col bg-gradient-to-t from-[#0f1a0f]/20 to-transparent">
//         {bids.map((order, i) => {
//           const width = (order.qty / maxQty) * 100;
//           const isBest = i === 0;
//           return (
//             <div
//               key={`bid-${i}`}
//               className={`relative flex justify-between items-center px-4 h-7 text-[#4ade80] ${isBest ? "font-bold bg-[#1a3a1a]/40" : ""}`}
//             >
//               <div
//                 className="absolute inset-0 bg-[#4ade80]/10"
//                 style={{ width: `${width}%`, right: 0 }}
//               />
//               <span className="z-10">
//                 ₹{order.price.toLocaleString("en-US")}
//               </span>
//               <span className="z-10 text-right">{formatQty(order.qty)}</span>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// export default OrderBook;
























