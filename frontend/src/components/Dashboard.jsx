import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useState, useEffect } from "react";
import { analyticsService } from "../services/analyticsService";
import { aiService } from "../services/aiService";
import CustomTooltip from "../utils/CustomTooltip";
import CalendarHeatmap from "../utils/CalendarHeatmap";

function Dashboard({ onAddTrade }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [equityData, setEquityData] = useState([]);
  const [weeklyPnL, setWeeklyPnL] = useState([]);
  const [sessionData, setSessionData] = useState([]);
  const [emotionData, setEmotionData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        console.log('Fetching dashboard data...');
        const response = await analyticsService.getDashboardStats();
        console.log('Dashboard stats response:', response);
        
        // Map backend response to frontend format
        setStats({
          totalPnL: response.totalPnL || 0,
          totalPnLChange: 0, // Calculate change if needed
          winRate: response.winRate || 0,
          winRateChange: 0, // Calculate change if needed
          avgRiskReward: response.avgRMultiple || 0,
          avgRiskRewardChange: 0, // Calculate change if needed
          drawdown: response.maxDrawdown || 0,
          drawdownChange: 0, // Calculate change if needed
          weeklyPnL: [], // Get from separate endpoint if needed
        });
        
        const equityResponse = await analyticsService.getEquityCurve();
        console.log('Equity curve response:', equityResponse);
        setEquityData(equityResponse || []);
        
        const sessionResponse = await analyticsService.getSessionStats();
        console.log('Session response:', sessionResponse);
        // Map session data to expected format
        setSessionData((sessionResponse || []).map(s => ({
          session: s._id || s.session,
          winRate: Math.round(s.winRate || 0),
          pnl: s.totalPnl || 0
        })));
        
        const emotionResponse = await analyticsService.getEmotionalAnalysis();
        console.log('Emotion response:', emotionResponse);
        setEmotionData(emotionResponse.emotions || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        // Set fallback data
        setStats({
          totalPnL: 0,
          totalPnLChange: 0,
          winRate: 0,
          winRateChange: 0,
          avgRiskReward: 0,
          avgRiskRewardChange: 0,
          drawdown: 0,
          drawdownChange: 0,
          weeklyPnL: [],
        });
        setEquityData([]);
        setSessionData([]);
        setEmotionData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    // Make refresh function available globally
    window.refreshDashboard = fetchDashboardData;
    
    // Cleanup
    return () => {
      delete window.refreshDashboard;
    };
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div>Loading dashboard...</div>
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
      <div className="stats-grid">
        {[
          { label: "Total PnL", value: `₹${(stats?.totalPnL || 0).toLocaleString('en-IN')}`, change: `+${stats?.totalPnLChange || 0}%`, up: (stats?.totalPnLChange || 0) >= 0, icon: "💰", grad: "linear-gradient(90deg,#00d4aa,#6366f1)" },
          { label: "Win Rate", value: `${stats?.winRate || 0}%`, change: `+${stats?.winRateChange || 0}%`, up: (stats?.winRateChange || 0) >= 0, icon: "🎯", grad: "linear-gradient(90deg,#6366f1,#00d4aa)" },
          { label: "Avg R:R", value: `${stats?.avgRiskReward || 0}R`, change: `+${stats?.avgRiskRewardChange || 0}R`, up: (stats?.avgRiskRewardChange || 0) >= 0, icon: "⚖️", grad: "linear-gradient(90deg,#00d4aa,#6366f1)" },
          { label: "Drawdown", value: `${stats?.drawdown || 0}%`, change: `${stats?.drawdownChange || 0}%`, up: (stats?.drawdownChange || 0) >= 0, icon: "📉", grad: "linear-gradient(90deg,#ef4444,#f59e0b)" },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ "--accent-grad": s.grad }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: i === 3 ? "var(--red)" : "var(--text)" }}>{s.value}</div>
            <div className={`stat-change ${s.up ? "up" : "down"}`}>{s.up ? "▲" : "▼"} {s.change} this month</div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Equity Curve</div>
              <div className="card-sub">Cumulative PnL over time</div>
            </div>
            <span className="badge badge-green">+$2,800</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={equityData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="pnl" stroke="#00d4aa" strokeWidth={2} fill="url(#areaGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Daily PnL</div>
              <div className="card-sub">This week</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyPnL} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]} fill="#00d4aa"
                label={false}
              >
                {weeklyPnL.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? "#00d4aa" : "#ef4444"} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bottom-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Discipline Score</div>
              <div className="card-sub">AI-powered behavior rating</div>
            </div>
            <span className="badge badge-purple">PRO</span>
          </div>
          <div className="gauge-wrap">
            <div className="gauge-score">7.4</div>
            <div className="gauge-label">/ 10 — Good</div>
            <div className="gauge-bars">
              {[
                { label: "Risk", val: 82, color: "#00d4aa" },
                { label: "Emotion", val: 65, color: "#6366f1" },
                { label: "Strategy", val: 78, color: "#f59e0b" },
                { label: "Patience", val: 70, color: "#00d4aa" },
              ].map((b, i) => (
                <div key={i} className="gauge-bar-item">
                  <div className="gauge-bar-label">{b.label}</div>
                  <div className="gauge-bar-track"><div className="gauge-bar-fill" style={{ width: `${b.val}%`, background: b.color }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Emotion Analysis</div>
              <div className="card-sub">Trade psychology breakdown</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie data={emotionData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={2}>
                  {emotionData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend" style={{ flex: 1 }}>
              {emotionData.map((e, i) => (
                <div key={i} className="pie-legend-item">
                  <div className="pie-legend-left"><div className="pie-dot" style={{ background: e.color }} /><span className="pie-name">{e.name}</span></div>
                  <span className="pie-pct">{e.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Session Performance</div>
            <div className="card-sub">Win rate & PnL by trading session</div>
          </div>
        </div>
        <div className="session-list">
          {sessionData.map((s, i) => (
            <div key={i} className="session-row">
              <div className="session-name">{s.session}</div>
              <div className="session-wr">{s.winRate}%</div>
              <div className="session-bar-wrap"><div className="session-bar-fill" style={{ width: `${s.winRate}%` }} /></div>
              <div className="session-pnl">+₹{(s.pnl || 0).toLocaleString('en-IN')}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Trading Calendar</div>
            <div className="card-sub">Performance heatmap — {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
          </div>
        </div>
        <CalendarHeatmap />
      </div>
    </div>
  );
}

export default Dashboard;
