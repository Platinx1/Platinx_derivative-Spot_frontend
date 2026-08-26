// // context/UserContext.js
// import React, { createContext, useContext, useState, useEffect } from 'react';

// const UserContext = createContext(null);

// export const UserProvider = ({ children }) => {
//   const [userId, setUserIdState] = useState(null);

//   // Load from localStorage on first mount
//   useEffect(() => {
//     const savedUserId = localStorage.getItem('user_id');
//     if (savedUserId) {
//       setUserIdState(savedUserId);
//     }
//   }, []);

//   // Set userId (both in state + localStorage)
//   const setUserId = (id) => {
//     if (id) {
//       localStorage.setItem('user_id', id);
//       setUserIdState(id);
//       console.log("✅ User ID Saved:", id);
//     }
//   };

//   // Clear user (logout)
//   const clearUserId = () => {
//     localStorage.removeItem('user_id');
//     setUserIdState(null);
//   };

//   return (
//     <UserContext.Provider value={{ 
//       userId, 
//       setUserId, 
//       clearUserId 
//     }}>
//       {children}
//     </UserContext.Provider>
//   );
// };

// // Custom Hook
// export const useUser = () => {
//   const context = useContext(UserContext);
//   if (!context) {
//     throw new Error('useUser must be used within UserProvider');
//   }
//   return context;
// };









// // context/UserContext.js
// import React, { createContext, useContext, useState, useEffect } from 'react';

// const UserContext = createContext(null);

// export const UserProvider = ({ children }) => {
//   const [userId, setUserIdState] = useState(null);
//   // ✅ FIX: Global balance refresh counter — jab bhi increment ho,
//   // OrderPlacement apna loadBalance() dobara call karega
//   const [balanceVersion, setBalanceVersion] = useState(0);

//   useEffect(() => {
//     const savedUserId = localStorage.getItem('user_id');
//     console.log("Saved User ID:", savedUserId);
//     if (savedUserId) {
//       setUserIdState(savedUserId);
//     }
//   }, []);

//   const setUserId = (id) => {
//     if (id) {
//       localStorage.setItem('user_id', id);
//       setUserIdState(id);
//       console.log("✅ User ID Saved:", id);
//     }
//   };

//   const clearUserId = () => {
//     localStorage.removeItem('user_id');
//     setUserIdState(null);
//   };

//   // ✅ FIX: Yeh function call karo jab bhi balance change ho
//   // (deposit, withdraw, ya position close ke baad)
//   const refreshBalance = () => {
//     setBalanceVersion((v) => v + 1);
//   };

//   return (
//     <UserContext.Provider value={{
//       userId,
//       setUserId,
//       clearUserId,
//       balanceVersion,   // OrderPlacement isko watch karega
//       refreshBalance,   // Wallet + Portfolio isko call karenge
//     }}>
//       {children}
//     </UserContext.Provider>
//   );
// };

// export const useUser = () => {
//   const context = useContext(UserContext);
//   if (!context) {
//     throw new Error('useUser must be used within UserProvider');
//   }
//   return context;
// };


// context/UserContext.js
import React, { createContext, useContext, useState } from 'react';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  // ✅ FIX: state ko direct localStorage se initialize karo (lazy initializer)
  // Ye function sirf pehli render par chalta hai — useEffect ka wait nahi karna padta,
  // isliye "userId set hone se pehle hi get ho raha hai" wala race condition fix ho jaata hai
  const [userId, setUserIdState] = useState(() => {
    return localStorage.getItem('user_id') || null;
  });

  // ✅ FIX: Global balance refresh counter — jab bhi increment ho,
  // OrderPlacement apna loadBalance() dobara call karega
  const [balanceVersion, setBalanceVersion] = useState(0);

  const setUserId = (id) => {
    if (id) {
      localStorage.setItem('user_id', id);
      setUserIdState(id);
      console.log("✅ User ID Saved:", id);
    }
  };

  const clearUserId = () => {
    localStorage.removeItem('user_id');
    setUserIdState(null);
  };

  // ✅ FIX: Yeh function call karo jab bhi balance change ho
  // (deposit, withdraw, ya position close ke baad)
  const refreshBalance = () => {
    setBalanceVersion((v) => v + 1);
  };

  return (
    <UserContext.Provider value={{
      userId,
      setUserId,
      
      clearUserId,
      balanceVersion,   // OrderPlacement isko watch karega
      refreshBalance,   // Wallet + Portfolio isko call karenge
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};