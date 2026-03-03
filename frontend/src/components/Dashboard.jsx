import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useState, useEffect } from "react";
import { analyticsService } from "../services/analyticsService";
import { aiService } from "../services/aiService";
import { authService } from "../services/authService";
import CustomTooltip from "../utils/CustomTooltip";
import CalendarHeatmap from "../utils/CalendarHeatmap";

function Dashboard({ onAddTrade, onNavigate }) {
  const user = authService.getCurrentUser();
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

        // Map backend response to frontend format
        setStats({
          totalPnL: response.totalPnl || 0,
          totalPnLChange: 0,
          winRate: response.winRate || 0,
          winRateChange: 0,
          avgRiskReward: response.avgRMultiple || 0,
          avgRiskRewardChange: 0,
          drawdown: response.maxDrawdown || 0,
          drawdownChange: 0,
        });

        const equityResponse = await analyticsService.getEquityCurve();
        setEquityData(equityResponse || []);

        // Fetch last 7 days for the BarChart
        const now = new Date();
        const dailyPnlResponse = await analyticsService.getCalendarHeatmap(now.getMonth() + 1, now.getFullYear());
        const last7Days = (dailyPnlResponse || []).slice(-7).map(d => ({
          day: new Date(d._id).toLocaleDateString('en-US', { weekday: 'short' }),
          pnl: d.pnl
        }));
        setWeeklyPnL(last7Days);

        const sessionResponse = await analyticsService.getSessionStats();
        setSessionData((sessionResponse || []).map(s => ({
          session: s.session || s._id,
          winRate: Math.round(s.winRate || 0),
          pnl: s.totalPnl || 0
        })));

        const emotionResponse = await analyticsService.getEmotionalAnalysis();
        setEmotionData(emotionResponse || []);

        // Fetch Behavior Score
        try {
          const behaviorResponse = await aiService.getBehaviorSummary();
          if (behaviorResponse) {
            setStats(prev => ({
              ...prev,
              disciplineScore: behaviorResponse.disciplineScore / 10,
              behaviors: behaviorResponse.current
            }));
          }
        } catch (bErr) {
          console.warn('Behavior summary not found:', bErr);
        }

      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError("Failed to load dashboard data. Please refresh.");
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
        <div className="card" style={{ position: "relative", overflow: "hidden" }}>
          <div className="card-header">
            <div><div className="card-title">Discipline Score</div><div className="card-sub">AI-powered behavior rating</div></div>
            <span className="badge badge-purple">PRO</span>
          </div>

          {user?.subscriptionTier === "free" ? (
            <div style={{
              marginTop: 20,
              padding: "30px 10px",
              textAlign: "center",
              background: "rgba(0,0,0,0.2)",
              borderRadius: 12,
              border: "1px dashed var(--border)"
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Pro Performance Tracking</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                Unlock behavioral scoring to track your trading discipline.
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate('billing')}>
                Get Pro
              </button>
            </div>
          ) : (
            <div className="gauge-wrap">
              <div className="gauge-score">{stats?.disciplineScore || "—"}</div>
              <div className="gauge-label">/ 10 — {(stats?.disciplineScore || 0) >= 8 ? "Excellent" : (stats?.disciplineScore || 0) >= 6 ? "Good" : "Needs Work"}</div>
              <div className="gauge-bars">
                {[
                  { label: "Overtrading", val: stats?.behaviors?.overtradingDetected ? 30 : 100, color: stats?.behaviors?.overtradingDetected ? "var(--red)" : "#00d4aa" },
                  { label: "Revenge", val: stats?.behaviors?.revengeTradeDetected ? 30 : 100, color: stats?.behaviors?.revengeTradeDetected ? "var(--red)" : "#6366f1" },
                  { label: "FOMO", val: stats?.behaviors?.fomoDetected ? 30 : 100, color: stats?.behaviors?.fomoDetected ? "var(--red)" : "#f59e0b" },
                  { label: "Risk Consistency", val: stats?.behaviors?.inconsistentRisk ? 30 : 100, color: stats?.behaviors?.inconsistentRisk ? "var(--red)" : "#00d4aa" },
                ].map((b, i) => (
                  <div key={i} className="gauge-bar-item">
                    <div className="gauge-bar-label">{b.label}</div>
                    <div className="gauge-bar-track"><div className="gauge-bar-fill" style={{ width: `${b.val}%`, background: b.color }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
              {Array.isArray(emotionData) && emotionData.map((e, i) => (
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
