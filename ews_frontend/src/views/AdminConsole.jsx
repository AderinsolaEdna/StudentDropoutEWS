import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileSpreadsheet, Send, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AdminConsole({ token, userRole }) {
  // Tabs: 'upload' or 'manual'
  const [activeTab, setActiveTab] = useState('upload');
  
  // CSV Upload States
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Manual Entry States
  const [formData, setFormData] = useState(getInitialFormState());
  const [submitting, setSubmitting] = useState(false);
  const [manualResult, setManualResult] = useState(null);
  const [manualError, setManualError] = useState(null);

  function getInitialFormState() {
    return {
      student_id: '',
      first_name: '',
      last_name: '',
      email: '',
      Gender: '1',
      Age_at_Matriculation: '20',
      Marital_Status_Binary: '0',
      Special_Needs_Status: '0',
      Mother_Education_Level: '3',
      Father_Education_Level: '3',
      Mother_Occupation: '2',
      Father_Occupation: '2',
      First_Generation_Student: '0',
      UTME_PostUME_Score: '140.0',
      Secondary_School_Exit_Grade: '135.0',
      Study_Mode: '1',
      Faculty: 'Sciences',
      Year_of_Study: '2',
      Non_Resident_Student: '0',
      Hostel_Residency: '1',
      School_Fees_Payment_Status: '1',
      Fee_Arrears_Status: '0',
      Bursary_Scholarship_Status: '0',
      Units_Registered_Semester_1: '6',
      Units_Passed_Semester_1: '6',
      Assessments_Sat_Semester_1: '6',
      Units_No_Assessment_Semester_1: '0',
      GPA_Semester_1_5pt: '3.5',
      Pass_Rate_Semester_1: '1.0',
      Units_Registered_Semester_2: '6',
      Units_Passed_Semester_2: '5',
      Assessments_Sat_Semester_2: '6',
      Units_No_Assessment_Semester_2: '0',
      GPA_Semester_2_5pt: '3.2',
      Pass_Rate_Semester_2: '0.83',
      CGPA_5point_Scale: '3.35',
      GPA_Change: '-0.3'
    };
  }

  // Pre-load demo student profile profiles for easy assessment
  const loadDemoData = (profileType) => {
    if (profileType === 'high_risk') {
      setFormData({
        student_id: `STU-DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
        first_name: 'Babajide',
        last_name: 'Okonkwo',
        email: 'babajide.okonkwo@univel.edu.ng',
        Gender: '1',
        Age_at_Matriculation: '22',
        Marital_Status_Binary: '1',
        Special_Needs_Status: '0',
        Mother_Education_Level: '1',
        Father_Education_Level: '2',
        Mother_Occupation: '1',
        Father_Occupation: '2',
        First_Generation_Student: '1',
        UTME_PostUME_Score: '105.5',
        Secondary_School_Exit_Grade: '102.0',
        Study_Mode: '1',
        Faculty: 'Engineering',
        Year_of_Study: '3',
        Non_Resident_Student: '1',
        Hostel_Residency: '0',
        School_Fees_Payment_Status: '0', // Unpaid fees
        Fee_Arrears_Status: '1', // Arrears active
        Bursary_Scholarship_Status: '0',
        Units_Registered_Semester_1: '7',
        Units_Passed_Semester_1: '2',
        Assessments_Sat_Semester_1: '4',
        Units_No_Assessment_Semester_1: '3',
        GPA_Semester_1_5pt: '1.15',
        Pass_Rate_Semester_1: '0.28',
        Units_Registered_Semester_2: '7',
        Units_Passed_Semester_2: '0',
        Assessments_Sat_Semester_2: '2',
        Units_No_Assessment_Semester_2: '5',
        GPA_Semester_2_5pt: '0.00',
        Pass_Rate_Semester_2: '0.00',
        CGPA_5point_Scale: '0.58',
        GPA_Change: '-1.15' // Serious decline
      });
    } else {
      // Low risk high performer
      setFormData({
        student_id: `STU-DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
        first_name: 'Chioma',
        last_name: 'Adeyemi',
        email: 'chioma.adeyemi@univel.edu.ng',
        Gender: '0',
        Age_at_Matriculation: '18',
        Marital_Status_Binary: '0',
        Special_Needs_Status: '0',
        Mother_Education_Level: '12',
        Father_Education_Level: '14',
        Mother_Occupation: '9',
        Father_Occupation: '10',
        First_Generation_Student: '0',
        UTME_PostUME_Score: '180.0',
        Secondary_School_Exit_Grade: '175.5',
        Study_Mode: '1',
        Faculty: 'Sciences',
        Year_of_Study: '2',
        Non_Resident_Student: '0',
        Hostel_Residency: '1',
        School_Fees_Payment_Status: '1',
        Fee_Arrears_Status: '0',
        Bursary_Scholarship_Status: '1', // Scholarship recipient
        Units_Registered_Semester_1: '6',
        Units_Passed_Semester_1: '6',
        Assessments_Sat_Semester_1: '6',
        Units_No_Assessment_Semester_1: '0',
        GPA_Semester_1_5pt: '4.8',
        Pass_Rate_Semester_1: '1.0',
        Units_Registered_Semester_2: '6',
        Units_Passed_Semester_2: '6',
        Assessments_Sat_Semester_2: '6',
        Units_No_Assessment_Semester_2: '0',
        GPA_Semester_2_5pt: '4.95',
        Pass_Rate_Semester_2: '1.0',
        CGPA_5point_Scale: '4.88',
        GPA_Change: '0.15'
      });
    }
    setManualResult(null);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadResult(null);
    setUploadError(null);
  };

  const handleCSVUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const config = {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Token ${token}`
        }
      };
      const response = await axios.post('/api/upload/', uploadFormData, config);
      setUploadResult(response.data);
    } catch (err) {
      setUploadError(err.response?.data?.error || "CSV parse or validation failure. Ensure columns align with features schema.");
    } finally {
      setUploading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setManualError(null);
    setManualResult(null);

    // Parse features to correct float/int types for backend validation
    const payload = {};
    Object.keys(formData).forEach(key => {
      const val = formData[key];
      if (['student_id', 'first_name', 'last_name', 'email', 'Faculty'].includes(key)) {
        payload[key] = val;
      } else if (['UTME_PostUME_Score', 'Secondary_School_Exit_Grade', 'GPA_Semester_1_5pt', 'Pass_Rate_Semester_1', 'GPA_Semester_2_5pt', 'Pass_Rate_Semester_2', 'CGPA_5point_Scale', 'GPA_Change'].includes(key)) {
        payload[key] = parseFloat(val) || 0.0;
      } else {
        payload[key] = parseInt(val) || 0;
      }
    });

    try {
      const config = {
        headers: { Authorization: `Token ${token}` }
      };
      const response = await axios.post('/api/students/manual-entry/', payload, config);
      setManualResult(response.data);
    } catch (err) {
      setManualError(err.response?.data || { error: "Failed to submit record." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Tab Selectors */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' }}>
        <button 
          className={`nav-link ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
          style={{ fontSize: '1rem', border: 'none', background: 'none', paddingBottom: '0.75rem' }}
        >
          Batch CSV Upload
        </button>
        <button 
          className={`nav-link ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual')}
          style={{ fontSize: '1rem', border: 'none', background: 'none', paddingBottom: '0.75rem' }}
        >
          Single Record Manual Entry
        </button>
      </div>

      {/* View 1: Batch CSV Upload */}
      {activeTab === 'upload' && (
        <div className="card">
          <h3 className="card-title"><Upload size={18} /> Student Dataset CSV Ingest Console</h3>
          
          {userRole !== 'admin' ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--risk-high)' }}>
              <AlertTriangle size={32} style={{ margin: '0 auto 1rem' }} />
              <h4>Access Denied</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Only Administrator accounts have permission to run batch CSV uploads.</p>
            </div>
          ) : (
            <form onSubmit={handleCSVUpload} style={{ marginTop: '1.5rem' }}>
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '3rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem', transition: 'var(--transition)' }}>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="csv-file-input"
                />
                <label htmlFor="csv-file-input" style={{ cursor: 'pointer' }}>
                  <FileSpreadsheet size={48} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
                  <p style={{ fontWeight: 600 }}>{file ? file.name : "Click to select student records CSV file"}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Columns must match Ground-Truth feature layout.
                  </p>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                {file && (
                  <button type="button" className="btn btn-secondary" onClick={() => setFile(null)}>Clear</button>
                )}
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!file || uploading}
                >
                  {uploading ? "Ingesting..." : "Execute Batch Import"}
                </button>
              </div>
            </form>
          )}

          {/* Upload Results report */}
          {uploadError && (
            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--risk-high-bg)', color: 'var(--risk-high-text)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--risk-high)', fontSize: '0.9rem' }}>
              <strong>Upload Error:</strong> {uploadError}
            </div>
          )}

          {uploadResult && (
            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <ShieldCheck color="green" size={20} /> Batch Import Analysis
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Successful Rows</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--risk-low)' }}>{uploadResult.success_count}</div>
                </div>
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Failed Rows</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: uploadResult.failed_count > 0 ? 'var(--risk-high)' : 'var(--text-primary)' }}>
                    {uploadResult.failed_count}
                  </div>
                </div>
              </div>

              {uploadResult.failed_count > 0 && (
                <div>
                  <h5 style={{ marginBottom: '0.5rem', fontWeight: 700 }}>Structured Per-Row Error Report</h5>
                  <div className="table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    <table className="ews-table">
                      <thead>
                        <tr>
                          <th style={{ width: '80px' }}>Row</th>
                          <th>Specific Validation Errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadResult.errors.map((err, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{err.row}</td>
                            <td style={{ color: 'var(--risk-high-text)', fontSize: '0.82rem' }}>
                              {Object.keys(err.errors).map(field => (
                                <div key={field}>
                                  <strong>{field}:</strong> {err.errors[field].join(', ')}
                                </div>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* View 2: Manual Data Entry */}
      {activeTab === 'manual' && (
        <div>
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h3 className="card-title" style={{ border: 'none', padding: 0, margin: 0 }}><Send size={18} /> Student Feature Entry</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Submit metrics to calculate instant dropout risk probabilities.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => loadDemoData('high_risk')}>
                  Load High-Risk Demo
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => loadDemoData('low_risk')}>
                  Load Low-Risk Demo
                </button>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} style={{ marginTop: '1.5rem' }}>
              {/* Profile Block */}
              <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '0.95rem', textTransform: 'uppercase' }}>Demographics & Profile</h4>
              <div className="form-grid-3" style={{ marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Student ID (Optional)</label>
                  <input type="text" name="student_id" value={formData.student_id} onChange={handleFormChange} placeholder="e.g. STU-0001" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleFormChange} placeholder="First Name" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleFormChange} placeholder="Last Name" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select name="Gender" value={formData.Gender} onChange={handleFormChange} className="form-input">
                    <option value="1">Male</option>
                    <option value="0">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Age at Matriculation</label>
                  <input type="number" name="Age_at_Matriculation" value={formData.Age_at_Matriculation} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Marital Status</label>
                  <select name="Marital_Status_Binary" value={formData.Marital_Status_Binary} onChange={handleFormChange} className="form-input">
                    <option value="0">Single</option>
                    <option value="1">Married</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Special Needs Status</label>
                  <select name="Special_Needs_Status" value={formData.Special_Needs_Status} onChange={handleFormChange} className="form-input">
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">First Generation Student</label>
                  <select name="First_Generation_Student" value={formData.First_Generation_Student} onChange={handleFormChange} className="form-input">
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>
              </div>

              {/* Parental Ordinal Attributes */}
              <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '0.95rem', textTransform: 'uppercase' }}>Socio-Economic Factors</h4>
              <div className="form-grid-3" style={{ marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Mother Education Level (1-43)</label>
                  <input type="number" name="Mother_Education_Level" value={formData.Mother_Education_Level} onChange={handleFormChange} className="form-input" min="1" max="50" />
                </div>
                <div className="form-group">
                  <label className="form-label">Father Education Level (1-43)</label>
                  <input type="number" name="Father_Education_Level" value={formData.Father_Education_Level} onChange={handleFormChange} className="form-input" min="1" max="50" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mother Occupation (1-10)</label>
                  <input type="number" name="Mother_Occupation" value={formData.Mother_Occupation} onChange={handleFormChange} className="form-input" min="1" max="20" />
                </div>
                <div className="form-group">
                  <label className="form-label">Father Occupation (1-10)</label>
                  <input type="number" name="Father_Occupation" value={formData.Father_Occupation} onChange={handleFormChange} className="form-input" min="1" max="20" />
                </div>
              </div>

              {/* Academics Pre-Matriculation & Institutional */}
              <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '0.95rem', textTransform: 'uppercase' }}>Academic Context</h4>
              <div className="form-grid-3" style={{ marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Faculty</label>
                  <select name="Faculty" value={formData.Faculty} onChange={handleFormChange} className="form-input">
                    <option value="Sciences">Sciences</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Arts">Arts</option>
                    <option value="Social_Sciences">Social Sciences</option>
                    <option value="Law">Law</option>
                    <option value="Medicine">Medicine</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year of Study (1-5)</label>
                  <input type="number" name="Year_of_Study" value={formData.Year_of_Study} onChange={handleFormChange} className="form-input" min="1" max="5" />
                </div>
                <div className="form-group">
                  <label className="form-label">Study Mode</label>
                  <select name="Study_Mode" value={formData.Study_Mode} onChange={handleFormChange} className="form-input">
                    <option value="1">Full-time</option>
                    <option value="0">Part-time</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">UTME Score</label>
                  <input type="number" name="UTME_PostUME_Score" value={formData.UTME_PostUME_Score} onChange={handleFormChange} className="form-input" step="0.1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sec. School Exit Grade</label>
                  <input type="number" name="Secondary_School_Exit_Grade" value={formData.Secondary_School_Exit_Grade} onChange={handleFormChange} className="form-input" step="0.1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Hostel Residency</label>
                  <select name="Hostel_Residency" value={formData.Hostel_Residency} onChange={handleFormChange} className="form-input">
                    <option value="1">Yes (Hostel)</option>
                    <option value="0">No (Off-campus)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Non-Resident Student</label>
                  <select name="Non_Resident_Student" value={formData.Non_Resident_Student} onChange={handleFormChange} className="form-input">
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>
              </div>

              {/* Financial Attributes */}
              <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '0.95rem', textTransform: 'uppercase' }}>Financial Indicators</h4>
              <div className="form-grid-3" style={{ marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Fees Paid Status</label>
                  <select name="School_Fees_Payment_Status" value={formData.School_Fees_Payment_Status} onChange={handleFormChange} className="form-input">
                    <option value="1">Paid</option>
                    <option value="0">Unpaid</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fee Arrears Status</label>
                  <select name="Fee_Arrears_Status" value={formData.Fee_Arrears_Status} onChange={handleFormChange} className="form-input">
                    <option value="0">No Arrears</option>
                    <option value="1">Has Arrears</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Bursary/Scholarship Recipient</label>
                  <select name="Bursary_Scholarship_Status" value={formData.Bursary_Scholarship_Status} onChange={handleFormChange} className="form-input">
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>
              </div>

              {/* Semester 1 & 2 Academics */}
              <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '0.95rem', textTransform: 'uppercase' }}>Semester Academic Metrics</h4>
              <div className="form-grid-3" style={{ marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Sem 1 Units Registered</label>
                  <input type="number" name="Units_Registered_Semester_1" value={formData.Units_Registered_Semester_1} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sem 1 Units Passed</label>
                  <input type="number" name="Units_Passed_Semester_1" value={formData.Units_Passed_Semester_1} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sem 1 Assessments Sat</label>
                  <input type="number" name="Assessments_Sat_Semester_1" value={formData.Assessments_Sat_Semester_1} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sem 1 Units No Assessment</label>
                  <input type="number" name="Units_No_Assessment_Semester_1" value={formData.Units_No_Assessment_Semester_1} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sem 1 GPA (0.0-5.0)</label>
                  <input type="number" name="GPA_Semester_1_5pt" value={formData.GPA_Semester_1_5pt} onChange={handleFormChange} className="form-input" step="0.01" min="0" max="5" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sem 1 Pass Rate (0.0-1.0)</label>
                  <input type="number" name="Pass_Rate_Semester_1" value={formData.Pass_Rate_Semester_1} onChange={handleFormChange} className="form-input" step="0.01" min="0" max="1" />
                </div>

                <div className="form-group">
                  <label className="form-label">Sem 2 Units Registered</label>
                  <input type="number" name="Units_Registered_Semester_2" value={formData.Units_Registered_Semester_2} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sem 2 Units Passed</label>
                  <input type="number" name="Units_Passed_Semester_2" value={formData.Units_Passed_Semester_2} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sem 2 Assessments Sat</label>
                  <input type="number" name="Assessments_Sat_Semester_2" value={formData.Assessments_Sat_Semester_2} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sem 2 Units No Assessment</label>
                  <input type="number" name="Units_No_Assessment_Semester_2" value={formData.Units_No_Assessment_Semester_2} onChange={handleFormChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sem 2 GPA (0.0-5.0)</label>
                  <input type="number" name="GPA_Semester_2_5pt" value={formData.GPA_Semester_2_5pt} onChange={handleFormChange} className="form-input" step="0.01" min="0" max="5" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sem 2 Pass Rate (0.0-1.0)</label>
                  <input type="number" name="Pass_Rate_Semester_2" value={formData.Pass_Rate_Semester_2} onChange={handleFormChange} className="form-input" step="0.01" min="0" max="1" />
                </div>
              </div>

              {/* CGPA and Trend metrics */}
              <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '0.95rem', textTransform: 'uppercase' }}>Overall Score Metrics</h4>
              <div className="form-grid-3" style={{ marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">CGPA (5.0 Point Scale)</label>
                  <input type="number" name="CGPA_5point_Scale" value={formData.CGPA_5point_Scale} onChange={handleFormChange} className="form-input" step="0.01" min="0" max="5" />
                </div>
                <div className="form-group">
                  <label className="form-label">GPA Change (S2 - S1)</label>
                  <input type="number" name="GPA_Change" value={formData.GPA_Change} onChange={handleFormChange} className="form-input" step="0.01" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setFormData(getInitialFormState())}>
                  <RefreshCw size={16} /> Reset
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Calculating..." : "Submit for Evaluation"}
                </button>
              </div>
            </form>

            {manualError && (
              <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--risk-high-bg)', color: 'var(--risk-high-text)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--risk-high)', fontSize: '0.9rem' }}>
                <strong>Submission Failed:</strong>
                {typeof manualError === 'object' && manualError.error ? (
                  <div>{manualError.error}</div>
                ) : (
                  Object.keys(manualError).map(key => (
                    <div key={key}><strong>{key}:</strong> {manualError[key].join(', ')}</div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Display prediction result inline */}
          {manualResult && (
            <div className="card" style={{ borderLeft: `6px solid ${
              manualResult.prediction.risk_tier === 'High Risk' ? 'var(--risk-high)' : 
              manualResult.prediction.risk_tier === 'Medium Risk' ? 'var(--risk-med)' : 'var(--risk-low)'
            }` }}>
              <h3 className="card-title"><ShieldCheck color="green" size={18} /> Evaluation Result Summary</h3>
              
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '1rem', alignItems: 'center' }}>
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', minWidth: '180px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Dropout probability</span>
                  <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {(manualResult.prediction.probability * 100).toFixed(1)}%
                  </div>
                  <span className={`badge badge-${
                    manualResult.prediction.risk_tier === 'High Risk' ? 'high' : 
                    manualResult.prediction.risk_tier === 'Medium Risk' ? 'med' : 'low'
                  }`} style={{ marginTop: '0.5rem' }}>
                    {manualResult.prediction.risk_tier}
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Top Contribution Drivers:</strong>
                    <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      {manualResult.prediction.top_drivers.map((d, i) => (
                        <li key={i} style={{ fontWeight: 600 }}>{d.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: `4px solid ${
                    manualResult.prediction.risk_tier === 'High Risk' ? 'var(--risk-high)' : 
                    manualResult.prediction.risk_tier === 'Medium Risk' ? 'var(--risk-med)' : 'var(--risk-low)'
                  }` }}>
                    <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Actionable Intervention Recommendation:</strong>
                    <p style={{ marginTop: '0.25rem', fontSize: '0.92rem', fontWeight: 500, lineHeight: '1.5' }}>
                      {manualResult.prediction.actionable_intervention}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
