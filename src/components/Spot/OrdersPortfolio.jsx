import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import MyOrders from "./MyOrders";
import Portfolio from "./Portfolio";
import Wallet from "./SpotWallet";
import TradeHistory from "./TradeHistory";

const OrdersPortfolioPage = () => {
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("spot_active_tab");
    return ["orders", "portfolio", "wallet", "trades"].includes(savedTab)
      ? savedTab
      : "orders";
  });
  const [openOnly, setOpenOnly] = useState(true);
  const [ordersRefresh, setOrdersRefresh] = useState(0);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem("spot_active_tab", tab);
  };

  const refreshOrders = () => {
    setOrdersRefresh((prev) => prev + 1);
  };
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060810",
        fontFamily: "'DM Mono','JetBrains Mono',monospace",
        padding: "10px 10px",
      }}
    >
      {/* Header with Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {/* MY ORDERS Tab */}
        <button
          onClick={() => handleTabChange("orders")}
          style={{
            padding: "8px 18px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background:
              activeTab === "orders"
                ? "linear-gradient(135deg, #5F0099, #9F00FF)"
                : "transparent",
            color: activeTab === "orders" ? "#e4dcdc" : "#6b7280",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.3px",
            outline:
              activeTab === "orders"
                ? "none"
                : "1px solid rgba(255,255,255,0.1)",
            transition: "all 0.15s",
          }}
        >
          OPEN ORDERS
        </button>

        {/* PORTFOLIO Tab */}
        <button
          onClick={() => handleTabChange("portfolio")}
          style={{
            padding: "8px 18px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background:
              activeTab === "portfolio"
                ? "linear-gradient(135deg, #5F0099, #9F00FF)"
                : "transparent",
            color: activeTab === "portfolio" ? "#f1ebeb" : "#6b7280",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.3px",
            outline:
              activeTab === "portfolio"
                ? "none"
                : "1px solid rgba(255,255,255,0.1)",
            transition: "all 0.15s",
          }}
        >
          PORTFOLIO
        </button>

        {/* WALLET Tab */}
        <button
          onClick={() => handleTabChange("wallet")}
          style={{
            padding: "8px 18px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background:
              activeTab === "wallet"
                ? "linear-gradient(135deg, #5F0099, #9F00FF)"
                : "transparent",
            color: activeTab === "wallet" ? "rgb(255, 248, 248)" : "#6b7280",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.3px",
            outline:
              activeTab === "wallet"
                ? "none"
                : "1px solid rgba(255,255,255,0.1)",
            transition: "all 0.15s",
          }}
        >
          WALLET
        </button>

        {/* TRADE HISTORY Tab */}
        <button
          onClick={() => handleTabChange("trades")}
          style={{
            padding: "8px 18px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background:
              activeTab === "trades"
                ? "linear-gradient(135deg, #5F0099, #9F00FF)"
                : "transparent",
            color: activeTab === "trades" ? "rgb(255, 248, 248)" : "#6b7280",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.3px",
            outline:
              activeTab === "trades"
                ? "none"
                : "1px solid rgba(255,255,255,0.1)",
            transition: "all 0.15s",
          }}
        >
          TRADE HISTORY
        </button>

        {/* Actions (right side) */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          {/* Refresh button - on Portfolio and Trades tab */}


          {/* Open Orders Only Toggle - only on Orders tab */}
          {/* {activeTab === "orders" && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 12,
                color: "#9ca3af",
                userSelect: "none",
              }}
            >
              <span>Open Orders Only</span>
              <div
                onClick={() => setOpenOnly(!openOnly)}
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 12,
                  background: openOnly ? "#f59e0b" : "#374151",
                  position: "relative",
                  transition: "background 0.2s",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 2,
                    left: openOnly ? 20 : 2,
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                />
              </div>
            </label>
          )} */}

          {/* View All Orders button - only on Orders tab */}

        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === "orders" && (
          <MyOrders
            openOnly={openOnly}
            refreshKey={ordersRefresh}
          />
        )}
        {activeTab === "portfolio" && <Portfolio />}
        {activeTab === "wallet" && <Wallet />}
        {activeTab === "trades" && <TradeHistory />}
      </div>
    </div>
  );
};

export default OrdersPortfolioPage;