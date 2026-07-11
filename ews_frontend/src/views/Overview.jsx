import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { ShieldAlert, Search, Filter, ArrowUpDown, Award, Users } from 'lucide-react';

export default function Overview({ onSelectStudent, token }) {
  const [students, setStudents] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  
  // Filters state
  const [faculty, setFaculty] = useState('All');
  const [riskTier, setRiskTier] = useState('All');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('student_id');
  const [sortOrder, setSortOrder] = useState('asc');
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    rate: 0
  });

  const [facultyChartData, setFacultyChartData] = useState([]);

  // Fetch student directory list with filters
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Token ${token}` },
        params: {
          page,
          limit: 15,
          faculty,
          risk_tier: riskTier,
          year_of_study: yearOfStudy,
          search,
          sort_by: sortBy,
          sort_order: sortOrder
        }
      };
      
      const response = await axios.get('/api/students/', config);
      setStudents(response.data.results || response.data.students || []);
      setTotalStudents(response.data.count || response.data.total || 0);
      setPages(Math.ceil((response.data.count || response.data.total || 1) / 15));
    } catch (err) {
      console.error("Error fetching students directory:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch metrics/statistics for charts (we compile it from a lightweight unpaginated endpoint or batch calculation)
  // Since we don't have a specific backend endpoint that outputs overall aggregations, we can fetch all records 
  // or construct it dynamically. To be efficient and simple, we can fetch the student directory with limit=10000 
  // to calculate aggregate stats and chart data once on component mount.
  const fetchAnalytics = async () => {
    try {
      const config = {
        headers: { Authorization: `Token ${token}` },
        params: { limit: 10000 }
      };
      const response = await axios.get('/api/students/', config);
      const allStuds = response.data.results || response.data.students || [];
      
      let high = 0;
      let med = 0;
      let low = 0;
      
      const facultyMap = {
        'Sciences': { name: 'Sciences', 'High Risk': 0, 'Medium Risk': 0, 'Low Risk': 0 },
        'Engineering': { name: 'Engineering', 'High Risk': 0, 'Medium Risk': 0, 'Low Risk': 0 },
        'Arts': { name: 'Arts', 'High Risk': 0, 'Medium Risk': 0, 'Low Risk': 0 },
        'Social_Sciences': { name: 'Social Sciences', 'High Risk': 0, 'Medium Risk': 0, 'Low Risk': 0 },
        'Law': { name: 'Law', 'High Risk': 0, 'Medium Risk': 0, 'Low Risk': 0 },
        'Medicine': { name: 'Medicine', 'High Risk': 0, 'Medium Risk': 0, 'Low Risk': 0 }
      };

      allStuds.forEach(s => {
        const tier = s.risk_tier;
        if (tier === 'High Risk') high++;
        else if (tier === 'Medium Risk') med++;
        else low++;

        const fac = s.faculty;
        if (facultyMap[fac]) {
          facultyMap[fac][tier]++;
        }
      });

      const total = allStuds.length;
      setStats({
        total,
        high,
        medium: med,
        low,
        rate: total > 0 ? ((high + med) / total * 100).toFixed(1) : 0
      });

      setFacultyChartData(Object.values(facultyMap));
    } catch (err) {
      console.error("Error generating analytics charts:", err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, faculty, riskTier, yearOfStudy, sortBy, sortOrder]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Pie chart variables
  const pieData = [
    { name: 'High Risk', value: stats.high, color: '#ef4444' },
    { name: 'Medium Risk', value: stats.medium, color: '#f97316' },
    { name: 'Low Risk', value: stats.low, color: '#10b981' }
  ];

  return (
    <div>
      {/* Aggregated stats widgets */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div>
            <span className="stat-label">Total Monitored Students</span>
            <div className="stat-value">{stats.total.toLocaleString()}</div>
          </div>
          <div className="stat-meta">
            <Users size={14} /> Active Enrollments
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--risk-high)' }}>
          <div>
            <span className="stat-label" style={{ color: 'var(--risk-high)' }}>High Risk</span>
            <div className="stat-value" style={{ color: 'var(--risk-high)' }}>{stats.high}</div>
          </div>
          <div className="stat-meta">
            <ShieldAlert size={14} color="red" /> Urgent Action Needed
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--risk-med)' }}>
          <div>
            <span className="stat-label" style={{ color: 'var(--risk-med)' }}>Medium Risk</span>
            <div className="stat-value" style={{ color: 'var(--risk-med)' }}>{stats.medium}</div>
          </div>
          <div className="stat-meta">
            <ShieldAlert size={14} color="orange" /> Welfare Check-in Recommended
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--risk-low)' }}>
          <div>
            <span className="stat-label" style={{ color: 'var(--risk-low)' }}>Low Risk</span>
            <div className="stat-value" style={{ color: 'var(--risk-low)' }}>{stats.low}</div>
          </div>
          <div className="stat-meta">
            <Award size={14} color="green" /> Satisfactory Progress
          </div>
        </div>

        <div className="card stat-card">
          <div>
            <span className="stat-label">System Warning Rate</span>
            <div className="stat-value">{stats.rate}%</div>
          </div>
          <div className="stat-meta">
            Ratio of High & Med Students
          </div>
        </div>
      </div>

      {/* Visual Analytics Sections */}
      <div className="dashboard-layout" style={{ marginBottom: '2rem' }}>
        {/* Faculty Risk Bar Chart */}
        <div className="card">
          <h3 className="card-title">Risk Distribution by Faculty</h3>
          <div style={{ width: '100%', height: '300px', marginTop: '1rem' }}>
            <ResponsiveContainer>
              <BarChart data={facultyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Low Risk" stackId="a" fill="#10b981" />
                <Bar dataKey="Medium Risk" stackId="a" fill="#f97316" />
                <Bar dataKey="High Risk" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Aggregate Pie Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 className="card-title" style={{ width: '100%' }}>Overall Risk Distribution</h3>
          <div style={{ width: '100%', height: '240px', display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.8rem' }}>
            {pieData.map((d, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '12px', height: '12px', backgroundColor: d.color, borderRadius: '2px' }}></span>
                {d.name}: {d.value} ({((d.value / (stats.total || 1)) * 100).toFixed(1)}%)
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Student Directory Directory & Filters */}
      <div className="card">
        <h3 className="card-title"><Users size={18} /> Student Warning Directory</h3>
        
        {/* Filters Panel */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1rem 0' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search by ID or Faculty..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Filter size={14} color="var(--text-muted)" />
              <select value={faculty} onChange={(e) => { setFaculty(e.target.value); setPage(1); }} className="form-input" style={{ width: '150px', padding: '0.5rem' }}>
                <option value="All">All Faculties</option>
                <option value="Sciences">Sciences</option>
                <option value="Engineering">Engineering</option>
                <option value="Arts">Arts</option>
                <option value="Social_Sciences">Social Sciences</option>
                <option value="Law">Law</option>
                <option value="Medicine">Medicine</option>
              </select>
            </div>

            <select value={riskTier} onChange={(e) => { setRiskTier(e.target.value); setPage(1); }} className="form-input" style={{ width: '150px', padding: '0.5rem' }}>
              <option value="All">All Risks</option>
              <option value="High & Medium Risk">High & Med Risk</option>
              <option value="High Risk">High Risk Only</option>
              <option value="Medium Risk">Medium Risk Only</option>
              <option value="Low Risk">Low Risk Only</option>
            </select>

            <select value={yearOfStudy} onChange={(e) => { setYearOfStudy(e.target.value); setPage(1); }} className="form-input" style={{ width: '120px', padding: '0.5rem' }}>
              <option value="">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
              <option value="5">Year 5</option>
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
                  <th onClick={() => toggleSort('student_id')} style={{ cursor: 'pointer' }}>
                    Student ID <ArrowUpDown size={12} />
                  </th>
                  <th>Name</th>
                  <th>Faculty</th>
                  <th onClick={() => toggleSort('cgpa')} style={{ cursor: 'pointer' }}>
                    CGPA <ArrowUpDown size={12} />
                  </th>
                  <th>Year</th>
                  <th onClick={() => toggleSort('probability')} style={{ cursor: 'pointer' }}>
                    Risk Score <ArrowUpDown size={12} />
                  </th>
                  <th>Risk Level</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length > 0 ? (
                  students.map((student, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{student.student_id}</td>
                      <td>{student.first_name} {student.last_name}</td>
                      <td>{student.faculty}</td>
                      <td>{student.cgpa?.toFixed(2)}</td>
                      <td>{student.year_of_study}</td>
                      <td>{(student.risk_probability * 100).toFixed(1)}%</td>
                      <td>
                        <span className={`badge badge-${
                          student.risk_tier === 'High Risk' ? 'high' : 
                          student.risk_tier === 'Medium Risk' ? 'med' : 'low'
                        }`}>
                          {student.risk_tier}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => onSelectStudent(student.student_id)}
                        >
                          View Case Profile
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No student records match the specified filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination controls */}
            {pages > 1 && (
              <div className="pagination-controls">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Showing page {page} of {pages} ({totalStudents} total records)
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary btn-sm"
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  >
                    Previous
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm"
                    disabled={page === pages}
                    onClick={() => setPage(prev => Math.min(prev + 1, pages))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
