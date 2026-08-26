


import { TradingProvider } from "./context/TradingContext";
import { UserProvider } from "./context/UserContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Sportpage from "./Pages/SportPage";
import FuturesPage from "./Pages/FuturesPage";
import SignupPage from "./Pages/SignUpPage";
import FuturesWallet from "./components/Futures/FuturesWallet";
import '@fortawesome/fontawesome-free/css/all.min.css';
import ProtectedRoute from "./components/ProtectedRoute";
function App() {
  return (
    <UserProvider>
      <TradingProvider>
        <ToastContainer position="top-right" autoClose={3000} />
        <BrowserRouter>
          <Routes>
            <Route
              path="/spot"
              element={
                <ProtectedRoute>
                  <Sportpage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/futures"
              element={
                <ProtectedRoute>
                  <FuturesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/wallet"
              element={
                <ProtectedRoute>
                  <FuturesWallet />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TradingProvider>
    </UserProvider>
  );
}

export default App;