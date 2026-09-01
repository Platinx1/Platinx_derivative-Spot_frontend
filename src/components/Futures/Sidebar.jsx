import React, { useState, useEffect, useCallback, useRef } from "react";
import { BarChart3, Wallet, ListFilter, RefreshCw, Menu } from "lucide-react";
import { useTradingContext } from "../../context/TradingContext"; // ← yeh import add karo

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const API_URL = `${BASE_URL}/api/spot/ticker/all`;
const TOP_N = 15;

// ── Crypto icon (same helper as CoinListPanel) ───────────────────────────────
const getCoinIconUrl = (symbol) => {
  const base = symbol.split("/")[0].toLowerCase();
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${base}.png`;
};

const colorFor = (sym) => {
  const palette = [
    "#f97316",
    "#3b82f6",
    "#a855f7",
    "#22c55e",
    "#eab308",
    "#ec4899",
    "#06b6d4",
    "#ef4444",
    "#8b5cf6",
    "#14b8a6",
    "#f59e0b",
    "#6366f1",
  ];
  let h = 0;
  for (let i = 0; i < sym.length; i++) h = sym.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
};

// ── Coin Avatar ──────────────────────────────────────────────────────────────
const CoinAvatar = ({ symbol, size = 32, selected = false }) => {
  const [err, setErr] = useState(false);
  const base = symbol.split("/")[0];

  // Hide these coins completely
  const hiddenCoins = ["USDT", "HIGH"];
  if (hiddenCoins.includes(base.toUpperCase())) {
    return null; // Completely hide USDT and HIGH
  }

  console.log(base, "base ++++++++");

  const ring = selected
    ? "0 0 0 2px #f59e0b, 0 0 10px rgba(245,158,11,0.35)"
    : "0 2px 8px rgba(0,0,0,0.45)";

  if (!err) {
    return (
      <img
        src={getCoinIconUrl(symbol)}
        alt={base}
        onError={() => setErr(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          boxShadow: ring,
          transition: "box-shadow 0.2s",
          flexShrink: 0,
          border: selected
            ? "2px solid #f59e0b"
            : "1.5px solid rgba(255,255,255,0.07)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: colorFor(base),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.3,
        fontWeight: 800,
        color: "#fff",
        boxShadow: ring,
        transition: "box-shadow 0.2s",
        flexShrink: 0,
        border: selected
          ? "2px solid #f59e0b"
          : "1.5px solid rgba(255,255,255,0.07)",
        letterSpacing: "-0.5px",
        fontFamily: "'DM Mono', 'JetBrains Mono', monospace",
      }}
    >
      {base.slice(0, 3)}
    </div>
  );
};

// ── Tooltip ──────────────────────────────────────────────────────────────────
const Tooltip = ({ children, label, subLabel, color }) => {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: "relative", display: "flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          style={{
            position: "absolute",
            left: "calc(100% + 10px)",
            top: "50%",
            transform: "translateY(-50%)",
            background: "#0f1520",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 7,
            padding: "6px 10px",
            pointerEvents: "none",
            zIndex: 999,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            minWidth: 100,
          }}
        >
          {/* Arrow */}
          <div
            style={{
              position: "absolute",
              left: -5,
              top: "50%",
              transform: "translateY(-50%) rotate(45deg)",
              width: 8,
              height: 8,
              background: "#0f1520",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRight: "none",
              borderTop: "none",
            }}
          />
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#e5e7eb",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {label}
          </div>
          {subLabel && (
            <div
              style={{
                fontSize: 11,
                marginTop: 2,
                color,
                fontWeight: 600,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {subLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Divider ──────────────────────────────────────────────────────────────────
const Divider = () => (
  <div style={{ padding: "4px 12px" }}>
    <div
      style={{
        height: 1,
        background: "rgba(255,255,255,0.05)",
        borderRadius: 1,
      }}
    />
  </div>
);

// ── Format helpers ───────────────────────────────────────────────────────────
const fmtPct = (n) => {
  const v = Number(n);
  if (isNaN(v)) return null;
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
};

const pctColor = (n) => (Number(n) >= 0 ? "#22c55e" : "#ef4444");

// ── Main Sidebar ─────────────────────────────────────────────────────────────
const Sidebar = ({ onShowPanel }) => {
  const { selectedPair, updateSelectedPair } = useTradingContext(); // ← Context use kar rahe hain

  const [panelOpen, setPanelOpen] = useState(false);
  const [topCoins, setTopCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  // ── Fetch top coins by volume ────────────────────────────────────────────
  const fetchTop = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(API_URL);
      const json = await res.json();
      if (json.success && json.data?.data) {
        const arr = Object.values(json.data.data)
          .filter((c) => c.symbol?.endsWith("/INR") && Number(c.lastPrice) > 0)
          .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume))
          .slice(0, TOP_N);
        setTopCoins(arr);
      }
    } catch (e) {
      console.error("Sidebar fetch err:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTop();
    timerRef.current = setInterval(() => fetchTop(true), 30000);
    return () => clearInterval(timerRef.current);
  }, [fetchTop]);

  const handlePanelToggle = (val) => {
    setPanelOpen(val);
    onShowPanel?.(val);
  };

  // Sidebar se pair select hone pe context update
  const handleSelectCoin = (coin) => {
    updateSelectedPair({
      symbol: coin.symbol,
      exchange: coin.exchange || "coinswitchx",
    });
  };

  return (
    <div
      style={{
        width: 52,
        background: "#060810",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        alignItems: "center",
        paddingTop: 8,
        paddingBottom: 8,
        gap: 0,
        boxShadow: "2px 0 16px rgba(0,0,0,0.4)",
        fontFamily: "'DM Mono','JetBrains Mono',monospace",
        userSelect: "none",
        zIndex: 100,
        position: "relative",
      }}
    >
      {/* ── Top: Panel toggle ── */}
      <Tooltip label={panelOpen ? "Close Panel" : "Open Panel"}>
        <button
          onClick={() => handlePanelToggle(!panelOpen)}
          onMouseEnter={() => handlePanelToggle(true)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: panelOpen ? "rgba(245,158,11,0.12)" : "transparent",
            border: panelOpen
              ? "1px solid rgba(245,158,11,0.3)"
              : "1px solid transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            marginBottom: 6,
            transition: "all 0.15s",
          }}
        >
          <Menu
            size={16}
            color={panelOpen ? "#f59e0b" : "#374151"}
            style={{
              transition: "transform 0.2s",
              transform: panelOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>
      </Tooltip>

      <Divider />

      {/* ── Top coins list ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          paddingTop: 6,
          paddingBottom: 6,
          width: "100%",
          scrollbarWidth: "none",
        }}
      >
        <style>{`
          .sb-coin:hover .sb-coin-inner {
            background: rgba(255,255,255,0.04) !important;
          }
          @keyframes sb-spin { to { transform: rotate(360deg); } }
          @keyframes sb-pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
        `}</style>

        {loading && topCoins.length === 0
          ? Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
                animation: "sb-pulse 1.5s ease infinite",
                animationDelay: `${i * 0.1}s`,
                marginBottom: 2,
              }}
            />
          ))
          : topCoins
            .filter((coin) => {
              // Extract base symbol (handles both BTCINR and BTC/INR)
              const base = coin.symbol.includes("/")
                ? coin.symbol.split("/")[0]
                : coin.symbol;

              // Hide these coins
              return !["USDT", "HIGH", "BOME", "LIGHT"].includes(base.toUpperCase());
            })
            .map((coin) => {
              const isSelected = coin.symbol === selectedPair.symbol;
              const pct = fmtPct(coin.percentageChange);
              const clr = pctColor(coin.percentageChange);

              return (
                <Tooltip
                  key={coin.symbol}
                  label={coin.symbol}
                  subLabel={pct}
                  color={clr}
                >
                  <button
                    className="sb-coin"
                    onClick={() => handleSelectCoin(coin)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "3px 0",
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    {/* Active indicator */}
                    {isSelected && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 3,
                          height: 20,
                          background: "#f59e0b",
                          borderRadius: "0 2px 2px 0",
                          boxShadow: "0 0 6px rgba(245,158,11,0.5)",
                        }}
                      />
                    )}

                    <div
                      className="sb-coin-inner"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isSelected
                          ? "rgba(245,158,11,0.08)"
                          : "transparent",
                        transition: "background 0.15s",
                      }}
                    >
                      <CoinAvatar
                        symbol={coin.symbol}
                        size={22}
                        selected={isSelected}
                      />
                    </div>
                  </button>
                </Tooltip>
              );
            })}
      </div>
    </div>
  );
};

export default Sidebar;
