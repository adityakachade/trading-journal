import { useState, useEffect } from "react";
import { tradeService } from "../services/tradeService";
import { aiService } from "../services/aiService";
import { authService } from "../services/authService";
import "../styles/styles.css";

function Journal({ onAddTrade, onNavigate, onEditTrade, onCloneTrade }) {
  const user = authService.getCurrentUser();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const handleDelete = async (tradeId) => {
    if (window.confirm("Are you sure you want to delete this trade? This action cannot be undone.")) {
      try {
        await tradeService.deleteTrade(tradeId);
        setTrades(trades.filter(t => t._id !== tradeId && t.id !== tradeId));
        if (window.refreshDashboard) window.refreshDashboard();
      } catch (err) {
        console.error('Failed to delete trade:', err);
        alert("Failed to delete trade.");
      }
    }
  };

  const fetchTrades = async (page = 1) => {
    try {
      setLoading(true);
      const response = await tradeService.getAllTrades({ page, limit: 20 });
      const tradesData = response.trades || response.data || [];
      const paginationData = response.pagination || { page: 1, pages: 1, total: tradesData.length };

      setTrades(tradesData);
      setPagination(paginationData);
    } catch (err) {
      console.error('Failed to fetch trades:', err);
      setError("Failed to load trades. Please try refreshing.");
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
    window.refreshJournal = fetchTrades;
    return () => {
      delete window.refreshJournal;
    };
  }, []);

  const analyzeTrade = async (tradeId) => {
    try {
      const analysis = await aiService.getTradeAnalysis(tradeId);
      setTrades(prevTrades =>
        prevTrades.map(trade =>
          trade.id === tradeId || trade._id === tradeId
            ? { ...trade, aiAnalysis: analysis, aiScore: analysis.qualityScore }
            : trade
        )
      );
      if (window.refreshAIInsights) {
        window.refreshAIInsights();
      }
    } catch (err) {
      console.error('Failed to analyze trade:', err);
    }
  };

  const filtered = filter === "ALL" ? trades : trades.filter(t => t.status?.toUpperCase() === filter.toUpperCase());

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div>Loading trades...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div className="tabs">
          {["ALL", "WIN", "LOSS"].map(f => (
            <div key={f} className={`tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={onAddTrade}>+ Log Trade</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Symbol</th><th>Dir</th><th>Entry</th><th>Exit</th>
                <th>SL</th><th>TP</th>
                <th>PnL</th><th>R:R</th><th>Strategy</th><th>Emotion</th>
                <th>Psych Score</th><th>AI Score</th><th>Mistake</th><th>Screenshot</th><th>Actions</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id || t._id || Math.random()}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="symbol">{t.symbol}</span>
                      <span
                        className="status-badge"
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          ...(badgeStyles[t.status?.toLowerCase()] || badgeStyles.breakeven)
                        }}
                      >
                        {t.status?.toUpperCase() || 'TRADED'}
                      </span>
                    </div>
                  </td>
                  <td><span className={t.direction === "LONG" || t.direction === "long" ? "dir-long" : "dir-short"}>{t.direction}</span></td>
                  <td>{t.entryPrice?.toFixed(5) || "—"}</td>
                  <td>{t.exitPrice?.toFixed(5) || "—"}</td>
                  <td style={{ color: "var(--red)", fontSize: "11px" }}>{t.stopLoss?.toFixed(5) || "—"}</td>
                  <td style={{ color: "var(--accent)", fontSize: "11px" }}>{t.takeProfit?.toFixed(5) || "—"}</td>
                  <td><span className={t.pnl >= 0 ? "pnl-pos" : "pnl-neg"}>{t.pnl >= 0 ? "+" : ""}${t.pnl?.toFixed(2) || "0.00"}</span></td>
                  <td>{t.rMultiple || t.riskReward || "—"}</td>
                  <td>{t.strategy}</td>
                  <td>{t.emotionBefore}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div className="score-bg" style={{ width: "32px", height: "4px" }}>
                        <div className="score-fill" style={{ width: `${(t.psychologyScore || 5) * 10}%`, background: (t.psychologyScore || 5) >= 8 ? "var(--accent)" : (t.psychologyScore || 5) >= 5 ? "var(--accent3)" : "var(--red)" }} />
                      </div>
                      <span style={{ fontSize: 11 }}>{t.psychologyScore || 5}</span>
                    </div>
                  </td>
                  <td>
                    <div className="score-bar">
                      <span className={`ai-score ${(t.aiAnalysis?.qualityScore || 0) >= 7 ? "ai-high" : (t.aiAnalysis?.qualityScore || 0) >= 5 ? "ai-mid" : "ai-low"}`}>{t.aiAnalysis?.qualityScore || "—"}</span>
                      <div className="score-bg"><div className="score-fill" style={{ width: `${(t.aiAnalysis?.qualityScore || 0) * 10}%` }} /></div>
                    </div>
                  </td>
                  <td>{t.mistakeTag ? <span className="mistake-tag">{t.mistakeTag}</span> : "—"}</td>
                  <td>
                    {t.screenshotUrl ? (
                      <img
                        src={t.screenshotUrl}
                        alt="Trade screenshot"
                        style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px", cursor: "pointer" }}
                        onClick={() => {
                          const modal = document.createElement('div');
                          modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;`;
                          modal.innerHTML = `<img src="${t.screenshotUrl}" style="max-width: 90%; max-height: 90%; object-fit: contain;" />`;
                          modal.onclick = () => document.body.removeChild(modal);
                          document.body.appendChild(modal);
                        }}
                      />
                    ) : "—"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          if (user?.subscriptionTier === "free") {
                            onNavigate('billing');
                          } else {
                            analyzeTrade(t.id || t._id);
                          }
                        }}
                        style={{ fontSize: "11px", padding: "4px 8px" }}
                        title="AI Analysis"
                      >
                        {user?.subscriptionTier === "free" ? "🔒" : "🤖"}
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => onEditTrade(t)}
                        style={{ fontSize: "11px", padding: "4px 8px" }}
                        title="Edit Trade"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => onCloneTrade(t)}
                        style={{ fontSize: "11px", padding: "4px 8px" }}
                        title="Clone Trade"
                      >
                        📑
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => handleDelete(t.id || t._id)}
                        style={{ fontSize: "11px", padding: "4px 8px", color: "var(--red)" }}
                        title="Delete Trade"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                  <td>{new Date(t.tradeDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "20px" }}>
          <button className="btn btn-ghost" disabled={pagination.page === 1} onClick={() => fetchTrades(pagination.page - 1)}>← Previous</button>
          <span>Page {pagination.page} of {pagination.pages}</span>
          <button className="btn btn-ghost" disabled={pagination.page === pagination.pages} onClick={() => fetchTrades(pagination.page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}


// Custom Styles for Status Badges
const badgeStyles = {
  open: { background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", border: "1px solid rgba(59, 130, 246, 0.2)" },
  win: { background: "rgba(0, 212, 170, 0.1)", color: "#00d4aa", border: "1px solid rgba(0, 212, 170, 0.2)" },
  loss: { background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" },
  breakeven: { background: "rgba(100, 116, 139, 0.1)", color: "var(--muted)", border: "1px solid rgba(100, 116, 139, 0.2)" }
};

export default Journal;
