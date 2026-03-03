import { useState, useEffect } from "react";
import { aiService } from "../services/aiService";
import { tradeService } from "../services/tradeService";
import { authService } from "../services/authService";
import { aiInsights as mockInsights } from "../data/mockData";

function AIInsights({ onNavigate }) {
  const user = authService.getCurrentUser();
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [insights, setInsights] = useState([]);
  const [trades, setTrades] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportContent, setReportContent] = useState(null);
  const [behaviorSummary, setBehaviorSummary] = useState(null);

  useEffect(() => {
    const fetchAIInsights = async () => {
      try {
        setInsightsLoading(true);

        // Fetch AI insights from backend
        const insightsResponse = await aiService.getInsights();

        // Fetch behavior summary
        const behaviorResponse = await aiService.getBehaviorSummary();
        setBehaviorSummary(behaviorResponse);

        // Fetch actual trades from backend
        const tradesResponse = await tradeService.getAllTrades();
        const actualTrades = tradesResponse.data || tradesResponse.trades || [];

        // Process trades to include AI analysis data
        const processedTrades = actualTrades.map(trade => ({
          ...trade,
          id: trade._id || trade.id,
          aiScore: trade.aiAnalysis?.qualityScore || null,
          aiAnalysis: trade.aiAnalysis || null
        }));

        setInsights(insightsResponse.insights || []);
        setTrades(processedTrades);
      } catch (err) {
        console.error('Failed to fetch AI insights:', err);
        setError('Failed to load AI insights');
        setTrades([]);
      } finally {
        setInsightsLoading(false);
      }
    };

    fetchAIInsights();
  }, []);

  const generate = async () => {
    try {
      setLoading(true);
      const response = await aiService.generateReport('weekly');
      setReportContent(response.content);
      setGenerated(true);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setReportContent("Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getPsychData = () => {
    if (!behaviorSummary) return [
      { label: "Overtrading Risk", val: 0, color: "var(--muted)" },
      { label: "FOMO Susceptibility", val: 0, color: "var(--muted)" },
      { label: "Revenge Trading Risk", val: 0, color: "var(--muted)" },
      { label: "Emotional Discipline", val: 0, color: "var(--muted)" },
      { label: "Strategy Adherence", val: 0, color: "var(--muted)" },
    ];

    const { flagCounts, disciplineScore, current } = behaviorSummary;
    const totalLogs = 30; // Based on backend limit

    return [
      {
        label: "Overtrading Risk",
        val: Math.round((flagCounts.overtradingCount / totalLogs) * 100),
        color: flagCounts.overtradingCount > 5 ? "#ef4444" : "#00d4aa"
      },
      {
        label: "FOMO Susceptibility",
        val: Math.round((flagCounts.fomoCount / totalLogs) * 100),
        color: flagCounts.fomoCount > 5 ? "#ef4444" : "#00d4aa"
      },
      {
        label: "Revenge Trading Risk",
        val: Math.round((flagCounts.revengeTradeCount / totalLogs) * 100),
        color: flagCounts.revengeTradeCount > 3 ? "#ef4444" : "#00d4aa"
      },
      {
        label: "Emotional Discipline",
        val: disciplineScore,
        color: disciplineScore >= 80 ? "#00d4aa" : disciplineScore >= 60 ? "#f59e0b" : "#ef4444"
      },
      {
        label: "Current Sentiment",
        val: current?.emotionalBias ? 30 : 90,
        color: current?.emotionalBias ? "#ef4444" : "#00d4aa"
      },
    ];
  };

  if (insightsLoading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div>Loading AI insights...</div>
        </div>
      </div>
    );
  }

  if (error || trades.length === 0) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>
            {trades.length === 0 ? 'No trades found' : 'Failed to load AI insights'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--muted)', textAlign: 'center' }}>
            {trades.length === 0
              ? 'Add some trades and analyze them with AI to see insights here.'
              : 'Please try refreshing the page or contact support if the issue persists.'
            }
          </div>
          {trades.length === 0 && (
            <button
              className="btn btn-primary"
              onClick={() => window.location.href = '/journal'}
            >
              Go to Journal
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}>🤖 AI Weekly Report</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Get a deep AI-generated analysis of your trading week</div>
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={loading}>
            {loading ? "Analyzing..." : generated ? "↺ Regenerate" : "Generate Report"}
          </button>
        </div>
        {loading && (
          <div style={{ marginTop: 20, display: "flex", gap: 8, alignItems: "center" }}>
            {[0, 0.15, 0.3].map((d, i) => (
              <div key={i} style={{ width: "33%", height: 6, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg, var(--accent2), var(--accent))", borderRadius: 4, animation: `pulse ${0.8 + d}s ease infinite alternate` }} />
              </div>
            ))}
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Analyzing trades...</span>
          </div>
        )}
        {generated && !loading && reportContent && (
          <div style={{ marginTop: 20, padding: 20, background: "var(--surface2)", borderRadius: 12, border: "1px solid rgba(0,212,170,0.15)", fontSize: 14, lineHeight: 1.8, color: "var(--text)" }}>
            <div style={{ whiteSpace: "pre-line" }}>
              {reportContent}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div className="card-header">
          <div><div className="card-title">Behavioral Flags</div><div className="card-sub">AI-detected patterns this month</div></div>
          <span className="badge badge-purple">ELITE</span>
        </div>

        {user?.subscriptionTier !== "elite" ? (
          <div style={{
            marginTop: 20,
            padding: "40px 20px",
            textAlign: "center",
            background: "rgba(0,0,0,0.2)",
            borderRadius: 12,
            border: "1px dashed var(--border)"
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Elite Pattern Recognition</div>
            <div style={{ fontSize: 14, color: "var(--muted)", maxWidth: 300, margin: "0 auto 20px" }}>
              Unlock sophisticated behavioral detection to identify FOMO, revenge trading, and more.
            </div>
            <button className="btn btn-primary" onClick={() => onNavigate('billing')}>
              Upgrade to Elite
            </button>
          </div>
        ) : (
          <div className="insights-grid">
            {insights.length > 0 ? (
              insights.map((ins, i) => (
                <div key={i} className={`insight-card insight-${ins.type}`}>
                  <div className="insight-header">
                    <span className="insight-icon">{ins.icon}</span>
                    <span className="insight-title">{ins.title}</span>
                  </div>
                  <div className="insight-desc">{ins.desc}</div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                No behavioral flags detected yet. Keep trading to build your profile.
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: "16px" }}>Trade Quality Scores</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {trades.slice(0, 10).map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", width: "60px" }}>{t.symbol}</span>
                <div style={{ flex: 1, height: "6px", background: "var(--border)", borderRadius: "4px" }}>
                  <div style={{ width: `${(t.aiScore || t.aiAnalysis?.qualityScore || 0) * 10}%`, height: "100%", borderRadius: "4px", background: (t.aiScore || t.aiAnalysis?.qualityScore || 0) >= 7 ? "#00d4aa" : (t.aiScore || t.aiAnalysis?.qualityScore || 0) >= 5 ? "#f59e0b" : "#ef4444" }} />
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: (t.aiScore || t.aiAnalysis?.qualityScore || 0) >= 7 ? "var(--accent)" : (t.aiScore || t.aiAnalysis?.qualityScore || 0) >= 5 ? "var(--accent3)" : "var(--red)", width: "28px", textAlign: "right" }}>{t.aiScore || t.aiAnalysis?.qualityScore || 0}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: "16px" }}>Psychology Scores</div>
          {getPsychData().map((p, i) => (
            <div key={i} style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>{p.label}</span>
                <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: p.color }}>{p.val || 0}%</span>
              </div>
              <div style={{ height: "6px", background: "var(--border)", borderRadius: "4px" }}>
                <div style={{ width: `${p.val || 0}%`, height: "100%", borderRadius: "4px", background: p.color, transition: "width 1s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AIInsights;
