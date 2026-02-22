import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import CustomTooltip from "../utils/CustomTooltip";
import { analyticsService } from "../services/analyticsService";
import { tradeService } from "../services/tradeService";

function Analytics() {
  const [strategyData, setStrategyData] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        
        // Fetch strategy performance data
        const strategyResponse = await analyticsService.getWinRateByStrategy();
        console.log('Strategy response:', strategyResponse);
        
        // Fetch risk metrics data
        const riskResponse = await analyticsService.getRiskMetrics();
        console.log('Risk response:', riskResponse);
        
        // Fetch all trades to calculate real risk and monthly data
        const tradesResponse = await tradeService.getAllTrades();
        const trades = tradesResponse.data || tradesResponse.trades || [];
        console.log('Trades response:', trades);
        
        // Process strategy data
        const processedStrategies = (strategyResponse || []).map(s => ({
          name: s.strategy || 'Unknown',
          wr: Math.round(s.winRate || 0),
          pnl: s.totalPnl || 0,
          trades: s.totalTrades || 0
        }));
        
        // Calculate risk data from actual trades
        const processedRisk = trades
          .filter(t => t.tradeDate)
          .sort((a, b) => new Date(a.tradeDate) - new Date(b.tradeDate))
          .map((trade, index) => {
            // Calculate risk percentage based on position size and entry price
            const riskPercent = trade.positionSize && trade.entryPrice 
              ? (trade.positionSize * 100 / trade.entryPrice).toFixed(2)
              : 1.0; // Default to 1% if not calculable
            
            const date = new Date(trade.tradeDate);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            return {
              t: dateStr,
              risk: parseFloat(riskPercent)
            };
          });
        
        // Calculate monthly PnL data from actual trades
        const monthlyPnL = {};
        trades.forEach(trade => {
          if (trade.tradeDate && trade.pnl !== undefined) {
            const date = new Date(trade.tradeDate);
            const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            
            if (!monthlyPnL[monthKey]) {
              monthlyPnL[monthKey] = 0;
            }
            monthlyPnL[monthKey] += trade.pnl || 0;
          }
        });
        
        const processedMonthly = Object.entries(monthlyPnL).map(([month, pnl]) => ({
          month,
          pnl: Math.round(pnl * 100) / 100 // Convert to 2 decimal places
        }));
        
        setStrategyData(processedStrategies);
        setRiskData(processedRisk);
        setMonthlyData(processedMonthly);
      } catch (err) {
        console.error('Failed to fetch analytics data:', err);
        setError('Failed to load analytics data');
        
        // Set fallback data
        setStrategyData([
          { name: "Trend Follow", wr: 78, pnl: 2100, trades: 18 },
          { name: "Breakout", wr: 65, pnl: 980, trades: 22 },
          { name: "HTF Rejection", wr: 71, pnl: 1340, trades: 14 },
          { name: "Reversal", wr: 48, pnl: -240, trades: 12 },
          { name: "Momentum", wr: 82, pnl: 1680, trades: 9 },
        ]);
        setRiskData([
          { t: "Mar 1", risk: 1.0 }, { t: "Mar 3", risk: 1.2 }, { t: "Mar 5", risk: 0.8 },
          { t: "Mar 7", risk: 2.1 }, { t: "Mar 9", risk: 1.0 }, { t: "Mar 11", risk: 1.0 },
          { t: "Mar 13", risk: 1.5 }, { t: "Mar 15", risk: 0.5 }, { t: "Mar 17", risk: 1.0 },
          { t: "Mar 19", risk: 1.0 },
        ]);
        setMonthlyData([
          { month: "Jan", pnl: 890 }, { month: "Feb", pnl: 1240 }, { month: "Mar", pnl: 670 },
          { month: "Apr", pnl: -340 }, { month: "May", pnl: 980 }, { month: "Jun", pnl: 1560 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
    
    // Make refresh function available globally
    window.refreshAnalytics = fetchAnalyticsData;
    
    // Cleanup
    return () => {
      delete window.refreshAnalytics;
    };
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div>Loading analytics...</div>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Strategy Performance</div><div className="card-sub">Win rate by setup</div></div>
          </div>
          <div className="strategy-list">
            {strategyData.map((s, i) => (
              <div key={i} className="strategy-row">
                <div>
                  <div className="strategy-name">{s.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.trades} trades</div>
                </div>
                <div className="strategy-stats">
                  <div className="strategy-stat">
                    <div className="strategy-stat-val" style={{ color: "var(--accent)" }}>{s.wr}%</div>
                    <div className="strategy-stat-label">Win Rate</div>
                  </div>
                  <div className="strategy-stat">
                    <div className="strategy-stat-val" style={{ color: s.pnl >= 0 ? "var(--accent)" : "var(--red)" }}>{s.pnl >= 0 ? "+" : ""}₹{s.pnl.toLocaleString('en-IN')}</div>
                    <div className="strategy-stat-label">Total PnL</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Risk Consistency</div><div className="card-sub">Risk % per trade over time</div></div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={riskData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="t" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip />
              <Line type="monotone" dataKey="risk" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 3 }} />
              <Line type="monotone" dataKey={() => 1} stroke="rgba(0,212,170,0.3)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Monthly PnL Breakdown</div></div>
          <span className="badge badge-green">2024</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData} barSize={36}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
              {monthlyData.map((v, i) => <Cell key={i} fill={v.pnl >= 0 ? "#00d4aa" : "#ef4444"} fillOpacity={0.8} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Analytics;
