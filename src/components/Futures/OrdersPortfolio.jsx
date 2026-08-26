


// import React, { useState } from "react";
// import { RefreshCw } from "lucide-react";
// import MyOrders from "./MyOrders";
// import Portfolio from "./Portfolio";
// import FuturesWallet from "./FuturesWallet"; // ← yeh import add karo

// const OrdersPortfolioPage = () => {
//   const [activeTab, setActiveTab] = useState("orders"); // 'orders' | 'portfolio' | 'wallet'
//   const [openOnly, setOpenOnly] = useState(true);

//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         background: "#060810",
//         fontFamily: "'DM Mono','JetBrains Mono',monospace",
//         padding: "10px 10px",
//       }}
//     >
//       {/* Header with Tabs */}
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           gap: 12,
//           marginBottom: 24,
//         }}
//       >
//         {/* MY ORDERS Tab */}
//         <button
//           onClick={() => setActiveTab("orders")}
//           style={{
//             padding: "8px 18px",
//             borderRadius: 6,
//             border: "none",
//             cursor: "pointer",
//             background: activeTab === "orders"
//               ? "linear-gradient(135deg, #d4a574, #b8935f)"
//               : "transparent",
//             color: activeTab === "orders" ? "#000" : "#6b7280",
//             fontSize: 13,
//             fontWeight: 700,
//             letterSpacing: "0.3px",
//             outline: activeTab === "orders" ? "none" : "1px solid rgba(255,255,255,0.1)",
//             transition: "all 0.15s",
//           }}
//         >
//           MY ORDERS
//         </button>

//         {/* PORTFOLIO Tab */}
//         <button
//           onClick={() => setActiveTab("portfolio")}
//           style={{
//             padding: "8px 18px",
//             borderRadius: 6,
//             border: "none",
//             cursor: "pointer",
//             background: activeTab === "portfolio"
//               ? "linear-gradient(135deg, #7b2ff7;, #c084fc)"
//               : "transparent",
//             color: activeTab === "portfolio" ? "#000" : "#6b7280",
//             fontSize: 13,
//             fontWeight: 700,
//             letterSpacing: "0.3px",
//             outline: activeTab === "portfolio" ? "none" : "1px solid rgba(255,255,255,0.1)",
//             transition: "all 0.15s",
//           }}
//         >
//           PORTFOLIO
//         </button>

//         {/* ✅ WALLET Tab - naya */}
//         <button
//           onClick={() => setActiveTab("wallet")}
//           style={{
//             padding: "8px 18px",
//             borderRadius: 6,
//             border: "none",
//             cursor: "pointer",
//             background: activeTab === "wallet"
//               ? "linear-gradient(135deg, #7b2ff7;, #c084fc)"
//               : "transparent",
//             color: activeTab === "wallet" ? "#000" : "#6b7280",
//             fontSize: 13,
//             fontWeight: 700,
//             letterSpacing: "0.3px",
//             outline: activeTab === "wallet" ? "none" : "1px solid rgba(255,255,255,0.1)",
//             transition: "all 0.15s",
//           }}
//         >
//           WALLET
//         </button>

//         {/* Actions (right side) */}
//         <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
//           {/* {activeTab === "portfolio" && (
//             <button style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#6b7280", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
//               <RefreshCw size={14} /> Refresh
//             </button>
//           )} */}
//           {activeTab === "orders" && (
//             <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#9ca3af", userSelect: "none" }}>
//               <span>Open Orders Only</span>
//               <div onClick={() => setOpenOnly(!openOnly)} style={{ width: 40, height: 22, borderRadius: 12, background: openOnly ? "#7b2ff7" : "#374151", position: "relative", transition: "background 0.2s", cursor: "pointer" }}>
//                 <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: openOnly ? 20 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
//               </div>
//             </label>
//           )}
//           {/* {activeTab === "orders" && (
//             <button onClick={() => console.log("View all orders")} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#6b7280", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
//               View All Orders <span style={{ fontSize: 14 }}>→</span>
//             </button>
//           )} */}
//         </div>
//       </div>

//       {/* Content */}
//       <div>
//         {activeTab === "orders" && <MyOrders openOnly={openOnly} />}
//         {activeTab === "portfolio" && <Portfolio />}
//         {activeTab === "wallet" && <FuturesWallet />}  {/* ✅ yeh add karo */}
//       </div>
//     </div>
//   );
// };

// export default OrdersPortfolioPage;

import React, { useState } from "react";
import MyOrders from "./MyOrders";
import Portfolio from "./Portfolio";
import FuturesWallet from "./FuturesWallet";

const OrdersPortfolioPage = () => {
  const [activeTab, setActiveTab] = useState("orders");
  const [openOnly, setOpenOnly] = useState(true);

  const tabStyle = (active) => ({
    padding: "10px 18px",
    borderRadius: "12px",
    border: active
      ? "none"
      : "1px solid rgba(255,255,255,0.06)",
    cursor: "pointer",
    background: active
      ? "linear-gradient(135deg,#7B2FF7 0%,#A855F7 50%,#C084FC 100%)"
      : "transparent",
    color: active ? "#FFFFFF" : "#94A3B8",
    fontSize: "13px",
    fontWeight: 600,
    letterSpacing: "0.3px",
    transition: "all .3s ease",
    minWidth: "120px",
    boxShadow: active
      ? "0px 4px 20px rgba(123,47,247,0.35)"
      : "none",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#070B14",
        fontFamily: "Inter, sans-serif",
        padding: "16px",
        color: "#F8FAFC",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
          padding: "14px",
          background: "#0F1725",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "12px",
          boxShadow: "0px 10px 40px rgba(0,0,0,0.35)",
          flexWrap: "wrap",
        }}
      >
        {/* Orders */}
        <button
          onClick={() => setActiveTab("orders")}
          style={tabStyle(activeTab === "orders")}
        >
          MY ORDERS
        </button>

        {/* Portfolio */}
        <button
          onClick={() => setActiveTab("portfolio")}
          style={tabStyle(activeTab === "portfolio")}
        >
          PORTFOLIO
        </button>

        {/* Wallet */}
        <button
          onClick={() => setActiveTab("wallet")}
          style={tabStyle(activeTab === "wallet")}
        >
          WALLET
        </button>

        {/* Right Side Controls */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          {activeTab === "orders" && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#94A3B8",
                fontSize: "13px",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              {/* <span>Open Orders Only</span> */}

              {/* 
              
              
              */}
            </label>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div
        style={{
          background: "#0F1725",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "12px",
          padding: "16px",
          boxShadow: "0px 10px 40px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {activeTab === "orders" && (
          <MyOrders openOnly={openOnly} />
        )}

        {activeTab === "portfolio" && (
          <Portfolio />
        )}

        {activeTab === "wallet" && (
          <FuturesWallet />
        )}
      </div>
    </div>
  );
};

export default OrdersPortfolioPage;