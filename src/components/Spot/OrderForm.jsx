


import React, { useState } from "react";

const OrderForm = () => {
  const [orderType, setOrderType] = useState("market"); // "market" or "limit"
  const [side, setSide] = useState("buy"); // "buy" or "sell"
  const [leverage, setLeverage] = useState("25x");
  const [marginMode, setMarginMode] = useState("isolated"); // "isolated" or "cross"
  const [tpSlEnabled, setTpSlEnabled] = useState(true);
  const [profitPercent, setProfitPercent] = useState("");
  const [lossPercent, setLossPercent] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [orderValue, setOrderValue] = useState("");

  const availableBalance = 841.05;
  const minOrderValue = orderType === "market" ? 12972.0 : 0.0;

  const leverageOptions = ["1x", "5x", "10x", "25x", "50x", "100x"];

  return (
    <div className="bg-[#0b0e11] w-full max-w-[360px] font-sans text-xs select-none">
      {/* Buy/Sell Toggle */}
      <div className="flex p-1 bg-[#151a21] rounded-lg mb-3">
        <button
          onClick={() => setSide("buy")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            side === "buy"
              ? "bg-[#1a2332] text-[#22c55e] border border-[#22c55e]/30"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Buy / Long
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            side === "sell"
              ? "bg-[#1a2332] text-[#ff6b6b] border border-[#ff6b6b]/30"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Sell / Short
        </button>
      </div>

      {/* Leverage & Margin Mode */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 bg-[#151a21] rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-gray-500 text-[11px]">Leverage</span>
          <select
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
            className="bg-transparent text-white font-medium text-sm outline-none cursor-pointer"
          >
            {leverageOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-[#151a21]">
                {opt}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setMarginMode(marginMode === "isolated" ? "cross" : "isolated")}
          className="bg-[#151a21] rounded-lg px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          {marginMode === "isolated" ? "Isolated" : "Cross"}
        </button>
      </div>

      {/* Market/Limit Tabs */}
      <div className="flex border-b border-gray-800 mb-3">
        <button
          onClick={() => setOrderType("market")}
          className={`px-4 py-2 text-sm font-medium relative ${
            orderType === "market"
              ? "text-yellow-500"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Market
          {orderType === "market" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500" />
          )}
        </button>
        <button
          onClick={() => setOrderType("limit")}
          className={`px-4 py-2 text-sm font-medium relative ${
            orderType === "limit"
              ? "text-yellow-500"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Limit
          {orderType === "limit" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500" />
          )}
        </button>
      </div>

      {/* Available Balance */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-gray-500 text-[11px]">Available</span>
        <div className="flex items-center gap-1">
          <span className="text-[#22c55e] font-medium">₹{availableBalance.toFixed(2)}</span>
          <button className="text-gray-500 hover:text-white">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Limit Price Input (Only for Limit orders) */}
      {orderType === "limit" && (
        <div className="bg-[#151a21] rounded-lg px-3 py-2.5 mb-2 flex items-center justify-between">
          <span className="text-gray-500 text-[11px]">Limit Price</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="0.00"
              className="bg-transparent text-right text-white text-sm outline-none w-24 placeholder-gray-600"
            />
            <button className="text-yellow-500 text-[11px] font-medium hover:text-yellow-400">
              Get Lowest
            </button>
          </div>
        </div>
      )}

      {/* Order Value Input */}
      <div className="bg-[#151a21] rounded-lg px-3 py-2.5 mb-2 flex items-center justify-between">
        <span className="text-gray-500 text-[11px]">Order Value</span>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 text-[11px]">Min ₹{minOrderValue.toFixed(2)}</span>
          <span className="text-yellow-500 text-[11px] ml-1">INR</span>
          <svg className="w-3 h-3 text-gray-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Percentage Buttons */}
      <div className="flex gap-2 mb-3">
        <button className="flex-1 bg-[#151a21] hover:bg-[#1a2332] text-gray-400 text-[11px] py-2 rounded-lg transition-colors">
          Min 0.002 BTC
        </button>
        <button className="flex-1 bg-[#151a21] hover:bg-[#1a2332] text-gray-400 text-[11px] py-2 rounded-lg transition-colors">
          25%
        </button>
        <button className="flex-1 bg-[#151a21] hover:bg-[#1a2332] text-gray-400 text-[11px] py-2 rounded-lg transition-colors">
          50%
        </button>
        <button className="flex-1 bg-[#151a21] hover:bg-[#1a2332] text-gray-400 text-[11px] py-2 rounded-lg transition-colors">
          100%
        </button>
      </div>

      {/* TP/SL Section */}
      <div className="bg-[#151a21] rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <span className="text-gray-300 text-[11px]">TP/SL on entire position</span>
            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <button
            onClick={() => setTpSlEnabled(!tpSlEnabled)}
            className={`w-8 h-4 rounded-full relative transition-colors ${
              tpSlEnabled ? "bg-yellow-500" : "bg-gray-600"
            }`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                tpSlEnabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {tpSlEnabled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-[#0b0e11] rounded-lg px-3 py-2">
              <div className="flex items-center gap-1 text-gray-500 text-[11px]">
                <span>Profit %</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </div>
              <input
                type="number"
                value={profitPercent}
                onChange={(e) => setProfitPercent(e.target.value)}
                placeholder="Enter Profit %"
                className="bg-transparent text-right text-gray-400 text-xs outline-none w-24 placeholder-gray-600"
              />
            </div>

            <div className="flex items-center justify-between bg-[#0b0e11] rounded-lg px-3 py-2">
              <div className="flex items-center gap-1 text-gray-500 text-[11px]">
                <span>Loss %</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <input
                type="number"
                value={lossPercent}
                onChange={(e) => setLossPercent(e.target.value)}
                placeholder="Enter Loss %"
                className="bg-transparent text-right text-gray-400 text-xs outline-none w-24 placeholder-gray-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* Est. P/L */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1">
          <span className="text-gray-500 text-[11px]">Est. P/L from this order</span>
          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-gray-500 text-xs">-- / --</span>
      </div>

      {/* Margin Info */}
      <div className="space-y-2 mb-3 px-1">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-[11px]">Margin</span>
          <span className="text-white text-xs">₹0.00</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-[11px]">Est. Liq. Price</span>
            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-white text-xs">₹0.00</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-[11px]">Fee (Maker/Taker)</span>
            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-gray-400 text-xs">0.025% / 0.063%</span>
        </div>
      </div>

      {/* Buy/Sell Button */}
      <button
        className={`w-full py-3 rounded-lg font-medium text-sm transition-all ${
          side === "buy"
            ? "bg-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/30 border border-[#22c55e]/30"
            : "bg-[#ff6b6b]/20 text-[#ff6b6b] hover:bg-[#ff6b6b]/30 border border-[#ff6b6b]/30"
        }`}
      >
        {side === "buy" ? "BUY / LONG" : "SELL / SHORT"}
      </button>

      {/* Disclaimer */}
      <p className="text-[10px] text-gray-600 mt-3 leading-relaxed px-1">
        You agree that you are trading crypto futures to hedge your spot holdings risk and crypto futures may be void under applicable laws. You also waive your right to recover any losses and costs from us.
      </p>
    </div>
  );
};

export default OrderForm;