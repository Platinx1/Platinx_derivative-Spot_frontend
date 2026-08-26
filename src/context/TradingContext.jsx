// // import React, { createContext, useContext, useState } from 'react';

// // // ── Create Context ───────────────────────────────────────────────────────────
// // const TradingContext = createContext(null);

// // // ── Default Pair ─────────────────────────────────────────────────────────────
// // const DEFAULT_PAIR = {
// //   symbol: 'BTC/INR',
// //   exchange: 'coinswitchx',
// // };

// // // ── Provider Component ───────────────────────────────────────────────────────
// // export const TradingProvider = ({ children }) => {
// //   const [selectedPair, setSelectedPair] = useState(DEFAULT_PAIR);

// //   const updateSelectedPair = (coin) => {
// //     setSelectedPair({
// //       symbol: coin.symbol || DEFAULT_PAIR.symbol,
// //       exchange: coin.exchange || DEFAULT_PAIR.exchange,
// //     });
// //   };

// //   return (
// //     <TradingContext.Provider value={{ selectedPair, updateSelectedPair }}>
// //       {children}
// //     </TradingContext.Provider>
// //   );
// // };

// // // ── Custom Hook ──────────────────────────────────────────────────────────────
// // export const useTradingContext = () => {
// //   const context = useContext(TradingContext);
// //   if (!context) {
// //     throw new Error('useTradingContext must be used within TradingProvider');
// //   }
// //   return context;
// // };







// import React, { createContext, useContext, useState } from 'react';

// // ── Create Context ───────────────────────────────────────────────────────────
// const TradingContext = createContext(null);

// // ── Default Pair ─────────────────────────────────────────────────────────────
// const DEFAULT_PAIR = {
//   symbol: 'BTC/INR',
//   exchange: 'coinswitchx',
// };

// // ── Provider Component ───────────────────────────────────────────────────────
// export const TradingProvider = ({ children }) => {
//   const [selectedPair, setSelectedPair] = useState(DEFAULT_PAIR);
//   const [selectedPrice, setSelectedPrice] = useState(null);
//   const [ordersRefresh, setOrdersRefresh] = useState(0);
//   const [walletRefresh, setWalletRefresh] = useState(0);


//   const updateSelectedPair = (coin) => {
//     setSelectedPair({
//       symbol: coin.symbol || DEFAULT_PAIR.symbol,
//       exchange: coin.exchange || DEFAULT_PAIR.exchange,
//     });
//     setSelectedPrice(null); // ← Reset price when pair changes
//   };
//   // Refresh Wallet
//   const refreshWallet = () => {
//     setWalletRefresh((prev) => prev + 1);
//   };
//   const updateSelectedPrice = (price) => {
//     setSelectedPrice(price);
//   };

//   return (
//     <TradingContext.Provider value={{
//       selectedPair,
//       updateSelectedPair,
//       selectedPrice,
//       ordersRefresh,
//       setOrdersRefresh,
//       updateSelectedPrice,
//       walletRefresh,
//       refreshWallet,
//     }}>
//       {children}
//     </TradingContext.Provider>
//   );
// };

// // ── Custom Hook ──────────────────────────────────────────────────────────────
// export const useTradingContext = () => {
//   const context = useContext(TradingContext);
//   if (!context) {
//     throw new Error('useTradingContext must be used within TradingProvider');
//   }
//   return context;
// }; 


import React, { createContext, useContext, useState, useEffect } from "react";

// ── Create Context ───────────────────────────────────────────────────────────
const TradingContext = createContext(null);

// ── Default Pair ─────────────────────────────────────────────────────────────
const DEFAULT_PAIR = {
  symbol: "BTC/INR",
  exchange: "coinswitchx",
};

// ── Provider Component ───────────────────────────────────────────────────────
export const TradingProvider = ({ children }) => {
  // Read persistent initial pair from localStorage on startup
  const [selectedPair, setSelectedPair] = useState(() => {
    try {
      const savedPair = localStorage.getItem("selected_trading_pair");
      return savedPair ? JSON.parse(savedPair) : DEFAULT_PAIR;
    } catch (e) {
      console.error("Error loading pair from localStorage:", e);
      return DEFAULT_PAIR;
    }
  });

  const [selectedPrice, setSelectedPrice] = useState(null);
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  const [walletRefresh, setWalletRefresh] = useState(0);

  // Sync state changes directly to localStorage
  useEffect(() => {
    if (selectedPair) {
      localStorage.setItem("selected_trading_pair", JSON.stringify(selectedPair));
    }
  }, [selectedPair]);

  const updateSelectedPair = (coin) => {
    const newPair = {
      symbol: coin.symbol || DEFAULT_PAIR.symbol,
      exchange: coin.exchange || DEFAULT_PAIR.exchange,
    };
    setSelectedPair(newPair);
    setSelectedPrice(null); // Reset price when pair changes
  };

  const refreshWallet = () => {
    setWalletRefresh((prev) => prev + 1);
  };

  const updateSelectedPrice = (price) => {
    setSelectedPrice(price);
  };

  return (
    <TradingContext.Provider
      value={{
        selectedPair,
        updateSelectedPair,
        selectedPrice,
        ordersRefresh,
        setOrdersRefresh,
        updateSelectedPrice,
        walletRefresh,
        refreshWallet,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

// ── Custom Hook ──────────────────────────────────────────────────────────────
export const useTradingContext = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error("useTradingContext must be used within TradingProvider");
  }
  return context;
};