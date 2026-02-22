import { useState, useEffect } from "react";
import { aiService } from "../services/aiService";
import { tradeService } from "../services/tradeService";
import { aiInsights as mockInsights } from "../data/mockData";

function AIInsights() {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [insights, setInsights] = useState([]);
  const [trades, setTrades] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportContent, setReportContent] = useState(null);

  useEffect(() => {
    const fetchAIInsights = async () => {
      try {
        setInsightsLoading(true);
        
        // Fetch AI insights from backend
        const insightsResponse = await aiService.getInsights();
        console.log('AI insights response:', insightsResponse);
        
        // Fetch actual trades from backend
        const tradesResponse = await tradeService.getAllTrades();
        const actualTrades = tradesResponse.data || tradesResponse.trades || [];
        console.log('Trades response:', actualTrades);
        
        // Process trades to include AI analysis data
        const processedTrades = actualTrades.map(trade => ({
          ...trade,
          id: trade._id || trade.id,
          aiScore: trade.aiAnalysis?.qualityScore || null,
          aiAnalysis: trade.aiAnalysis || null
        }));
        
        setInsights(insightsResponse.insights || mockInsights);
        setTrades(processedTrades);
      } catch (err) {
        console.error('Failed to fetch AI insights:', err);
        setError('Failed to load AI insights');
        
        // Set fallback data
        setInsights(mockInsights);
        setTrades([]);
      } finally {
        setInsightsLoading(false);
      }
    };

    fetchAIInsights();
    
    // Make refresh function available globally
    window.refreshAIInsights = fetchAIInsights;
    
    // Cleanup
    return () => {
      delete window.refreshAIInsights;
    };
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

  const refreshData = async () => {
    setInsightsLoading(true);
    try {
      // Fetch AI insights from backend
      const insightsResponse = await aiService.getInsights();
      console.log('AI insights response:', insightsResponse);
      
      // Fetch actual trades from backend
      const tradesResponse = await tradeService.getAllTrades();
      const actualTrades = tradesResponse.data || tradesResponse.trades || [];
      console.log('Trades response:', actualTrades);
      
      // Process trades to include AI analysis data
      const processedTrades = actualTrades.map(trade => ({
        ...trade,
        id: trade._id || trade.id,
        aiScore: trade.aiAnalysis?.qualityScore || null,
        aiAnalysis: trade.aiAnalysis || null
      }));
      
      setInsights(insightsResponse.insights || []);
      setTrades(processedTrades);
      setError(null);
    } catch (err) {
      console.error('Failed to refresh data:', err);
      setError('Failed to refresh data');
    } finally {
      setInsightsLoading(false);
    }
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
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Analyzing 75 trades...</span>
          </div>
        )}
        {generated && !loading && reportContent && (
          <div style={{ marginTop: 20, padding: 20, background: "var(--surface2)", borderRadius: 12, border: "1px solid rgba(0,212,170,0.15)", fontSize: 14, lineHeight: 1.8, color: "var(--text)" }}>
            <div style={{ whiteSpace: "pre-line" }}>
              {reportContent}
            </div>
          </div>
        )}
        {error && (
          <div style={{ marginTop: 20, padding: 16, background: "rgba(239,68,68,0.1)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 14 }}>
            {error}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div><div className="card-title">Behavioral Flags</div><div className="card-sub">AI-detected patterns this month</div></div>
          <span className="badge badge-purple">ELITE</span>
        </div>
        <div className="insights-grid">
          {insights.map((ins, i) => (
            <div key={i} className={`insight-card insight-${ins.type}`}>
              <div className="insight-header">
                <span className="insight-icon">{ins.icon}</span>
                <span className="insight-title">{ins.title}</span>
              </div>
              <div className="insight-desc">{ins.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: "16px" }}>Trade Quality Scores</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {trades.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", width: "60px" }}>{t.symbol}</span>
                <div style={{ flex: 1, height: "6px", background: "var(--border)", borderRadius: "4px" }}>
                  <div style={{ width: `${(t.aiScore || t.aiAnalysis?.qualityScore || 8) * 10}%`, height: "100%", borderRadius: "4px", background: (t.aiScore || t.aiAnalysis?.qualityScore || 8) >= 7 ? "#00d4aa" : (t.aiScore || t.aiAnalysis?.qualityScore || 8) >= 5 ? "#f59e0b" : "#ef4444" }} />
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: (t.aiScore || t.aiAnalysis?.qualityScore || 8) >= 7 ? "var(--accent)" : (t.aiScore || t.aiAnalysis?.qualityScore || 8) >= 5 ? "var(--accent3)" : "var(--red)", width: "28px", textAlign: "right" }}>{t.aiScore || t.aiAnalysis?.qualityScore || 8}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: "16px" }}>Psychology Scores</div>
          {[
            { label: "Overtrading Risk", val: 32, color: "#00d4aa" },
            { label: "FOMO Susceptibility", val: 58, color: "#f59e0b" },
            { label: "Revenge Trading Risk", val: 44, color: "#f59e0b" },
            { label: "Emotional Discipline", val: 71, color: "#00d4aa" },
            { label: "Strategy Adherence", val: 84, color: "#00d4aa" },
          ].map((p, i) => (
            <div key={i} style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>{p.label}</span>
                <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: p.color }}>{p.val}%</span>
              </div>
              <div style={{ height: "6px", background: "var(--border)", borderRadius: "4px" }}>
                <div style={{ width: `${p.val}%`, height: "100%", borderRadius: "4px", background: p.color, transition: "width 1s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AIInsights;
