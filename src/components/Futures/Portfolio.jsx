
import React, { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { useUser } from "../../context/UserContext";

// ─── APIs & Constants ───────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const WS_URL = "https://pilot-fawss.pi42.com";

const WALLET_API_BASE = `${BASE_URL}/api/fno/futures-wallet/details`;
const POSITIONS_API_BASE = `${BASE_URL}/api/fno/positions`;
const PLACE_ORDER_API = `${BASE_URL}/api/fno/place-order`;
const EXCHANGE_INFO_API = `${BASE_URL}/api/fno/exchange-info`;
const TRADES_BY_POSITION_API = `${BASE_URL}/api/fno/trades-by-position`;
const PAIR_INFO_API = `${BASE_URL}/api/fno/pair-by-name`;

// ─── COLORS ────────────────────────────────────────────────────────────────
const T = {
  // Backgrounds
  bg: "#070B14",
  surface: "#0F1725",
  bgDeep: "#050816",
  bgInput: "#131A28",
  bgInputHov: "#1A2335",
  bgOverlay: "rgba(0,0,0,0.75)",

  // Borders
  border: "rgba(255,255,255,0.06)",
  borderFocus: "rgba(123,47,247,0.35)",

  // Primary Colors
  primary: "#7B2FF7",
  primaryLight: "#A855F7",
  secondary: "#C084FC",
  accent: "#7B2FF7",

  // Gradient
  gradient: "linear-gradient(135deg,#7B2FF7 0%,#A855F7 50%,#C084FC 100%)",

  // Text
  text: "#F8FAFC",
  muted: "#94A3B8",
  label: "#CBD5E1",

  // Status
  green: "#22C55E",
  red: "#EF4444",
  success: "#22C55E",
  warning: "#F59E0B",

  // Card
  card: "#131A28",

  // Effects
  shadow: "0px 10px 40px rgba(0,0,0,0.35)",

  // Radius
  radius: "12px",

  // Font
  font: "'Inter', sans-serif",
  mono: "'Inter', sans-serif",
};

// ─── HELPERS ───────────────────────────────────────────────────────────────
const fmtINR = (n, d = 2) =>
  "₹" +
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
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

const fmtTime = (val) => {
  if (!val) return "—";
  // handles epoch ms/seconds or ISO/date strings
  const num = Number(val);
  const date = !isNaN(num) && val.toString().trim() !== ""
    ? new Date(num > 1e12 ? num : num * 1000)
    : new Date(val);
  if (isNaN(date.getTime())) return val.toString();
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function roundUp(num, precision) {
  const p = Number.isFinite(Number(precision)) ? Number(precision) : 3;
  const factor = Math.pow(10, p);
  return Math.ceil(num * factor) / factor;
}

function calculateMinQuantity(notionalVal, marketPrice, quantityPrecision) {
  if (!notionalVal || !marketPrice || marketPrice <= 0) return 0;
  const minQty = notionalVal / marketPrice;
  return roundUp(minQty, quantityPrecision);
}

const getContractMinQty = (contract, currentMarkPrice) => {
  if (!contract) return 0;

  const notionalFilter = contract.filters?.find(
    (f) => f.filterType === "MIN_NOTIONAL" || f.filterType === "NOTIONAL"
  );
  const notionalVal = parseFloat(
    contract.notional || notionalFilter?.minNotional || notionalFilter?.notional || "0"
  );

  const rawPrecision = contract.quantityPrecision ?? contract.baseAssetPrecision ?? contract.qtyPrecision;
  const quantityPrecision = (rawPrecision !== undefined && rawPrecision !== null && !isNaN(Number(rawPrecision)))
    ? Number(rawPrecision)
    : 3;

  let notionalMinQty = 0;
  if (notionalVal > 0 && currentMarkPrice > 0) {
    notionalMinQty = roundUp(notionalVal / currentMarkPrice, quantityPrecision);
  }

  const marketFilter = contract.filters?.find((f) => f.filterType === "MARKET_QTY_SIZE");
  const lotFilter = contract.filters?.find((f) => f.filterType === "LOT_SIZE");
  const explicitMinQty = parseFloat(
    contract.minQty || marketFilter?.minQty || lotFilter?.minQty || "0"
  );

  const finalMin = Math.max(notionalMinQty, explicitMinQty);
  return finalMin > 0 ? finalMin : explicitMinQty || notionalMinQty || 0;
};

const getPosQty = (pos) => {
  if (!pos) return 0;
  return pos.quantity ?? pos.positionAmount ?? pos.size ?? pos.amount ?? 0;
};

// ─── Calculate real P&L ────────────────────────────────────────────────────
const calcPnL = (pos, markPrice) => {
  if (!markPrice || !pos) return null;
  const entry = parseFloat(pos.entryPrice || pos.entry_price || pos.avgPrice || 0);
  const amount = parseFloat(getPosQty(pos));
  if (!entry || !amount) return 0;

  const typeStr = (pos.positionType || pos.side || pos.type || "LONG").toString().toUpperCase();
  const isLong = typeStr === "LONG" || typeStr === "BUY";

  if (isLong) {
    return (markPrice - entry) * amount;
  } else {
    return (entry - markPrice) * amount;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ═══ SELL QUANTITY VALIDATION FUNCTION ═════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Validates sell quantity before placing reduce-only market order
 * Prevents "Reduce-only order quantity is below the minimum allowed" error
 *
 * @param {number} positionSize - Current position size (e.g., 9.5)
 * @param {number} inputQty - User entered quantity (e.g., 5)
 * @param {number} minQty - Minimum order quantity from exchangeInfo (e.g., 4.9)
 * @returns {object} { isValid, finalQty, error, warning, isFullClose }
 */
const validateSellQuantity = (positionSize, inputQty, minQty) => {
  const result = {
    isValid: false,
    finalQty: 0,
    error: null,
    warning: null,
    isFullClose: false,
  };

  if (!positionSize || positionSize <= 0) {
    result.error = "No open position to close";
    return result;
  }

  const qty = parseFloat(inputQty) || 0;
  const min = parseFloat(minQty) || 0;

  // CASE 1: Input quantity entered by user is below minimum order size → RED ERROR
  if (min > 0 && qty > 0 && qty < min) {
    result.error = `Quantity (${qty}) is below minimum allowed order size (${min}). Please enter at least ${min}.`;
    return result;
  }

  // CASE 2: Position size itself is strictly below minimum → MUST close full
  if (min > 0 && positionSize < min) {
    result.isValid = true;
    result.finalQty = positionSize;
    result.isFullClose = true;
    result.warning = `Position size (${positionSize}) is below minimum order size (${min}). Closing full position.`;
    return result;
  }

  // CASE 3: Partial close would leave dust position → FORCE FULL CLOSE
  const effectiveQty = Math.min(qty, positionSize);
  const remaining = positionSize - effectiveQty;

  if (min > 0 && remaining > 0 && remaining < min) {
    result.isValid = true;
    result.finalQty = positionSize;
    result.isFullClose = true;
    result.warning = `Partial close leaves ${remaining.toFixed(6)} (below min ${min}). Closing full position instead.`;
    return result;
  }

  // CASE 4: No input → Default to full close
  if (qty <= 0) {
    result.isValid = true;
    result.finalQty = positionSize;
    result.isFullClose = true;
    return result;
  }

  // CASE 5: Normal partial close
  result.isValid = true;
  result.finalQty = effectiveQty;
  return result;
};

// ─── Inner Tab ─────────────────────────────────────────────────────────────
const InnerTab = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "10px 24px",
      borderRadius: 6,
      border: "none",
      cursor: "pointer",
      background: active ? T.accent : "transparent",
      color: active ? T.text : T.muted,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: "0.4px",
      borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
      transition: "all 0.15s",
      fontFamily: T.mono,
    }}
  >
    {label}
  </button>
);

// ─── INPUT GROUP ───────────────────────────────────────────────────────────
const InputGroup = ({ label, value, onChange, placeholder, unit, error, hint }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div
      style={{
        background: focused ? T.bgInputHov : T.bgInput,
        border: `1px solid ${error ? T.red : focused ? T.borderFocus : T.border}`,
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: error ? T.red : T.label,
          marginBottom: 6,
          textTransform: "uppercase",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{label}</span>
        {hint && <span style={{ color: T.muted }}>{hint}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: T.mono,
            fontSize: 15,
            fontWeight: 600,
            color: T.text,
            flex: 1,
          }}
        />
        {unit && <span style={{ fontSize: 14, color: T.label, marginLeft: 8 }}>{unit}</span>}
      </div>
      {error && <div style={{ fontSize: 11, color: T.red, marginTop: 4 }}>{error}</div>}
    </div>
  );
};

// ─── ORDER MODAL ───────────────────────────────────────────────────────────
const OrderModal = ({
  position,
  side,
  userId,
  accountId,
  availableINR,
  onClose,
  onSuccess,
  exchangeInfo,
}) => {
  const BASE_COIN = position.contractPair.replace("INR", "");
  const SYMBOL = position.contractPair;

  const initialQty = getPosQty(position);
  const [orderType, setOrderType] = useState("market");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState(initialQty ? initialQty.toString() : "");
  const [markPrice, setMarkPrice] = useState(0);
  const [priceDir, setPriceDir] = useState("up");
  const [isConnected, setIsConnected] = useState(false);
  const markPriceRef = useRef(0);

  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [isFullClose, setIsFullClose] = useState(false);
  const [pairInfo, setPairInfo] = useState(null);

  useEffect(() => {
    const q = getPosQty(position);
    if (q) {
      setQuantity(q.toString());
    }
  }, [position]);

  useEffect(() => {
    if (!SYMBOL) return;
    let isMounted = true;
    fetch(`${PAIR_INFO_API}?name=${SYMBOL}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.status && json.data) {
          const d = json.data;
          setPairInfo({
            notional: parseFloat(d.notional) || 0,
            quantityPrecision: parseInt(d.quantityPrecision, 10),
          });
        }
      })
      .catch((e) => console.error("Pair info fetch error:", e));
    return () => {
      isMounted = false;
    };
  }, [SYMBOL]);

  const getMinQty = useCallback(() => {
    const livePrice = markPrice > 0 ? markPrice : (parseFloat(position.entryPrice) || 0);

    if (pairInfo && pairInfo.notional > 0 && livePrice > 0) {
      const qPrec = Number.isFinite(pairInfo.quantityPrecision) ? pairInfo.quantityPrecision : 3;
      return calculateMinQuantity(pairInfo.notional, livePrice, qPrec);
    }

    if (position?.minQty !== undefined && position?.minQty !== null) return parseFloat(position.minQty);
    if (!exchangeInfo || !SYMBOL) return null;
    const contract = exchangeInfo.contracts?.find((c) => c.name === SYMBOL);
    if (!contract) return null;

    return getContractMinQty(contract, livePrice);
  }, [position, pairInfo, markPrice, exchangeInfo, SYMBOL]);

  const minQtyFromFunc = getMinQty();
  const posQtyVal = parseFloat(getPosQty(position) || 0);
  const minQtyVal = parseFloat(minQtyFromFunc || 0);

  // Take the minimum of position quantity key and getMinQty() key
  const effectiveMinQty = (posQtyVal > 0 && minQtyVal > 0)
    ? Math.min(posQtyVal, minQtyVal)
    : (minQtyVal || posQtyVal || 0);

  const minQty = effectiveMinQty;
  const positionSize = posQtyVal;

  useEffect(() => {
    const validation = validateSellQuantity(positionSize, quantity, minQty);
    setWarning(validation.warning);
    setIsFullClose(validation.isFullClose);
  }, [quantity, positionSize, minQty]);

  useEffect(() => {
    const symLower = SYMBOL.toLowerCase();
    const socket = io(WS_URL, { transports: ["websocket"], forceNew: true });

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("subscribe", { params: [`${symLower}@markPrice`] });
    });

    socket.on("markPriceUpdate", (data) => {
      if (!data?.p) return;
      const newPrice = Number(data.p);
      setPriceDir(newPrice >= (markPriceRef.current || newPrice) ? "up" : "down");
      markPriceRef.current = newPrice;
      setMarkPrice(newPrice);
    });

    return () => socket.disconnect();
  }, [SYMBOL]);

  const isReduceOrder =
    (side === "sell" && position.positionType === "LONG") ||
    (side === "buy" && position.positionType === "SHORT");

  const priceNum = parseFloat(price) || 0;

  const validation = validateSellQuantity(positionSize, quantity, minQty);

  const canPlace =
    !placing &&
    validation.isValid &&
    (orderType === "market" || (orderType === "limit" && priceNum > 0));

  const handlePlace = async () => {
    if (!canPlace) return;
    setPlacing(true);
    setError(null);

    const finalQty = validation.finalQty;

    const payload = {
      user: userId.toString(),
      accountId: accountId ? accountId.toString() : undefined,
      placeType: "POSITION",
      quantity: parseFloat(finalQty.toFixed(6)),
      reduceOnly: false,
      type: orderType.toUpperCase(),
      symbol: SYMBOL,
      positionId: position.positionId,
    };

    if (orderType === "limit" && priceNum > 0) {
      payload.price = priceNum;
    }

    try {
      const res = await fetch(PLACE_ORDER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.status) {
        setPlaced(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setError(data.message || "Order failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setPlacing(false);
    }
  };

  const handleMaxClick = () => {
    setQuantity(positionSize.toString());
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: T.bgOverlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380,
          background: T.bg,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
            background: T.bgDeep,
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{BASE_COIN}/INR</div>
            <div style={{ fontSize: 11, color: T.label }}>
              {position.positionType} • {positionSize} {BASE_COIN} • Entry{" "}
              {fmtINR(position.entryPrice)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: T.gradient,
              width: 34,
              height: 34,
              borderRadius: 8,
              color: T.text,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Side Banner */}
        <div
          style={{
            padding: "13px 20px",
            background: side === "sell" ? "rgba(199, 114, 255, 0.87)" : "rgba(14,203,129,0.12)",
            borderBottom: `2px solid ${side === "sell" ? T.red : T.green}`,
          }}
        >
          <span style={{ fontWeight: 700, color: side === "sell" ? T.red : T.green, fontSize: 15 }}>
            {side.toUpperCase()}
          </span>
          <span style={{ marginLeft: 10, fontSize: 12, color: T.label }}>
            {isReduceOrder ? "Close / Reduce Position" : "Add to Position"}
          </span>
        </div>

        {/* Order Type Tabs */}
        <div style={{ display: "flex", background: T.bgDeep, padding: "10px 12px 0" }}>
          {["market", "limit"].map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              style={{
                flex: 1,
                padding: "8px",
                fontSize: 11,
                fontWeight: 600,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: orderType === t ? T.accent : T.label,
                borderBottom: orderType === t ? `2px solid ${T.accent}` : "2px solid transparent",
                fontFamily: T.mono,
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: 16 }}>
          {/* Mark Price */}
          <div
            style={{
              background: T.bgDeep,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: T.label, marginBottom: 4 }}>MARK PRICE</div>
              <span style={{ fontSize: 18, fontWeight: 700, color: priceDir === "up" ? T.green : T.red }}>
                {fmtPrice(markPrice)}
              </span>
            </div>
            <div style={{ color: isConnected ? T.green : T.label, fontSize: 9, fontFamily: T.mono }}>
              {isConnected ? "● LIVE" : "○ CONNECTING"}
            </div>
          </div>

          {/* Available Balance */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 14,
              fontSize: 13,
              fontFamily: T.mono,
            }}
          >
            <span style={{ color: T.label }}>AVAILABLE BALANCE :</span>
            <span style={{ fontWeight: 700, color: T.text }}>{fmtINR(availableINR)}</span>
          </div>

          {/* Quantity Input with Min hint and MAX button */}
          <div
            style={{
              background: T.bgInput,
              border: `1px solid ${validation.error ? T.red : T.border}`,
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: validation.error ? T.red : T.label,
                marginBottom: 6,
                textTransform: "uppercase",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>QUANTITY ({BASE_COIN})</span>
              <span style={{ color: T.muted }}>
                Min: {effectiveMinQty || "—"} {BASE_COIN}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={effectiveMinQty ? effectiveMinQty.toString() : positionSize.toString()}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: T.mono,
                  fontSize: 15,
                  fontWeight: 600,
                  color: isFullClose ? T.warning : T.text,
                  flex: 1,
                }}
              />
              <span style={{ fontSize: 14, color: T.label }}>{BASE_COIN}</span>
              <button
                onClick={handleMaxClick}
                style={{
                  background: "rgba(212,165,116,0.15)",
                  border: "none",
                  color: T.accent,
                  padding: "4px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: T.mono,
                }}
              >
                MAX
              </button>
            </div>
          </div>

          {validation.error && (
            <div
              style={{
                color: T.red,
                fontSize: 12,
                marginTop: 8,
                padding: "10px 14px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: 6,
                fontFamily: T.mono,
                fontWeight: 600,
              }}
            >
              ⛔ {validation.error}
            </div>
          )}

          {warning && !validation.error && (
            <div
              style={{
                color: T.warning,
                fontSize: 12,
                marginTop: 8,
                padding: "8px 12px",
                background: "rgba(245,158,11,0.1)",
                borderRadius: 6,
                fontFamily: T.mono,
              }}
            >
              ℹ️ {warning}
            </div>
          )}

          {isFullClose && !warning && (
            <div
              style={{
                color: T.warning,
                fontSize: 12,
                marginTop: 8,
                padding: "8px 12px",
                background: "rgba(152, 23, 238, 0.1)",
                borderRadius: 6,
                fontFamily: T.mono,
              }}
            >
              Closing full position of {positionSize} {BASE_COIN}
            </div>
          )}

          {orderType === "limit" && (
            <InputGroup
              label="LIMIT PRICE"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              unit="INR"
            />
          )}

          {error && (
            <div
              style={{
                color: T.red,
                fontSize: 12,
                marginTop: 8,
                padding: "8px 12px",
                background: "rgba(246,70,93,0.1)",
                borderRadius: 6,
              }}
            >
              {error}
            </div>
          )}

          {/* Order Summary */}
          <div
            style={{
              background: T.bgDeep,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              marginTop: 12,
              fontFamily: T.mono,
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: T.label }}>Position Size</span>
              <span style={{ color: T.text }}>
                {positionSize} {BASE_COIN}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: T.label }}>Closing</span>
              <span style={{ color: isFullClose ? T.warning : T.text, fontWeight: 700 }}>
                {validation.finalQty} {BASE_COIN}
                {isFullClose && " (Full)"}
              </span>
            </div>
            {validation.finalQty < positionSize && !isFullClose && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: T.label }}>Remaining</span>
                <span style={{ color: T.text }}>
                  {(positionSize - validation.finalQty).toFixed(3)} {BASE_COIN}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handlePlace}
            disabled={!canPlace}
            style={{
              width: "100%",
              padding: "15px",
              marginTop: 16,
              fontWeight: 700,
              borderRadius: 12,
              border: "none",
              fontFamily: T.mono,
              fontSize: 13,
              background: placed ? T.success : T.gradient,
              color: "#fff",
              cursor: !canPlace ? "not-allowed" : "pointer",
              opacity: !canPlace ? 0.6 : 1,
              transition: "all 0.25s ease",
              boxShadow: !placed ? "0 4px 20px rgba(123,47,247,0.35)" : "none",
            }}
          >
            {placing
              ? "Processing..."
              : placed
                ? "✓ Order Placed"
                : isFullClose
                  ? "CLOSE FULL POSITION"
                  : `PLACE ${side.toUpperCase()} ${orderType.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── TRADES MODAL ────────────────────────────────────────────────────────
// Calls GET /trades-by-position?user=&positionId=  (NO side filter — this was
// the bug: sending positionType ("LONG"/"SHORT") as `side` made the backend
// only match one direction, so SELL/exit trades never showed up).
// We now fetch the FULL trade history for the position — both the entry
// (BUY/SELL that opened it) and the exit (BUY/SELL that closed it).
const TradesModal = ({ position, userId, side, onClose }) => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTrades = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          user: userId,
          positionId: position.positionId,
          side: "SELL",// optional, but can help backend filter faster
        });
        const res = await fetch(`${TRADES_BY_POSITION_API}?${params.toString()}`);
        const json = await res.json();

        if (cancelled) return;

        if (json.status) {
          setTrades(json.data || []);
        } else {
          setError(json.message || "Failed to load trades");
          setTrades([]);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Trades fetch failed:", err);
        setError("Failed to load trades");
        setTrades([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrades();
    return () => {
      cancelled = true;
    };
  }, [position.positionId, userId]);

  const BASE_COIN = position.contractPair.replace("INR", "");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: T.bgOverlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxWidth: "100%",
          maxHeight: "80vh",
          background: T.bg,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
            background: T.bgDeep,
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
              {position.contractPair} Trades
            </div>
            <div style={{ fontSize: 11, color: T.label }}>
              {position.positionType} • Position #{position.positionId}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: T.gradient,
              width: 34,
              height: 34,
              borderRadius: 8,
              color: T.text,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: T.muted, fontFamily: T.mono }}>
              Loading trades...
            </div>
          ) : error ? (
            <div style={{ padding: 24 }}>
              <div
                style={{
                  color: T.red,
                  fontSize: 12,
                  padding: "10px 14px",
                  background: "rgba(239,68,68,0.1)",
                  borderRadius: 8,
                  fontFamily: T.mono,
                }}
              >
                {error}
              </div>
            </div>
          ) : trades.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: T.muted, fontFamily: T.mono }}>
              No trades found for this position
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: T.mono }}>
              <thead>
                <tr style={{ background: T.bgDeep, position: "sticky", top: 0 }}>
                  {["Side", "Price", "Qty", "Contract Pair", "Time"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: h === "Side" ? "left" : "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.muted,
                        whiteSpace: "nowrap",
                        borderBottom: `1px solid ${T.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((tr, i) => {
                  const tradeSide = tr.side || tr.orderSide || "—";
                  const isBuy = String(tradeSide).toUpperCase() === "BUY";
                  const qty = tr.quantity ?? tr.qty ?? tr.filledQuantity ?? "—";
                  const contractPair = tr.contractPair || tr.symbol || "—";
                  const tradePrice = tr.price ?? tr.executedPrice ?? tr.avgPrice ?? null;
                  const realizedPnl = tr.realizedPnl ?? tr.commission ?? null;
                  const time = tr.time ?? tr.timestamp ?? tr.createdAt ?? tr.date ?? null;

                  return (
                    <tr key={tr.tradeId || tr.id || tr.orderId || i} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontWeight: 700,
                          color: isBuy ? T.green : T.red,
                        }}
                      >
                        {String(tradeSide).toUpperCase()}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: T.text }}>
                        {tradePrice !== null ? fmtPrice(tradePrice) : "—"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: T.text }}>
                        {qty}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: T.text }}>
                        {contractPair}
                      </td>
                      {/* <td style={{ padding: "12px 16px", textAlign: "center", color: T.muted }}>
                        {realizedPnl !== null ? fmtINR(realizedPnl) : "—"}
                      </td> */}
                      <td style={{ padding: "12px 16px", textAlign: "center", color: T.muted, fontSize: 12 }}>
                        {fmtTime(time)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── LIVE MARK PRICE HOOK ─────────────────────────────────────────────────
const useLiveMarkPrices = (positions) => {
  const [markPrices, setMarkPrices] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    if (!positions || positions.length === 0) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(WS_URL, { transports: ["websocket"], forceNew: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      const params = positions
        .filter((pos) => pos && (pos.contractPair || pos.symbol))
        .map((pos) => `${(pos.contractPair || pos.symbol).toLowerCase()}@markPrice`);
      socket.emit("subscribe", { params });
    });

    socket.on("markPriceUpdate", (data) => {
      if (!data?.s || !data?.p) return;
      const symbol = data.s.toUpperCase();
      const price = parseFloat(data.p);
      setMarkPrices((prev) => ({ ...prev, [symbol]: price }));
    });

    socket.on("disconnect", () => { });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [positions.map((p) => p.contractPair || p.symbol || "").join(",")]);

  return markPrices;
};

// ─── MAIN PORTFOLIO ────────────────────────────────────────────────────────
const Portfolio = () => {
  const { userId, accountId, refreshBalance } = useUser();

  const [activeTab, setActiveTab] = useState("OPEN");
  const [wallet, setWallet] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableINR, setAvailableINR] = useState(0);
  const [modalInfo, setModalInfo] = useState(null);
  const [exchangeInfo, setExchangeInfo] = useState(null);
  const [tradesModalInfo, setTradesModalInfo] = useState(null); // { position }

  const markPrices = useLiveMarkPrices(activeTab === "OPEN" ? positions : []);

  const fetchExchangeInfo = useCallback(async () => {
    try {
      const res = await fetch(`${EXCHANGE_INFO_API}?market=INR`);
      const json = await res.json();
      if (json.status && json.data) {
        setExchangeInfo(json.data);
      }
    } catch (err) {
      console.error("Exchange info fetch failed:", err);
    }
  }, []);

  const fetchWallet = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${WALLET_API_BASE}?user=${userId}&marginAsset=INR`);
      const json = await res.json();
      if (json.status && json.data) {
        setWallet(json.data);
        setAvailableINR(parseFloat(json.data.withdrawableBalance) || 0);
      }
    } catch (err) {
      console.error(err);
    }
  }, [userId]);

  const fetchPositions = useCallback(async () => {
    if (!userId) return;
    try {
      const status =
        activeTab === "OPEN" ? "OPEN" : activeTab === "CLOSED" ? "CLOSED" : "LIQUIDATED";
      const res = await fetch(`${POSITIONS_API_BASE}?user=${userId}&positionStatus=${status}`);
      const json = await res.json();
      setPositions(json.status && json.data ? json.data : []);
    } catch (err) {
      console.error(err);
      setPositions([]);
    }
  }, [userId, activeTab]);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      Promise.all([fetchWallet(), fetchPositions(), fetchExchangeInfo()]).finally(() =>
        setLoading(false),
      );
    }
  }, [userId, activeTab]);

  useEffect(() => {
    if (!userId || activeTab !== "OPEN") return;
    const interval = setInterval(() => {
      fetchWallet();
      fetchPositions();
    }, 15000);
    return () => clearInterval(interval);
  }, [userId, activeTab]);

  const totalMarginUsed = positions.reduce((sum, pos) => sum + parseFloat(pos.margin || 0), 0);

  const totalUnrealisedPnL = positions.reduce((sum, pos) => {
    const sym = pos.contractPair || pos.symbol;
    const mp = markPrices[sym];
    const pnl = mp !== undefined ? calcPnL(pos, mp) : 0;
    return sum + (pnl || 0);
  }, 0);

  const isNegativePnL = totalUnrealisedPnL < 0;
  const currentValue = wallet ? parseFloat(wallet.marginBalance || 0) : 0;

  // OPEN tab → no Trades column (position isn't closed yet, nothing to view).
  // CLOSED tab → Trades column added at the end so user can inspect fills.
  // LIQUIDATED tab → no Trades column (kept as before, only CLOSED requested).
  const tableHeaders =
    activeTab === "OPEN"
      ? ["Contract", "Type", "Size", "Entry Price", "Mark Price", "Liq. Price", "Leverage", "Margin", "P&L", "Action"]
      : activeTab === "CLOSED"
        ? ["Contract", "Type", "Size", "Entry Price", "Sell Price", "Leverage", "Margin", "Realised P&L", "Trades"]
        : ["Contract", "Type", "Size", "Entry Price", "Sell Price", "Liq. Price", "Leverage", "Margin", "Realised P&L"];

  if (loading && !positions.length) {
    return (
      <div style={{ color: T.muted, padding: 20, fontFamily: T.mono }}>
        Loading Portfolio...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: T.mono, padding: "20px" }}>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Left Stats */}
        <div
          style={{
            width: 200,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: "20px",
            }}
          >
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Current Value</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>
              ₹{currentValue.toFixed(2)}
            </div>
          </div>
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: "20px",
            }}
          >
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Invested Value</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>
              ₹{totalMarginUsed.toFixed(2)}
            </div>
          </div>
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: "20px",
            }}
          >
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Unrealised P&L</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: isNegativePnL ? T.red : T.green,
              }}
            >
              {isNegativePnL ? "▼" : "▲"} ₹{Math.abs(totalUnrealisedPnL).toFixed(2)}
            </div>
            {activeTab === "OPEN" && (
              <div style={{ fontSize: 9, color: T.green, marginTop: 6 }}>● LIVE</div>
            )}
          </div>
        </div>

        {/* Main Panel */}
        <div
          style={{
            flex: 1,
            background: T.surface,
            borderRadius: 8,
            overflow: "hidden",
            border: `1px solid ${T.border}`,
          }}
        >
          {/* Tab Header */}
          <div
            style={{
              background: "#080b12",
              borderBottom: `1px solid ${T.border}`,
              padding: "0 16px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 4 }}>
              <InnerTab label="OPEN" active={activeTab === "OPEN"} onClick={() => setActiveTab("OPEN")} />
              <InnerTab
                label="CLOSED"
                active={activeTab === "CLOSED"}
                onClick={() => setActiveTab("CLOSED")}
              />
              <InnerTab
                label="LIQUIDATED"
                active={activeTab === "LIQUIDATED"}
                onClick={() => setActiveTab("LIQUIDATED")}
              />
            </div>
          </div>

          {/* Positions Table */}
          <div
            style={{ padding: "4px" }}
            className="max-h-[300px] md:max-h-[400px] lg:max-h-[450px] overflow-y-auto"
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#080b12", borderBottom: `1px solid ${T.border}` }}>
                  {tableHeaders.map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "14px 16px",
                        textAlign: h === "Contract" || h === "Action" ? "left" : "center",
                        fontSize: 12,
                        fontWeight: 700,
                        color: T.muted,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tableHeaders.length}
                      style={{ padding: "80px", textAlign: "center", color: T.muted }}
                    >
                      No {activeTab.toLowerCase()} positions found
                    </td>
                  </tr>
                ) : (
                  positions.map((pos) => {
                    const isLong = String(pos.positionType).toUpperCase() === "LONG";
                    const isShort = String(pos.positionType).toUpperCase() === "SHORT";

                    const mp = markPrices[pos.contractPair];
                    const livePnL = mp !== undefined ? calcPnL(pos, mp) : null;
                    const displayPnL =
                      activeTab === "OPEN" ? livePnL : parseFloat(pos.realizedProfit || 0);

                    const pnlColor = displayPnL === null ? T.muted : displayPnL < 0 ? T.red : T.green;

                    const rawClosePrice = pos.closePrice || pos.sellPrice || pos.exitPrice || null;

                    // CLOSED tab me agar type SHORT ho, to entry price and sell price interchange ho jaaye
                    const isClosedShort = activeTab === "CLOSED" && isShort;
                    const displayEntryPrice = isClosedShort ? rawClosePrice : pos.entryPrice;
                    const displayClosePrice = isClosedShort ? pos.entryPrice : rawClosePrice;

                    return (
                      <tr key={pos.positionId} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: "14px 16px", fontWeight: 600, color: T.text }}>
                          {pos.contractPair}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            textAlign: "center",
                            fontWeight: 700,
                            color: isLong ? T.green : T.red,
                          }}
                        >
                          {pos.positionType}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center", color: T.text }}>
                          {getPosQty(pos)}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center", color: T.text }}>
                          {displayEntryPrice ? `₹${Number(displayEntryPrice).toFixed(3)}` : "—"}
                        </td>
                        {activeTab === "OPEN" ? (
                          <td
                            style={{
                              padding: "14px 16px",
                              textAlign: "center",
                              color: mp ? T.accent : T.muted,
                              fontWeight: 600,
                            }}
                          >
                            {mp ? `₹${Number(mp).toFixed(3)}` : "—"}
                          </td>
                        ) : (
                          <td
                            style={{
                              padding: "14px 16px",
                              textAlign: "center",
                              color: displayClosePrice ? T.accent : T.muted,
                              fontWeight: 600,
                            }}
                          >
                            {displayClosePrice ? `₹${Number(displayClosePrice).toFixed(3)}` : "—"}
                          </td>
                        )}
                        {(activeTab === "OPEN" || activeTab === "LIQUIDATED") && (
                          <td style={{ padding: "14px 16px", textAlign: "center", color: T.warning }}>
                            {pos.liquidationPrice ? `₹${Number(pos.liquidationPrice).toFixed(3)}` : "—"}
                          </td>
                        )}
                        <td style={{ padding: "14px 16px", textAlign: "center", color: T.text }}>
                          {pos.leverage}x
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center", color: T.text }}>
                          ₹{parseFloat(pos.margin || 0).toFixed(2)}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            textAlign: "center",
                            color: pnlColor,
                            fontWeight: 700,
                          }}
                        >
                          {displayPnL === null
                            ? "—"
                            : `${displayPnL >= 0 ? "+" : ""}₹${displayPnL.toFixed(2)}`}
                        </td>
                        {activeTab === "OPEN" && (
                          <td style={{ padding: "14px 16px" }}>
                            {isLong ? (
                              <button
                                onClick={() => setModalInfo({ position: pos, side: "sell" })}
                                style={{
                                  padding: "6px 18px",
                                  background: "rgba(246,70,93,0.15)",
                                  color: T.red,
                                  borderRadius: 6,
                                  border: "none",
                                  cursor: "pointer",
                                  fontFamily: T.mono,
                                  fontWeight: 700,
                                  fontSize: 12,
                                }}
                              >
                                SELL
                              </button>
                            ) : (
                              <button
                                onClick={() => setModalInfo({ position: pos, side: "buy" })}
                                style={{
                                  padding: "6px 18px",
                                  background: "rgba(14,203,129,0.15)",
                                  color: T.green,
                                  borderRadius: 6,
                                  border: "none",
                                  cursor: "pointer",
                                  fontFamily: T.mono,
                                  fontWeight: 700,
                                  fontSize: 12,
                                }}
                              >
                                BUY
                              </button>
                            )}
                          </td>
                        )}
                        {/* Trades VIEW button → only in CLOSED tab */}
                        {activeTab === "CLOSED" && (
                          <td style={{ padding: "14px 16px", textAlign: "center" }}>
                            <button
                              onClick={() =>
                                setTradesModalInfo({
                                  position: pos,
                                  side: pos.positionType === "LONG" ? "SELL" : "BUY",
                                })
                              }
                            >
                              VIEW
                            </button>


                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {modalInfo && (
        <OrderModal
          position={modalInfo.position}
          side={modalInfo.side}
          userId={userId}
          accountId={accountId}
          availableINR={availableINR}
          onClose={() => setModalInfo(null)}
          onSuccess={() => {
            fetchWallet();
            fetchPositions();
            refreshBalance();
          }}
          exchangeInfo={exchangeInfo}
        />
      )}

      {/* Trades Modal — CLOSED tab only */}
      {tradesModalInfo && (
        <TradesModal
          position={tradesModalInfo.position}
          userId={userId}
          onClose={() => setTradesModalInfo(null)}
        />
      )}
    </div>
  );
};

export default Portfolio;



// import React, { useState, useEffect, useCallback, useRef } from "react";
// import { io } from "socket.io-client";
// import { useUser } from "../../context/UserContext";

// // ─── APIs & Constants ───────────────────────────────────────────────────────
// const BASE_URL = import.meta.env.VITE_API_BASE_URL;
// const WS_URL = "https://pilot-fawss.pi42.com";

// const WALLET_API_BASE = `${BASE_URL}/api/pi42/futures-wallet/details`;
// const POSITIONS_API_BASE = `${BASE_URL}/api/pi42/positions`;
// const PLACE_ORDER_API = `${BASE_URL}/api/pi42/place-order`;
// const EXCHANGE_INFO_API = `${BASE_URL}/api/pi42/exchange-info`;
// const TRADES_BY_POSITION_API = `${BASE_URL}/api/pi42/trades-by-position`; // ← NEW

// // ─── COLORS ────────────────────────────────────────────────────────────────
// const T = {
//   // Backgrounds
//   bg: "#070B14",
//   surface: "#0F1725",
//   bgDeep: "#050816",
//   bgInput: "#131A28",
//   bgInputHov: "#1A2335",
//   bgOverlay: "rgba(0,0,0,0.75)",

//   // Borders
//   border: "rgba(255,255,255,0.06)",
//   borderFocus: "rgba(123,47,247,0.35)",

//   // Primary Colors
//   primary: "#7B2FF7",
//   primaryLight: "#A855F7",
//   secondary: "#C084FC",
//   accent: "#7B2FF7",

//   // Gradient
//   gradient: "linear-gradient(135deg,#7B2FF7 0%,#A855F7 50%,#C084FC 100%)",

//   // Text
//   text: "#F8FAFC",
//   muted: "#94A3B8",
//   label: "#CBD5E1",

//   // Status
//   green: "#22C55E",
//   red: "#EF4444",
//   success: "#22C55E",
//   warning: "#F59E0B",

//   // Card
//   card: "#131A28",

//   // Effects
//   shadow: "0px 10px 40px rgba(0,0,0,0.35)",

//   // Radius
//   radius: "12px",

//   // Font
//   font: "'Inter', sans-serif",
//   mono: "'Inter', sans-serif",
// };

// // ─── HELPERS ───────────────────────────────────────────────────────────────
// const fmtINR = (n, d = 2) =>
//   "₹" +
//   Number(n).toLocaleString("en-IN", {
//     minimumFractionDigits: d,
//     maximumFractionDigits: d,
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

// const fmtTime = (val) => {
//   if (!val) return "—";
//   // handles epoch ms/seconds or ISO/date strings
//   const num = Number(val);
//   const date = !isNaN(num) && val.toString().trim() !== ""
//     ? new Date(num > 1e12 ? num : num * 1000)
//     : new Date(val);
//   if (isNaN(date.getTime())) return val.toString();
//   return date.toLocaleString("en-IN", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// };

// // ─── Calculate real P&L ────────────────────────────────────────────────────
// const calcPnL = (pos, markPrice) => {
//   if (!markPrice) return null;
//   const entry = parseFloat(pos.entryPrice);
//   const amount = parseFloat(pos.positionAmount);
//   if (pos.positionType === "LONG") {
//     return (markPrice - entry) * amount;
//   } else {
//     return (entry - markPrice) * amount;
//   }
// };

// // ═══════════════════════════════════════════════════════════════════════════
// // ═══ SELL QUANTITY VALIDATION FUNCTION ═════════════════════════════════════
// // ═══════════════════════════════════════════════════════════════════════════
// /**
//  * Validates sell quantity before placing reduce-only market order
//  * Prevents "Reduce-only order quantity is below the minimum allowed" error
//  *
//  * @param {number} positionSize - Current position size (e.g., 9.5)
//  * @param {number} inputQty - User entered quantity (e.g., 5)
//  * @param {number} minQty - Minimum order quantity from exchangeInfo (e.g., 4.9)
//  * @returns {object} { isValid, finalQty, error, warning, isFullClose }
//  */
// const validateSellQuantity = (positionSize, inputQty, minQty) => {
//   const result = {
//     isValid: false,
//     finalQty: 0,
//     error: null,
//     warning: null,
//     isFullClose: false,
//   };

//   if (!positionSize || positionSize <= 0) {
//     result.error = "No open position to close";
//     return result;
//   }

//   const qty = parseFloat(inputQty) || 0;
//   const min = parseFloat(minQty) || 0;

//   // CASE 1: Position itself is below minimum → MUST close full
//   if (min > 0 && positionSize <= min) {
//     result.isValid = true;
//     result.finalQty = positionSize;
//     result.isFullClose = true;
//     result.warning = `Position size (${positionSize}) is below minimum order size (${min}). Closing full position.`;
//     return result;
//   }

//   // CASE 2: Input quantity is below minimum → BLOCK
//   if (min > 0 && qty > 0 && qty < min) {
//     result.error = `Minimum order quantity is ${min}`;
//     return result;
//   }

//   // CASE 3: Partial close would leave dust position → FORCE FULL CLOSE
//   const effectiveQty = Math.min(qty, positionSize);
//   const remaining = positionSize - effectiveQty;

//   if (min > 0 && remaining > 0 && remaining < min) {
//     result.isValid = true;
//     result.finalQty = positionSize;
//     result.isFullClose = true;
//     result.warning = `Partial close leaves ${remaining.toFixed(3)} (below min ${min}). Closing full position instead.`;
//     return result;
//   }

//   // CASE 4: No input → Default to full close
//   if (qty <= 0) {
//     result.isValid = true;
//     result.finalQty = positionSize;
//     result.isFullClose = true;
//     return result;
//   }

//   // CASE 5: Normal partial close
//   result.isValid = true;
//   result.finalQty = effectiveQty;
//   return result;
// };

// // ─── Inner Tab ─────────────────────────────────────────────────────────────
// const InnerTab = ({ label, active, onClick }) => (
//   <button
//     onClick={onClick}
//     style={{
//       padding: "10px 24px",
//       borderRadius: 6,
//       border: "none",
//       cursor: "pointer",
//       background: active ? T.accent : "transparent",
//       color: active ? T.text : T.muted,
//       fontSize: 13,
//       fontWeight: 700,
//       letterSpacing: "0.4px",
//       borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
//       transition: "all 0.15s",
//       fontFamily: T.mono,
//     }}
//   >
//     {label}
//   </button>
// );

// // ─── INPUT GROUP ───────────────────────────────────────────────────────────
// const InputGroup = ({ label, value, onChange, placeholder, unit, error, hint }) => {
//   const [focused, setFocused] = useState(false);
//   return (
//     <div
//       style={{
//         background: focused ? T.bgInputHov : T.bgInput,
//         border: `1px solid ${error ? T.red : focused ? T.borderFocus : T.border}`,
//         borderRadius: 8,
//         padding: "12px 14px",
//         marginBottom: 10,
//       }}
//     >
//       <div
//         style={{
//           fontSize: 11,
//           color: error ? T.red : T.label,
//           marginBottom: 6,
//           textTransform: "uppercase",
//           display: "flex",
//           justifyContent: "space-between",
//         }}
//       >
//         <span>{label}</span>
//         {hint && <span style={{ color: T.muted }}>{hint}</span>}
//       </div>
//       <div style={{ display: "flex", alignItems: "center" }}>
//         <input
//           type="text"
//           value={value}
//           onChange={onChange}
//           placeholder={placeholder}
//           onFocus={() => setFocused(true)}
//           onBlur={() => setFocused(false)}
//           style={{
//             background: "transparent",
//             border: "none",
//             outline: "none",
//             fontFamily: T.mono,
//             fontSize: 15,
//             fontWeight: 600,
//             color: T.text,
//             flex: 1,
//           }}
//         />
//         {unit && <span style={{ fontSize: 14, color: T.label, marginLeft: 8 }}>{unit}</span>}
//       </div>
//       {error && <div style={{ fontSize: 11, color: T.red, marginTop: 4 }}>{error}</div>}
//     </div>
//   );
// };

// // ─── ORDER MODAL ───────────────────────────────────────────────────────────
// const OrderModal = ({
//   position,
//   side,
//   userId,
//   accountId,
//   availableINR,
//   onClose,
//   onSuccess,
//   exchangeInfo,
// }) => {
//   const BASE_COIN = position.contractPair.replace("INR", "");
//   const SYMBOL = position.contractPair;

//   const [orderType, setOrderType] = useState("market");
//   const [price, setPrice] = useState("");
//   const [quantity, setQuantity] = useState(position.positionAmount.toString());

//   const [markPrice, setMarkPrice] = useState(0);
//   const [priceDir, setPriceDir] = useState("up");
//   const [isConnected, setIsConnected] = useState(false);
//   const markPriceRef = useRef(0);

//   const [placing, setPlacing] = useState(false);
//   const [placed, setPlaced] = useState(false);
//   const [error, setError] = useState(null);
//   const [warning, setWarning] = useState(null);
//   const [isFullClose, setIsFullClose] = useState(false);

//   const getMinQty = useCallback(() => {
//     if (!exchangeInfo || !SYMBOL) return null;
//     const contract = exchangeInfo.contracts?.find((c) => c.name === SYMBOL);
//     if (!contract) return null;
//     const marketFilter = contract.filters?.find((f) => f.filterType === "MARKET_QTY_SIZE");
//     const lotFilter = contract.filters?.find((f) => f.filterType === "LOT_SIZE");
//     return parseFloat(marketFilter?.minQty || lotFilter?.minQty || "0");
//   }, [exchangeInfo, SYMBOL]);

//   const minQty = getMinQty();
//   const positionSize = parseFloat(position.positionAmount || 0);

//   useEffect(() => {
//     const validation = validateSellQuantity(positionSize, quantity, minQty);
//     setWarning(validation.warning);
//     setIsFullClose(validation.isFullClose);
//   }, [quantity, positionSize, minQty]);

//   useEffect(() => {
//     const symLower = SYMBOL.toLowerCase();
//     const socket = io(WS_URL, { transports: ["websocket"], forceNew: true });

//     socket.on("connect", () => {
//       setIsConnected(true);
//       socket.emit("subscribe", { params: [`${symLower}@markPrice`] });
//     });

//     socket.on("markPriceUpdate", (data) => {
//       if (!data?.p) return;
//       const newPrice = Number(data.p);
//       setPriceDir(newPrice >= (markPriceRef.current || newPrice) ? "up" : "down");
//       markPriceRef.current = newPrice;
//       setMarkPrice(newPrice);
//     });

//     return () => socket.disconnect();
//   }, [SYMBOL]);

//   const isReduceOrder =
//     (side === "sell" && position.positionType === "LONG") ||
//     (side === "buy" && position.positionType === "SHORT");

//   const priceNum = parseFloat(price) || 0;

//   const validation = validateSellQuantity(positionSize, quantity, minQty);

//   const canPlace =
//     !placing &&
//     validation.isValid &&
//     (orderType === "market" || (orderType === "limit" && priceNum > 0));

//   const handlePlace = async () => {
//     if (!canPlace) return;
//     setPlacing(true);
//     setError(null);

//     const finalQty = validation.finalQty;

//     const payload = {
//       user: userId.toString(),
//       accountId: accountId ? accountId.toString() : undefined,
//       placeType: "POSITION",
//       quantity: parseFloat(finalQty.toFixed(6)),
//       reduceOnly: false,
//       type: orderType.toUpperCase(),
//       symbol: SYMBOL,
//       positionId: position.positionId,
//     };

//     if (orderType === "limit" && priceNum > 0) {
//       payload.price = priceNum;
//     }

//     try {
//       const res = await fetch(PLACE_ORDER_API, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();

//       if (res.ok && data.status) {
//         setPlaced(true);
//         setTimeout(() => {
//           onSuccess();
//           onClose();
//         }, 1500);
//       } else {
//         setError(data.message || "Order failed");
//       }
//     } catch {
//       setError("Network error");
//     } finally {
//       setPlacing(false);
//     }
//   };

//   const handleMaxClick = () => {
//     setQuantity(positionSize.toString());
//   };

//   return (
//     <div
//       onClick={onClose}
//       style={{
//         position: "fixed",
//         inset: 0,
//         zIndex: 1000,
//         background: T.bgOverlay,
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//       }}
//     >
//       <div
//         onClick={(e) => e.stopPropagation()}
//         style={{
//           width: 380,
//           background: T.bg,
//           borderRadius: 16,
//           overflow: "hidden",
//           boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
//         }}
//       >
//         {/* Header */}
//         <div
//           style={{
//             padding: "18px 20px",
//             background: T.bgDeep,
//             borderBottom: `1px solid ${T.border}`,
//             display: "flex",
//             justifyContent: "space-between",
//           }}
//         >
//           <div>
//             <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{BASE_COIN}/INR</div>
//             <div style={{ fontSize: 11, color: T.label }}>
//               {position.positionType} • {position.positionAmount} {BASE_COIN} • Entry{" "}
//               {fmtINR(position.entryPrice)}
//             </div>
//           </div>
//           <button
//             onClick={onClose}
//             style={{
//               background: T.gradient,
//               width: 34,
//               height: 34,
//               borderRadius: 8,
//               color: T.text,
//               border: "none",
//               cursor: "pointer",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//             }}
//           >
//             ✕
//           </button>
//         </div>

//         {/* Side Banner */}
//         <div
//           style={{
//             padding: "13px 20px",
//             background: side === "sell" ? "rgba(199, 114, 255, 0.87)" : "rgba(14,203,129,0.12)",
//             borderBottom: `2px solid ${side === "sell" ? T.red : T.green}`,
//           }}
//         >
//           <span style={{ fontWeight: 700, color: side === "sell" ? T.red : T.green, fontSize: 15 }}>
//             {side.toUpperCase()}
//           </span>
//           <span style={{ marginLeft: 10, fontSize: 12, color: T.label }}>
//             {isReduceOrder ? "Close / Reduce Position" : "Add to Position"}
//           </span>
//         </div>

//         {/* Order Type Tabs */}
//         <div style={{ display: "flex", background: T.bgDeep, padding: "10px 12px 0" }}>
//           {["market", "limit"].map((t) => (
//             <button
//               key={t}
//               onClick={() => setOrderType(t)}
//               style={{
//                 flex: 1,
//                 padding: "8px",
//                 fontSize: 11,
//                 fontWeight: 600,
//                 background: "transparent",
//                 border: "none",
//                 cursor: "pointer",
//                 color: orderType === t ? T.accent : T.label,
//                 borderBottom: orderType === t ? `2px solid ${T.accent}` : "2px solid transparent",
//                 fontFamily: T.mono,
//               }}
//             >
//               {t.toUpperCase()}
//             </button>
//           ))}
//         </div>

//         {/* Body */}
//         <div style={{ padding: 16 }}>
//           {/* Mark Price */}
//           <div
//             style={{
//               background: T.bgDeep,
//               border: `1px solid ${T.border}`,
//               borderRadius: 8,
//               padding: "10px 14px",
//               marginBottom: 14,
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//             }}
//           >
//             <div>
//               <div style={{ fontSize: 10, color: T.label, marginBottom: 4 }}>MARK PRICE</div>
//               <span style={{ fontSize: 18, fontWeight: 700, color: priceDir === "up" ? T.green : T.red }}>
//                 {fmtPrice(markPrice)}
//               </span>
//             </div>
//             <div style={{ color: isConnected ? T.green : T.label, fontSize: 9, fontFamily: T.mono }}>
//               {isConnected ? "● LIVE" : "○ CONNECTING"}
//             </div>
//           </div>

//           {/* Available Balance */}
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               marginBottom: 14,
//               fontSize: 13,
//               fontFamily: T.mono,
//             }}
//           >
//             <span style={{ color: T.label }}>AVAILABLE BALANCE :</span>
//             <span style={{ fontWeight: 700, color: T.text }}>{fmtINR(availableINR)}</span>
//           </div>

//           {/* Quantity Input with Min hint and MAX button */}
//           <div
//             style={{
//               background: T.bgInput,
//               border: `1px solid ${validation.error ? T.red : T.border}`,
//               borderRadius: 8,
//               padding: "12px 14px",
//               marginBottom: 10,
//             }}
//           >
//             <div
//               style={{
//                 fontSize: 11,
//                 color: validation.error ? T.red : T.label,
//                 marginBottom: 6,
//                 textTransform: "uppercase",
//                 display: "flex",
//                 justifyContent: "space-between",
//               }}
//             >
//               <span>QUANTITY ({BASE_COIN})</span>
//               <span style={{ color: T.muted }}>
//                 Min: {minQty || "—"} {BASE_COIN}
//               </span>
//             </div>
//             <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//               <input
//                 type="text"
//                 value={quantity}
//                 onChange={(e) => setQuantity(e.target.value)}
//                 placeholder={positionSize.toString()}
//                 style={{
//                   background: "transparent",
//                   border: "none",
//                   outline: "none",
//                   fontFamily: T.mono,
//                   fontSize: 15,
//                   fontWeight: 600,
//                   color: isFullClose ? T.warning : T.text,
//                   flex: 1,
//                 }}
//               />
//               <span style={{ fontSize: 14, color: T.label }}>{BASE_COIN}</span>
//               <button
//                 onClick={handleMaxClick}
//                 style={{
//                   background: "rgba(212,165,116,0.15)",
//                   border: "none",
//                   color: T.accent,
//                   padding: "4px 12px",
//                   borderRadius: 6,
//                   cursor: "pointer",
//                   fontSize: 11,
//                   fontWeight: 700,
//                   fontFamily: T.mono,
//                 }}
//               >
//                 MAX
//               </button>
//             </div>
//             {validation.error && (
//               <div style={{ fontSize: 11, color: T.red, marginTop: 4 }}>⚠️ {validation.error}</div>
//             )}
//           </div>

//           {warning && (
//             <div
//               style={{
//                 color: T.warning,
//                 fontSize: 12,
//                 marginTop: 8,
//                 padding: "8px 12px",
//                 background: "rgba(245,158,11,0.1)",
//                 borderRadius: 6,
//                 fontFamily: T.mono,
//               }}
//             >
//               ℹ️ {warning}
//             </div>
//           )}

//           {isFullClose && !warning && (
//             <div
//               style={{
//                 color: T.warning,
//                 fontSize: 12,
//                 marginTop: 8,
//                 padding: "8px 12px",
//                 background: "rgba(152, 23, 238, 0.1)",
//                 borderRadius: 6,
//                 fontFamily: T.mono,
//               }}
//             >
//               Closing full position of {positionSize} {BASE_COIN}
//             </div>
//           )}

//           {orderType === "limit" && (
//             <InputGroup
//               label="LIMIT PRICE"
//               value={price}
//               onChange={(e) => setPrice(e.target.value)}
//               placeholder="0.00"
//               unit="INR"
//             />
//           )}

//           {error && (
//             <div
//               style={{
//                 color: T.red,
//                 fontSize: 12,
//                 marginTop: 8,
//                 padding: "8px 12px",
//                 background: "rgba(246,70,93,0.1)",
//                 borderRadius: 6,
//               }}
//             >
//               {error}
//             </div>
//           )}

//           {/* Order Summary */}
//           <div
//             style={{
//               background: T.bgDeep,
//               border: `1px solid ${T.border}`,
//               borderRadius: 8,
//               padding: "10px 14px",
//               marginTop: 12,
//               fontFamily: T.mono,
//               fontSize: 12,
//             }}
//           >
//             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
//               <span style={{ color: T.label }}>Position Size</span>
//               <span style={{ color: T.text }}>
//                 {positionSize} {BASE_COIN}
//               </span>
//             </div>
//             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
//               <span style={{ color: T.label }}>Closing</span>
//               <span style={{ color: isFullClose ? T.warning : T.text, fontWeight: 700 }}>
//                 {validation.finalQty} {BASE_COIN}
//                 {isFullClose && " (Full)"}
//               </span>
//             </div>
//             {validation.finalQty < positionSize && !isFullClose && (
//               <div style={{ display: "flex", justifyContent: "space-between" }}>
//                 <span style={{ color: T.label }}>Remaining</span>
//                 <span style={{ color: T.text }}>
//                   {(positionSize - validation.finalQty).toFixed(3)} {BASE_COIN}
//                 </span>
//               </div>
//             )}
//           </div>

//           <button
//             onClick={handlePlace}
//             disabled={!canPlace}
//             style={{
//               width: "100%",
//               padding: "15px",
//               marginTop: 16,
//               fontWeight: 700,
//               borderRadius: 12,
//               border: "none",
//               fontFamily: T.mono,
//               fontSize: 13,
//               background: placed ? T.success : T.gradient,
//               color: "#fff",
//               cursor: !canPlace ? "not-allowed" : "pointer",
//               opacity: !canPlace ? 0.6 : 1,
//               transition: "all 0.25s ease",
//               boxShadow: !placed ? "0 4px 20px rgba(123,47,247,0.35)" : "none",
//             }}
//           >
//             {placing
//               ? "Processing..."
//               : placed
//                 ? "✓ Order Placed"
//                 : isFullClose
//                   ? "CLOSE FULL POSITION"
//                   : `PLACE ${side.toUpperCase()} ${orderType.toUpperCase()}`}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ─── TRADES MODAL (NEW) ─────────────────────────────────────────────────────
// // Calls GET /trades-by-position?user=&positionId=&side= and shows the fills
// // that make up a position.
// const TradesModal = ({ position, side, userId, onClose }) => {
//   const [trades, setTrades] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     let cancelled = false;

//     const fetchTrades = async () => {
//       setLoading(true);
//       setError(null);

//       try {
//         const params = new URLSearchParams({
//           user: userId,
//           positionId: position.positionId,
//           side,
//         });
//         const res = await fetch(`${TRADES_BY_POSITION_API}?${params.toString()}`);
//         const json = await res.json();

//         if (cancelled) return;

//         if (json.status) {
//           setTrades(json.data || []);
//         } else {
//           setError(json.message || "Failed to load trades");
//           setTrades([]);
//         }
//       } catch (err) {
//         if (cancelled) return;
//         console.error("Trades fetch failed:", err);
//         setError("Failed to load trades");
//         setTrades([]);
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     };

//     fetchTrades();
//     return () => {
//       cancelled = true;
//     };
//   }, [position.positionId, side, userId]);

//   const BASE_COIN = position.contractPair.replace("INR", "");

//   return (
//     <div
//       onClick={onClose}
//       style={{
//         position: "fixed",
//         inset: 0,
//         zIndex: 1000,
//         background: T.bgOverlay,
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         padding: 20,
//       }}
//     >
//       <div
//         onClick={(e) => e.stopPropagation()}
//         style={{
//           width: 560,
//           maxWidth: "100%",
//           maxHeight: "80vh",
//           background: T.bg,
//           borderRadius: 16,
//           overflow: "hidden",
//           boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
//           display: "flex",
//           flexDirection: "column",
//         }}
//       >
//         {/* Header */}
//         <div
//           style={{
//             padding: "18px 20px",
//             background: T.bgDeep,
//             borderBottom: `1px solid ${T.border}`,
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             flexShrink: 0,
//           }}
//         >
//           <div>
//             <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
//               {position.contractPair} Trades
//             </div>
//             <div style={{ fontSize: 11, color: T.label }}>
//               {position.positionType} • Position #{position.positionId}
//             </div>
//           </div>
//           <button
//             onClick={onClose}
//             style={{
//               background: T.gradient,
//               width: 34,
//               height: 34,
//               borderRadius: 8,
//               color: T.text,
//               border: "none",
//               cursor: "pointer",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               flexShrink: 0,
//             }}
//           >
//             ✕
//           </button>
//         </div>

//         {/* Body */}
//         <div style={{ overflowY: "auto", flex: 1 }}>
//           {loading ? (
//             <div style={{ padding: 48, textAlign: "center", color: T.muted, fontFamily: T.mono }}>
//               Loading trades...
//             </div>
//           ) : error ? (
//             <div style={{ padding: 24 }}>
//               <div
//                 style={{
//                   color: T.red,
//                   fontSize: 12,
//                   padding: "10px 14px",
//                   background: "rgba(239,68,68,0.1)",
//                   borderRadius: 8,
//                   fontFamily: T.mono,
//                 }}
//               >
//                 {error}
//               </div>
//             </div>
//           ) : trades.length === 0 ? (
//             <div style={{ padding: 48, textAlign: "center", color: T.muted, fontFamily: T.mono }}>
//               No trades found for this position
//             </div>
//           ) : (
//             <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: T.mono }}>
//               <thead>
//                 <tr style={{ background: T.bgDeep, position: "sticky", top: 0 }}>
//                   {["Side", "Price", "Qty", "Fee", "Time"].map((h) => (
//                     <th
//                       key={h}
//                       style={{
//                         padding: "10px 16px",
//                         textAlign: h === "Side" ? "left" : "center",
//                         fontSize: 11,
//                         fontWeight: 700,
//                         color: T.muted,
//                         whiteSpace: "nowrap",
//                         borderBottom: `1px solid ${T.border}`,
//                       }}
//                     >
//                       {h}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {trades.map((tr, i) => {
//                   const tradeSide = tr.side || tr.orderSide || side;
//                   const isBuy = String(tradeSide).toUpperCase() === "BUY";
//                   const qty = tr.quantity ?? tr.qty ?? tr.filledQuantity ?? "—";
//                   const tradePrice = tr.price ?? tr.executedPrice ?? tr.avgPrice ?? null;
//                   const fee = tr.fee ?? tr.commission ?? null;
//                   const time = tr.time ?? tr.timestamp ?? tr.createdAt ?? tr.date ?? null;

//                   return (
//                     <tr key={tr.tradeId || tr.id || tr.orderId || i} style={{ borderBottom: `1px solid ${T.border}` }}>
//                       <td
//                         style={{
//                           padding: "12px 16px",
//                           fontWeight: 700,
//                           color: isBuy ? T.green : T.red,
//                         }}
//                       >
//                         {String(tradeSide).toUpperCase()}
//                       </td>
//                       <td style={{ padding: "12px 16px", textAlign: "center", color: T.text }}>
//                         {tradePrice !== null ? fmtPrice(tradePrice) : "—"}
//                       </td>
//                       <td style={{ padding: "12px 16px", textAlign: "center", color: T.text }}>
//                         {qty} {BASE_COIN}
//                       </td>
//                       <td style={{ padding: "12px 16px", textAlign: "center", color: T.muted }}>
//                         {fee !== null ? fmtINR(fee) : "—"}
//                       </td>
//                       <td style={{ padding: "12px 16px", textAlign: "center", color: T.muted, fontSize: 12 }}>
//                         {fmtTime(time)}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// // ─── LIVE MARK PRICE HOOK ─────────────────────────────────────────────────
// const useLiveMarkPrices = (positions) => {
//   const [markPrices, setMarkPrices] = useState({});
//   const socketRef = useRef(null);

//   useEffect(() => {
//     if (!positions || positions.length === 0) return;

//     if (socketRef.current) {
//       socketRef.current.disconnect();
//       socketRef.current = null;
//     }

//     const socket = io(WS_URL, { transports: ["websocket"], forceNew: true });
//     socketRef.current = socket;

//     socket.on("connect", () => {
//       const params = positions.map((pos) => `${pos.contractPair.toLowerCase()}@markPrice`);
//       socket.emit("subscribe", { params });
//     });

//     socket.on("markPriceUpdate", (data) => {
//       if (!data?.s || !data?.p) return;
//       const symbol = data.s.toUpperCase();
//       const price = parseFloat(data.p);
//       setMarkPrices((prev) => ({ ...prev, [symbol]: price }));
//     });

//     socket.on("disconnect", () => { });

//     return () => {
//       socket.disconnect();
//       socketRef.current = null;
//     };
//   }, [positions.map((p) => p.contractPair).join(",")]);

//   return markPrices;
// };

// // ─── MAIN PORTFOLIO ────────────────────────────────────────────────────────
// const Portfolio = () => {
//   const { userId, accountId, refreshBalance } = useUser();

//   const [activeTab, setActiveTab] = useState("OPEN");
//   const [wallet, setWallet] = useState(null);
//   const [positions, setPositions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [availableINR, setAvailableINR] = useState(0);
//   const [modalInfo, setModalInfo] = useState(null);
//   const [exchangeInfo, setExchangeInfo] = useState(null);
//   const [tradesModalInfo, setTradesModalInfo] = useState(null); // ← NEW: { position, side }

//   const markPrices = useLiveMarkPrices(activeTab === "OPEN" ? positions : []);

//   const fetchExchangeInfo = useCallback(async () => {
//     try {
//       const res = await fetch(`${EXCHANGE_INFO_API}?market=INR`);
//       const json = await res.json();
//       if (json.status && json.data) {
//         setExchangeInfo(json.data);
//       }
//     } catch (err) {
//       console.error("Exchange info fetch failed:", err);
//     }
//   }, []);

//   const fetchWallet = useCallback(async () => {
//     if (!userId) return;
//     try {
//       const res = await fetch(`${WALLET_API_BASE}?user=${userId}&marginAsset=INR`);
//       const json = await res.json();
//       if (json.status && json.data) {
//         setWallet(json.data);
//         setAvailableINR(parseFloat(json.data.withdrawableBalance) || 0);
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   }, [userId]);

//   const fetchPositions = useCallback(async () => {
//     if (!userId) return;
//     try {
//       const status =
//         activeTab === "OPEN" ? "OPEN" : activeTab === "CLOSED" ? "CLOSED" : "LIQUIDATED";
//       const res = await fetch(`${POSITIONS_API_BASE}?user=${userId}&positionStatus=${status}`);
//       const json = await res.json();
//       setPositions(json.status && json.data ? json.data : []);
//     } catch (err) {
//       console.error(err);
//       setPositions([]);
//     }
//   }, [userId, activeTab]);

//   useEffect(() => {
//     if (userId) {
//       setLoading(true);
//       Promise.all([fetchWallet(), fetchPositions(), fetchExchangeInfo()]).finally(() =>
//         setLoading(false),
//       );
//     }
//   }, [userId, activeTab]);

//   useEffect(() => {
//     if (!userId || activeTab !== "OPEN") return;
//     const interval = setInterval(() => {
//       fetchWallet();
//       fetchPositions();
//     }, 15000);
//     return () => clearInterval(interval);
//   }, [userId, activeTab]);

//   const totalMarginUsed = positions.reduce((sum, pos) => sum + parseFloat(pos.margin || 0), 0);

//   const totalUnrealisedPnL = positions.reduce((sum, pos) => {
//     const mp = markPrices[pos.contractPair];
//     const pnl = mp !== undefined ? calcPnL(pos, mp) : 0;
//     return sum + (pnl || 0);
//   }, 0);

//   const isNegativePnL = totalUnrealisedPnL < 0;
//   const currentValue = wallet ? parseFloat(wallet.marginBalance || 0) : 0;

//   // "Trades" column added at the end for every tab so a user can always
//   // inspect the fills that make up a position.
//   const tableHeaders =
//     activeTab === "OPEN"
//       ? ["Contract", "Type", "Size", "Entry Price", "Mark Price", "Leverage", "Margin", "P&L", "Action", "Trades"]
//       : [
//         "Contract",
//         "Type",
//         "Size",
//         "Entry Price",
//         "Sell Price",
//         "Leverage",
//         "Margin",
//         "Realised P&L",
//         "Trades",
//       ];

//   if (loading && !positions.length) {
//     return (
//       <div style={{ color: T.muted, padding: 20, fontFamily: T.mono }}>
//         Loading Portfolio...
//       </div>
//     );
//   }

//   return (
//     <div style={{ fontFamily: T.mono, padding: "20px" }}>
//       <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
//         {/* Left Stats */}
//         <div
//           style={{
//             width: 200,
//             flexShrink: 0,
//             display: "flex",
//             flexDirection: "column",
//             gap: 14,
//           }}
//         >
//           <div
//             style={{
//               background: T.surface,
//               border: `1px solid ${T.border}`,
//               borderRadius: 10,
//               padding: "20px",
//             }}
//           >
//             <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Current Value</div>
//             <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>
//               ₹{currentValue.toFixed(2)}
//             </div>
//           </div>
//           <div
//             style={{
//               background: T.surface,
//               border: `1px solid ${T.border}`,
//               borderRadius: 10,
//               padding: "20px",
//             }}
//           >
//             <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Invested Value</div>
//             <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>
//               ₹{totalMarginUsed.toFixed(2)}
//             </div>
//           </div>
//           <div
//             style={{
//               background: T.surface,
//               border: `1px solid ${T.border}`,
//               borderRadius: 10,
//               padding: "20px",
//             }}
//           >
//             <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Unrealised P&L</div>
//             <div
//               style={{
//                 fontSize: 18,
//                 fontWeight: 700,
//                 color: isNegativePnL ? T.red : T.green,
//               }}
//             >
//               {isNegativePnL ? "▼" : "▲"} ₹{Math.abs(totalUnrealisedPnL).toFixed(2)}
//             </div>
//             {activeTab === "OPEN" && (
//               <div style={{ fontSize: 9, color: T.green, marginTop: 6 }}>● LIVE</div>
//             )}
//           </div>
//         </div>

//         {/* Main Panel */}
//         <div
//           style={{
//             flex: 1,
//             background: T.surface,
//             borderRadius: 8,
//             overflow: "hidden",
//             border: `1px solid ${T.border}`,
//           }}
//         >
//           {/* Tab Header */}
//           <div
//             style={{
//               background: "#080b12",
//               borderBottom: `1px solid ${T.border}`,
//               padding: "0 16px",
//               display: "flex",
//               alignItems: "center",
//             }}
//           >
//             <div style={{ display: "flex", gap: 4 }}>
//               <InnerTab label="OPEN" active={activeTab === "OPEN"} onClick={() => setActiveTab("OPEN")} />
//               <InnerTab
//                 label="CLOSED"
//                 active={activeTab === "CLOSED"}
//                 onClick={() => setActiveTab("CLOSED")}
//               />
//               <InnerTab
//                 label="LIQUIDATED"
//                 active={activeTab === "LIQUIDATED"}
//                 onClick={() => setActiveTab("LIQUIDATED")}
//               />
//             </div>
//           </div>

//           {/* Positions Table */}
//           <div
//             style={{ padding: "4px" }}
//             className="max-h-[300px] md:max-h-[400px] lg:max-h-[450px] overflow-y-auto"
//           >
//             <table style={{ width: "100%", borderCollapse: "collapse" }}>
//               <thead>
//                 <tr style={{ background: "#080b12", borderBottom: `1px solid ${T.border}` }}>
//                   {tableHeaders.map((h) => (
//                     <th
//                       key={h}
//                       style={{
//                         padding: "14px 16px",
//                         textAlign: h === "Contract" || h === "Action" ? "left" : "center",
//                         fontSize: 12,
//                         fontWeight: 700,
//                         color: T.muted,
//                         whiteSpace: "nowrap",
//                       }}
//                     >
//                       {h}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {positions.length === 0 ? (
//                   <tr>
//                     <td
//                       colSpan={tableHeaders.length}
//                       style={{ padding: "80px", textAlign: "center", color: T.muted }}
//                     >
//                       No {activeTab.toLowerCase()} positions found
//                     </td>
//                   </tr>
//                 ) : (
//                   positions.map((pos) => {
//                     const isLong = pos.positionType === "LONG";

//                     const mp = markPrices[pos.contractPair];
//                     const livePnL = mp !== undefined ? calcPnL(pos, mp) : null;
//                     const displayPnL =
//                       activeTab === "OPEN" ? livePnL : parseFloat(pos.realizedProfit || 0);

//                     const pnlColor = displayPnL === null ? T.muted : displayPnL < 0 ? T.red : T.green;

//                     const closePrice = pos.closePrice || pos.sellPrice || pos.exitPrice || null;

//                     return (
//                       <tr key={pos.positionId} style={{ borderBottom: `1px solid ${T.border}` }}>
//                         <td style={{ padding: "14px 16px", fontWeight: 600, color: T.text }}>
//                           {pos.contractPair}
//                         </td>
//                         <td
//                           style={{
//                             padding: "14px 16px",
//                             textAlign: "center",
//                             fontWeight: 700,
//                             color: isLong ? T.green : T.red,
//                           }}
//                         >
//                           {pos.positionType}
//                         </td>
//                         <td style={{ padding: "14px 16px", textAlign: "center", color: T.text }}>
//                           {pos.quantity}
//                         </td>
//                         <td style={{ padding: "14px 16px", textAlign: "center", color: T.text }}>
//                           ₹{parseFloat(pos.entryPrice).toFixed(2)}
//                         </td>
//                         {activeTab === "OPEN" ? (
//                           <td
//                             style={{
//                               padding: "14px 16px",
//                               textAlign: "center",
//                               color: mp ? T.accent : T.muted,
//                               fontWeight: 600,
//                             }}
//                           >
//                             {mp ? fmtPrice(mp) : "—"}
//                           </td>
//                         ) : (
//                           <td
//                             style={{
//                               padding: "14px 16px",
//                               textAlign: "center",
//                               color: closePrice ? T.accent : T.muted,
//                               fontWeight: 600,
//                             }}
//                           >
//                             {closePrice ? `₹${parseFloat(closePrice).toFixed(2)}` : "—"}
//                           </td>
//                         )}
//                         <td style={{ padding: "14px 16px", textAlign: "center", color: T.text }}>
//                           {pos.leverage}x
//                         </td>
//                         <td style={{ padding: "14px 16px", textAlign: "center", color: T.text }}>
//                           ₹{parseFloat(pos.margin || 0).toFixed(2)}
//                         </td>
//                         <td
//                           style={{
//                             padding: "14px 16px",
//                             textAlign: "center",
//                             color: pnlColor,
//                             fontWeight: 700,
//                           }}
//                         >
//                           {displayPnL === null
//                             ? "—"
//                             : `${displayPnL >= 0 ? "+" : ""}₹${displayPnL.toFixed(2)}`}
//                         </td>
//                         {activeTab === "OPEN" ? (
//                           <td style={{ padding: "14px 16px" }}>
//                             {isLong ? (
//                               <button
//                                 onClick={() => setModalInfo({ position: pos, side: "sell" })}
//                                 style={{
//                                   padding: "6px 18px",
//                                   background: "rgba(246,70,93,0.15)",
//                                   color: T.red,
//                                   borderRadius: 6,
//                                   border: "none",
//                                   cursor: "pointer",
//                                   fontFamily: T.mono,
//                                   fontWeight: 700,
//                                   fontSize: 12,
//                                 }}
//                               >
//                                 SELL
//                               </button>
//                             ) : (
//                               <button
//                                 onClick={() => setModalInfo({ position: pos, side: "buy" })}
//                                 style={{
//                                   padding: "6px 18px",
//                                   background: "rgba(14,203,129,0.15)",
//                                   color: T.green,
//                                   borderRadius: 6,
//                                   border: "none",
//                                   cursor: "pointer",
//                                   fontFamily: T.mono,
//                                   fontWeight: 700,
//                                   fontSize: 12,
//                                 }}
//                               >
//                                 BUY
//                               </button>
//                             )}
//                           </td>
//                         ) : null}
//                         {/* ── NEW: View button → opens TradesModal ── */}
//                         <td style={{ padding: "14px 16px", textAlign: "center" }}>
//                           <button
//                             onClick={() =>
//                               setTradesModalInfo({ position: pos, side: pos.positionType })
//                             }
//                             style={{
//                               padding: "6px 16px",
//                               background: "rgba(123,47,247,0.15)",
//                               color: T.accent,
//                               borderRadius: 6,
//                               border: "none",
//                               cursor: "pointer",
//                               fontFamily: T.mono,
//                               fontWeight: 700,
//                               fontSize: 12,
//                             }}
//                           >
//                             VIEW
//                           </button>
//                         </td>
//                       </tr>
//                     );
//                   })
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>

//       {/* Order Modal */}
//       {modalInfo && (
//         <OrderModal
//           position={modalInfo.position}
//           side={modalInfo.side}
//           userId={userId}
//           accountId={accountId}
//           availableINR={availableINR}
//           onClose={() => setModalInfo(null)}
//           onSuccess={() => {
//             fetchWallet();
//             fetchPositions();
//             refreshBalance();
//           }}
//           exchangeInfo={exchangeInfo}
//         />
//       )}

//       {/* Trades Modal (NEW) */}
//       {tradesModalInfo && (
//         <TradesModal
//           position={tradesModalInfo.position}
//           side={tradesModalInfo.side}
//           userId={userId}
//           onClose={() => setTradesModalInfo(null)}
//         />
//       )}
//     </div>
//   );
// };

// export default Portfolio;

// // export default Portfolio;
// import React, { useState, useEffect, useCallback, useRef } from "react";
// import { io } from "socket.io-client";
// import { useUser } from "../../context/UserContext";

// // ─── APIs & Constants ───────────────────────────────────────────────────────
// const BASE_URL = import.meta.env.VITE_API_BASE_URL;
// const WS_URL = "https://pilot-fawss.pi42.com";

// const WALLET_API_BASE = `${BASE_URL}/api/pi42/futures-wallet/details`;
// const POSITIONS_API_BASE = `${BASE_URL}/api/pi42/positions`;
// const PLACE_ORDER_API = `${BASE_URL}/api/pi42/place-order`;
// const EXCHANGE_INFO_API = `${BASE_URL}/api/pi42/exchange-info`; // ← NEW: for minQty

// // ─── COLORS ────────────────────────────────────────────────────────────────
// const T = {
//   // Backgrounds
//   bg: "#070B14",
//   surface: "#0F1725",
//   bgDeep: "#050816",
//   bgInput: "#131A28",
//   bgInputHov: "#1A2335",
//   bgOverlay: "rgba(0,0,0,0.75)",

//   // Borders
//   border: "rgba(255,255,255,0.06)",
//   borderFocus: "rgba(123,47,247,0.35)",

//   // Primary Colors
//   primary: "#7B2FF7",
//   primaryLight: "#A855F7",
//   secondary: "#C084FC",

//   // Gradient
//   gradient:
//     "linear-gradient(135deg,#7B2FF7 0%,#A855F7 50%,#C084FC 100%)",

//   // Text
//   text: "#F8FAFC",
//   muted: "#94A3B8",
//   label: "#CBD5E1",

//   // Status
//   green: "#22C55E",
//   red: "#EF4444",
//   success: "#22C55E",
//   warning: "#F59E0B",

//   // Card
//   card: "#131A28",

//   // Effects
//   shadow: "0px 10px 40px rgba(0,0,0,0.35)",

//   // Radius
//   radius: "12px",

//   // Font
//   font: "'Inter', sans-serif",
//   mono: "'Inter', sans-serif",
// };
// // ─── HELPERS ───────────────────────────────────────────────────────────────
// const fmtINR = (n, d = 2) =>
//   "₹" +
//   Number(n).toLocaleString("en-IN", {
//     minimumFractionDigits: d,
//     maximumFractionDigits: d,
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

// // ─── Calculate real P&L ────────────────────────────────────────────────────
// const calcPnL = (pos, markPrice) => {
//   if (!markPrice) return null;
//   const entry = parseFloat(pos.entryPrice);
//   const amount = parseFloat(pos.positionAmount);
//   if (pos.positionType === "LONG") {
//     return (markPrice - entry) * amount;
//   } else {
//     return (entry - markPrice) * amount;
//   }
// };

// // ═══════════════════════════════════════════════════════════════════════════
// // ═══ NEW: SELL QUANTITY VALIDATION FUNCTION ════════════════════════════════
// // ═══════════════════════════════════════════════════════════════════════════
// /**
//  * Validates sell quantity before placing reduce-only market order
//  * Prevents "Reduce-only order quantity is below the minimum allowed" error
//  *
//  * @param {number} positionSize - Current position size (e.g., 9.5)
//  * @param {number} inputQty - User entered quantity (e.g., 5)
//  * @param {number} minQty - Minimum order quantity from exchangeInfo (e.g., 4.9)
//  * @returns {object} { isValid, finalQty, error, warning, isFullClose }
//  */
// const validateSellQuantity = (positionSize, inputQty, minQty) => {
//   const result = {
//     isValid: false,
//     finalQty: 0,
//     error: null,
//     warning: null,
//     isFullClose: false,
//   };

//   // No position
//   if (!positionSize || positionSize <= 0) {
//     result.error = "No open position to close";
//     return result;
//   }

//   const qty = parseFloat(inputQty) || 0;
//   const min = parseFloat(minQty) || 0;

//   // CASE 1: Position itself is below minimum → MUST close full
//   if (min > 0 && positionSize <= min) {
//     result.isValid = true;
//     result.finalQty = positionSize;
//     result.isFullClose = true;
//     result.warning = `Position size (${positionSize}) is below minimum order size (${min}). Closing full position.`;
//     return result;
//   }

//   // CASE 2: Input quantity is below minimum → BLOCK
//   if (min > 0 && qty > 0 && qty < min) {
//     result.error = `Minimum order quantity is ${min}`;
//     return result;
//   }

//   // CASE 3: Partial close would leave dust position → FORCE FULL CLOSE
//   const effectiveQty = Math.min(qty, positionSize);
//   const remaining = positionSize - effectiveQty;

//   if (min > 0 && remaining > 0 && remaining < min) {
//     result.isValid = true;
//     result.finalQty = positionSize;
//     result.isFullClose = true;
//     result.warning = `Partial close leaves ${remaining.toFixed(3)} (below min ${min}). Closing full position instead.`;
//     return result;
//   }

//   // CASE 4: No input → Default to full close
//   if (qty <= 0) {
//     result.isValid = true;
//     result.finalQty = positionSize;
//     result.isFullClose = true;
//     return result;
//   }

//   // CASE 5: Normal partial close
//   result.isValid = true;
//   result.finalQty = effectiveQty;
//   return result;
// };

// // ─── Inner Tab ─────────────────────────────────────────────────────────────
// const InnerTab = ({ label, active, onClick }) => (
//   <button
//     onClick={onClick}
//     style={{
//       padding: "10px 24px",
//       borderRadius: 6,
//       border: "none",
//       cursor: "pointer",
//       background: active ? "#7b2ff7" : "transparent",
//       color: active ? T.accent : T.muted,
//       fontSize: 13,
//       fontWeight: 700,
//       letterSpacing: "0.4px",
//       borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
//       transition: "all 0.15s",
//       fontFamily: T.mono,
//     }}
//   >
//     {label}
//   </button>
// );

// // ─── INPUT GROUP ───────────────────────────────────────────────────────────
// const InputGroup = ({ label, value, onChange, placeholder, unit, error, hint }) => {
//   const [focused, setFocused] = useState(false);
//   return (
//     <div
//       style={{
//         background: focused ? T.bgInputHov : T.bgInput,
//         border: `1px solid ${error ? T.red : focused ? T.borderFocus : T.border}`,
//         borderRadius: 8,
//         padding: "12px 14px",
//         marginBottom: 10,
//       }}
//     >
//       <div
//         style={{
//           fontSize: 11,
//           color: error ? T.red : T.label,
//           marginBottom: 6,
//           textTransform: "uppercase",
//           display: "flex",
//           justifyContent: "space-between",
//         }}
//       >
//         <span>{label}</span>
//         {hint && <span style={{ color: T.muted }}>{hint}</span>}
//       </div>
//       <div style={{ display: "flex", alignItems: "center" }}>
//         <input
//           type="text"
//           value={value}
//           onChange={onChange}
//           placeholder={placeholder}
//           onFocus={() => setFocused(true)}
//           onBlur={() => setFocused(false)}
//           style={{
//             background: "transparent",
//             border: "none",
//             outline: "none",
//             fontFamily: T.mono,
//             fontSize: 15,
//             fontWeight: 600,
//             color: T.text,
//             flex: 1,
//           }}
//         />
//         {unit && (
//           <span style={{ fontSize: 14, color: T.label, marginLeft: 8 }}>
//             {unit}
//           </span>
//         )}
//       </div>
//       {error && (
//         <div style={{ fontSize: 11, color: T.red, marginTop: 4 }}>{error}</div>
//       )}
//     </div>
//   );
// };

// // ─── ORDER MODAL ───────────────────────────────────────────────────────────
// const OrderModal = ({
//   position,
//   side,
//   userId,
//   accountId,
//   availableINR,
//   onClose,
//   onSuccess,
//   exchangeInfo, // ← NEW: passed from parent
// }) => {
//   const BASE_COIN = position.contractPair.replace("INR", "");
//   const SYMBOL = position.contractPair;

//   const [orderType, setOrderType] = useState("market");
//   const [price, setPrice] = useState("");
//   const [quantity, setQuantity] = useState(position.positionAmount.toString());

//   const [markPrice, setMarkPrice] = useState(0);
//   const [priceDir, setPriceDir] = useState("up");
//   const [isConnected, setIsConnected] = useState(false);
//   const markPriceRef = useRef(0);

//   const [placing, setPlacing] = useState(false);
//   const [placed, setPlaced] = useState(false);
//   const [error, setError] = useState(null);
//   const [warning, setWarning] = useState(null); // ← NEW
//   const [isFullClose, setIsFullClose] = useState(false); // ← NEW

//   // ─── NEW: Get minQty for this symbol from exchangeInfo ───
//   const getMinQty = useCallback(() => {
//     if (!exchangeInfo || !SYMBOL) return null;
//     const contract = exchangeInfo.contracts?.find(
//       (c) => c.name === SYMBOL
//     );
//     if (!contract) return null;
//     const marketFilter = contract.filters?.find(
//       (f) => f.filterType === "MARKET_QTY_SIZE"
//     );
//     const lotFilter = contract.filters?.find(
//       (f) => f.filterType === "LOT_SIZE"
//     );
//     return parseFloat(marketFilter?.minQty || lotFilter?.minQty || "0");
//   }, [exchangeInfo, SYMBOL]);

//   const minQty = getMinQty();
//   const positionSize = parseFloat(position.positionAmount || 0);

//   // ─── NEW: Validate quantity whenever it changes ───
//   useEffect(() => {
//     const validation = validateSellQuantity(positionSize, quantity, minQty);
//     setWarning(validation.warning);
//     setIsFullClose(validation.isFullClose);
//     // Don't set error here, let the user type freely
//   }, [quantity, positionSize, minQty]);

//   useEffect(() => {
//     const symLower = SYMBOL.toLowerCase();
//     const socket = io(WS_URL, { transports: ["websocket"], forceNew: true });

//     socket.on("connect", () => {
//       setIsConnected(true);
//       socket.emit("subscribe", { params: [`${symLower}@markPrice`] });
//     });

//     socket.on("markPriceUpdate", (data) => {
//       if (!data?.p) return;
//       const newPrice = Number(data.p);
//       setPriceDir(
//         newPrice >= (markPriceRef.current || newPrice) ? "up" : "down",
//       );
//       markPriceRef.current = newPrice;
//       setMarkPrice(newPrice);
//     });

//     return () => socket.disconnect();
//   }, [SYMBOL]);

//   const isReduceOrder =
//     (side === "sell" && position.positionType === "LONG") ||
//     (side === "buy" && position.positionType === "SHORT");

//   const quantityNum = parseFloat(quantity) || 0;
//   const priceNum = parseFloat(price) || 0;

//   // ─── NEW: Use validation for canPlace ───
//   const validation = validateSellQuantity(positionSize, quantity, minQty);

//   const canPlace =
//     !placing &&
//     validation.isValid &&
//     (orderType === "market" || (orderType === "limit" && priceNum > 0));

//   const handlePlace = async () => {
//     if (!canPlace) return;
//     setPlacing(true);
//     setError(null);

//     // ─── NEW: Use validated final quantity ───
//     const finalQty = validation.finalQty;

//     const payload = {
//       user: userId.toString(),
//       accountId: accountId ? accountId.toString() : undefined,
//       placeType: "POSITION",
//       quantity: parseFloat(finalQty.toFixed(6)),
//       reduceOnly: false,
//       type: orderType.toUpperCase(),
//       symbol: SYMBOL,
//       positionId: position.positionId,
//     };

//     if (orderType === "limit" && priceNum > 0) {
//       payload.price = priceNum;
//     }

//     try {
//       const res = await fetch(PLACE_ORDER_API, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();

//       if (res.ok && data.status) {
//         setPlaced(true);
//         setTimeout(() => {
//           onSuccess();
//           onClose();
//         }, 1500);
//       } else {
//         setError(data.message || "Order failed");
//       }
//     } catch {
//       setError("Network error");
//     } finally {
//       setPlacing(false);
//     }
//   };

//   // ─── NEW: Set max (full close) ───
//   const handleMaxClick = () => {
//     setQuantity(positionSize.toString());
//   };

//   return (
//     <div
//       onClick={onClose}
//       style={{
//         position: "fixed",
//         inset: 0,
//         zIndex: 1000,
//         background: T.bgOverlay,
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//       }}
//     >
//       <div
//         onClick={(e) => e.stopPropagation()}
//         style={{
//           width: 380,
//           background: T.bg,
//           borderRadius: 16,
//           overflow: "hidden",
//           boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
//         }}
//       >
//         {/* Header */}
//         <div
//           style={{
//             padding: "18px 20px",
//             background: T.bgDeep,
//             borderBottom: `1px solid ${T.border}`,
//             display: "flex",
//             justifyContent: "space-between",
//           }}
//         >
//           <div>
//             <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
//               {BASE_COIN}/INR
//             </div>
//             <div style={{ fontSize: 11, color: T.label }}>
//               {position.positionType} • {position.positionAmount} {BASE_COIN} •
//               Entry {fmtINR(position.entryPrice)}
//             </div>
//           </div>
//           <button
//             onClick={onClose}
//             style={{
//               background: "linear-gradient(135deg,#7B2FF7 0%,#A855F7 50%,#C084FC 100%)",
//               width: 34,
//               height: 34,
//               borderRadius: 8,
//               color: T.text,
//               border: "none",
//               cursor: "pointer",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//             }}
//           >
//             ✕
//           </button>
//         </div>

//         {/* Side Banner */}
//         <div
//           style={{
//             padding: "13px 20px",
//             background:
//               side === "sell"
//                 ? "rgba(199, 114, 255, 0.87)"
//                 : "rgba(14,203,129,0.12)",
//             borderBottom: `2px solid ${side === "sell" ? T.red : T.green}`,
//           }}
//         >
//           <span
//             style={{
//               fontWeight: 700,
//               color: side === "sell" ? T.red : T.green,
//               fontSize: 15,
//             }}
//           >
//             {side.toUpperCase()}
//           </span>
//           <span style={{ marginLeft: 10, fontSize: 12, color: T.label }}>
//             {isReduceOrder ? "Close / Reduce Position" : "Add to Position"}
//           </span>
//         </div>

//         {/* Order Type Tabs */}
//         <div
//           style={{
//             display: "flex",
//             background: T.bgDeep,
//             padding: "10px 12px 0",
//           }}
//         >
//           {["market", "limit"].map((t) => (
//             <button
//               key={t}
//               onClick={() => setOrderType(t)}
//               style={{
//                 flex: 1,
//                 padding: "8px",
//                 fontSize: 11,
//                 fontWeight: 600,
//                 background: "transparent",
//                 border: "none",
//                 cursor: "pointer",
//                 color: orderType === t ? T.accent : T.label,
//                 borderBottom:
//                   orderType === t
//                     ? `2px solid ${T.accent}`
//                     : "2px solid transparent",
//                 fontFamily: T.mono,
//               }}
//             >
//               {t.toUpperCase()}
//             </button>
//           ))}
//         </div>

//         {/* Body */}
//         <div style={{ padding: 16 }}>
//           {/* Mark Price */}
//           <div
//             style={{
//               background: T.bgDeep,
//               border: `1px solid ${T.border}`,
//               borderRadius: 8,
//               padding: "10px 14px",
//               marginBottom: 14,
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//             }}
//           >
//             <div>
//               <div style={{ fontSize: 10, color: T.label, marginBottom: 4 }}>
//                 MARK PRICE
//               </div>
//               <span
//                 style={{
//                   fontSize: 18,
//                   fontWeight: 700,
//                   color: priceDir === "up" ? T.green : T.red,
//                 }}
//               >
//                 {fmtPrice(markPrice)}
//               </span>
//             </div>
//             <div
//               style={{
//                 color: isConnected ? T.green : T.label,
//                 fontSize: 9,
//                 fontFamily: T.mono,
//               }}
//             >
//               {isConnected ? "● LIVE" : "○ CONNECTING"}
//             </div>
//           </div>

//           {/* Available Balance */}
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               marginBottom: 14,
//               fontSize: 13,
//               fontFamily: T.mono,
//             }}
//           >
//             <span style={{ color: T.label }}>AVAILABLE BALANCE :</span>
//             <span style={{ fontWeight: 700, color: T.text }}>
//               {fmtINR(availableINR)}
//             </span>
//           </div>

//           {/* ─── NEW: Quantity Input with Min hint and MAX button ─── */}
//           <div
//             style={{
//               background: T.bgInput,
//               border: `1px solid ${validation.error ? T.red : T.border}`,
//               borderRadius: 8,
//               padding: "12px 14px",
//               marginBottom: 10,
//             }}
//           >
//             <div
//               style={{
//                 fontSize: 11,
//                 color: validation.error ? T.red : T.label,
//                 marginBottom: 6,
//                 textTransform: "uppercase",
//                 display: "flex",
//                 justifyContent: "space-between",
//               }}
//             >
//               <span>QUANTITY ({BASE_COIN})</span>
//               <span style={{ color: T.muted }}>
//                 Min: {minQty || "—"} {BASE_COIN}
//               </span>
//             </div>
//             <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//               <input
//                 type="text"
//                 value={quantity}
//                 onChange={(e) => setQuantity(e.target.value)}
//                 placeholder={positionSize.toString()}
//                 style={{
//                   background: "transparent",
//                   border: "none",
//                   outline: "none",
//                   fontFamily: T.mono,
//                   fontSize: 15,
//                   fontWeight: 600,
//                   color: isFullClose ? T.warning : T.text,
//                   flex: 1,
//                 }}
//               />
//               <span style={{ fontSize: 14, color: T.label }}>{BASE_COIN}</span>
//               <button
//                 onClick={handleMaxClick}
//                 style={{
//                   background: "rgba(212,165,116,0.15)",
//                   border: "none",
//                   color: T.accent,
//                   padding: "4px 12px",
//                   borderRadius: 6,
//                   cursor: "pointer",
//                   fontSize: 11,
//                   fontWeight: 700,
//                   fontFamily: T.mono,
//                 }}
//               >
//                 MAX
//               </button>
//             </div>
//             {validation.error && (
//               <div style={{ fontSize: 11, color: T.red, marginTop: 4 }}>
//                 ⚠️ {validation.error}
//               </div>
//             )}
//           </div>

//           {/* ─── NEW: Warning Message ─── */}
//           {warning && (
//             <div
//               style={{
//                 color: T.warning,
//                 fontSize: 12,
//                 marginTop: 8,
//                 padding: "8px 12px",
//                 background: "rgba(245,158,11,0.1)",
//                 borderRadius: 6,
//                 fontFamily: T.mono,
//               }}
//             >
//               ℹ️ {warning}
//             </div>
//           )}

//           {/* ─── NEW: Full Close Indicator ─── */}
//           {isFullClose && !warning && (
//             <div
//               style={{
//                 color: T.warning,
//                 fontSize: 12,
//                 marginTop: 8,
//                 padding: "8px 12px",
//                 background: "rgba(152, 23, 238, 0.1)",
//                 borderRadius: 6,
//                 fontFamily: T.mono,
//               }}
//             >
//                Closing full position of {positionSize} {BASE_COIN}
//             </div>
//           )}

//           {orderType === "limit" && (
//             <InputGroup
//               label="LIMIT PRICE"
//               value={price}
//               onChange={(e) => setPrice(e.target.value)}
//               placeholder="0.00"
//               unit="INR"
//             />
//           )}

//           {error && (
//             <div
//               style={{
//                 color: T.red,
//                 fontSize: 12,
//                 marginTop: 8,
//                 padding: "8px 12px",
//                 background: "rgba(246,70,93,0.1)",
//                 borderRadius: 6,
//               }}
//             >
//               {error}
//             </div>
//           )}

//           {/* ─── NEW: Order Summary ─── */}
//           <div
//             style={{
//               background: T.bgDeep,
//               border: `1px solid ${T.border}`,
//               borderRadius: 8,
//               padding: "10px 14px",
//               marginTop: 12,
//               fontFamily: T.mono,
//               fontSize: 12,
//             }}
//           >
//             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
//               <span style={{ color: T.label }}>Position Size</span>
//               <span style={{ color: T.text }}>{positionSize} {BASE_COIN}</span>
//             </div>
//             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
//               <span style={{ color: T.label }}>Closing</span>
//               <span style={{ color: isFullClose ? T.warning : T.text, fontWeight: 700 }}>
//                 {validation.finalQty} {BASE_COIN}
//                 {isFullClose && " (Full)"}
//               </span>
//             </div>
//             {validation.finalQty < positionSize && !isFullClose && (
//               <div style={{ display: "flex", justifyContent: "space-between" }}>
//                 <span style={{ color: T.label }}>Remaining</span>
//                 <span style={{ color: T.text }}>
//                   {(positionSize - validation.finalQty).toFixed(3)} {BASE_COIN}
//                 </span>
//               </div>
//             )}
//           </div>

//           <button
//             onClick={handlePlace}
//             disabled={!canPlace}
//             style={{
//               width: "100%",
//               padding: "15px",
//               marginTop: 16,
//               fontWeight: 700,
//               borderRadius: 12,
//               border: "none",
//               fontFamily: T.mono,
//               fontSize: 13,
//               background: placed
//                 ? T.success
//                 : T.gradient,
//               color: "#fff",
//               cursor: !canPlace ? "not-allowed" : "pointer",
//               opacity: !canPlace ? 0.6 : 1,
//               transition: "all 0.25s ease",
//               boxShadow: !placed
//                 ? "0 4px 20px rgba(123,47,247,0.35)"
//                 : "none",
//             }}
//           >
//             {placing
//               ? "Processing..."
//               : placed
//                 ? "✓ Order Placed"
//                 : isFullClose
//                   ? "CLOSE FULL POSITION"
//                   : `PLACE ${side.toUpperCase()} ${orderType.toUpperCase()}`}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ─── LIVE MARK PRICE HOOK ─────────────────────────────────────────────────
// const useLiveMarkPrices = (positions) => {
//   const [markPrices, setMarkPrices] = useState({});
//   const socketRef = useRef(null);

//   useEffect(() => {
//     if (!positions || positions.length === 0) return;

//     if (socketRef.current) {
//       socketRef.current.disconnect();
//       socketRef.current = null;
//     }

//     const socket = io(WS_URL, { transports: ["websocket"], forceNew: true });
//     socketRef.current = socket;

//     socket.on("connect", () => {
//       const params = positions.map(
//         (pos) => `${pos.contractPair.toLowerCase()}@markPrice`,
//       );
//       socket.emit("subscribe", { params });
//     });

//     socket.on("markPriceUpdate", (data) => {
//       if (!data?.s || !data?.p) return;
//       const symbol = data.s.toUpperCase();
//       const price = parseFloat(data.p);
//       setMarkPrices((prev) => ({ ...prev, [symbol]: price }));
//     });

//     socket.on("disconnect", () => { });

//     return () => {
//       socket.disconnect();
//       socketRef.current = null;
//     };
//   }, [positions.map((p) => p.contractPair).join(",")]);

//   return markPrices;
// };

// // ─── MAIN PORTFOLIO ────────────────────────────────────────────────────────
// const Portfolio = () => {
//   const { userId, accountId, refreshBalance } = useUser();

//   const [activeTab, setActiveTab] = useState("OPEN");
//   const [wallet, setWallet] = useState(null);
//   const [positions, setPositions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [availableINR, setAvailableINR] = useState(0);
//   const [modalInfo, setModalInfo] = useState(null);
//   const [exchangeInfo, setExchangeInfo] = useState(null); // ← NEW

//   const markPrices = useLiveMarkPrices(activeTab === "OPEN" ? positions : []);

//   // ─── NEW: Fetch exchange info for minQty ───
//   const fetchExchangeInfo = useCallback(async () => {
//     try {
//       const res = await fetch(`${EXCHANGE_INFO_API}?market=INR`);
//       const json = await res.json();
//       if (json.status && json.data) {
//         setExchangeInfo(json.data);
//       }
//     } catch (err) {
//       console.error("Exchange info fetch failed:", err);
//     }
//   }, []);

//   const fetchWallet = useCallback(async () => {
//     if (!userId) return;
//     try {
//       const res = await fetch(
//         `${WALLET_API_BASE}?user=${userId}&marginAsset=INR`,
//       );
//       const json = await res.json();
//       if (json.status && json.data) {
//         setWallet(json.data);
//         setAvailableINR(parseFloat(json.data.withdrawableBalance) || 0);
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   }, [userId]);

//   const fetchPositions = useCallback(async () => {
//     if (!userId) return;
//     try {
//       const status =
//         activeTab === "OPEN"
//           ? "OPEN"
//           : activeTab === "CLOSED"
//             ? "CLOSED"
//             : "LIQUIDATED";
//       const res = await fetch(
//         `${POSITIONS_API_BASE}?user=${userId}&positionStatus=${status}`,
//       );
//       const json = await res.json();
//       setPositions(json.status && json.data ? json.data : []);
//     } catch (err) {
//       console.error(err);
//       setPositions([]);
//     }
//   }, [userId, activeTab]);

//   useEffect(() => {
//     if (userId) {
//       setLoading(true);
//       Promise.all([fetchWallet(), fetchPositions(), fetchExchangeInfo()]).finally(() =>
//         setLoading(false),
//       );
//     }
//   }, [userId, activeTab]);

//   useEffect(() => {
//     if (!userId || activeTab !== "OPEN") return;
//     const interval = setInterval(() => {
//       fetchWallet();
//       fetchPositions();
//     }, 15000);
//     return () => clearInterval(interval);
//   }, [userId, activeTab]);

//   const totalMarginUsed = positions.reduce(
//     (sum, pos) => sum + parseFloat(pos.margin || 0),
//     0,
//   );

//   const totalUnrealisedPnL = positions.reduce((sum, pos) => {
//     const mp = markPrices[pos.contractPair];
//     const pnl = mp !== undefined ? calcPnL(pos, mp) : 0;
//     return sum + (pnl || 0);
//   }, 0);

//   const isNegativePnL = totalUnrealisedPnL < 0;
//   const currentValue = wallet ? parseFloat(wallet.marginBalance || 0) : 0;

//   // ── FIXED: Added "Close Price" header for CLOSED tab ──
//   const tableHeaders =
//     activeTab === "OPEN"
//       ? [
//         "Contract",
//         "Type",
//         "Size",
//         "Entry Price",
//         "Mark Price",
//         "Leverage",
//         "Margin",
//         "P&L",
//         "Action",
//       ]
//       : [
//         "Contract",
//         "Type",
//         "Size",
//         "Entry Price",
//         "Sell Price",
//         "Leverage",
//         "Margin",
//         "Realised P&L",
//       ];

//   if (loading && !positions.length) {
//     return (
//       <div style={{ color: T.muted, padding: 20, fontFamily: T.mono }}>
//         Loading Portfolio...
//       </div>
//     );
//   }

//   return (
//     <div style={{ fontFamily: T.mono, padding: "20px" }}>
//       <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
//         {/* Left Stats */}
//         <div
//           style={{
//             width: 200,
//             flexShrink: 0,
//             display: "flex",
//             flexDirection: "column",
//             gap: 14,
//           }}
//         >
//           <div
//             style={{
//               background: T.surface,
//               border: `1px solid ${T.border}`,
//               borderRadius: 10,
//               padding: "20px",
//             }}
//           >
//             <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
//               Current Value
//             </div>
//             <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>
//               ₹{currentValue.toFixed(2)}
//             </div>
//           </div>
//           <div
//             style={{
//               background: T.surface,
//               border: `1px solid ${T.border}`,
//               borderRadius: 10,
//               padding: "20px",
//             }}
//           >
//             <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
//               Invested Value
//             </div>
//             <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>
//               ₹{totalMarginUsed.toFixed(2)}
//             </div>
//           </div>
//           <div
//             style={{
//               background: T.surface,
//               border: `1px solid ${T.border}`,
//               borderRadius: 10,
//               padding: "20px",
//             }}
//           >
//             <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
//               Unrealised P&L
//             </div>
//             <div
//               style={{
//                 fontSize: 18,
//                 fontWeight: 700,
//                 color: isNegativePnL ? T.red : T.green,
//               }}
//             >
//               {isNegativePnL ? "▼" : "▲"} ₹
//               {Math.abs(totalUnrealisedPnL).toFixed(2)}
//             </div>
//             {activeTab === "OPEN" && (
//               <div style={{ fontSize: 9, color: T.green, marginTop: 6 }}>
//                 ● LIVE
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Main Panel */}
//         <div
//           style={{
//             flex: 1,
//             background: T.surface,
//             borderRadius: 8,
//             overflow: "hidden",
//             border: `1px solid ${T.border}`,
//           }}
//         >
//           {/* Tab Header */}
//           <div
//             style={{
//               background: "#080b12",
//               borderBottom: `1px solid ${T.border}`,
//               padding: "0 16px",
//               display: "flex",
//               alignItems: "center",
//             }}
//           >
//             <div style={{ display: "flex", gap: 4 }}>
//               <InnerTab
//                 label="OPEN"
//                 active={activeTab === "OPEN"}
//                 onClick={() => setActiveTab("OPEN")}
//               />
//               <InnerTab
//                 label="CLOSED"
//                 active={activeTab === "CLOSED"}
//                 onClick={() => setActiveTab("CLOSED")}
//               />
//               <InnerTab
//                 label="LIQUIDATED"
//                 active={activeTab === "LIQUIDATED"}
//                 onClick={() => setActiveTab("LIQUIDATED")}
//               />
//             </div>
//           </div>

//           {/* Positions Table */}
//           <div
//             style={{ padding: "4px" }}
//             className="max-h-[300px] md:max-h-[400px] lg:max-h-[450px] overflow-y-auto"
//           >
//             <table style={{ width: "100%", borderCollapse: "collapse" }}>
//               <thead>
//                 <tr
//                   style={{
//                     background: "#080b12",
//                     borderBottom: `1px solid ${T.border}`,
//                   }}
//                 >
//                   {tableHeaders.map((h) => (
//                     <th
//                       key={h}
//                       style={{
//                         padding: "14px 16px",
//                         textAlign:
//                           h === "Contract" || h === "Action"
//                             ? "left"
//                             : "center",
//                         fontSize: 12,
//                         fontWeight: 700,
//                         color: T.muted,
//                         whiteSpace: "nowrap",
//                       }}
//                     >
//                       {h}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {positions.length === 0 ? (
//                   <tr>
//                     <td
//                       colSpan={tableHeaders.length}
//                       style={{
//                         padding: "80px",
//                         textAlign: "center",
//                         color: T.muted,
//                       }}
//                     >
//                       No {activeTab.toLowerCase()} positions found
//                     </td>
//                   </tr>
//                 ) : (
//                   positions.map((pos) => {
//                     const isLong = pos.positionType === "LONG";

//                     const mp = markPrices[pos.contractPair];
//                     const livePnL = mp !== undefined ? calcPnL(pos, mp) : null;
//                     const displayPnL =
//                       activeTab === "OPEN"
//                         ? livePnL
//                         : parseFloat(pos.realizedProfit || 0);

//                     const pnlColor =
//                       displayPnL === null
//                         ? T.muted
//                         : displayPnL < 0
//                           ? T.red
//                           : T.green;

//                     const closePrice = pos.closePrice || pos.sellPrice || pos.exitPrice || null;

//                     return (
//                       <tr
//                         key={pos.positionId}
//                         style={{ borderBottom: `1px solid ${T.border}` }}
//                       >
//                         <td
//                           style={{
//                             padding: "14px 16px",
//                             fontWeight: 600,
//                             color: T.text,
//                           }}
//                         >
//                           {pos.contractPair}
//                         </td>
//                         <td
//                           style={{
//                             padding: "14px 16px",
//                             textAlign: "center",
//                             fontWeight: 700,
//                             color: isLong ? T.green : T.red,
//                           }}
//                         >
//                           {pos.positionType}
//                         </td>
//                         <td
//                           style={{
//                             padding: "14px 16px",
//                             textAlign: "center",
//                             color: T.text,
//                           }}
//                         >
//                           {pos.quantity}
//                         </td>
//                         <td
//                           style={{
//                             padding: "14px 16px",
//                             textAlign: "center",
//                             color: T.text,
//                           }}
//                         >
//                           ₹{parseFloat(pos.entryPrice).toFixed(2)}
//                         </td>
//                         {activeTab === "OPEN" ? (
//                           <td
//                             style={{
//                               padding: "14px 16px",
//                               textAlign: "center",
//                               color: mp ? T.accent : T.muted,
//                               fontWeight: 600,
//                             }}
//                           >
//                             {mp ? fmtPrice(mp) : "—"}
//                           </td>
//                         ) : (
//                           <td
//                             style={{
//                               padding: "14px 16px",
//                               textAlign: "center",
//                               color: closePrice ? T.accent : T.muted,
//                               fontWeight: 600,
//                             }}
//                           >
//                             {closePrice ? `₹${parseFloat(closePrice).toFixed(2)}` : "—"}
//                           </td>
//                         )}
//                         <td
//                           style={{
//                             padding: "14px 16px",
//                             textAlign: "center",
//                             color: T.text,
//                           }}
//                         >
//                           {pos.leverage}x
//                         </td>
//                         <td
//                           style={{
//                             padding: "14px 16px",
//                             textAlign: "center",
//                             color: T.text,
//                           }}
//                         >
//                           ₹{parseFloat(pos.margin || 0).toFixed(2)}
//                         </td>
//                         <td
//                           style={{
//                             padding: "14px 16px",
//                             textAlign: "center",
//                             color: pnlColor,
//                             fontWeight: 700,
//                           }}
//                         >
//                           {displayPnL === null
//                             ? "—"
//                             : `${displayPnL >= 0 ? "+" : ""}₹${displayPnL.toFixed(2)}`}
//                         </td>
//                         {activeTab === "OPEN" ? (
//                           <td style={{ padding: "14px 16px" }}>
//                             {isLong ? (
//                               <button
//                                 onClick={() =>
//                                   setModalInfo({ position: pos, side: "sell" })
//                                 }
//                                 style={{
//                                   padding: "6px 18px",
//                                   background: "rgba(246,70,93,0.15)",
//                                   color: T.red,
//                                   borderRadius: 6,
//                                   border: "none",
//                                   cursor: "pointer",
//                                   fontFamily: T.mono,
//                                   fontWeight: 700,
//                                   fontSize: 12,
//                                 }}
//                               >
//                                 SELL
//                               </button>
//                             ) : (
//                               <button
//                                 onClick={() =>
//                                   setModalInfo({ position: pos, side: "buy" })
//                                 }
//                                 style={{
//                                   padding: "6px 18px",
//                                   background: "rgba(14,203,129,0.15)",
//                                   color: T.green,
//                                   borderRadius: 6,
//                                   border: "none",
//                                   cursor: "pointer",
//                                   fontFamily: T.mono,
//                                   fontWeight: 700,
//                                   fontSize: 12,
//                                 }}
//                               >
//                                 BUY
//                               </button>
//                             )}
//                           </td>
//                         ) : null}
//                       </tr>
//                     );
//                   })
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>

//       {/* Order Modal */}
//       {modalInfo && (
//         <OrderModal
//           position={modalInfo.position}
//           side={modalInfo.side}
//           userId={userId}
//           accountId={accountId}
//           availableINR={availableINR}
//           onClose={() => setModalInfo(null)}
//           onSuccess={() => {
//             fetchWallet();
//             fetchPositions();
//             refreshBalance();
//           }}
//           exchangeInfo={exchangeInfo} // ← NEW: pass exchangeInfo
//         />
//       )}
//     </div>
//   );
// };

// export default Portfolio;























// // import React, { useState, useEffect, useCallback, useRef } from "react";
// // import { io } from "socket.io-client";
// // import { useUser } from "../../context/UserContext";

// // // ─── APIs & Constants ───────────────────────────────────────────────────────
// // const BASE_URL = import.meta.env.VITE_API_BASE_URL;
// // const WS_URL = "https://pilot-fawss.pi42.com";

// // const WALLET_API_BASE = `${BASE_URL}/api/pi42/futures-wallet/details`;
// // const POSITIONS_API_BASE = `${BASE_URL}/api/pi42/positions`;
// // const PLACE_ORDER_API = `${BASE_URL}/api/pi42/place-order`;

// // // ─── COLORS ────────────────────────────────────────────────────────────────
// // const T = {
// //   bg: "#060810",
// //   surface: "#0b0e17",
// //   bgDeep: "#070a10",
// //   bgInput: "#111827",
// //   bgInputHov: "#151d2e",
// //   bgOverlay: "rgba(0,0,0,0.75)",
// //   border: "rgba(255,255,255,0.06)",
// //   borderFocus: "rgba(240,185,11,0.35)",
// //   accent: "#d4a574",
// //   green: "#0ecb81",
// //   red: "#f6465d",
// //   label: "#5a6478",
// //   text: "#e5e7eb",
// //   muted: "#6b7280",
// //   mono: "'DM Mono','JetBrains Mono',monospace",
// //   success: "#22c55e",
// // };

// // // ─── HELPERS ───────────────────────────────────────────────────────────────
// // const fmtINR = (n, d = 2) =>
// //   "₹" +
// //   Number(n).toLocaleString("en-IN", {
// //     minimumFractionDigits: d,
// //     maximumFractionDigits: d,
// //   });

// // const fmtPrice = (n) => {
// //   const v = Number(n);
// //   if (!v) return "—";
// //   const d = v >= 10000 ? 0 : v >= 100 ? 1 : 2;
// //   return (
// //     "₹" +
// //     v.toLocaleString("en-IN", {
// //       minimumFractionDigits: d,
// //       maximumFractionDigits: d,
// //     })
// //   );
// // };

// // // ─── Calculate real P&L ────────────────────────────────────────────────────
// // // LONG:  (markPrice - entryPrice) * positionAmount
// // // SHORT: (entryPrice - markPrice) * positionAmount
// // const calcPnL = (pos, markPrice) => {
// //   if (!markPrice) return null;
// //   const entry = parseFloat(pos.entryPrice);
// //   const amount = parseFloat(pos.positionAmount);
// //   if (pos.positionType === "LONG") {
// //     return (markPrice - entry) * amount;
// //   } else {
// //     return (entry - markPrice) * amount;
// //   }
// // };

// // // ─── Inner Tab ─────────────────────────────────────────────────────────────
// // const InnerTab = ({ label, active, onClick }) => (
// //   <button
// //     onClick={onClick}
// //     style={{
// //       padding: "10px 24px",
// //       borderRadius: 6,
// //       border: "none",
// //       cursor: "pointer",
// //       background: active ? "rgba(212,165,116,0.15)" : "transparent",
// //       color: active ? T.accent : T.muted,
// //       fontSize: 13,
// //       fontWeight: 700,
// //       letterSpacing: "0.4px",
// //       borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
// //       transition: "all 0.15s",
// //       fontFamily: T.mono,
// //     }}
// //   >
// //     {label}
// //   </button>
// // );

// // // ─── INPUT GROUP ───────────────────────────────────────────────────────────
// // const InputGroup = ({ label, value, onChange, placeholder, unit, error }) => {
// //   const [focused, setFocused] = useState(false);
// //   return (
// //     <div
// //       style={{
// //         background: focused ? T.bgInputHov : T.bgInput,
// //         border: `1px solid ${error ? T.red : focused ? T.borderFocus : T.border}`,
// //         borderRadius: 8,
// //         padding: "12px 14px",
// //         marginBottom: 10,
// //       }}
// //     >
// //       <div
// //         style={{
// //           fontSize: 11,
// //           color: error ? T.red : T.label,
// //           marginBottom: 6,
// //           textTransform: "uppercase",
// //         }}
// //       >
// //         {label}
// //       </div>
// //       <div style={{ display: "flex", alignItems: "center" }}>
// //         <input
// //           type="text"
// //           value={value}
// //           onChange={onChange}
// //           placeholder={placeholder}
// //           onFocus={() => setFocused(true)}
// //           onBlur={() => setFocused(false)}
// //           style={{
// //             background: "transparent",
// //             border: "none",
// //             outline: "none",
// //             fontFamily: T.mono,
// //             fontSize: 15,
// //             fontWeight: 600,
// //             color: T.text,
// //             flex: 1,
// //           }}
// //         />
// //         {unit && (
// //           <span style={{ fontSize: 14, color: T.label, marginLeft: 8 }}>
// //             {unit}
// //           </span>
// //         )}
// //       </div>
// //       {error && (
// //         <div style={{ fontSize: 11, color: T.red, marginTop: 4 }}>{error}</div>
// //       )}
// //     </div>
// //   );
// // };

// // // ─── ORDER MODAL ───────────────────────────────────────────────────────────
// // const OrderModal = ({
// //   position,
// //   side,
// //   userId,
// //   accountId,
// //   availableINR,
// //   onClose,
// //   onSuccess,
// // }) => {
// //   const BASE_COIN = position.contractPair.replace("INR", "");
// //   const SYMBOL = position.contractPair;

// //   const [orderType, setOrderType] = useState("market");
// //   const [price, setPrice] = useState("");
// //   const [quantity, setQuantity] = useState(position.positionAmount.toString());

// //   const [markPrice, setMarkPrice] = useState(0);
// //   const [priceDir, setPriceDir] = useState("up");
// //   const [isConnected, setIsConnected] = useState(false);
// //   const markPriceRef = useRef(0);

// //   const [placing, setPlacing] = useState(false);
// //   const [placed, setPlaced] = useState(false);
// //   const [error, setError] = useState(null);

// //   useEffect(() => {
// //     const symLower = SYMBOL.toLowerCase();
// //     const socket = io(WS_URL, { transports: ["websocket"], forceNew: true });

// //     socket.on("connect", () => {
// //       setIsConnected(true);
// //       socket.emit("subscribe", { params: [`${symLower}@markPrice`] });
// //     });

// //     socket.on("markPriceUpdate", (data) => {
// //       if (!data?.p) return;
// //       const newPrice = Number(data.p);
// //       setPriceDir(
// //         newPrice >= (markPriceRef.current || newPrice) ? "up" : "down",
// //       );
// //       markPriceRef.current = newPrice;
// //       setMarkPrice(newPrice);
// //     });

// //     return () => socket.disconnect();
// //   }, [SYMBOL]);

// //   const isReduceOrder =
// //     (side === "sell" && position.positionType === "LONG") ||
// //     (side === "buy" && position.positionType === "SHORT");

// //   const quantityNum = parseFloat(quantity) || 0;
// //   const priceNum = parseFloat(price) || 0;

// //   const canPlace =
// //     !placing &&
// //     quantityNum > 0 &&
// //     quantityNum <= parseFloat(position.positionAmount || 0) &&
// //     (orderType === "market" || (orderType === "limit" && priceNum > 0));

// //   const handlePlace = async () => {
// //     if (!canPlace) return;
// //     setPlacing(true);
// //     setError(null);

// //     const payload = {
// //       user: userId.toString(),
// //       accountId: accountId ? accountId.toString() : undefined,
// //       placeType: "POSITION",
// //       quantity: parseFloat(quantityNum.toFixed(6)),
// //       reduceOnly: false,
// //       type: orderType.toUpperCase(),
// //       symbol: SYMBOL,
// //       positionId: position.positionId,
// //     };

// //     if (orderType === "limit" && priceNum > 0) {
// //       payload.price = priceNum;
// //     }

// //     try {
// //       const res = await fetch(PLACE_ORDER_API, {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify(payload),
// //       });

// //       const data = await res.json();

// //       if (res.ok && data.status) {
// //         setPlaced(true);
// //         setTimeout(() => {
// //           onSuccess();
// //           onClose();
// //         }, 1500);
// //       } else {
// //         setError(data.message || "Order failed");
// //       }
// //     } catch {
// //       setError("Network error");
// //     } finally {
// //       setPlacing(false);
// //     }
// //   };

// //   return (
// //     <div
// //       onClick={onClose}
// //       style={{
// //         position: "fixed",
// //         inset: 0,
// //         zIndex: 1000,
// //         background: T.bgOverlay,
// //         display: "flex",
// //         alignItems: "center",
// //         justifyContent: "center",
// //       }}
// //     >
// //       <div
// //         onClick={(e) => e.stopPropagation()}
// //         style={{
// //           width: 380,
// //           background: T.bg,
// //           borderRadius: 16,
// //           overflow: "hidden",
// //           boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
// //         }}
// //       >
// //         {/* Header */}
// //         <div
// //           style={{
// //             padding: "18px 20px",
// //             background: T.bgDeep,
// //             borderBottom: `1px solid ${T.border}`,
// //             display: "flex",
// //             justifyContent: "space-between",
// //           }}
// //         >
// //           <div>
// //             <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
// //               {BASE_COIN}/INR
// //             </div>
// //             <div style={{ fontSize: 11, color: T.label }}>
// //               {position.positionType} • {position.positionAmount} {BASE_COIN} •
// //               Entry {fmtINR(position.entryPrice)}
// //             </div>
// //           </div>
// //           <button
// //             onClick={onClose}
// //             style={{
// //               background: "rgba(255,255,255,0.06)",
// //               width: 34,
// //               height: 34,
// //               borderRadius: 8,
// //               color: T.text,
// //               border: "none",
// //               cursor: "pointer",
// //               display: "flex",
// //               alignItems: "center",
// //               justifyContent: "center",
// //             }}
// //           >
// //             ✕
// //           </button>
// //         </div>

// //         {/* Side Banner */}
// //         <div
// //           style={{
// //             padding: "13px 20px",
// //             background:
// //               side === "sell"
// //                 ? "rgba(246,70,93,0.12)"
// //                 : "rgba(14,203,129,0.12)",
// //             borderBottom: `2px solid ${side === "sell" ? T.red : T.green}`,
// //           }}
// //         >
// //           <span
// //             style={{
// //               fontWeight: 700,
// //               color: side === "sell" ? T.red : T.green,
// //               fontSize: 15,
// //             }}
// //           >
// //             {side.toUpperCase()}
// //           </span>
// //           <span style={{ marginLeft: 10, fontSize: 12, color: T.label }}>
// //             {isReduceOrder ? "Close / Reduce Position" : "Add to Position"}
// //           </span>
// //         </div>

// //         {/* Order Type Tabs */}
// //         <div
// //           style={{
// //             display: "flex",
// //             background: T.bgDeep,
// //             padding: "10px 12px 0",
// //           }}
// //         >
// //           {["market", "limit"].map((t) => (
// //             <button
// //               key={t}
// //               onClick={() => setOrderType(t)}
// //               style={{
// //                 flex: 1,
// //                 padding: "8px",
// //                 fontSize: 11,
// //                 fontWeight: 600,
// //                 background: "transparent",
// //                 border: "none",
// //                 cursor: "pointer",
// //                 color: orderType === t ? T.accent : T.label,
// //                 borderBottom:
// //                   orderType === t
// //                     ? `2px solid ${T.accent}`
// //                     : "2px solid transparent",
// //                 fontFamily: T.mono,
// //               }}
// //             >
// //               {t.toUpperCase()}
// //             </button>
// //           ))}
// //         </div>

// //         {/* Body */}
// //         <div style={{ padding: 16 }}>
// //           {/* Mark Price */}
// //           <div
// //             style={{
// //               background: T.bgDeep,
// //               border: `1px solid ${T.border}`,
// //               borderRadius: 8,
// //               padding: "10px 14px",
// //               marginBottom: 14,
// //               display: "flex",
// //               justifyContent: "space-between",
// //               alignItems: "center",
// //             }}
// //           >
// //             <div>
// //               <div style={{ fontSize: 10, color: T.label, marginBottom: 4 }}>
// //                 MARK PRICE
// //               </div>
// //               <span
// //                 style={{
// //                   fontSize: 18,
// //                   fontWeight: 700,
// //                   color: priceDir === "up" ? T.green : T.red,
// //                 }}
// //               >
// //                 {fmtPrice(markPrice)}
// //               </span>
// //             </div>
// //             <div
// //               style={{
// //                 color: isConnected ? T.green : T.label,
// //                 fontSize: 9,
// //                 fontFamily: T.mono,
// //               }}
// //             >
// //               {isConnected ? "● LIVE" : "○ CONNECTING"}
// //             </div>
// //           </div>

// //           {/* Available Balance */}
// //           <div
// //             style={{
// //               display: "flex",
// //               justifyContent: "space-between",
// //               marginBottom: 14,
// //               fontSize: 13,
// //               fontFamily: T.mono,
// //             }}
// //           >
// //             <span style={{ color: T.label }}>AVAILABLE BALANCE :</span>
// //             <span style={{ fontWeight: 700, color: T.text }}>
// //               {fmtINR(availableINR)}
// //             </span>
// //           </div>

// //           {/* Inputs */}
// //           <InputGroup
// //             label={`QUANTITY (${BASE_COIN})`}
// //             value={quantity}
// //             onChange={(e) => setQuantity(e.target.value)}
// //             placeholder="0"
// //             unit={BASE_COIN}
// //           />

// //           {orderType === "limit" && (
// //             <InputGroup
// //               label="LIMIT PRICE"
// //               value={price}
// //               onChange={(e) => setPrice(e.target.value)}
// //               placeholder="0.00"
// //               unit="INR"
// //             />
// //           )}

// //           {error && (
// //             <div
// //               style={{
// //                 color: T.red,
// //                 fontSize: 12,
// //                 marginTop: 8,
// //                 padding: "8px 12px",
// //                 background: "rgba(246,70,93,0.1)",
// //                 borderRadius: 6,
// //               }}
// //             >
// //               {error}
// //             </div>
// //           )}

// //           <button
// //             onClick={handlePlace}
// //             disabled={!canPlace}
// //             style={{
// //               width: "100%",
// //               padding: "15px",
// //               marginTop: 16,
// //               fontWeight: 700,
// //               borderRadius: 8,
// //               border: "none",
// //               fontFamily: T.mono,
// //               fontSize: 13,
// //               background: placed
// //                 ? T.success
// //                 : side === "sell"
// //                   ? T.red
// //                   : T.green,
// //               color: side === "sell" ? "#fff" : "#000",
// //               cursor: !canPlace ? "not-allowed" : "pointer",
// //               opacity: !canPlace ? 0.6 : 1,
// //               transition: "all 0.2s",
// //             }}
// //           >
// //             {placing
// //               ? "Processing..."
// //               : placed
// //                 ? "✓ Order Placed"
// //                 : `PLACE ${side.toUpperCase()} ${orderType.toUpperCase()}`}
// //           </button>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // // ─── LIVE MARK PRICE HOOK ─────────────────────────────────────────────────
// // // Subscribes to all position symbols at once via a single WebSocket connection
// // // and returns a map: { "TRXINR": 30.52, "SOLINR": 10500, ... }
// // const useLiveMarkPrices = (positions) => {
// //   const [markPrices, setMarkPrices] = useState({});
// //   const socketRef = useRef(null);

// //   useEffect(() => {
// //     if (!positions || positions.length === 0) return;

// //     // Disconnect previous socket if exists
// //     if (socketRef.current) {
// //       socketRef.current.disconnect();
// //       socketRef.current = null;
// //     }

// //     const socket = io(WS_URL, { transports: ["websocket"], forceNew: true });
// //     socketRef.current = socket;

// //     socket.on("connect", () => {
// //       // Subscribe to markPrice for every open position symbol
// //       const params = positions.map(
// //         (pos) => `${pos.contractPair.toLowerCase()}@markPrice`,
// //       );
// //       socket.emit("subscribe", { params });
// //     });

// //     socket.on("markPriceUpdate", (data) => {
// //       // data.s = symbol like "TRXINR", data.p = mark price string
// //       if (!data?.s || !data?.p) return;
// //       const symbol = data.s.toUpperCase();
// //       const price = parseFloat(data.p);
// //       setMarkPrices((prev) => ({ ...prev, [symbol]: price }));
// //     });

// //     socket.on("disconnect", () => {});

// //     return () => {
// //       socket.disconnect();
// //       socketRef.current = null;
// //     };
// //   }, [positions.map((p) => p.contractPair).join(",")]);

// //   return markPrices;
// // };

// // // ─── MAIN PORTFOLIO ────────────────────────────────────────────────────────
// // const Portfolio = () => {
// //   const { userId, accountId ,refreshBalance  } = useUser();

// //   const [activeTab, setActiveTab] = useState("OPEN");
// //   const [wallet, setWallet] = useState(null);
// //   const [positions, setPositions] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [availableINR, setAvailableINR] = useState(0);
// //   const [modalInfo, setModalInfo] = useState(null);

// //   // ── Live mark prices for all open positions ──
// //   const markPrices = useLiveMarkPrices(activeTab === "OPEN" ? positions : []);

// //   const fetchWallet = useCallback(async () => {
// //     if (!userId) return;
// //     try {
// //       const res = await fetch(
// //         `${WALLET_API_BASE}?user=${userId}&marginAsset=INR`,
// //       );
// //       const json = await res.json();
// //       if (json.status && json.data) {
// //         setWallet(json.data);
// //         setAvailableINR(parseFloat(json.data.withdrawableBalance) || 0);
// //       }
// //     } catch (err) {
// //       console.error(err);
// //     }
// //   }, [userId]);

// //   const fetchPositions = useCallback(async () => {
// //     if (!userId) return;
// //     try {
// //       const status =
// //         activeTab === "OPEN"
// //           ? "OPEN"
// //           : activeTab === "CLOSED"
// //             ? "CLOSED"
// //             : "LIQUIDATED";
// //       const res = await fetch(
// //         `${POSITIONS_API_BASE}?user=${userId}&positionStatus=${status}`,
// //       );
// //       const json = await res.json();
// //       setPositions(json.status && json.data ? json.data : []);
// //     } catch (err) {
// //       console.error(err);
// //       setPositions([]);
// //     }
// //   }, [userId, activeTab]);

// //   useEffect(() => {
// //     if (userId) {
// //       setLoading(true);
// //       Promise.all([fetchWallet(), fetchPositions()]).finally(() =>
// //         setLoading(false),
// //       );
// //     }
// //   }, [userId, activeTab]);

// //   useEffect(() => {
// //     if (!userId || activeTab !== "OPEN") return;
// //     const interval = setInterval(() => {
// //       fetchWallet();
// //       fetchPositions();
// //     }, 15000); // Increased to 15s since we have live WS for P&L
// //     return () => clearInterval(interval);
// //   }, [userId, activeTab]);

// //   // ── Aggregate stats using live mark prices ──
// //   const totalMarginUsed = positions.reduce(
// //     (sum, pos) => sum + parseFloat(pos.margin || 0),
// //     0,
// //   );

// //   // Total unrealised P&L = sum of per-position live P&L (fallback to 0 if no mark price yet)
// //   const totalUnrealisedPnL = positions.reduce((sum, pos) => {
// //     const mp = markPrices[pos.contractPair];
// //     const pnl = mp !== undefined ? calcPnL(pos, mp) : 0;
// //     return sum + (pnl || 0);
// //   }, 0);

// //   const isNegativePnL = totalUnrealisedPnL < 0;
// //   const currentValue = wallet ? parseFloat(wallet.marginBalance || 0) : 0;

// //   const tableHeaders =
// //     activeTab === "OPEN"
// //       ? [
// //           "Contract",
// //           "Type",
// //           "Size",
// //           "Entry Price",
// //           "Mark Price",
// //           "Leverage",
// //           "Margin",
// //           "P&L",
// //           "Action",
// //         ]
// //       : [
// //           "Contract",
// //           "Type",
// //           "Size",
// //           "Entry Price",
// //           "Leverage",
// //           "Margin",
// //           "Realised P&L",
// //         ];

// //   if (loading && !positions.length) {
// //     return (
// //       <div style={{ color: T.muted, padding: 20, fontFamily: T.mono }}>
// //         Loading Portfolio...
// //       </div>
// //     );
// //   }

// //   return (
// //     <div style={{ fontFamily: T.mono, padding: "20px" }}>
// //       <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
// //         {/* Left Stats */}
// //         <div
// //           style={{
// //             width: 200,
// //             flexShrink: 0,
// //             display: "flex",
// //             flexDirection: "column",
// //             gap: 14,
// //           }}
// //         >
// //           <div
// //             style={{
// //               background: T.surface,
// //               border: `1px solid ${T.border}`,
// //               borderRadius: 10,
// //               padding: "20px",
// //             }}
// //           >
// //             <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
// //               Current Value
// //             </div>
// //             <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>
// //               ₹{currentValue.toFixed(2)}
// //             </div>
// //           </div>
// //           <div
// //             style={{
// //               background: T.surface,
// //               border: `1px solid ${T.border}`,
// //               borderRadius: 10,
// //               padding: "20px",
// //             }}
// //           >
// //             <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
// //               Invested Value
// //             </div>
// //             <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>
// //               ₹{totalMarginUsed.toFixed(2)}
// //             </div>
// //           </div>
// //           <div
// //             style={{
// //               background: T.surface,
// //               border: `1px solid ${T.border}`,
// //               borderRadius: 10,
// //               padding: "20px",
// //             }}
// //           >
// //             <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
// //               Unrealised P&L
// //             </div>
// //             <div
// //               style={{
// //                 fontSize: 18,
// //                 fontWeight: 700,
// //                 color: isNegativePnL ? T.red : T.green,
// //               }}
// //             >
// //               {isNegativePnL ? "▼" : "▲"} ₹
// //               {Math.abs(totalUnrealisedPnL).toFixed(2)}
// //             </div>
// //             {/* Live indicator */}
// //             {activeTab === "OPEN" && (
// //               <div style={{ fontSize: 9, color: T.green, marginTop: 6 }}>
// //                 ● LIVE
// //               </div>
// //             )}
// //           </div>
// //         </div>

// //         {/* Main Panel */}
// //         <div
// //           style={{
// //             flex: 1,
// //             background: T.surface,
// //             borderRadius: 8,
// //             overflow: "hidden",
// //             border: `1px solid ${T.border}`,
// //           }}
// //         >
// //           {/* Tab Header */}
// //           <div
// //             style={{
// //               background: "#080b12",
// //               borderBottom: `1px solid ${T.border}`,
// //               padding: "0 16px",
// //               display: "flex",
// //               alignItems: "center",
// //             }}
// //           >
// //             <div style={{ display: "flex", gap: 4 }}>
// //               <InnerTab
// //                 label="OPEN"
// //                 active={activeTab === "OPEN"}
// //                 onClick={() => setActiveTab("OPEN")}
// //               />
// //               <InnerTab
// //                 label="CLOSED"
// //                 active={activeTab === "CLOSED"}
// //                 onClick={() => setActiveTab("CLOSED")}
// //               />
// //               <InnerTab
// //                 label="LIQUIDATED"
// //                 active={activeTab === "LIQUIDATED"}
// //                 onClick={() => setActiveTab("LIQUIDATED")}
// //               />
// //             </div>
// //           </div>

// //           {/* Positions Table */}
// //           <div
// //             style={{ padding: "4px" }}
// //             className="max-h-[300px] md:max-h-[400px] lg:max-h-[450px] overflow-y-auto"
// //           >
// //             <table style={{ width: "100%", borderCollapse: "collapse" }}>
// //               <thead>
// //                 <tr
// //                   style={{
// //                     background: "#080b12",
// //                     borderBottom: `1px solid ${T.border}`,
// //                   }}
// //                 >
// //                   {tableHeaders.map((h) => (
// //                     <th
// //                       key={h}
// //                       style={{
// //                         padding: "14px 16px",
// //                         textAlign:
// //                           h === "Contract" || h === "Action"
// //                             ? "left"
// //                             : "center",
// //                         fontSize: 12,
// //                         fontWeight: 700,
// //                         color: T.muted,
// //                         whiteSpace: "nowrap",
// //                       }}
// //                     >
// //                       {h}
// //                     </th>
// //                   ))}
// //                 </tr>
// //               </thead>
// //               <tbody>
// //                 {positions.length === 0 ? (
// //                   <tr>
// //                     <td
// //                       colSpan={tableHeaders.length}
// //                       style={{
// //                         padding: "80px",
// //                         textAlign: "center",
// //                         color: T.muted,
// //                       }}
// //                     >
// //                       No {activeTab.toLowerCase()} positions found
// //                     </td>
// //                   </tr>
// //                 ) : (
// //                   positions.map((pos) => {
// //                     const isLong = pos.positionType === "LONG";

// //                     // ── OPEN: use live mark price for P&L ──
// //                     const mp = markPrices[pos.contractPair];
// //                     const livePnL = mp !== undefined ? calcPnL(pos, mp) : null;
// //                     const displayPnL =
// //                       activeTab === "OPEN"
// //                         ? livePnL
// //                         : parseFloat(pos.realizedProfit || 0);

// //                     const pnlColor =
// //                       displayPnL === null
// //                         ? T.muted
// //                         : displayPnL < 0
// //                           ? T.red
// //                           : T.green;

// //                     return (
// //                       <tr
// //                         key={pos.positionId}
// //                         style={{ borderBottom: `1px solid ${T.border}` }}
// //                       >
// //                         {/* Contract */}
// //                         <td
// //                           style={{
// //                             padding: "14px 16px",
// //                             fontWeight: 600,
// //                             color: T.text,
// //                           }}
// //                         >
// //                           {pos.contractPair}
// //                         </td>

// //                         {/* Type */}
// //                         <td
// //                           style={{
// //                             padding: "14px 16px",
// //                             textAlign: "center",
// //                             fontWeight: 700,
// //                             color: isLong ? T.green : T.red,
// //                           }}
// //                         >
// //                           {pos.positionType}
// //                         </td>

// //                         {/* Size */}
// //                         <td
// //                           style={{
// //                             padding: "14px 16px",
// //                             textAlign: "center",
// //                             color: T.text,
// //                           }}
// //                         >
// //                           {pos.quantity}
// //                         </td>

// //                         {/* Entry Price */}
// //                         <td
// //                           style={{
// //                             padding: "14px 16px",
// //                             textAlign: "center",
// //                             color: T.text,
// //                           }}
// //                         >
// //                           ₹{parseFloat(pos.entryPrice).toFixed(2)}
// //                         </td>

// //                         {/* Mark Price (only for OPEN) */}
// //                         {activeTab === "OPEN" && (
// //                           <td
// //                             style={{
// //                               padding: "14px 16px",
// //                               textAlign: "center",
// //                               color: mp ? T.accent : T.muted,
// //                               fontWeight: 600,
// //                             }}
// //                           >
// //                             {mp ? fmtPrice(mp) : "—"}
// //                           </td>
// //                         )}

// //                         {/* Leverage */}
// //                         <td
// //                           style={{
// //                             padding: "14px 16px",
// //                             textAlign: "center",
// //                             color: T.text,
// //                           }}
// //                         >
// //                           {pos.leverage}x
// //                         </td>

// //                         {/* Margin */}
// //                         <td
// //                           style={{
// //                             padding: "14px 16px",
// //                             textAlign: "center",
// //                             color: T.text,
// //                           }}
// //                         >
// //                           ₹{parseFloat(pos.margin || 0).toFixed(2)}
// //                         </td>

// //                         {/* P&L */}
// //                         <td
// //                           style={{
// //                             padding: "14px 16px",
// //                             textAlign: "center",
// //                             color: pnlColor,
// //                             fontWeight: 700,
// //                           }}
// //                         >
// //                           {displayPnL === null
// //                             ? "—"
// //                             : `${displayPnL >= 0 ? "+" : ""}₹${displayPnL.toFixed(2)}`}
// //                         </td>

// //                         {/* Action (OPEN only) */}
// //                         {activeTab === "OPEN" ? (
// //                           <td style={{ padding: "14px 16px" }}>
// //                             {isLong ? (
// //                               <button
// //                                 onClick={() =>
// //                                   setModalInfo({ position: pos, side: "sell" })
// //                                 }
// //                                 style={{
// //                                   padding: "6px 18px",
// //                                   background: "rgba(246,70,93,0.15)",
// //                                   color: T.red,
// //                                   borderRadius: 6,
// //                                   border: "none",
// //                                   cursor: "pointer",
// //                                   fontFamily: T.mono,
// //                                   fontWeight: 700,
// //                                   fontSize: 12,
// //                                 }}
// //                               >
// //                                 SELL
// //                               </button>
// //                             ) : (
// //                               <button
// //                                 onClick={() =>
// //                                   setModalInfo({ position: pos, side: "buy" })
// //                                 }
// //                                 style={{
// //                                   padding: "6px 18px",
// //                                   background: "rgba(14,203,129,0.15)",
// //                                   color: T.green,
// //                                   borderRadius: 6,
// //                                   border: "none",
// //                                   cursor: "pointer",
// //                                   fontFamily: T.mono,
// //                                   fontWeight: 700,
// //                                   fontSize: 12,
// //                                 }}
// //                               >
// //                                 BUY
// //                               </button>
// //                             )}
// //                           </td>
// //                         ) : null}
// //                       </tr>
// //                     );
// //                   })
// //                 )}
// //               </tbody>
// //             </table>
// //           </div>
// //         </div>
// //       </div>

// //       {/* Order Modal */}
// //       {modalInfo && (
// //         <OrderModal
// //           position={modalInfo.position}
// //           side={modalInfo.side}
// //           userId={userId}
// //           accountId={accountId}
// //           availableINR={availableINR}
// //           onClose={() => setModalInfo(null)}
// //           onSuccess={() => {
// //             fetchWallet();
// //             fetchPositions();
// //             refreshBalance();
// //           }}
// //         />
// //       )}
// //     </div>
// //   );
// // };

// // // export default Portfolio;
// // import React, { useState, useEffect, useCallback, useRef } from "react";
// // import { io } from "socket.io-client";
// // import { useUser } from "../../context/UserContext";

// // // ─── APIs & Constants ───────────────────────────────────────────────────────
// // const BASE_URL = import.meta.env.VITE_API_BASE_URL;
// // const WS_URL = "https://pilot-fawss.pi42.com";

// // const WALLET_API_BASE = `${BASE_URL}/api/pi42/futures-wallet/details`;
// // const POSITIONS_API_BASE = `${BASE_URL}/api/pi42/positions`;
// // const PLACE_ORDER_API = `${BASE_URL}/api/pi42/place-order`;

// // // ─── COLORS ────────────────────────────────────────────────────────────────
// // const T = {
// //   bg: "#060810",
// //   surface: "#0b0e17",
// //   bgDeep: "#070a10",
// //   bgInput: "#111827",
// //   bgInputHov: "#151d2e",
// //   bgOverlay: "rgba(0,0,0,0.75)",
// //   border: "rgba(255,255,255,0.06)",
// //   borderFocus: "rgba(240,185,11,0.35)",
// //   accent: "#d4a574",
// //   green: "#0ecb81",
// //   red: "#f6465d",
// //   label: "#5a6478",
// //   text: "#e5e7eb",
// //   muted: "#6b7280",
// //   mono: "'DM Mono','JetBrains Mono',monospace",
// //   success: "#22c55e",
// // };

// // // ─── HELPERS ───────────────────────────────────────────────────────────────
// // const fmtINR = (n, d = 2) =>
// //   "₹" +
// //   Number(n).toLocaleString("en-IN", {
// //     minimumFractionDigits: d,
// //     maximumFractionDigits: d,
// //   });

// // const fmtPrice = (n) => {
// //   const v = Number(n);
// //   if (!v) return "—";
// //   const d = v >= 10000 ? 0 : v >= 100 ? 1 : 2;
// //   return (
// //     "₹" +
// //     v.toLocaleString("en-IN", {
// //       minimumFractionDigits: d,
// //       maximumFractionDigits: d,
// //     })
// //   );
// // };

// // // ─── Calculate real P&L ────────────────────────────────────────────────────
// // const calcPnL = (pos, markPrice) => {
// //   if (!markPrice) return null;
// //   const entry = parseFloat(pos.entryPrice);
// //   const amount = parseFloat(pos.positionAmount);
// //   if (pos.positionType === "LONG") {
// //     return (markPrice - entry) * amount;
// //   } else {
// //     return (entry - markPrice) * amount;
// //   }
// // };

// // // ─── Inner Tab ─────────────────────────────────────────────────────────────
// // const InnerTab = ({ label, active, onClick }) => (
// //   <button
// //     onClick={onClick}
// //     style={{
// //       padding: "10px 24px",
// //       borderRadius: 6,
// //       border: "none",
// //       cursor: "pointer",
// //       background: active ? "rgba(212,165,116,0.15)" : "transparent",
// //       color: active ? T.accent : T.muted,
// //       fontSize: 13,
// //       fontWeight: 700,
// //       letterSpacing: "0.4px",
// //       borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
// //       transition: "all 0.15s",
// //       fontFamily: T.mono,
// //     }}
// //   >
// //     {label}
// //   </button>
// // );

// // // ─── INPUT GROUP ───────────────────────────────────────────────────────────
// // const InputGroup = ({ label, value, onChange, placeholder, unit, error }) => {
// //   const [focused, setFocused] = useState(false);
// //   return (
// //     <div
// //       style={{
// //         background: focused ? T.bgInputHov : T.bgInput,
// //         border: `1px solid ${error ? T.red : focused ? T.borderFocus : T.border}`,
// //         borderRadius: 8,
// //         padding: "12px 14px",
// //         marginBottom: 10,
// //       }}
// //     >
// //       <div
// //         style={{
// //           fontSize: 11,
// //           color: error ? T.red : T.label,
// //           marginBottom: 6,
// //           textTransform: "uppercase",
// //         }}
// //       >
// //         {label}
// //       </div>
// //       <div style={{ display: "flex", alignItems: "center" }}>
// //         <input
// //           type="text"
// //           value={value}
// //           onChange={onChange}
// //           placeholder={placeholder}
// //           onFocus={() => setFocused(true)}
// //           onBlur={() => setFocused(false)}
// //           style={{
// //             background: "transparent",
// //             border: "none",
// //             outline: "none",
// //             fontFamily: T.mono,
// //             fontSize: 15,
// //             fontWeight: 600,
// //             color: T.text,
// //             flex: 1,
// //           }}
// //         />
// //         {unit && (
// //           <span style={{ fontSize: 14, color: T.label, marginLeft: 8 }}>
// //             {unit}
// //           </span>
// //         )}
// //       </div>
// //       {error && (
// //         <div style={{ fontSize: 11, color: T.red, marginTop: 4 }}>{error}</div>
// //       )}
// //     </div>
// //   );
// // };

// // // ─── ORDER MODAL ───────────────────────────────────────────────────────────
// // const OrderModal = ({
// //   position,
// //   side,
// //   userId,
// //   accountId,
// //   availableINR,
// //   onClose,
// //   onSuccess,
// // }) => {
// //   const BASE_COIN = position.contractPair.replace("INR", "");
// //   const SYMBOL = position.contractPair;

// //   const [orderType, setOrderType] = useState("market");
// //   const [price, setPrice] = useState("");
// //   const [quantity, setQuantity] = useState(position.positionAmount.toString());

// //   const [markPrice, setMarkPrice] = useState(0);
// //   const [priceDir, setPriceDir] = useState("up");
// //   const [isConnected, setIsConnected] = useState(false);
// //   const markPriceRef = useRef(0);

// //   const [placing, setPlacing] = useState(false);
// //   const [placed, setPlaced] = useState(false);
// //   const [error, setError] = useState(null);

// //   useEffect(() => {
// //     const symLower = SYMBOL.toLowerCase();
// //     const socket = io(WS_URL, { transports: ["websocket"], forceNew: true });

// //     socket.on("connect", () => {
// //       setIsConnected(true);
// //       socket.emit("subscribe", { params: [`${symLower}@markPrice`] });
// //     });

// //     socket.on("markPriceUpdate", (data) => {
// //       if (!data?.p) return;
// //       const newPrice = Number(data.p);
// //       setPriceDir(
// //         newPrice >= (markPriceRef.current || newPrice) ? "up" : "down",
// //       );
// //       markPriceRef.current = newPrice;
// //       setMarkPrice(newPrice);
// //     });

// //     return () => socket.disconnect();
// //   }, [SYMBOL]);

// //   const isReduceOrder =
// //     (side === "sell" && position.positionType === "LONG") ||
// //     (side === "buy" && position.positionType === "SHORT");

// //   const quantityNum = parseFloat(quantity) || 0;
// //   const priceNum = parseFloat(price) || 0;

// //   const canPlace =
// //     !placing &&
// //     quantityNum > 0 &&
// //     quantityNum <= parseFloat(position.positionAmount || 0) &&
// //     (orderType === "market" || (orderType === "limit" && priceNum > 0));

// //   const handlePlace = async () => {
// //     if (!canPlace) return;
// //     setPlacing(true);
// //     setError(null);

// //     const payload = {
// //       user: userId.toString(),
// //       accountId: accountId ? accountId.toString() : undefined,
// //       placeType: "POSITION",
// //       quantity: parseFloat(quantityNum.toFixed(6)),
// //       reduceOnly: false,
// //       type: orderType.toUpperCase(),
// //       symbol: SYMBOL,
// //       positionId: position.positionId,
// //     };

// //     if (orderType === "limit" && priceNum > 0) {
// //       payload.price = priceNum;
// //     }

// //     try {
// //       const res = await fetch(PLACE_ORDER_API, {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify(payload),
// //       });

// //       const data = await res.json();

// //       if (res.ok && data.status) {
// //         setPlaced(true);
// //         setTimeout(() => {
// //           onSuccess();
// //           onClose();
// //         }, 1500);
// //       } else {
// //         setError(data.message || "Order failed");
// //       }
// //     } catch {
// //       setError("Network error");
// //     } finally {
// //       setPlacing(false);
// //     }
// //   };

// //   return (
// //     <div
// //       onClick={onClose}
// //       style={{
// //         position: "fixed",
// //         inset: 0,
// //         zIndex: 1000,
// //         background: T.bgOverlay,
// //         display: "flex",
// //         alignItems: "center",
// //         justifyContent: "center",
// //       }}
// //     >
// //       <div
// //         onClick={(e) => e.stopPropagation()}
// //         style={{
// //           width: 380,
// //           background: T.bg,
// //           borderRadius: 16,
// //           overflow: "hidden",
// //           boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
// //         }}
// //       >
// //         {/* Header */}
// //         <div
// //           style={{
// //             padding: "18px 20px",
// //             background: T.bgDeep,
// //             borderBottom: `1px solid ${T.border}`,
// //             display: "flex",
// //             justifyContent: "space-between",
// //           }}
// //         >
// //           <div>
// //             <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
// //               {BASE_COIN}/INR
// //             </div>
// //             <div style={{ fontSize: 11, color: T.label }}>
// //               {position.positionType} • {position.positionAmount} {BASE_COIN} •
// //               Entry {fmtINR(position.entryPrice)}
// //             </div>
// //           </div>
// //           <button
// //             onClick={onClose}
// //             style={{
// //               background: "rgba(255,255,255,0.06)",
// //               width: 34,
// //               height: 34,
// //               borderRadius: 8,
// //               color: T.text,
// //               border: "none",
// //               cursor: "pointer",
// //               display: "flex",
// //               alignItems: "center",
// //               justifyContent: "center",
// //             }}
// //           >
// //             ✕
// //           </button>
// //         </div>

// //         {/* Side Banner */}
// //         <div
// //           style={{
// //             padding: "13px 20px",
// //             background:
// //               side === "sell"
// //                 ? "rgba(246,70,93,0.12)"
// //                 : "rgba(14,203,129,0.12)",
// //             borderBottom: `2px solid ${side === "sell" ? T.red : T.green}`,
// //           }}
// //         >
// //           <span
// //             style={{
// //               fontWeight: 700,
// //               color: side === "sell" ? T.red : T.green,
// //               fontSize: 15,
// //             }}
// //           >
// //             {side.toUpperCase()}
// //           </span>
// //           <span style={{ marginLeft: 10, fontSize: 12, color: T.label }}>
// //             {isReduceOrder ? "Close / Reduce Position" : "Add to Position"}
// //           </span>
// //         </div>

// //         {/* Order Type Tabs */}
// //         <div
// //           style={{
// //             display: "flex",
// //             background: T.bgDeep,
// //             padding: "10px 12px 0",
// //           }}
// //         >
// //           {["market", "limit"].map((t) => (
// //             <button
// //               key={t}
// //               onClick={() => setOrderType(t)}
// //               style={{
// //                 flex: 1,
// //                 padding: "8px",
// //                 fontSize: 11,
// //                 fontWeight: 600,
// //                 background: "transparent",
// //                 border: "none",
// //                 cursor: "pointer",
// //                 color: orderType === t ? T.accent : T.label,
// //                 borderBottom:
// //                   orderType === t
// //                     ? `2px solid ${T.accent}`
// //                     : "2px solid transparent",
// //                 fontFamily: T.mono,
// //               }}
// //             >
// //               {t.toUpperCase()}
// //             </button>
// //           ))}
// //         </div>

// //         {/* Body */}
// //         <div style={{ padding: 16 }}>
// //           {/* Mark Price */}
// //           <div
// //             style={{
// //               background: T.bgDeep,
// //               border: `1px solid ${T.border}`,
// //               borderRadius: 8,
// //               padding: "10px 14px",
// //               marginBottom: 14,
// //               display: "flex",
// //               justifyContent: "space-between",
// //               alignItems: "center",
// //             }}
// //           >
// //             <div>
// //               <div style={{ fontSize: 10, color: T.label, marginBottom: 4 }}>
// //                 MARK PRICE
// //               </div>
// //               <span
// //                 style={{
// //                   fontSize: 18,
// //                   fontWeight: 700,
// //                   color: priceDir === "up" ? T.green : T.red,
// //                 }}
// //               >
// //                 {fmtPrice(markPrice)}
// //               </span>
// //             </div>
// //             <div
// //               style={{
// //                 color: isConnected ? T.green : T.label,
// //                 fontSize: 9,
// //                 fontFamily: T.mono,
// //               }}
// //             >
// //               {isConnected ? "● LIVE" : "○ CONNECTING"}
// //             </div>
// //           </div>

// //           {/* Available Balance */}
// //           <div
// //             style={{
// //               display: "flex",
// //               justifyContent: "space-between",
// //               marginBottom: 14,
// //               fontSize: 13,
// //               fontFamily: T.mono,
// //             }}
// //           >
// //             <span style={{ color: T.label }}>AVAILABLE BALANCE :</span>
// //             <span style={{ fontWeight: 700, color: T.text }}>
// //               {fmtINR(availableINR)}
// //             </span>
// //           </div>

// //           {/* Inputs */}
// //           <InputGroup
// //             label={`QUANTITY (${BASE_COIN})`}
// //             value={quantity}
// //             onChange={(e) => setQuantity(e.target.value)}
// //             placeholder="0"
// //             unit={BASE_COIN}
// //           />

// //           {orderType === "limit" && (
// //             <InputGroup
// //               label="LIMIT PRICE"
// //               value={price}
// //               onChange={(e) => setPrice(e.target.value)}
// //               placeholder="0.00"
// //               unit="INR"
// //             />
// //           )}

// //           {error && (
// //             <div
// //               style={{
// //                 color: T.red,
// //                 fontSize: 12,
// //                 marginTop: 8,
// //                 padding: "8px 12px",
// //                 background: "rgba(246,70,93,0.1)",
// //                 borderRadius: 6,
// //               }}
// //             >
// //               {error}
// //             </div>
// //           )}

// //           <button
// //             onClick={handlePlace}
// //             disabled={!canPlace}
// //             style={{
// //               width: "100%",
// //               padding: "15px",
// //               marginTop: 16,
// //               fontWeight: 700,
// //               borderRadius: 8,
// //               border: "none",
// //               fontFamily: T.mono,
// //               fontSize: 13,
// //               background: placed
// //                 ? T.success
// //                 : side === "sell"
// //                   ? T.red
// //                   : T.green,
// //               color: side === "sell" ? "#fff" : "#000",
// //               cursor: !canPlace ? "not-allowed" : "pointer",
// //               opacity: !canPlace ? 0.6 : 1,
// //               transition: "all 0.2s",
// //             }}
// //           >
// //             {placing
// //               ? "Processing..."
// //               : placed
// //                 ? "✓ Order Placeds"
// //                 : `PLACE ${side.toUpperCase()} ${orderType.toUpperCase()}`}
// //           </button>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // // ─── LIVE MARK PRICE HOOK ─────────────────────────────────────────────────
// // const useLiveMarkPrices = (positions) => {
// //   const [markPrices, setMarkPrices] = useState({});
// //   const socketRef = useRef(null);

// //   useEffect(() => {
// //     if (!positions || positions.length === 0) return;

// //     if (socketRef.current) {
// //       socketRef.current.disconnect();
// //       socketRef.current = null;
// //     }

// //     const socket = io(WS_URL, { transports: ["websocket"], forceNew: true });
// //     socketRef.current = socket;

// //     socket.on("connect", () => {
// //       const params = positions.map(
// //         (pos) => `${pos.contractPair.toLowerCase()}@markPrice`,
// //       );
// //       socket.emit("subscribe", { params });
// //     });

// //     socket.on("markPriceUpdate", (data) => {
// //       if (!data?.s || !data?.p) return;
// //       const symbol = data.s.toUpperCase();
// //       const price = parseFloat(data.p);
// //       setMarkPrices((prev) => ({ ...prev, [symbol]: price }));
// //     });

// //     socket.on("disconnect", () => { });

// //     return () => {
// //       socket.disconnect();
// //       socketRef.current = null;
// //     };
// //   }, [positions.map((p) => p.contractPair).join(",")]);

// //   return markPrices;
// // };

// // // ─── MAIN PORTFOLIO ────────────────────────────────────────────────────────
// // const Portfolio = () => {
// //   const { userId, accountId, refreshBalance } = useUser();

// //   const [activeTab, setActiveTab] = useState("OPEN");
// //   const [wallet, setWallet] = useState(null);
// //   const [positions, setPositions] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [availableINR, setAvailableINR] = useState(0);
// //   const [modalInfo, setModalInfo] = useState(null);

// //   const markPrices = useLiveMarkPrices(activeTab === "OPEN" ? positions : []);

// //   const fetchWallet = useCallback(async () => {
// //     if (!userId) return;
// //     try {
// //       const res = await fetch(
// //         `${WALLET_API_BASE}?user=${userId}&marginAsset=INR`,
// //       );
// //       const json = await res.json();
// //       if (json.status && json.data) {
// //         setWallet(json.data);
// //         setAvailableINR(parseFloat(json.data.withdrawableBalance) || 0);
// //       }
// //     } catch (err) {
// //       console.error(err);
// //     }
// //   }, [userId]);

// //   const fetchPositions = useCallback(async () => {
// //     if (!userId) return;
// //     try {
// //       const status =
// //         activeTab === "OPEN"
// //           ? "OPEN"
// //           : activeTab === "CLOSED"
// //             ? "CLOSED"
// //             : "LIQUIDATED";
// //       const res = await fetch(
// //         `${POSITIONS_API_BASE}?user=${userId}&positionStatus=${status}`,
// //       );
// //       const json = await res.json();
// //       setPositions(json.status && json.data ? json.data : []);
// //     } catch (err) {
// //       console.error(err);
// //       setPositions([]);
// //     }
// //   }, [userId, activeTab]);

// //   useEffect(() => {
// //     if (userId) {
// //       setLoading(true);
// //       Promise.all([fetchWallet(), fetchPositions()]).finally(() =>
// //         setLoading(false),
// //       );
// //     }
// //   }, [userId, activeTab]);

// //   useEffect(() => {
// //     if (!userId || activeTab !== "OPEN") return;
// //     const interval = setInterval(() => {
// //       fetchWallet();
// //       fetchPositions();
// //     }, 15000);
// //     return () => clearInterval(interval);
// //   }, [userId, activeTab]);

// //   const totalMarginUsed = positions.reduce(
// //     (sum, pos) => sum + parseFloat(pos.margin || 0),
// //     0,
// //   );

// //   const totalUnrealisedPnL = positions.reduce((sum, pos) => {
// //     const mp = markPrices[pos.contractPair];
// //     const pnl = mp !== undefined ? calcPnL(pos, mp) : 0;
// //     return sum + (pnl || 0);
// //   }, 0);

// //   const isNegativePnL = totalUnrealisedPnL < 0;
// //   const currentValue = wallet ? parseFloat(wallet.marginBalance || 0) : 0;

// //   // ── FIXED: Added "Close Price" header for CLOSED tab ──
// //   const tableHeaders =
// //     activeTab === "OPEN"
// //       ? [
// //         "Contract",
// //         "Type",
// //         "Size",
// //         "Entry Price",
// //         "Mark Price",
// //         "Leverage",
// //         "Margin",
// //         "P&L",
// //         "Action",
// //       ]
// //       : [
// //         "Contract",
// //         "Type",
// //         "Size",
// //         "Entry Price",
// //         "Sell Price",        // ← NEW
// //         "Leverage",
// //         "Margin",
// //         "Realised P&L",
// //       ];

// //   if (loading && !positions.length) {
// //     return (
// //       <div style={{ color: T.muted, padding: 20, fontFamily: T.mono }}>
// //         Loading Portfolio...
// //       </div>
// //     );
// //   }

// //   return (
// //     <div style={{ fontFamily: T.mono, padding: "20px" }}>
// //       <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
// //         {/* Left Stats */}
// //         <div
// //           style={{
// //             width: 200,
// //             flexShrink: 0,
// //             display: "flex",
// //             flexDirection: "column",
// //             gap: 14,
// //           }}
// //         >
// //           <div
// //             style={{
// //               background: T.surface,
// //               border: `1px solid ${T.border}`,
// //               borderRadius: 10,
// //               padding: "20px",
// //             }}
// //           >
// //             <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
// //               Current Value
// //             </div>
// //             <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>
// //               ₹{currentValue.toFixed(2)}
// //             </div>
// //           </div>
// //           <div
// //             style={{
// //               background: T.surface,
// //               border: `1px solid ${T.border}`,
// //               borderRadius: 10,
// //               padding: "20px",
// //             }}
// //           >
// //             <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
// //               Invested Value
// //             </div>
// //             <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>
// //               ₹{totalMarginUsed.toFixed(2)}
// //             </div>
// //           </div>
// //           <div
// //             style={{
// //               background: T.surface,
// //               border: `1px solid ${T.border}`,
// //               borderRadius: 10,
// //               padding: "20px",
// //             }}
// //           >
// //             <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
// //               Unrealised P&L
// //             </div>
// //             <div
// //               style={{
// //                 fontSize: 18,
// //                 fontWeight: 700,
// //                 color: isNegativePnL ? T.red : T.green,
// //               }}
// //             >
// //               {isNegativePnL ? "▼" : "▲"} ₹
// //               {Math.abs(totalUnrealisedPnL).toFixed(2)}
// //             </div>
// //             {activeTab === "OPEN" && (
// //               <div style={{ fontSize: 9, color: T.green, marginTop: 6 }}>
// //                 ● LIVE
// //               </div>
// //             )}
// //           </div>
// //         </div>

// //         {/* Main Panel */}
// //         <div
// //           style={{
// //             flex: 1,
// //             background: T.surface,
// //             borderRadius: 8,
// //             overflow: "hidden",
// //             border: `1px solid ${T.border}`,
// //           }}
// //         >
// //           {/* Tab Header */}
// //           <div
// //             style={{
// //               background: "#080b12",
// //               borderBottom: `1px solid ${T.border}`,
// //               padding: "0 16px",
// //               display: "flex",
// //               alignItems: "center",
// //             }}
// //           >
// //             <div style={{ display: "flex", gap: 4 }}>
// //               <InnerTab
// //                 label="OPEN"
// //                 active={activeTab === "OPEN"}
// //                 onClick={() => setActiveTab("OPEN")}
// //               />
// //               <InnerTab
// //                 label="CLOSED"
// //                 active={activeTab === "CLOSED"}
// //                 onClick={() => setActiveTab("CLOSED")}
// //               />
// //               <InnerTab
// //                 label="LIQUIDATED"
// //                 active={activeTab === "LIQUIDATED"}
// //                 onClick={() => setActiveTab("LIQUIDATED")}
// //               />
// //             </div>
// //           </div>

// //           {/* Positions Table */}
// //           <div
// //             style={{ padding: "4px" }}
// //             className="max-h-[300px] md:max-h-[400px] lg:max-h-[450px] overflow-y-auto"
// //           >
// //             <table style={{ width: "100%", borderCollapse: "collapse" }}>
// //               <thead>
// //                 <tr
// //                   style={{
// //                     background: "#080b12",
// //                     borderBottom: `1px solid ${T.border}`,
// //                   }}
// //                 >
// //                   {tableHeaders.map((h) => (
// //                     <th
// //                       key={h}
// //                       style={{
// //                         padding: "14px 16px",
// //                         textAlign:
// //                           h === "Contract" || h === "Action"
// //                             ? "left"
// //                             : "center",
// //                         fontSize: 12,
// //                         fontWeight: 700,
// //                         color: T.muted,
// //                         whiteSpace: "nowrap",
// //                       }}
// //                     >
// //                       {h}
// //                     </th>
// //                   ))}
// //                 </tr>
// //               </thead>
// //               <tbody>
// //                 {positions.length === 0 ? (
// //                   <tr>
// //                     <td
// //                       colSpan={tableHeaders.length}
// //                       style={{
// //                         padding: "80px",
// //                         textAlign: "center",
// //                         color: T.muted,
// //                       }}
// //                     >
// //                       No {activeTab.toLowerCase()} positions found
// //                     </td>
// //                   </tr>
// //                 ) : (
// //                   positions.map((pos) => {
// //                     const isLong = pos.positionType === "LONG";

// //                     const mp = markPrices[pos.contractPair];
// //                     const livePnL = mp !== undefined ? calcPnL(pos, mp) : null;
// //                     const displayPnL =
// //                       activeTab === "OPEN"
// //                         ? livePnL
// //                         : parseFloat(pos.realizedProfit || 0);

// //                     const pnlColor =
// //                       displayPnL === null
// //                         ? T.muted
// //                         : displayPnL < 0
// //                           ? T.red
// //                           : T.green;

// //                     // ── FIXED: Get close/sell price for CLOSED positions ──
// //                     const closePrice = pos.closePrice || pos.sellPrice || pos.exitPrice || null;

// //                     return (
// //                       <tr
// //                         key={pos.positionId}
// //                         style={{ borderBottom: `1px solid ${T.border}` }}
// //                       >
// //                         {/* Contract */}
// //                         <td
// //                           style={{
// //                             padding: "14px 16px",
// //                             fontWeight: 600,
// //                             color: T.text,
// //                           }}
// //                         >
// //                           {pos.contractPair}
// //                         </td>

// //                         {/* Type */}
// //                         <td
// //                           style={{
// //                             padding: "14px 16px",
// //                             textAlign: "center",
// //                             fontWeight: 700,
// //                             color: isLong ? T.green : T.red,
// //                           }}
// //                         >
// //                           {pos.positionType}
// //                         </td>

// //                         {/* Size */}
// //                         <td
// //                           style={{
// //                             padding: "14px 16px",
// //                             textAlign: "center",
// //                             color: T.text,
// //                           }}
// //                         >
// //                           {pos.quantity}
// //                         </td>

// //                         {/* Entry Price */}
// //                         <td
// //                           style={{
// //                             padding: "14px 16px",
// //                             textAlign: "center",
// //                             color: T.text,
// //                           }}
// //                         >
// //                           ₹{parseFloat(pos.entryPrice).toFixed(2)}
// //                         </td>

// //                         {/* ── FIXED: Mark Price (OPEN) / Close Price (CLOSED) ── */}
// //                         {activeTab === "OPEN" ? (
// //                           <td
// //                             style={{
// //                               padding: "14px 16px",
// //                               textAlign: "center",
// //                               color: mp ? T.accent : T.muted,
// //                               fontWeight: 600,
// //                             }}
// //                           >
// //                             {mp ? fmtPrice(mp) : "—"}
// //                           </td>
// //                         ) : (
// //                           <td
// //                             style={{
// //                               padding: "14px 16px",
// //                               textAlign: "center",
// //                               color: closePrice ? T.accent : T.muted,
// //                               fontWeight: 600,
// //                             }}
// //                           >
// //                             {closePrice ? `₹${parseFloat(closePrice).toFixed(2)}` : "—"}
// //                           </td>
// //                         )}

// //                         {/* Leverage */}
// //                         <td
// //                           style={{
// //                             padding: "14px 16px",
// //                             textAlign: "center",
// //                             color: T.text,
// //                           }}
// //                         >
// //                           {pos.leverage}x
// //                         </td>

// //                         {/* Margin */}
// //                         <td
// //                           style={{
// //                             padding: "14px 16px",
// //                             textAlign: "center",
// //                             color: T.text,
// //                           }}
// //                         >
// //                           ₹{parseFloat(pos.margin || 0).toFixed(2)}
// //                         </td>

// //                         {/* P&L */}
// //                         <td
// //                           style={{
// //                             padding: "14px 16px",
// //                             textAlign: "center",
// //                             color: pnlColor,
// //                             fontWeight: 700,
// //                           }}
// //                         >
// //                           {displayPnL === null
// //                             ? "—"
// //                             : `${displayPnL >= 0 ? "+" : ""}₹${displayPnL.toFixed(2)}`}
// //                         </td>

// //                         {/* Action (OPEN only) */}
// //                         {activeTab === "OPEN" ? (
// //                           <td style={{ padding: "14px 16px" }}>
// //                             {isLong ? (
// //                               <button
// //                                 onClick={() =>
// //                                   setModalInfo({ position: pos, side: "sell" })
// //                                 }
// //                                 style={{
// //                                   padding: "6px 18px",
// //                                   background: "rgba(246,70,93,0.15)",
// //                                   color: T.red,
// //                                   borderRadius: 6,
// //                                   border: "none",
// //                                   cursor: "pointer",
// //                                   fontFamily: T.mono,
// //                                   fontWeight: 700,
// //                                   fontSize: 12,
// //                                 }}
// //                               >
// //                                 SELL
// //                               </button>
// //                             ) : (
// //                               <button
// //                                 onClick={() =>
// //                                   setModalInfo({ position: pos, side: "buy" })
// //                                 }
// //                                 style={{
// //                                   padding: "6px 18px",
// //                                   background: "rgba(14,203,129,0.15)",
// //                                   color: T.green,
// //                                   borderRadius: 6,
// //                                   border: "none",
// //                                   cursor: "pointer",
// //                                   fontFamily: T.mono,
// //                                   fontWeight: 700,
// //                                   fontSize: 12,
// //                                 }}
// //                               >
// //                                 BUY
// //                               </button>
// //                             )}
// //                           </td>
// //                         ) : null}
// //                       </tr>
// //                     );
// //                   })
// //                 )}
// //               </tbody>
// //             </table>
// //           </div>
// //         </div>
// //       </div>

// //       {/* Order Modal */}
// //       {modalInfo && (
// //         <OrderModal
// //           position={modalInfo.position}
// //           side={modalInfo.side}
// //           userId={userId}
// //           accountId={accountId}
// //           availableINR={availableINR}
// //           onClose={() => setModalInfo(null)}
// //           onSuccess={() => {
// //             fetchWallet();
// //             fetchPositions();
// //             refreshBalance();
// //           }}
// //         />
// //       )}
// //     </div>
// //   );
// // };

// // export default Portfolio;
