import React, { useState } from "react";
import { Search, SlidersHorizontal, Download, ChevronDown } from "lucide-react";
import TradeHistory from "../components/Spot/TradeHistory";
import OpenOrders from "../components/Spot/OpenOrders";

const SpotOrders = () => {
  const [activeTab, setActiveTab] = useState("history"); // 'history' | 'open'
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  // CSV download (mock)
  const handleDownloadCSV = () => {
    alert("CSV download initiated");
    // In production: generate CSV from filtered data
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#070814",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        padding: "24px 32px",
      }}
    >
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#e5e7eb",
            margin: 0,
            letterSpacing: "-0.5px",
          }}
        >
          Spot Orders
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
          View and manage your spot trading orders
        </p>
      </div>

      {/* Main Card */}
      <div
        style={{
          background: "#131A28",
          border: "1px solid #1E2433",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Tabs + Actions Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid #1E2433",
            background: "#0F1725",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setActiveTab("history")}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                borderRadius: 7,
                cursor: "pointer",
                background:
                  activeTab === "history"
                    ? "rgba(123,47,247,0.15)"
                    : "transparent",
                color: activeTab === "history" ? "#7B2FF7" : "#94A3B8",
                outline:
                  activeTab === "history"
                    ? "1px solid rgba(123,47,247,0.3)"
                    : "none",
                transition: "all 0.15s",
                letterSpacing: "0.3px",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== "history") {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== "history") {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              Trade History
            </button>

            <button
              onClick={() => setActiveTab("open")}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                borderRadius: 7,
                cursor: "pointer",
                background:
                  activeTab === "open"
                    ? "rgba(123,47,247,0.15)"
                    : "transparent",
                color: activeTab === "open" ? "#7B2FF7" : "#94A3B8",
                outline:
                  activeTab === "open"
                    ? "1px solid rgba(123,47,247,0.3)"
                    : "none",
                transition: "all 0.15s",
                letterSpacing: "0.3px",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== "open") {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== "open") {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              Open Orders
            </button>
          </div>

          {/* Search + Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flex: 1,
              maxWidth: 600,
            }}
          >
            {/* Search */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#0f1520",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 8,
                padding: "8px 12px",
                flex: 1,
              }}
            >
              <Search size={16} color="#6b7280" />
              <input
                type="text"
                placeholder="Search for crypto"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#e5e7eb",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6b7280",
                    cursor: "pointer",
                    fontSize: 16,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Download CSV */}
            <button
              onClick={handleDownloadCSV}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 8,
                color: "#f59e0b",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(245,158,11,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(245,158,11,0.1)";
              }}
            >
              DOWNLOAD CSV
              <ChevronDown size={14} />
            </button>

            {/* Filter */}
            <button
              onClick={() => setShowFilter(!showFilter)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: showFilter ? "rgba(245,158,11,0.1)" : "transparent",
                border: `1px solid ${showFilter ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 8,
                color: showFilter ? "#f59e0b" : "#6b7280",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!showFilter) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }
              }}
              onMouseLeave={(e) => {
                if (!showFilter) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <SlidersHorizontal size={16} />
              Filter
            </button>
          </div>
        </div>

        {/* Filter Panel (collapsible) */}
        {showFilter && (
          <div
            style={{
              padding: "16px 24px",
              background: "#060810",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                EXCHANGE
              </label>
              <select
                style={{
                  background: "#0f1520",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 6,
                  padding: "6px 10px",
                  color: "#e5e7eb",
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
              >
                <option>All</option>
                <option>CoinSwitchX</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                ORDER TYPE
              </label>
              <select
                style={{
                  background: "#0f1520",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 6,
                  padding: "6px 10px",
                  color: "#e5e7eb",
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
              >
                <option>All</option>
                <option>Limit</option>
                <option>Market</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                BUY/SELL
              </label>
              <select
                style={{
                  background: "#0f1520",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 6,
                  padding: "6px 10px",
                  color: "#e5e7eb",
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
              >
                <option>All</option>
                <option>Buy</option>
                <option>Sell</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                STATUS
              </label>
              <select
                style={{
                  background: "#0f1520",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 6,
                  padding: "6px 10px",
                  color: "#e5e7eb",
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
              >
                <option>All</option>
                <option>Fulfilled</option>
                <option>Cancelled</option>
                <option>Partial</option>
              </select>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div style={{ padding: "0" }}>
          {activeTab === "history" ? (
            <TradeHistory searchQuery={searchQuery} />
          ) : (
            <OpenOrders searchQuery={searchQuery} />
          )}
        </div>
      </div>

      {/* Footer disclaimer */}
      <div
        style={{
          marginTop: 32,
          padding: 16,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 8,
          fontSize: 11,
          color: "#4b5563",
          lineHeight: 1.6,
        }}
      >
        CoinSwitch Pro is a virtual digital asset (VDA)/ crypto aggregation
        platform. Upon your instruction, we buy and sell cryptos and/or crypto
        futures on your behalf, from/ on such third-party crypto exchange, as
        selected by you. The services of online trading of Crypto/ VDA and/or
        crypto futures is provided by Bitcipher Labs LLP (LLPIN: AAM-0533).
        Crypto products and NFTs are unregulated and can be highly risky. There
        may be no regulatory recourse for any loss from such transactions.
      </div>
    </div>
  );
};

export default SpotOrders;
