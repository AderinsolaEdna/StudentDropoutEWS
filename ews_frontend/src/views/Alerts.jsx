import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, CheckCircle, Clock, AlertTriangle, Search } from 'lucide-react';

export default function Alerts({ token }) {
  const [alerts, setAlerts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totalAlerts, setTotalAlerts] = useState(0);
  
  // Filtering
  const [statusFilter, setStatusFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [search, setSearch] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Token ${token}` },
        params: {
          page,
          status: statusFilter,
          risk_tier: riskFilter,
          limit: 15
        }
      };
      
      const response = await axios.get('/api/alerts/', config);
      
      let alertData = response.data.results || [];
      // Apply local client search filter if user types something
      if (search.trim()) {
        const query = search.toLowerCase();
        alertData = alertData.filter(a => 
          a.student_id.toLowerCase().includes(query) || 
          a.student_name.toLowerCase().includes(query) ||
          a.faculty.toLowerCase().includes(query)
        );
      }
      
      setAlerts(alertData);
      setTotalAlerts(response.data.count || alertData.length);
      setPages(Math.ceil((response.data.count || alertData.length || 1) / 15));
    } catch (err) {
      console.error("Error fetching alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [page, statusFilter, riskFilter]);

  const updateAlertStatus = async (id, newStatus) => {
    setProcessingId(id);
    try {
      const config = {
        headers: { Authorization: `Token ${token}` }
      };
      await axios.patch(`/api/alerts/${id}/`, { status: newStatus }, config);
      // Refresh list
      fetchAlerts();
    } catch (err) {
      console.error("Error updating alert status:", err);
      alert("Failed to update alert status. Verify permissions.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAlerts();
  };

  // Aggregation counts helper
  const openCount = alerts.filter(a => a.status === 'open').length;
  const progressCount = alerts.filter(a => a.status === 'in_progress').length;

  return (
    <div>
      {/* Visual Header Summary cards */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="card stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div>
            <span className="stat-label">Open Alerts</span>
            <div className="stat-value">{openCount}</div>
          </div>
          <div className="stat-meta">
            <AlertTriangle size={14} color="#f59e0b" /> Pending Initial Contact
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div>
            <span className="stat-label">In-Progress Interventions</span>
            <div className="stat-value">{progressCount}</div>
          </div>
          <div className="stat-meta">
            <Clock size={14} color="#3b82f6" /> Adviser Meetings Scheduled
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div>
            <span className="stat-label">Active Support Ratio</span>
            <div className="stat-value">
              {alerts.length > 0 ? ((alerts.filter(a => a.status !== 'open').length / alerts.length) * 100).toFixed(0) : 0}%
            </div>
          </div>
          <div className="stat-meta">
            <CheckCircle size={14} color="#10b981" /> Cases Handled
          </div>
        </div>
      </div>

      {/* Main Alert Warning Manager list */}
      <div className="card">
        <h3 className="card-title"><ShieldAlert size={18} /> Active Intervention Alerts</h3>
        
        {/* Filters */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1rem 0' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search alerts by student..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="form-input" style={{ width: '150px', padding: '0.5rem' }}>
              <option value="All">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            <select value={riskFilter} onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }} className="form-input" style={{ width: '150px', padding: '0.5rem' }}>
              <option value="All">All Risks</option>
              <option value="High Risk">High Risk</option>
              <option value="Medium Risk">Medium Risk</option>
            </select>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Query</button>
          </div>
        </form>

        {loading ? (
          <div className="spinner"></div>
        ) : (
          <div className="table-wrapper">
            <table className="ews-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Faculty</th>
                  <th>Risk Tier</th>
                  <th>Prob.</th>
                  <th>Date Raised</th>
                  <th>Recommended Action</th>
                  <th>Status</th>
                  <th>Intervention Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length > 0 ? (
                  alerts.map((alert, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{alert.student_id}</td>
                      <td>{alert.student_name}</td>
                      <td>{alert.faculty}</td>
                      <td>
                        <span className={`badge badge-${alert.risk_tier === 'High Risk' ? 'high' : 'med'}`}>
                          {alert.risk_tier}
                        </span>
                      </td>
                      <td>{(alert.probability * 100).toFixed(1)}%</td>
                      <td>{new Date(alert.created_at).toLocaleDateString()}</td>
                      <td style={{ fontSize: '0.82rem', maxWidth: '300px', lineHeight: '1.4' }}>
                        {alert.actionable_intervention}
                      </td>
                      <td>
                        <span className={`badge badge-status-${alert.status}`}>
                          {alert.status === 'open' ? 'Open' : alert.status === 'in_progress' ? 'In Progress' : 'Resolved'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {alert.status === 'open' && (
                            <button 
                              className="btn btn-secondary btn-sm"
                              disabled={processingId === alert.id}
                              onClick={() => updateAlertStatus(alert.id, 'in_progress')}
                            >
                              In Progress
                            </button>
                          )}
                          {alert.status !== 'resolved' && (
                            <button 
                              className="btn btn-primary btn-sm"
                              style={{ backgroundColor: 'var(--risk-low)', borderColor: 'var(--risk-low)' }}
                              disabled={processingId === alert.id}
                              onClick={() => updateAlertStatus(alert.id, 'resolved')}
                            >
                              Resolve
                            </button>
                          )}
                          {alert.status === 'resolved' && (
                            <button 
                              className="btn btn-secondary btn-sm"
                              disabled={processingId === alert.id}
                              onClick={() => updateAlertStatus(alert.id, 'open')}
                            >
                              Re-open
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No active alerts generated.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
