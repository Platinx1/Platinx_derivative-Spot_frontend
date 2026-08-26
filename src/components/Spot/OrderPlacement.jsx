
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useTradingContext } from "../../context/TradingContext";
import { toast } from "react-toastify";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const PORTFOLIO_API_URL = `${BASE_URL}/api/coinswitch/spot/portfolio`;
const PLACE_ORDER_API_URL = `${BASE_URL}/api/coinswitch/spot/order`;
const TICKER_API_BASE = `${BASE_URL}/api/coinswitch/spot/ticker/single`;
const WALLET_API_URL = `${BASE_URL}/api/coinswitch/spot/wallet-balance`;
const FEE_RATE = 0.004; // 0.4%

// ─── COLOR TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg: "#0d1117",
  bgDeep: "#0d1117",
  bgInput: "#161b22",
  bgInputHov: "#161b22",
  border: "#21262d",
  borderFocus: "rgba(240,185,11,0.5)",
  accent: "#7B2FF7",
  accentDim: "rgba(123,47,247,0.12)",
  green: "#0ecb81",
  greenDim: "rgba(14,203,129,0.12)",
  greenBorder: "#0ecb81",
  red: "#f6465d",
  redDim: "rgba(246,70,93,0.12)",
  redBorder: "#f6465d",
  label: "#8b949e",
  text: "#e6edf3",
  textDim: "#8b949e",
  warnBg: "rgba(246,70,93,0.08)",
  warnBorder: "rgba(246,70,93,0.25)",
  tooltipBg: "#1c2128",
  mono: "'Inter', 'SF Pro Display', system-ui, sans-serif",
  success: "#0ecb81",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmtINR = (n, decimals = 4) =>
  "₹" +
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const fmtINR0 = (n) =>
  "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────
const InputGroup = ({
  label,
  value,
  onChange,
  placeholder,
  unit,
  hint,
  badge,
  onBadge,
  rightText,
  noteText,
  focusColor,
}) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== "" && value !== null && value !== undefined;
  const isHighlighted = focused || hasValue;
  const borderCol = focusColor || "rgba(240,185,11,0.5)";
  return (
    <div
      style={{
        background: "#161b22",
        border: `1px solid ${isHighlighted ? borderCol : "#21262d"}`,
        borderRadius: 6,
        padding: "0 10px",
        display: "flex",
        alignItems: "center",
        height: 36,
        gap: 6,
        transition: "border-color 0.15s, box-shadow 0.15s",
        width: "100%",
        boxSizing: "border-box",
        boxShadow: isHighlighted ? `0 0 0 1px ${borderCol}` : "none",
      }}
    >
      {label && (
        <span
          style={{
            fontSize: 10,
            color: isHighlighted ? "#e6edf3" : "#8b949e",
            whiteSpace: "nowrap",
            flexShrink: 0,
            transition: "color 0.15s",
          }}
        >
          {label}
        </span>
      )}
      <input
        className="order-input"
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder || "0"}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 13,
          fontWeight: 600,
          color: "#e6edf3",
          width: "100%",
          fontVariantNumeric: "tabular-nums",
          fontFamily: C.mono,
        }}
      />
      {badge && (
        <button
          type="button"
          onClick={onBadge}
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
          {badge}
        </button>
      )}
      {rightText && (
        <span
          style={{
            fontSize: 10,
            color: "#8b949e",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {rightText}
        </span>
      )}
      {unit && (
        <span
          style={{
            fontSize: 11,
            color: "#8b949e",
            flexShrink: 0,
          }}
        >
          {unit}
        </span>
      )}
    </div>
  );
};

const FeeTooltip = ({ price, qty, visible }) => {
  const amount = price * qty;
  const fee = amount * FEE_RATE;
  const total = amount + fee;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 10px)",
        left: 0,
        width: 240,
        background: C.tooltipBg,
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        padding: 16,
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px rgba(240,185,11,0.08)",
        zIndex: 100,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "all" : "none",
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: C.text,
          letterSpacing: "0.5px",
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom: `1px solid ${C.border}`,
          textTransform: "uppercase",
        }}
      >
        Trading Fee Breakup
      </div>
      {[
        { key: "Price", val: fmtINR0(price) },
        { key: "Quantity", val: `×${qty.toFixed(6)}` },
        { key: "Amount", val: fmtINR(amount) },
        { key: "Fee (0.4%)", val: `+${fmtINR(fee)}`, color: C.accent },
      ].map(({ key, val, color }) => (
        <div
          key={key}
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 11, color: C.label }}>{key}</span>
          <span
            style={{
              fontSize: 11,
              color: color || C.text,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {val}
          </span>
        </div>
      ))}
      <div style={{ height: 1, background: C.border, margin: "10px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>
          Total
        </span>
        <span
          style={{
            fontSize: 13,
            color: C.accent,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtINR(total)}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: -6,
          left: 18,
          width: 10,
          height: 10,
          background: C.tooltipBg,
          borderRight: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const OrderPlacement = () => {
  const { selectedPair } = useTradingContext();
  const { refreshOrders, refreshWallet } = useTradingContext();
  const SYMBOL = selectedPair?.symbol || "LIGHT/INR";
  const EXCHANGE = selectedPair?.exchange || "coinswitchx";
  const baseCoin = SYMBOL.split("/")[0];
  const quoteCoin = SYMBOL.split("/")[1] || "INR";

  const TICKER_API = `${TICKER_API_BASE}?symbol=${SYMBOL}&exchange=${EXCHANGE}`;

  const [token] = useState(() => localStorage.getItem("token") || "");
  const [userId] = useState(() => localStorage.getItem("user_id") || "1128");

  // State
  const [side, setSide] = useState("buy");
  const [orderType, setOrderType] = useState("limit");
  const [limitPrice, setLimitPrice] = useState("");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [qty, setQty] = useState("");
  const [sliderVal, setSliderVal] = useState(0);
  const [activePct, setActivePct] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [feeHover, setFeeHover] = useState(false);
  const [availableINR, setAvailableINR] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingTicker, setLoadingTicker] = useState(true);
  const [error, setError] = useState(null);
  const [bestAsk, setBestAsk] = useState("");
  const [bestBid, setBestBid] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [pairInfo, setPairInfo] = useState(null);


  // Ref to track if user has manually initialized or edited price
  const isPriceSetRef = useRef(false);
  const {
    ordersRefresh,
    setOrdersRefresh,
    selectedPrice,
    updateSelectedPrice,
    walletRefresh,
  } = useTradingContext();

  useEffect(() => {
    if (selectedPrice != null && selectedPrice !== "" && !isNaN(Number(selectedPrice))) {
      setCurrentPrice(String(selectedPrice));
    }
  }, [selectedPrice]);

  // ── Fetch Ticker ──────────────────────────────────────────────────────────
  const fetchTicker = useCallback(
    async (isInitial = false) => {
      try {
        if (isInitial) setLoadingTicker(true);
        const res = await fetch(TICKER_API);
        const json = await res.json().catch(() => null);

        let d = null;
        if (json?.data) {
          if (json.data[SYMBOL]) d = json.data[SYMBOL];
          else if (json.data[SYMBOL.toUpperCase()]) d = json.data[SYMBOL.toUpperCase()];
          else if (json.data.data?.[EXCHANGE]) d = json.data.data[EXCHANGE];
          else if (json.data.data?.[SYMBOL]) d = json.data.data[SYMBOL];
          else if (typeof json.data === "object") {
            if (json.data.lastPrice !== undefined || json.data.price !== undefined) {
              d = json.data;
            } else {
              d = Object.values(json.data)[0];
              if (d?.data) d = Object.values(d.data)[0] || d;
            }
          }
        }

        if (d) {
          const last = d.lastPrice != null ? String(d.lastPrice) : (d.price != null ? String(d.price) : "");
          const ask = d.askPrice != null ? String(d.askPrice) : last;
          const bid = d.bidPrice != null ? String(d.bidPrice) : last;

          if (last) {
            setCurrentPrice(last);
          }
          if (ask) setBestAsk(ask);
          if (bid) setBestBid(bid);

          if (!isPriceSetRef.current) {
            isPriceSetRef.current = true;
          }
        }
      } catch (err) {
        console.error("Ticker fetch error:", err);
      } finally {
        if (isInitial) setLoadingTicker(false);
      }
    },
    [TICKER_API, SYMBOL, EXCHANGE]
  );

  // ── Minimum Quantity Calculation ──────────────────────────────────────────
  const getMinimumOrderQuantity = (minQty, marketPrice, quantityPrecision) => {
    const rawQty = minQty / marketPrice;
    const factor = Math.pow(10, quantityPrecision);
    return Math.ceil(rawQty * factor) / factor;
  };

  const fetchPairInfo = useCallback(async () => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/coinswitch/spot/pairs?name=${encodeURIComponent(
          SYMBOL
        )}`
      );
      const json = await res.json();
      if (json.success && json.data?.length > 0) {
        setPairInfo(json.data[0]);
      }
    } catch (err) {
      console.error("Pair fetch error:", err);
    }
  }, [SYMBOL]);

  useEffect(() => {
    fetchPairInfo();
  }, [fetchPairInfo]);

  const minimumOrderQty =
    pairInfo && currentPrice
      ? getMinimumOrderQuantity(
        Number(pairInfo.minQty),
        Number(currentPrice),
        Number(pairInfo.quantityPrecision)
      )
      : 0;

  // ── Fetch Wallet Balance ──────────────────────────────────────────────────
  // 1. Add state for total balance
  const [totalINR, setTotalINR] = useState(0);

  // 2. Update fetchBalance implementation
  // ── Fetch Wallet Balance with Auto-Refresh ──────────────────────────────────
  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch(`${WALLET_API_URL}?user=${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.status && json.data) {
        setAvailableINR(Number(json.data.availableForSpot || json.data.freeBalance || 0));
        setTotalINR(Number(json.data.totalBalance || 0));
      }
    } catch (err) {
      console.error("Failed to fetch wallet balance:", err);
      setError("Could not load wallet balance");
    } finally {
      setLoadingBalance(false);
    }
  }, [token, userId]);

  // Auto-polling & Focus Listener for Wallet Balance
  useEffect(() => {
    // Initial fetch
    fetchBalance();

    // 1. Poll wallet balance every 5 seconds
    const balanceInterval = setInterval(() => {
      fetchBalance();
    }, 5000);

    // 2. Refresh when window/tab gets focus
    const handleFocus = () => fetchBalance();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(balanceInterval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchBalance, walletRefresh]);

  // ── Reset on Pair Change & Setup Polling ──────────────────────────────────
  useEffect(() => {
    isPriceSetRef.current = false; // reset flag
    setLimitPrice("");
    setTriggerPrice("");
    setQty("");
    setSliderVal(0);
    setActivePct(null);
    setError(null);
    setBestAsk("");
    setBestBid("");

    // Initial fetch
    fetchTicker(true);

    // Refresh current price every 2 seconds without resetting limitPrice input
    const interval = setInterval(() => {
      fetchTicker(false);
    }, 2000);

    return () => clearInterval(interval);
  }, [SYMBOL, fetchTicker]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance, walletRefresh]);
  useEffect(() => {
    if (selectedPrice != null && selectedPrice !== "") {
      setCurrentPrice(String(selectedPrice));
    }
  }, [selectedPrice]);
  // ── Derived values ────────────────────────────────────────────────────────
  const price = parseFloat(limitPrice.replace(/,/g, "")) || 0;
  const qtyNum = parseFloat(qty) || 0;
  const amount = price * qtyNum;
  const fee = amount * FEE_RATE;
  const totalCost = amount + fee;
  const totalReceive = amount - fee;

  // ── Percentage / Slider Handlers ──────────────────────────────────────────
  const handleSetPct = useCallback(
    (p) => {
      if (activePct === p) {
        setActivePct(null);
        setQty("");
        setSliderVal(0);
        return;
      }

      setActivePct(p);
      if (p === "min") {
        setQty(minimumOrderQty ? minimumOrderQty.toString() : "1");
        setSliderVal(0);
      } else {
        const budget = availableINR * (p / 100);
        const q = budget / (price || 1);
        setQty(q.toFixed(pairInfo?.quantityPrecision || 4));
        setSliderVal(p);
      }
    },
    [activePct, price, availableINR, minimumOrderQty, pairInfo]
  );

  const handleSlider = useCallback(
    (v) => {
      setSliderVal(v);
      setActivePct(null);
      if (v === 0) {
        setQty("");
        return;
      }
      const budget = availableINR * (v / 100);
      const q = budget / (price || 1);
      setQty(q.toFixed(pairInfo?.quantityPrecision || 4));
    },
    [price, availableINR, pairInfo]
  );

  // ── Place Order Handler ───────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    try {
      setPlacing(true);
      const payload = {
        user: userId,
        side,
        symbol: SYMBOL,
        type: orderType === "stoplimit" ? "stop_limit" : "limit",
        price: Number(limitPrice),
        quantity: Number(qty),
        exchange: EXCHANGE,
      };

      const response = await fetch(PLACE_ORDER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Order Placement Failed");
      }

      toast.success("Order Placed Successfully");
      setOrdersRefresh(prev => prev + 1);
      refreshWallet();
      setTimeout(() => fetchBalance(), 600);
      setTimeout(() => fetchBalance(), 1500);
      setTimeout(() => fetchBalance(), 3000);
      setPlaced(true);
      setTimeout(() => setPlaced(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  // ── Side / Type Handlers ──────────────────────────────────────────────────
  const handleSide = (s) => {
    setSide(s);
    setActivePct(null);
  };

  const handleType = (t) => {
    setOrderType(t);
    setTriggerPrice("");
    setQty("");
    setSliderVal(0);
    setActivePct(null);
  };

  const isGreen = side === "buy";

  const pctClass = (p) => {
    if (activePct !== p) return {};
    return {
      background: isGreen ? C.greenDim : C.redDim,
      color: isGreen ? C.green : C.red,
      borderColor: isGreen ? C.greenBorder : C.redBorder,
    };
  };

  const placeBtnLabel = placing
    ? "Processing…"
    : placed
      ? "✓ Order Placed"
      : `Place ${side === "buy" ? "Buy" : "Sell"} Order`;

  return (
    <div
      style={{
        width: "100%",
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        overflow: "visible",
        boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
        fontFamily: C.mono,
        position: "relative",
        minHeight: "623px",
      }}
    >
      {/* ── BUY / SELL TABS ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          background: C.bgDeep,
          overflow: "hidden",
        }}
      >
        {["buy", "sell"].map((s) => (
          <button
            key={s}
            onClick={() => handleSide(s)}
            style={{
              padding: "13px 0",
              fontFamily: C.mono,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              border: "none",
              cursor: "pointer",
              background:
                side === s ? (s === "buy" ? C.green : C.red) : "transparent",
              color:
                side === s
                  ? s === "buy"
                    ? "#000"
                    : "#fff"
                  : s === "buy"
                    ? C.green
                    : C.red,
              transition: "background 0.2s",
            }}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── ORDER TYPE ── */}
      <div
        style={{
          display: "flex",
          padding: "12px 14px 0",
          borderBottom: `1px solid ${C.border}`,
          background: C.bg,
        }}
      >
        {["limit", "stoplimit"].map((t) => (
          <button
            key={t}
            onClick={() => handleType(t)}
            style={{
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              background: "transparent",
              color: orderType === t ? "#fff" : C.label,
              borderBottom: `2px solid ${orderType === t ? C.accent : "transparent"
                }`,
              marginBottom: -1,
              cursor: "pointer",
              fontFamily: C.mono,
            }}
          >
            {t === "limit" ? "Limit" : ""}
          </button>
        ))}
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: 14 }}>
        {/* Available Balance */}
        {/* ── BALANCE DISPLAY SECTION ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
            padding: "8px 12px",
            background: C.bgInput,
            borderRadius: 7,
            border: `1px solid ${C.border}`,
          }}
        >
          <div>
            <div style={{ fontSize: 9, color: C.label, textTransform: "uppercase", marginBottom: 2 }}>
              AVAILABLE SPOT BALANCE
            </div>

          </div>

          <div style={{ textAlign: "right" }}>
            {loadingBalance ? (
              <span style={{ fontSize: 11, color: C.label }}>Loading...</span>
            ) : (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#e6edf3",
                  fontFamily: C.mono,
                }}
              >
                ₹{Number(availableINR).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            )}
          </div>
        </div>
        {/* Current Price Display */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#111827",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: C.label,
              textTransform: "uppercase",
            }}
          >
            Current Price
          </span>

          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#e6edf3",
              fontFamily: C.mono,
            }}
          >
            {currentPrice
              ? `₹${Number(currentPrice).toLocaleString("en-IN")}`
              : "--"}
          </span>
        </div>

        {error && (
          <div
            style={{
              color: C.red,
              fontSize: 11,
              marginBottom: 10,
              textAlign: "center",
              padding: "8px 12px",
              background: C.warnBg,
              border: `1px solid ${C.warnBorder}`,
              borderRadius: 6,
            }}
          >
            {error}
          </div>
        )}

        {/* Trigger Price (stop-limit only) */}
        {/* {orderType === "stoplimit" && (
          <InputGroup
            label="Trigger Price"
            value={triggerPrice}
            onChange={(e) => setTriggerPrice(e.target.value)}
            placeholder="Market trigger price"
            unit={quoteCoin}
          />
        )} */}

        {/* Limit Price */}
        <InputGroup
          label={loadingTicker ? "Limit Price (Loading…)" : "Limit Price"}
          value={limitPrice}
          onChange={(e) => {
            isPriceSetRef.current = true;
            setLimitPrice(e.target.value);
          }}
          unit={quoteCoin}
          badge={side === "buy" ? "Best Ask" : "Best Bid"}
          onBadge={() => {
            isPriceSetRef.current = true;
            const fillPrice = currentPrice || (side === "buy" ? bestAsk : bestBid);
            if (fillPrice) {
              setLimitPrice(String(fillPrice));
            }
          }}
        />

        {/* Quantity */}
        <InputGroup
          label="Quantity"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="0.00"
          unit={baseCoin}
          rightText={`Min ${minimumOrderQty.toFixed(
            pairInfo?.quantityPrecision || 6
          )}`}
        />

        {/* Total Cost / Receive */}
        <div
          style={{
            background: C.bgInput,
            border: `1px solid ${C.border}`,
            borderRadius: 7,
            padding: "10px 12px",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: C.label,
                  textTransform: "uppercase",
                  marginBottom: 5,
                }}
              >
                {side === "buy" ? "Total Cost" : "You Receive ≈"}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                {side === "buy"
                  ? fmtINR(totalCost, 2)
                  : fmtINR(totalReceive, 2)}
              </div>
            </div>
            <span style={{ fontSize: 9, color: C.label }}>Fee 0.4%</span>
          </div>
        </div>

        {/* Percentage Buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 6,
            marginBottom: 10,
          }}
        >
          {[
            { label: "Min", key: "min" },
            { label: "25%", key: 25 },
            { label: "50%", key: 50 },
            { label: "100%", key: 100 },
          ].map(({ label, key }) => (
            <button
              key={key}
              onClick={() => handleSetPct(key)}
              style={{
                padding: "6px 0",
                fontSize: 10,
                fontWeight: 600,
                borderRadius: 5,
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: C.border,
                background: C.bgInput,
                color: C.label,
                cursor: "pointer",
                fontFamily: C.mono,
                outline: "none",
                boxShadow: "none",
                ...pctClass(key),
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Slider */}


        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={placing}
          style={{
            width: "100%",
            padding: "12px 20px",
            background: "#7B2FF7",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: placing ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
            opacity: placing ? 0.7 : 1,
          }}
        >
          {placeBtnLabel}
        </button>

        {/* Fee Info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginTop: 20,
            position: "relative",
          }}
          onMouseEnter={() => setFeeHover(true)}
          onMouseLeave={() => setFeeHover(false)}
        >
          <span
            style={{
              fontSize: 11,
              color: feeHover ? C.accent : C.label,
              cursor: "pointer",
            }}
          >
            Fee breakup (0.4%)
          </span>
          <FeeTooltip price={price} qty={qtyNum} visible={feeHover} />
        </div>
      </div>
    </div>
  );
};

export default OrderPlacement;