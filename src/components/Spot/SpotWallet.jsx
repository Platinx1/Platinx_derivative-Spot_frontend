import React, { useState, useEffect } from "react";
import {
    ChevronLeft,
    ChevronRight,
    ArrowDownRight,
    ArrowUpRight,
    RefreshCw,
} from "lucide-react";
import { useUser } from "../../context/UserContext";
import { useTradingContext } from "../../context/TradingContext";

// ─── APIs ────────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const WALLET_API = `${BASE_URL}/api/spot/wallet-balance`;
const HISTORY_API = `${BASE_URL}/api/spot/deposit-withdraw-history`;
const DEPOSIT_API = `${BASE_URL}/api/spot/deposit-inr`;
const WITHDRAW_API = `${BASE_URL}/api/spot/withdraw-inr`;

const HISTORY_LIMIT = 20;

// ─── Design tokens ───────────────────────────────────────────────────────────
const T = {
    surface: "#131A28",
    border: "rgba(255,255,255,0.06)",
    green: "#22C55E",
    red: "#EF4444",
    text: "#F8FAFC",
    muted: "#94A3B8",
    accent: "#7B2FF7",
    accentSoft: "rgba(123,47,247,0.15)",
    mono: "'Inter', sans-serif",
};

const fmtINR = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

// ─── Sub Components ──────────────────────────────────────────────────────────
const StatCard = ({ label, value }) => (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "20px" }}>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.green }}>{value}</div>
    </div>
);

const InnerTab = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        style={{
            padding: "8px 20px",
            borderRadius: 6,
            background: active ? T.accentSoft : "transparent",
            color: active ? T.accent : T.muted,
            fontWeight: 700,
            fontSize: 12,
            borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
        }}
    >
        {label}
    </button>
);

const AmountInput = ({ value, onChange }) => (
    <div style={{ position: "relative", marginBottom: 14 }}>
        <style>{`
            /* Remove native browser up/down arrows from number input */
            input[type=number]::-webkit-inner-spin-button, 
            input[type=number]::-webkit-outer-spin-button { 
                -webkit-appearance: none; 
                margin: 0; 
            }
            input[type=number] {
                -moz-appearance: textfield;
            }
        `}</style>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.muted, fontSize: 15, fontWeight: 700 }}>₹</span>
        <input
            type="number"
            value={value}
            onChange={onChange}
            onWheel={(e) => e.target.blur()} // Prevents mouse wheel scrolling from altering the input value
            placeholder="0.00"
            min="0"
            step="any"
            style={{
                width: "100%",
                background: "#080b12",
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: "13px 14px 13px 28px",
                fontSize: 16,
                color: T.text,
                outline: "none",
            }}
        />
    </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const SpotWallet = () => {
    const { userId, refreshBalance } = useUser();
    const { walletRefresh } = useTradingContext();

    const [availableBalance, setAvailableBalance] = useState(0);
    const [history, setHistory] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("deposit");
    const [amount, setAmount] = useState("");
    const [selectedPct, setSelectedPct] = useState(null);
    const [successMsg, setSuccessMsg] = useState("");
    const [error, setError] = useState("");

    const loadWalletData = async (isInitial = false) => {
        if (!userId) return setError("User ID not found");
        if (isInitial) setLoading(true);
        try {
            const res = await fetch(`${WALLET_API}?user=${userId}`);
            const json = await res.json();
            const walletData = json.data?.data || json.data || json;

            if (json.status || json.success) {
                const spotBal = walletData?.availableForSpot
                    ?? walletData?.freeBalance
                    ?? walletData?.balance
                    ?? 0;

                setAvailableBalance(Number(spotBal));
            } else {
                setError(json.message || "Failed to load wallet");
            }
        } catch (err) {
            console.error(err);
            setError("Network error");
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const fetchHistory = async (page = 1) => {
        if (!userId) return;
        setHistoryLoading(true);

        const params = new URLSearchParams({
            user: userId,
            page: page.toString(),
            limit: HISTORY_LIMIT.toString(),
            marginAsset: "INR",
        });

        try {
            const res = await fetch(`${HISTORY_API}?${params}`);
            const json = await res.json();

            if (json.status || json.success) {
                setHistory(json.data || []);
                setTotalCount(json.total || 0);
                setCurrentPage(json.currentPage || page);
                setHasMore((json.currentPage || page) < (json.totalPages || 1));
            } else {
                setHistory([]);
            }
        } catch (err) {
            console.error(err);
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleAmountChange = (e) => {
        setAmount(e.target.value);
        setSelectedPct(null);
    };

    const handlePercentageClick = (percentage) => {
        if (selectedPct === percentage) {
            setSelectedPct(null);
            setAmount("");
        } else {
            setSelectedPct(percentage);
            const calculatedAmount = ((availableBalance * percentage) / 100).toFixed(2);
            setAmount(calculatedAmount);
        }
    };

    const handlePresetDepositClick = (preset) => {
        if (selectedPct === preset) {
            setSelectedPct(null);
            setAmount("");
        } else {
            setSelectedPct(preset);
            setAmount(preset.toString());
        }
    };

    const handleDeposit = async () => {
        if (!amount || parseFloat(amount) <= 0) return setError("Enter valid amount");
        setActionLoading(true);
        setError("");
        setSuccessMsg("");

        try {
            const res = await fetch(DEPOSIT_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: userId, amount: parseFloat(amount) }),
            });
            const json = await res.json();

            if (json.status || json.success) {
                setSuccessMsg(`✅ Deposited ${fmtINR(amount)} successfully`);
                setAmount("");
                setSelectedPct(null);
                loadWalletData();
                refreshBalance?.();
                if (activeTab === "history") fetchHistory(1);
            } else {
                setError(json.message || "Deposit failed");
            }
        } catch (err) {
            setError("Network error");
        } finally {
            setActionLoading(false);
            setTimeout(() => { setSuccessMsg(""); setError(""); }, 4000);
        }
    };

    const handleWithdraw = async () => {
        const entered = parseFloat(amount);
        if (!entered || entered <= 0) return setError("Enter valid amount");

        if (entered > availableBalance) {
            setError(`Insufficient balance. Available: ${fmtINR(availableBalance)}`);
            return;
        }

        setActionLoading(true);
        setError("");
        setSuccessMsg("");

        try {
            const res = await fetch(WITHDRAW_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user: userId, amount: entered }),
            });
            const json = await res.json();

            if (json.status || json.success) {
                setSuccessMsg(`✅ Withdrawn ${fmtINR(entered)} successfully`);
                setAmount("");
                setSelectedPct(null);
                loadWalletData();
                refreshBalance?.();
                if (activeTab === "history") fetchHistory(1);
            } else {
                setError(json.message || "Withdrawal failed");
            }
        } catch (err) {
            console.error(err);
            setError("Network error");
        } finally {
            setActionLoading(false);
            setTimeout(() => { setSuccessMsg(""); setError(""); }, 4000);
        }
    };

    useEffect(() => {
        if (userId) loadWalletData(true);
        const interval = setInterval(() => {
            if (userId) loadWalletData(false);
        }, 3000);
        return () => clearInterval(interval);
    }, [userId, walletRefresh]);

    useEffect(() => {
        if (userId && activeTab === "history") fetchHistory(1);
    }, [userId, activeTab]);

    if (loading) return <div style={{ padding: 40, color: T.muted }}>Loading Wallet...</div>;

    return (
        <div style={{ fontFamily: T.mono, padding: "20px" }}>
            <div style={{ display: "flex", gap: 20 }}>
                <div style={{ width: 260 }}>
                    <StatCard
                        label="AVAILABLE SPOT BALANCE"
                        value={fmtINR(availableBalance)}
                    />
                </div>

                <div style={{ flex: 1, background: T.surface, borderRadius: 8, border: `1px solid ${T.border}` }}>
                    <div style={{ background: "#080b12", padding: "0 16px", display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ display: "flex", gap: 4 }}>
                            <InnerTab label="TRANSFER IN" active={activeTab === "deposit"} onClick={() => { setActiveTab("deposit"); setAmount(""); setSelectedPct(null); }} />
                            <InnerTab label="TRANSFER OUT" active={activeTab === "withdraw"} onClick={() => { setActiveTab("withdraw"); setAmount(""); setSelectedPct(null); }} />
                            <InnerTab label="HISTORY" active={activeTab === "history"} onClick={() => setActiveTab("history")} />
                        </div>
                        <button onClick={() => { loadWalletData(); if (activeTab === "history") fetchHistory(currentPage); }} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}>
                            <RefreshCw size={16} />
                        </button>
                    </div>

                    {/* Deposit Tab */}
                    {activeTab === "deposit" && (
                        <div style={{ padding: "28px 32px", maxWidth: 440 }}>
                            <div style={{ fontSize: 11, color: T.muted, marginBottom: 18 }}>DEPOSIT INR TO SPOT WALLET</div>
                            <AmountInput value={amount} onChange={handleAmountChange} />

                            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                                {[1000, 5000, 10000, 50000].map((q) => {
                                    const isSelected = selectedPct === q;
                                    return (
                                        <button
                                            key={q}
                                            onClick={() => handlePresetDepositClick(q)}
                                            style={{
                                                flex: 1,
                                                padding: "6px 12px",
                                                border: `1px solid ${isSelected ? T.accent : T.border}`,
                                                borderRadius: 6,
                                                background: isSelected ? T.accentSoft : "transparent",
                                                color: isSelected ? T.accent : T.muted,
                                                fontWeight: isSelected ? 700 : 400,
                                                cursor: "pointer",
                                                transition: "all 0.15s ease",
                                            }}
                                        >
                                            +{q / 1000}K
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={handleDeposit}
                                disabled={actionLoading || !amount}
                                style={{ width: "100%", padding: "14px", borderRadius: 8, border: "none", background: T.green, color: "#000", fontWeight: 700, cursor: actionLoading || !amount ? "not-allowed" : "pointer", opacity: actionLoading || !amount ? 0.6 : 1 }}
                            >
                                {actionLoading ? "Processing..." : "TRANSFER IN"}
                            </button>
                        </div>
                    )}

                    {/* Withdraw Tab */}
                    {activeTab === "withdraw" && (
                        <div style={{ padding: "28px 32px", maxWidth: 440 }}>
                            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>WITHDRAW INR FROM SPOT WALLET</div>
                            <div style={{ fontSize: 15, color: T.green, fontWeight: 700, marginBottom: 20 }}>
                                Available: {fmtINR(availableBalance)}
                            </div>
                            <AmountInput value={amount} onChange={handleAmountChange} />

                            {/* Dynamic Percentage Buttons */}
                            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                                {[25, 50, 75, 100].map((pct) => {
                                    const isSelected = selectedPct === pct;
                                    return (
                                        <button
                                            key={pct}
                                            onClick={() => handlePercentageClick(pct)}
                                            disabled={availableBalance <= 0}
                                            style={{
                                                flex: 1,
                                                padding: "6px 12px",
                                                border: `1px solid ${isSelected ? T.accent : T.border}`,
                                                borderRadius: 6,
                                                background: isSelected ? T.accentSoft : "transparent",
                                                color: isSelected ? T.accent : T.muted,
                                                fontWeight: isSelected ? 700 : 400,
                                                cursor: availableBalance <= 0 ? "not-allowed" : "pointer",
                                                transition: "all 0.15s ease",
                                            }}
                                        >
                                            {pct}%
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={handleWithdraw}
                                disabled={actionLoading || !amount}
                                style={{ width: "100%", padding: "14px", borderRadius: 8, border: "none", background: T.red, color: "#fff", fontWeight: 700, cursor: actionLoading || !amount ? "not-allowed" : "pointer", opacity: actionLoading || !amount ? 0.6 : 1 }}
                            >
                                {actionLoading ? "Processing..." : "TRANSFER OUT"}
                            </button>
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === "history" && (
                        <>
                            <div style={{ padding: "12px 16px", fontSize: 12, color: T.muted, borderBottom: `1px solid ${T.border}` }}>
                                {totalCount} transactions
                            </div>

                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#080b12" }}>
                                        {["Type", "Amount", "Status", "Date"].map((h, i) => (
                                            <th key={i} style={{ padding: "12px 16px", textAlign: i === 0 ? "left" : "center", fontSize: 11, color: T.muted }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyLoading ? (
                                        <tr><td colSpan="4" style={{ textAlign: "center", padding: 60, color: T.muted }}>Loading transactions...</td></tr>
                                    ) : history.length === 0 ? (
                                        <tr><td colSpan="4" style={{ textAlign: "center", padding: 60, color: T.muted }}>No transactions found</td></tr>
                                    ) : (
                                        history.map((tx) => {
                                            const isDeposit = tx.type === "DEPOSIT";
                                            const amt = tx.amount?.$numberDecimal ?? tx.amount ?? 0;
                                            const date = new Date(tx.coinswitchTransactionTime || tx.createdAt).toLocaleString("en-IN", {
                                                day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                                            });

                                            return (
                                                <tr key={tx._id} style={{ borderBottom: `1px solid ${T.border}` }}>
                                                    <td style={{ padding: "14px 16px" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                            <div style={{ width: 28, height: 28, borderRadius: 6, background: isDeposit ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                {isDeposit ? <ArrowDownRight size={14} color={T.green} /> : <ArrowUpRight size={14} color={T.red} />}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 600 }}>{tx.type}</div>
                                                                <div style={{ fontSize: 12, color: T.muted }}>{tx.asset}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: "center", fontWeight: 700, color: isDeposit ? T.green : T.red }}>
                                                        {isDeposit ? "+" : "-"}{fmtINR(amt)}
                                                    </td>
                                                    <td style={{ textAlign: "center" }}>
                                                        <span style={{ padding: "4px 10px", borderRadius: 4, background: tx.status === "SUCCESS" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: tx.status === "SUCCESS" ? T.green : T.red, fontSize: 11 }}>
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: "center", fontSize: 12, color: T.muted }}>{date}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>

                            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <button onClick={() => fetchHistory(currentPage - 1)} disabled={currentPage === 1} style={{ cursor: "pointer" }}>← Prev</button>
                                <span>Page {currentPage}</span>
                                <button onClick={() => fetchHistory(currentPage + 1)} disabled={!hasMore} style={{ cursor: "pointer" }}>Next →</button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Toast Messages */}
            {successMsg && <div style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: T.green, color: "#000", padding: "12px 24px", borderRadius: 8 }}>{successMsg}</div>}
            {error && <div style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: T.red, color: "#fff", padding: "12px 24px", borderRadius: 8 }}>{error}</div>}
        </div>
    );
};

export default SpotWallet;