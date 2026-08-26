import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_ORDERS = [
  { id: 101, pair: 'LIGHT/INR', exchange: 'CoinSwitchX', type: 'Limit', side: 'Buy', quantity: 8.93, orderValue: 199.94, limitPrice: 22.30, status: '0% Executed', lockedAmount: 199.94, createdAt: '2026-02-18T11:28:37' },
  { id: 102, pair: 'OM/INR', exchange: 'CoinSwitchX', type: 'Limit', side: 'Buy', quantity: 30, orderValue: 0.00, limitPrice: 5.00, status: '0% Executed', lockedAmount: 0.00, createdAt: '2026-02-15T13:28:24' },
];

// ── Coin icon ─────────────────────────────────────────────────────────────────
const getCoinIcon = (pair) => {
  const base = pair.split('/')[0].toLowerCase();
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${base}.png`;
};

const CoinIcon = ({ pair }) => {
  const [err, setErr] = useState(false);
  const base = pair.split('/')[0];
  
  if (!err) {
    return (
      <img
        src={getCoinIcon(pair)}
        alt={base}
        onError={() => setErr(true)}
        style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }}
      />
    );
  }
  
  const hash = base.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const colors = ['#f97316', '#3b82f6', '#a855f7', '#22c55e', '#eab308', '#ec4899'];
  const bg = colors[hash % colors.length];
  
  return (
    <div style={{
      width: 24, height: 24, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0,
    }}>
      {base.slice(0, 2)}
    </div>
  );
};

// ── Format helpers ────────────────────────────────────────────────────────────
const fmt = (n) => n ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00';

// ── Main Component ────────────────────────────────────────────────────────────
const OpenOrders = ({ searchQuery = '' }) => {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filter
  const filtered = useMemo(() => {
    if (!searchQuery) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(o => o.pair.toLowerCase().includes(q) || o.exchange.toLowerCase().includes(q));
  }, [orders, searchQuery]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  // Cancel order
  const handleCancel = (id) => {
    if (window.confirm('Cancel this order?')) {
      setOrders(prev => prev.filter(o => o.id !== id));
    }
  };

  // Group by date
  const grouped = useMemo(() => {
    const map = {};
    paginated.forEach(o => {
      const date = new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      if (!map[date]) map[date] = [];
      map[date].push(o);
    });
    return map;
  }, [paginated]);

  return (
    <div style={{
      fontFamily: "'DM Mono','JetBrains Mono',monospace",
      color: '#e5e7eb',
    }}>
      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: '#0a0e13', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>PAIR</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>EXCHANGE</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>ORDER TYPE</th>
              <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>BUY/SELL</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>QUANTITY</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>ORDER VALUE</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>LIMIT PRICE</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>STATUS</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>LOCKED AMT</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>CREATED AT</th>
              <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(grouped).length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: '#4b5563', fontSize: 13 }}>
                  No open orders
                </td>
              </tr>
            ) : (
              Object.entries(grouped).map(([date, rows]) => (
                <React.Fragment key={date}>
                  {/* Date separator */}
                  <tr>
                    <td colSpan={11} style={{ 
                      padding: '12px 16px', background: '#060810', 
                      fontSize: 11, fontWeight: 600, color: '#6b7280',
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      {date}
                    </td>
                  </tr>
                  {rows.map((order) => (
                    <tr
                      key={order.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Pair */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CoinIcon pair={order.pair} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb' }}>
                            {order.pair.split('/')[0]}
                            <span style={{ color: '#4b5563', fontWeight: 400 }}>/{order.pair.split('/')[1]}</span>
                          </span>
                        </div>
                      </td>
                      {/* Exchange */}
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af' }}>
                        {order.exchange}
                      </td>
                      {/* Order Type */}
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af' }}>
                        {order.type}
                      </td>
                      {/* Buy/Sell */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                          background: order.side === 'Buy' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          color: order.side === 'Buy' ? '#22c55e' : '#ef4444',
                          border: order.side === 'Buy' ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)',
                        }}>
                          {order.side}
                        </span>
                      </td>
                      {/* Quantity */}
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#d1d5db', textAlign: 'right', fontWeight: 600 }}>
                        {order.quantity}
                      </td>
                      {/* Order Value */}
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#d1d5db', textAlign: 'right', fontWeight: 600 }}>
                        {fmt(order.orderValue)}
                      </td>
                      {/* Limit Price */}
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af', textAlign: 'right' }}>
                        {order.limitPrice ? fmt(order.limitPrice) : '--'}
                      </td>
                      {/* Status */}
                      <td style={{ padding: '12px 16px', fontSize: 11, color: '#6b7280' }}>
                        {order.status}
                      </td>
                      {/* Locked Amount */}
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#d1d5db', textAlign: 'right', fontWeight: 600 }}>
                        {fmt(order.lockedAmount)}
                      </td>
                      {/* Created At */}
                      <td style={{ padding: '12px 16px', fontSize: 11, color: '#6b7280', textAlign: 'right' }}>
                        {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </td>
                      {/* Cancel button */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleCancel(order.id)}
                          style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            color: '#ef4444',
                            padding: '4px 8px',
                            borderRadius: 5,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            margin: '0 auto',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.05)',
          marginTop: 8,
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              background: page === 1 ? 'transparent' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${page === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(245,158,11,0.25)'}`,
              color: page === 1 ? '#374151' : '#f59e0b',
              padding: '6px 12px', borderRadius: 6, cursor: page === 1 ? 'default' : 'pointer',
              fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            Page <span style={{ color: '#f59e0b', fontWeight: 700 }}>{page}</span> of {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              background: page === totalPages ? 'transparent' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${page === totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(245,158,11,0.25)'}`,
              color: page === totalPages ? '#374151' : '#f59e0b',
              padding: '6px 12px', borderRadius: 6, cursor: page === totalPages ? 'default' : 'pointer',
              fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default OpenOrders;