import { useState, useEffect } from "react";
import "./styles/styles.css";
import "./styles/auth.css";
import Dashboard from "./components/Dashboard";
import Journal from "./components/Journal";
import Analytics from "./components/Analytics";
import LiveTradingChart from "./components/LiveTradingChart";
import AIInsights from "./components/AIInsights";
import AddTradeModal from "./components/AddTradeModal";
import Login from "./components/Login";
import ThemeToggle from "./components/ThemeToggle";
import { navItems } from "./data/mockData";
import { pageTitles } from "./data/constants";
import { authService } from "./services/authService";

export default function App() {
  const [page, setPage] = useState(() => {
    // Get saved page from localStorage, default to dashboard
    return localStorage.getItem('currentPage') || 'dashboard';
  });
  const [showModal, setShowModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Save page to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentPage', page);
  }, [page]);

  useEffect(() => {
    const checkAuth = () => {
      if (authService.isAuthenticated()) {
        const userData = authService.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    const userData = authService.getCurrentUser();
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      <style>{`@keyframes pulse { from { opacity: 0.3; } to { opacity: 1; } }`}</style>
      <div className="app">
        <div className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">📈</div>
            <div>
              <div className="logo-text">EdgeIQ</div>
              <div className="logo-sub">AI Trading Journal</div>
            </div>
          </div>
          <nav className="nav">
            <div className="nav-label">Main</div>
            {navItems.map(n => (
              <div key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>
                <span className="nav-icon">{n.icon}</span> {n.label}
              </div>
            ))}
            <div className="nav-label" style={{ marginTop: 8 }}>Account</div>
            {[{ id: "settings", icon: "⚙️", label: "Settings" }, { id: "billing", icon: "💳", label: "Billing" }, { id: "logout", icon: "🚪", label: "Logout" }].map(n => (
              <div key={n.id} className={`nav-item ${n.id === "logout" ? "logout-item" : ""}`} onClick={() => n.id === "logout" ? handleLogout() : setPage(n.id)}>
                <span className="nav-icon">{n.icon}</span> {n.label}
              </div>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="user-card">
              <div className="user-avatar">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
              </div>
              <div>
                <div className="user-name">{user?.name || 'User'}</div>
                <div className="user-tier">⚡ {user?.subscriptionTier === 'elite' ? 'Elite Plan' : user?.subscriptionTier === 'pro' ? 'Pro Plan' : 'Free Plan'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="main">
          <div className="topbar">
            <div className="topbar-title">{pageTitles[page]}</div>
            <div className="topbar-actions">
              <ThemeToggle />
              <button className="btn btn-ghost">📤 Export PDF</button>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Log Trade</button>
            </div>
          </div>
          <div className="content scrollbar-hide">
            {page === "dashboard" && <Dashboard onAddTrade={() => setShowModal(true)} />}
            {page === "journal" && <Journal onAddTrade={() => setShowModal(true)} />}
            {page === "analytics" && <Analytics />}
            {page === "live" && <LiveTradingChart />}
            {page === "ai" && <AIInsights />}
          </div>
        </div>
      </div>

      {showModal && <AddTradeModal onClose={() => setShowModal(false)} />}
    </>
  );
}
