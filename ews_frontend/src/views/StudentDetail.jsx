import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { ShieldAlert, BookOpen, Wallet, GraduationCap, ChevronLeft } from 'lucide-react';

export default function StudentDetail({ studentId, onBack, token }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudentProfile = async () => {
      setLoading(true);
      try {
        const config = {
          headers: { Authorization: `Token ${token}` }
        };
        const response = await axios.get(`/api/students/${studentId}/`, config);
        setProfile(response.data);
      } catch (err) {
        setError(err.response?.data?.error || "Error loading student profile details.");
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchStudentProfile();
    }
  }, [studentId]);

  if (loading) return <div className="spinner"></div>;
  if (error) return <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--risk-high)' }}><h3>{error}</h3><button onClick={onBack} className="btn btn-secondary" style={{ marginTop: '1rem' }}>Back</button></div>;
  if (!profile) return null;

  const { features, prediction, history } = profile;
  const prob = prediction ? prediction.probability : 0.0;
  const tier = prediction ? prediction.risk_tier : 'Low Risk';

  // SVG Gauge calculations
  const radius = 50;
  const strokeWidth = 10;
  const circum = Math.PI * radius; // 157.08
  const strokeDashoffset = circum - (prob * circum);
  
  let gaugeColor = 'var(--risk-low)';
  if (tier === 'High Risk') gaugeColor = 'var(--risk-high)';
  else if (tier === 'Medium Risk') gaugeColor = 'var(--risk-med)';

  // Format history for Line Chart
  const chartHistory = [...history].reverse().map(h => ({
    name: `Sem ${h.semester_index}`,
    probability: Math.round(h.probability * 100),
    cgpa: h.cgpa
  }));

  // Map drivers to user friendly titles
  const formatFeatureName = (name) => {
    return name
      .replace(/_/g, ' ')
      .replace('5point Scale', 'Scale (5.0)')
      .replace('5pt', 'Scale (5.0)')
      .replace('Semester 1', 'Sem 1')
      .replace('Semester 2', 'Sem 2');
  };

  return (
    <div>
      <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
        <ChevronLeft size={16} /> Back to Overview
      </button>

      {/* Main Student Header Info */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>STUDENT CASE PROFILE</span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{profile.first_name} {profile.last_name}</h2>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <span><strong>Student ID:</strong> {profile.student_id}</span>
              <span><strong>Email:</strong> {profile.email}</span>
              <span><strong>Faculty:</strong> {features.Faculty}</span>
            </div>
          </div>
          <div>
            <span className={`badge badge-${tier === 'High Risk' ? 'high' : tier === 'Medium Risk' ? 'med' : 'low'}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
              {tier}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-layout" style={{ marginBottom: '2rem' }}>
        {/* Risk Assessment Score Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px' }}>
          <h3 className="card-title" style={{ width: '100%' }}>Dropout Probability</h3>
          
          <div className="gauge-container" style={{ margin: '1.5rem 0' }}>
            <svg width="180" height="110" viewBox="0 0 120 70">
              {/* Background Arc */}
              <path 
                d="M 10 60 A 50 50 0 0 1 110 60" 
                fill="none" 
                stroke="var(--border-color)" 
                strokeWidth={strokeWidth} 
                strokeLinecap="round"
              />
              {/* Foreground Arc */}
              <path 
                d="M 10 60 A 50 50 0 0 1 110 60" 
                fill="none" 
                stroke={gaugeColor} 
                strokeWidth={strokeWidth} 
                strokeLinecap="round"
                strokeDasharray={circum}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className="gauge-percentage">{(prob * 100).toFixed(1)}%</div>
          </div>
          
          <div className="gauge-label">Computed Dropout Risk</div>
        </div>

        {/* Top Contributing Drivers & Recommendation */}
        <div className="card" style={{ minHeight: '340px' }}>
          <h3 className="card-title">Contributing Risk Drivers (Top 2)</h3>
          
          <div style={{ margin: '1.5rem 0' }}>
            {prediction && prediction.top_drivers && prediction.top_drivers.length > 0 ? (
              prediction.top_drivers.map((driver, index) => {
                const rawVal = features[driver];
                // Calculate representative intensity percentage for UI
                let intensity = 50; 
                if (driver.includes('Status') || driver.includes('Binary') || driver.includes('First_Generation')) {
                  intensity = rawVal === 1 ? 90 : 20;
                } else if (driver.includes('CGPA') || driver.includes('GPA')) {
                  intensity = Math.max(0, Math.round(((5.0 - rawVal) / 5.0) * 100));
                } else if (driver.includes('Passed')) {
                  intensity = Math.max(0, Math.round((1 - (rawVal / 6)) * 100));
                }
                
                return (
                  <div key={index} className="driver-bar-container">
                    <div className="driver-info">
                      <span style={{ fontWeight: 600 }}>{formatFeatureName(driver)}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>Value: {rawVal}</span>
                    </div>
                    <div className="driver-bar-outer">
                      <div 
                        className="driver-bar-inner" 
                        style={{ 
                          width: `${intensity}%`,
                          backgroundColor: tier === 'High Risk' ? 'var(--risk-high)' : 'var(--risk-med)'
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No significant risk drivers identified.</p>
            )}
          </div>

          {/* Intervention Advice */}
          <div style={{ marginTop: '1.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '1rem', borderLeft: `4px solid ${gaugeColor}` }}>
            <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.25rem' }}>
              Actionable Intervention Recommendation
            </h4>
            <p style={{ fontSize: '0.95rem', lineHeight: '1.5', fontWeight: 500 }}>
              {prediction ? prediction.actionable_intervention : "No recommendation available."}
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-layout" style={{ marginBottom: '2rem' }}>
        {/* Prediction History Timeline Chart */}
        <div className="card">
          <h3 className="card-title">Risk Probability & CGPA Trend</h3>
          <div style={{ width: '100%', height: '240px', marginTop: '1rem' }}>
            <ResponsiveContainer>
              <LineChart data={chartHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" stroke="var(--risk-high)" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: 'Risk %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'var(--risk-high)' } }} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--primary)" domain={[0, 5]} tick={{ fontSize: 11 }} label={{ value: 'CGPA', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: 'var(--primary)' } }} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="probability" stroke="var(--risk-high)" strokeWidth={2.5} activeDot={{ r: 6 }} name="Risk Probability (%)" />
                <Line yAxisId="right" type="monotone" dataKey="cgpa" stroke="var(--primary)" strokeWidth={2.5} name="CGPA" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Features Details Panel */}
        <div className="card">
          <h3 className="card-title">Key Feature Breakdown</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
                <BookOpen size={14} /> Academics (Current Sem)
              </div>
              <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1rem' }}>
                <span>Units Registered: <strong>{features.Units_Registered_Semester_1}</strong></span>
                <span>GPA (Sem 1): <strong>{features.GPA_Semester_1_5pt}</strong></span>
                <span>Units Passed: <strong>{features.Units_Passed_Semester_1}</strong></span>
                <span>GPA (Sem 2): <strong>{features.GPA_Semester_2_5pt}</strong></span>
                <span>Pass Rate: <strong>{(features.Pass_Rate_Semester_1 * 100).toFixed(0)}%</strong></span>
                <span>CGPA Scale: <strong>{features.CGPA_5point_Scale}</strong></span>
              </div>
            </div>

            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
                <Wallet size={14} /> Financial Status
              </div>
              <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1rem' }}>
                <span>Fees Paid: <strong>{features.School_Fees_Payment_Status === 1 ? 'Yes' : 'No'}</strong></span>
                <span>Scholarship: <strong>{features.Bursary_Scholarship_Status === 1 ? 'Yes' : 'No'}</strong></span>
                <span>Arrears: <strong>{features.Fee_Arrears_Status === 1 ? 'Yes' : 'No'}</strong></span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
                <GraduationCap size={14} /> Personal & Demographics
              </div>
              <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1rem' }}>
                <span>Age: <strong>{features.Age_at_Matriculation}</strong></span>
                <span>Hostel Residency: <strong>{features.Hostel_Residency === 1 ? 'Yes' : 'No'}</strong></span>
                <span>Study Mode: <strong>{features.Study_Mode === 1 ? 'Full-Time' : 'Part-Time'}</strong></span>
                <span>1st Gen: <strong>{features.First_Generation_Student === 1 ? 'Yes' : 'No'}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
