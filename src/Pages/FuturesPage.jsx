import React, { useState, useEffect } from "react";
import Header from "../components/Futures/Header";
import TradingChart from "../components/Futures/TradingChart";
import OrderBookTrades from "../components/Futures/OrderBookTrades";
import MarketTicker from "../components/Futures/MarketTicker";
import OrdersPortfolioPage from "../components/Futures/OrdersPortfolio";
import OrderPlacement from "../components/Futures/OrderPlacement";
import CoinListPanel from "../components/Futures/CoinListPanel";
import Sidebar from "../components/Futures/Sidebar";
import { useSearchParams } from "react-router-dom";
import { useUser } from "../context/UserContext";
import Navbar from "../components/Futures/Navbar";
import Cookies from "js-cookie";

function FuturesPage() {
  console.log("✅ FuturesPage Rendered");
  const [showCoinList, setShowCoinList] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);

  const handleShowPanel = (show) => setShowCoinList(show);

  const handleSelectCoin = (coin) => {
    setSelectedCoin(coin);
    setShowCoinList(false);
  };

  const [searchParams] = useSearchParams();
  const { userId, setUserId } = useUser();

  // URL se user_id leke set karo
  // useEffect(() => {
  //   const urlUserId = searchParams.get("user_id");

  //   if (urlUserId) {
  //     setUserId(urlUserId); // Context + LocalStorage dono mein save
  //   } else if (!userId) {
  //     console.warn("No user_id found in URL or context");
  //   }
  // }, [searchParams, setUserId, userId]);

  useEffect(() => {
    const cookieUserId = Cookies.get("user_id");
    console.log("✅ FuturesPage Mounted");

    
    if (cookieUserId) {
      setUserId(cookieUserId);
      console.log("🔥 USER READY:", cookieUserId);
    }
  }, [setUserId]);

  console.log("Current User ID in FuturesPage:", userId);

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
              className="futures-grid"
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
                  marginRight: "10px",
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

export default FuturesPage;
