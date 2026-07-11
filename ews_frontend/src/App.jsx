import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, Sun, Moon, LogOut, LayoutDashboard, BellRing, Settings, UserCheck } from 'lucide-react';

// Sub views
import Overview from './views/Overview';
import StudentDetail from './views/StudentDetail';
import Alerts from './views/Alerts';
import AdminConsole from './views/AdminConsole';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('ews_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('ews_user') || 'null'));
  
  // Navigation: 'overview', 'student-detail', 'alerts', 'admin-console'
  const [activeView, setActiveView] = useState('overview');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  
  // Theme state: 'light' or 'dark'
  const [theme, setTheme] = useState(localStorage.getItem('ews_theme') || 'dark');

  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Sync theme attribute on document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ews_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const response = await axios.post('/api/login/', { username, password });
      const { token: userToken, role, email, username: userName } = response.data;
      
      setToken(userToken);
      const profile = { username: userName, role, email };
      setUser(profile);
      
      localStorage.setItem('ews_token', userToken);
      localStorage.setItem('ews_user', JSON.stringify(profile));
    } catch (err) {
      setLoginError(err.response?.data?.non_field_errors?.[0] || "Invalid username or password. Check that the server is running and database is seeded.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickLogin = (roleType) => {
    setUsername(roleType);
    setPassword('password123');
    // Submit login using standard flow shortly
    setTimeout(() => {
      const submitBtn = document.getElementById('login-submit-btn');
      if (submitBtn) submitBtn.click();
    }, 100);
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('ews_token');
    localStorage.removeItem('ews_user');
    setActiveView('overview');
  };

  const handleSelectStudent = (id) => {
    setSelectedStudentId(id);
    setActiveView('student-detail');
  };

  const renderView = () => {
    switch (activeView) {
      case 'overview':
        return <Overview onSelectStudent={handleSelectStudent} token={token} />;
      case 'student-detail':
        return <StudentDetail studentId={selectedStudentId} onBack={() => setActiveView('overview')} token={token} />;
      case 'alerts':
        return <Alerts token={token} />;
      case 'admin-console':
        return <AdminConsole token={token} userRole={user?.role} />;
      default:
        return <Overview onSelectStudent={handleSelectStudent} token={token} />;
    }
  };

  // If not authenticated, show premium themed login overlay
  if (!token) {
    return (
      <div className="login-overlay">
        <div className="login-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: 'var(--risk-high-bg)', color: 'var(--risk-high)', padding: '1rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifySelf: 'center' }}>
              <ShieldAlert size={36} />
            </div>
          </div>
          <h2 className="login-title">Early Warning System</h2>
          <p className="login-subtitle">Student Dropout Risk Predictor Backend</p>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input 
                type="text" 
                className="form-input" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                placeholder="Username"
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="Password"
              />
            </div>
            
            {loginError && (
              <p style={{ color: 'var(--risk-high)', fontSize: '0.82rem', marginBottom: '1rem', textAlign: 'left', fontWeight: 500 }}>
                ⚠️ {loginError}
              </p>
            )}

            <button 
              id="login-submit-btn"
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.75rem' }}
              disabled={loginLoading}
            >
              {loginLoading ? "Authenticating..." : "Sign In to Dashboard"}
            </button>
          </form>

          {/* Quick login guides for grading/testing convenience */}
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem', fontWeight: 700 }}>
              Development Quick-Logins
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button onClick={() => handleQuickLogin('admin')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem' }}>
                Admin Account
              </button>
              <button onClick={() => handleQuickLogin('adviser')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem' }}>
                Adviser Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <header className="main-header">
        <div className="brand-section">
          <ShieldAlert size={24} color="red" />
          <span className="brand-name">EWS DROPOUT PREDICTOR</span>
        </div>

        <nav className="nav-links">
          <span 
            className={`nav-link ${activeView === 'overview' || activeView === 'student-detail' ? 'active' : ''}`}
            onClick={() => setActiveView('overview')}
          >
            <LayoutDashboard size={14} style={{ marginRight: '0.25rem', display: 'inline' }} /> Department Overview
          </span>
          <span 
            className={`nav-link ${activeView === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveView('alerts')}
          >
            <BellRing size={14} style={{ marginRight: '0.25rem', display: 'inline' }} /> Alert Management
          </span>
          
          {/* Hide/disable admin routes from non-admin roles */}
          {user?.role === 'admin' && (
            <span 
              className={`nav-link ${activeView === 'admin-console' ? 'active' : ''}`}
              onClick={() => setActiveView('admin-console')}
            >
              <Settings size={14} style={{ marginRight: '0.25rem', display: 'inline' }} /> Admin Ingest Console
            </span>
          )}
        </nav>

        <div className="header-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '1rem' }}>
            <UserCheck size={14} color="var(--primary)" />
            <span>
              <strong>{user?.username}</strong> ({user?.role})
            </span>
          </div>

          {/* Theme switcher */}
          <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle color scheme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Logout */}
          <button onClick={handleLogout} className="theme-toggle-btn" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main dashboard content */}
      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
}
