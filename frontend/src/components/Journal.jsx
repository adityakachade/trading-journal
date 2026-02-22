import { useState, useEffect } from "react";
import { tradeService } from "../services/tradeService";
import { aiService } from "../services/aiService";
import { trades as mockTrades } from "../data/mockData";
import "../styles/styles.css";

function Journal({ onAddTrade }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        setLoading(true);
        const response = await tradeService.getAllTrades();
        const tradesData = response.data || response.trades || [];
        console.log('Fetched trades:', tradesData);
        console.log('Trade with screenshot:', tradesData.find(t => t.screenshotUrl));
        setTrades(tradesData);
      } catch (err) {
        console.error('Failed to fetch trades:', err);
        setTrades([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();

    // Make refresh function available globally
    window.refreshJournal = fetchTrades;

    // Cleanup
    return () => {
      delete window.refreshJournal;
    };
  }, []);

  const analyzeTrade = async (tradeId) => {
    try {
      const analysis = await aiService.getTradeAnalysis(tradeId);
      // Update the trade with AI analysis
      setTrades(prevTrades =>
        prevTrades.map(trade =>
          trade.id === tradeId || trade._id === tradeId
            ? { ...trade, aiAnalysis: analysis, aiScore: analysis.qualityScore }
            : trade
        )
      );
      // Trigger a refresh of AI insights by calling a global refresh function
      if (window.refreshAIInsights) {
        window.refreshAIInsights();
      }
    } catch (err) {
      console.error('Failed to analyze trade:', err);
    }
  };

  const filtered = filter === "ALL" ? trades : trades.filter(t => t.status === filter);

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div>Loading trades...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div>{error}</div>
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
                <th key="symbol">Symbol</th><th key="dir">Dir</th><th key="entry">Entry</th><th key="exit">Exit</th>
                <th key="pnl">PnL</th><th key="rr">R:R</th><th key="strategy">Strategy</th><th key="emotion">Emotion</th>
                <th key="ai-score">AI Score</th><th key="mistake">Mistake</th><th key="screenshot">Screenshot</th><th key="actions">Actions</th><th key="date">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                console.log('Trade data:', t.id || t._id, 'has screenshot:', !!t.screenshotUrl, 'screenshot length:', t.screenshotUrl?.length || 0);
                return (
                  <tr key={t.id || t._id || Math.random()}>
                    <td><span className="symbol">{t.symbol}</span></td>
                    <td><span className={t.direction === "LONG" ? "dir-long" : "dir-short"}>{t.direction}</span></td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{t.entryPrice?.toFixed(5) || "—"}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{t.exitPrice?.toFixed(5) || "—"}</td>
                    <td><span className={t.pnl >= 0 ? "pnl-pos" : "pnl-neg"}>{t.pnl >= 0 ? "+" : ""}${t.pnl?.toFixed(2) || "0.00"}</span></td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: (t.riskReward || 0) > 0 ? "var(--accent)" : "var(--red)" }}>{t.riskReward || "—"}</td>
                    <td><span style={{ fontSize: 12, color: "var(--muted)" }}>{t.strategy}</span></td>
                    <td><span style={{ fontSize: 12 }}>{t.emotionBefore}</span></td>
                    <td>
                      <div className="score-bar">
                        <span className={`ai-score ${(t.aiAnalysis?.qualityScore || 0) >= 7 ? "ai-high" : (t.aiAnalysis?.qualityScore || 0) >= 5 ? "ai-mid" : "ai-low"}`}>{t.aiAnalysis?.qualityScore || "—"}</span>
                        <div className="score-bg"><div className="score-fill" style={{ width: `${(t.aiAnalysis?.qualityScore || 0) * 10}%` }} /></div>
                      </div>
                    </td>
                    <td>{t.mistakeTag ? <span className="mistake-tag">{t.mistakeTag}</span> : <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>}</td>
                    <td>
                      {t.screenshotUrl ? (
                        <div style={{ position: 'relative' }}>
                          <img
                            src={t.screenshotUrl}
                            alt="Trade screenshot"
                            style={{
                              width: "40px",
                              height: "40px",
                              objectFit: "cover",
                              borderRadius: "4px",
                              cursor: "pointer",
                              border: "1px solid var(--border)"
                            }}
                            onClick={() => {
                              const modal = document.createElement('div');
                              modal.style.cssText = `
                              position: fixed;
                              top: 0;
                              left: 0;
                              width: 100%;
                              height: 100%;
                              background: rgba(0,0,0,0.8);
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              z-index: 10000;
                              cursor: pointer;
                            `;
                              modal.innerHTML = `
                              <img src="${t.screenshotUrl}" style="max-width: 90%; max-height: 90%; object-fit: contain; border-radius: 8px;" />
                            `;
                              modal.onclick = () => document.body.removeChild(modal);
                              document.body.appendChild(modal);
                            }}
                          />
                        </div>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        onClick={() => analyzeTrade(t.id || t._id)}
                        style={{ fontSize: "11px", padding: "4px 8px" }}
                      >
                        🤖 Analyze
                      </button>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(t.tradeDate).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Journal;
