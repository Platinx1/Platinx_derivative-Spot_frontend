


import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { useUser } from "../../context/UserContext";

// ─── APIs ────────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const WALLET_API = `${BASE_URL}/api/pi42/futures-wallet/details`;
const HISTORY_API = `${BASE_URL}/api/pi42/wallet-history`;
const DEPOSIT_API = `${BASE_URL}/api/pi42/deposit-inr`;
const WITHDRAW_API = `${BASE_URL}/api/pi42/withdraw-inr`;

const HISTORY_LIMIT = 20;

// ─── Design tokens ───────────────────────────────────────────────────────────
const T = {
  bg: "#070B14",
  surface: "#131A28",

  border: "rgba(255,255,255,0.06)",

  primary: "#7B2FF7",
  primaryLight: "#A855F7",
  secondary: "#C084FC",

  gradient: "linear-gradient(135deg,#7B2FF7 0%,#A855F7 50%,#C084FC 100%)",

  green: "#22C55E",
  red: "#EF4444",

  text: "#F8FAFC",
  muted: "#94A3B8",

  accent: "#7B2FF7",
  accentSoft: "rgba(123,47,247,0.15)",

  mono: "'Inter', sans-serif",

  shadow: "0 10px 40px rgba(0,0,0,0.35)",
  radius: "12px",
};

const fmtINR = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

// ─── Sub Components ──────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, subColor }) => (
  <div
    style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 10,
      padding: "20px",
    }}
  >
    <div
      style={{
        fontSize: 11,
        color: T.muted,
        marginBottom: 6,
        letterSpacing: "0.5px",
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 4 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 12, color: subColor || T.muted }}>{sub}</div>}
  </div>
);

const InnerTab = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "8px 20px",
      borderRadius: 6,
      border: "none",
      cursor: "pointer",
      background: active ? T.accentSoft : "transparent",
      color: active ? T.accent : T.muted,
      fontSize: 12,
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

const AmountInput = ({ value, onChange, placeholder = "0.00" }) => (
  <div style={{ position: "relative", marginBottom: 14 }}>
    <span
      style={{
        position: "absolute",
        left: 14,
        top: "50%",
        transform: "translateY(-50%)",
        color: T.muted,
        fontSize: 15,
        fontWeight: 700,
      }}
    >
      ₹
    </span>
    <input
      type="number"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: "100%",
        background: "#080b12",
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: "13px 14px 13px 28px",
        fontSize: 16,
        fontWeight: 600,
        color: T.text,
        fontFamily: T.mono,
        outline: "none",
        boxSizing: "border-box",
      }}
      onFocus={(e) => (e.target.style.borderColor = "rgba(123,47,247,0.4)")}
      onBlur={(e) => (e.target.style.borderColor = T.border)}
    />
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const FuturesWallet = () => {
  const { userId, refreshBalance } = useUser();

  const [wallet, setWallet] = useState({
    withdrawableBalance: 0,
    totalBalance: 0,
    marginBalance: 0,
  });
  const [history, setHistory] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("deposit");
  const [amount, setAmount] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  // ── Load Wallet Data using only userId ───────────────────────────────
  const loadWalletData = async () => {
    if (!userId) {
      setError("User ID not found. Please go to /futures?user_id=XXX");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const walletRes = await fetch(`${WALLET_API}?user=${userId}&marginAsset=INR`);
      const walletJson = await walletRes.json();

      if (walletJson.status && walletJson.data) {
        setWallet(walletJson.data);
      } else {
        setError(walletJson.message || "Failed to load wallet");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch History using only userId ───────────────────────────────
  const fetchHistory = async (page = 1, type = "", marginAsset = "INR") => {
    if (!userId) return;
    if (page < 1) return;

    setHistoryLoading(true);

    try {
      const res = await fetch(HISTORY_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: userId,
          page,
          limit: HISTORY_LIMIT,
          type, // DEPOSIT | WITHDRAWAL
          marginAsset,
        }),
      });

      const json = await res.json();

      if (json.status) {
        setHistory(json.data?.data || []);
        setTotalCount(json.data?.totalCount || 0);
        setHasMore(Boolean(json.data?.hasMore));
        setCurrentPage(json.data?.page || page);
      } else {
        console.error(json.message);
        setHistory([]);
        setTotalCount(0);
        setHasMore(false);
      }
    } catch (err) {
      console.error("History fetch failed:", err);
      setHistory([]);
      setTotalCount(0);
      setHasMore(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Deposit ───────────────────────────────────────────────────────
  const handleDeposit = async () => {
    if (!amount || !userId) return;
    setActionLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(DEPOSIT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userId,
          amount: parseFloat(amount),
        }),
      });
      const json = await res.json();

      if (json.status) {
        setSuccessMsg(`Deposited ${fmtINR(amount)} successfully`);
        setAmount("");
        loadWalletData();
        refreshBalance();
        if (activeTab === "history") fetchHistory(1);
      } else {
        setError(json.message || "Deposit failed");
      }
    } catch {
      setError("Deposit failed");
    } finally {
      setActionLoading(false);
      setTimeout(() => {
        setSuccessMsg("");
        setError("");
      }, 3000);
    }
  };

  // ── Withdraw ──────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    if (!amount || !userId) return;
    setActionLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(WITHDRAW_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userId,
          amount: parseFloat(amount),
        }),
      });
      const json = await res.json();

      if (json.status) {
        setSuccessMsg(`Withdrawn ${fmtINR(amount)} successfully`);
        setAmount("");
        loadWalletData();
        refreshBalance();
        if (activeTab === "history") fetchHistory(1);
      } else {
        setError(json.message || "Withdrawal failed");
      }
    } catch {
      setError("Withdrawal failed");
    } finally {
      setActionLoading(false);
      setTimeout(() => {
        setSuccessMsg("");
        setError("");
      }, 3000);
    }
  };

  // Load wallet once userId is available
  useEffect(() => {
    if (userId) {
      loadWalletData();
    }
  }, [userId]);

  // Load history whenever the History tab becomes active
  useEffect(() => {
    if (userId && activeTab === "history") {
      fetchHistory(1);
    }
  }, [userId, activeTab]);

  if (loading) {
    return (
      <div style={{ color: T.muted, padding: 40, fontFamily: T.mono }}>
        Loading Wallet...
      </div>
    );
  }

  const totalBal = parseFloat(wallet.totalBalance || wallet.withdrawableBalance || 0);
  const withdrawableBal = parseFloat(wallet.withdrawableBalance || 0);
  const marginBal = parseFloat(wallet.marginBalance || 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / HISTORY_LIMIT));

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
          <StatCard
            label="TOTAL BALANCE"
            value={fmtINR(totalBal)}
            sub="Available for Trading"
            subColor={T.green}
          />
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
          {/* Tabs Header */}
          <div
            style={{
              background: "#080b12",
              borderBottom: `1px solid ${T.border}`,
              padding: "0 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: 4 }}>
              <InnerTab
                label="TRANSFER IN"
                active={activeTab === "deposit"}
                onClick={() => setActiveTab("deposit")}
              />
              <InnerTab
                label="TRANSFER OUT"
                active={activeTab === "withdraw"}
                onClick={() => setActiveTab("withdraw")}
              />
              <InnerTab
                label="HISTORY"
                active={activeTab === "history"}
                onClick={() => setActiveTab("history")}
              />
            </div>

            <button
              onClick={() => {
                loadWalletData();
                if (activeTab === "history") fetchHistory(currentPage);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: T.muted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
              }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* Deposit Tab */}
          {activeTab === "deposit" && (
            <div style={{ padding: "28px 32px", maxWidth: 440 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 18 }}>
                DEPOSIT INR TO FUTURES WALLET
              </div>
              <AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} />

              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {[1000, 5000, 10000, 50000].map((q) => (
                  <button
                    key={q}
                    onClick={() => setAmount(q)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 5,
                      border: `1px solid ${T.border}`,
                      background: "transparent",
                      color: T.muted,
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    +{q / 1000}K
                  </button>
                ))}
              </div>

              <button
                onClick={handleDeposit}
                disabled={actionLoading || !amount}
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: 7,
                  border: "none",
                  background: !amount || actionLoading ? "rgba(34,197,94,0.25)" : T.green,
                  color: !amount || actionLoading ? "rgba(255,255,255,0.3)" : "#000",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                }}
              >
                {actionLoading ? "Processing..." : "TRANSFER IN"}
              </button>
            </div>
          )}

          {/* Withdraw Tab */}
          {activeTab === "withdraw" && (
            <div style={{ padding: "28px 32px", maxWidth: 440 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
                WITHDRAW INR FROM FUTURES WALLET
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 18 }}>
                Available:{" "}
                <span style={{ color: T.green, fontWeight: 700 }}>
                  {fmtINR(withdrawableBal)}
                </span>
              </div>

              <AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} />

              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <button
                  onClick={() => setAmount(withdrawableBal)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 5,
                    border: `1px solid ${T.border}`,
                    background: "transparent",
                    color: T.muted,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  MAX
                </button>
              </div>

              <button
                onClick={handleWithdraw}
                disabled={actionLoading || !amount}
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: 7,
                  border: "none",
                  background: !amount || actionLoading ? "rgba(239,68,68,0.2)" : T.red,
                  color: !amount || actionLoading ? "rgba(255,255,255,0.3)" : "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                }}
              >
                {actionLoading ? "Processing..." : "TRANSFER OUT"}
              </button>
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <>
              <div
                style={{
                  padding: "10px 16px",
                  fontSize: 11,
                  color: T.muted,
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                {totalCount} transaction{totalCount === 1 ? "" : "s"} total
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      background: "#080b12",
                      borderBottom: `1px solid ${T.border}`,
                    }}
                  >
                    {["Type", "Amount", "Status", "Date"].map((h, i) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 16px",
                          textAlign: i === 0 ? "left" : "center",
                          fontSize: 11,
                          fontWeight: 700,
                          color: T.muted,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: "48px", textAlign: "center", color: T.muted }}>
                        Loading transactions...
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: "48px", textAlign: "center", color: T.muted }}>
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    history.map((tx, i) => {
                      const isDeposit = tx.type === "DEPOSIT";

                      return (
                        <tr
                          key={tx.referenceId || tx.orderId || i}
                          style={{ borderBottom: `1px solid ${T.border}` }}
                        >
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 6,
                                  background: isDeposit
                                    ? "rgba(34,197,94,0.12)"
                                    : "rgba(239,68,68,0.12)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {isDeposit ? (
                                  <ArrowDownRight size={14} color={T.green} />
                                ) : (
                                  <ArrowUpRight size={14} color={T.red} />
                                )}
                              </div>

                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                                  {tx.type}
                                </div>
                                <div style={{ fontSize: 11, color: T.muted }}>{tx.asset}</div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: "14px 16px", textAlign: "center" }}>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: isDeposit ? T.green : T.red,
                              }}
                            >
                              {isDeposit ? "+" : "-"}
                              {fmtINR(Math.abs(Number(tx.amount)))}
                            </span>
                          </td>

                          <td style={{ padding: "14px 16px", textAlign: "center" }}>
                            <span
                              style={{
                                fontSize: 11,
                                padding: "3px 9px",
                                borderRadius: 4,
                                background:
                                  tx.status === "SUCCESS"
                                    ? "rgba(34,197,94,0.12)"
                                    : "rgba(239,68,68,0.12)",
                                color: tx.status === "SUCCESS" ? T.green : T.red,
                              }}
                            >
                              {tx.status}
                            </span>
                          </td>

                          <td
                            style={{
                              padding: "14px 16px",
                              textAlign: "center",
                              fontSize: 12,
                              color: T.muted,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tx.date}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              <div
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: `1px solid ${T.border}`,
                }}
              >
                <button
                  onClick={() => fetchHistory(currentPage - 1)}
                  disabled={currentPage === 1 || historyLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: `1px solid ${T.border}`,
                    background: "transparent",
                    color: currentPage === 1 ? T.muted : T.text,
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span style={{ fontSize: 12, color: T.muted }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => fetchHistory(currentPage + 1)}
                  disabled={!hasMore || historyLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: `1px solid ${T.border}`,
                    background: "transparent",
                    color: !hasMore ? T.muted : T.text,
                    cursor: !hasMore ? "not-allowed" : "pointer",
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast Messages */}
      {successMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            background: T.green,
            color: "#000",
            padding: "12px 24px",
            borderRadius: 8,
            fontWeight: 700,
          }}
        >
          {successMsg}
        </div>
      )}
      {error && (
        <div
          style={{
            position: "fixed",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            background: T.red,
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 8,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default FuturesWallet;