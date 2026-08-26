import React, { useState } from "react";
import Sidebar from "../components/Spot/Sidebar";
import CoinListPanel from "../components/Spot/CoinListPanel";
import TradingChart from "../components/Spot/TradingChart";
import MarketTicker from "../components/Spot/MarketTicker";
import OrderBookTrades from "../components/Spot/OrderBookTrades";
import OrderPlacement from "../components/Spot/OrderPlacement";
import OrdersPortfolioPage from "../components/Spot/OrdersPortfolio";
import Header from "../components/Spot/Header";

function Sportpage() {
  const [showCoinList, setShowCoinList] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);

  const handleShowPanel = (show) => setShowCoinList(show);

  const handleSelectCoin = (coin) => {
    setSelectedCoin(coin);
    setShowCoinList(false);
  };

  return (
    <div
      style={{
        height: "100vh",
        background: "#070814",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        overflow: "hidden",
        color: "#FFFFFF",
      }}
    >
      {/* ── Top Header (Fixed) ── */}
      <div style={{ flexShrink: 0 }}>
        <Header />
      </div>

      {/* ── Main Body ── */}
      <div
        style={{ flex: 1, display: "flex", position: "relative", minHeight: 0 }}
      >
        {/* ── Sidebar (Fixed, always visible) ── */}
        <div style={{ flexShrink: 0 }}>
          <Sidebar
            onShowPanel={handleShowPanel}
            onSelectCoin={handleSelectCoin}
            selectedCoin={selectedCoin?.symbol || "BTC/INR"}
          />
        </div>

        {/* ── CoinList Panel (overlay on hover) ── */}
        {showCoinList && (
          <div
            style={{
              position: "absolute",
              left: 52,
              top: 0,
              height: "100%",
              zIndex: 50,
              boxShadow: "4px 0 24px rgba(0,0,0,0.6)",
            }}
            onMouseEnter={() => handleShowPanel(true)}
            onMouseLeave={() => handleShowPanel(false)}
          >
            <CoinListPanel
              isOpen={showCoinList}
              onSelectCoin={handleSelectCoin}
            />
          </div>
        )}

        {/* ── Trading Area (Scrollable middle + Fixed bottom ticker) ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            height: "100%",
          }}
        >
          {/* Scrollable Content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            {/* ── 3-Column Row: Chart | OrderBook | OrderForm ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 55fr) minmax(220px, 22fr) minmax(220px, 22fr)",
                gap: 0,
                borderTop: "1px solid #1E2433",
                margin: "6px 0 0 6px",
                minHeight: 623,
              }}
            >
              {/* ── Column 1: Chart ── */}
              <div
                style={{
                  borderRight: "1px solid #1E2433",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <TradingChart selectedCoin={selectedCoin} />
              </div>

              {/* ── Column 2: Order Book / Last Trades ── */}
              <div
                style={{
                  borderRight: "1px solid #1E2433",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <OrderBookTrades selectedCoin={selectedCoin} />
              </div>

              {/* ── Column 3: Order Placement ── */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <OrderPlacement selectedCoin={selectedCoin} />
              </div>
            </div>

            {/* Portfolio page */}
            <div style={{ margin: "6px" }}>
              <OrdersPortfolioPage />
            </div>
          </div>

          {/* ── Bottom Ticker (Fixed) ── */}
          <div style={{ flexShrink: 0 }}>
            <MarketTicker />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sportpage;
