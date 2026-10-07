import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Briefcase, Target, UploadCloud, ChevronLeft, ArrowRight, Layers, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import './NewInterviewSetup.css';

export default function NewInterviewSetup() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [role, setRole] = useState('');
  const [level, setLevel] = useState('mid');
  const [focus, setFocus] = useState('technical');
  const [jobDescription, setJobDescription] = useState('');
  
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [resumeText, setResumeText] = useState('');

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await api.post('/interviews/upload-resume', formData);
      const data = response.data;
      setResumeText(data.resume_text);
      setUploadSuccess(true);
    } catch (err) {
      console.error(err);
      setUploadError('Failed to upload resume. Please try again.');
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.post('/interviews/start', {
        role,
        level,
        focus,
        job_description: jobDescription || null,
        resume_text: resumeText || null
      });

      const data = response.data;
      
      navigate(`/interview/${data.session_id}`, { 
        state: { 
          initialQuestion: data.question,
          role, 
          level, 
          focus 
        } 
      });
    } catch (err) {
      console.error(err);
      alert('Failed to start interview. Please check your connection and API key.');
    }
  };

  return (
    <div className="setup-container">
      {/* Decorative Orbs */}
      <div className="orb orb-1" style={{ top: '-10%', left: '-5%' }}></div>
      <div className="orb orb-2" style={{ bottom: '-10%', right: '-5%' }}></div>

      <nav className="setup-navbar">
        <Link to="/dashboard" className="back-link">
          <ChevronLeft size={20} />
          Back to Dashboard
        </Link>
        <Link to="/" className="nav-logo">
          <span className="text-gradient">InterviewPilot</span> AI
        </Link>
        <div style={{ width: '140px' }}></div> {/* Spacer for centering */}
      </nav>

      <main className="setup-main">
        <div className="setup-glass-panel">
          
          <div className="setup-cover-image">
            <img src="/images/setup_illustration.jpg" alt="AI Interview Preparation" />
          </div>

          <div className="setup-header">
            <h1 className="text-gradient">Configure Your Interview</h1>
            <p>Tailor the AI interviewer to match your specific target role and experience level.</p>
          </div>

          <form onSubmit={handleSubmit} className="setup-form">
            
            <div className="form-grid">
              {/* Left Column - Details */}
              <div className="form-column">
                
                <div className="input-group">
                  <label htmlFor="role">Target Job Role</label>
                  <div className="input-with-icon">
                    <Briefcase size={18} className="input-icon" />
                    <input 
                      type="text" 
                      id="role"
                      className="input-field icon-padding" 
                      placeholder="e.g. Frontend Engineer, Product Manager"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="level">Experience Level</label>
                  <div className="input-with-icon">
                    <Layers size={18} className="input-icon" />
                    <select 
                      id="level" 
                      className="input-field icon-padding custom-select"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                    >
                      <option value="intern">Intern</option>
                      <option value="junior">Junior (0-2 years)</option>
                      <option value="mid">Mid-Level (3-5 years)</option>
                      <option value="senior">Senior (5+ years)</option>
                      <option value="staff">Lead / Staff</option>
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="focus">Primary Focus Area</label>
                  <div className="input-with-icon">
                    <Target size={18} className="input-icon" />
                    <select 
                      id="focus" 
                      className="input-field icon-padding custom-select"
                      value={focus}
                      onChange={(e) => setFocus(e.target.value)}
                    >
                      <option value="technical">Technical / Coding</option>
                      <option value="behavioral">Behavioral / Leadership</option>
                      <option value="system_design">System Architecture</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="jobDescription">Job Description (Optional)</label>
                  <div className="input-with-icon">
                    <FileText size={18} className="input-icon" style={{ top: '16px', transform: 'none' }} />
                    <textarea 
                      id="jobDescription"
                      className="input-field icon-padding" 
                      placeholder="Paste the job description here..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows={4}
                      style={{ resize: 'vertical', minHeight: '100px', paddingTop: '12px' }}
                    />
                  </div>
                </div>
                
              </div>

              {/* Right Column - Resume */}
              <div className="form-column">
                <div className="input-group" style={{ height: '100%' }}>
                  <label>Context / Resume (Optional)</label>
                  <div className="upload-dropzone" onClick={() => !isUploading && fileInputRef.current?.click()} style={{ cursor: isUploading ? 'default' : 'pointer' }}>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept=".pdf,.docx" 
                      style={{ display: 'none' }} 
                    />
                    
                    {isUploading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <Loader2 size={40} className="upload-icon" style={{ animation: 'spin 2s linear infinite' }} />
                        <h4 style={{ margin: 0 }}>Uploading {file?.name}...</h4>
                      </div>
                    ) : uploadSuccess ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <CheckCircle2 size={48} color="#10b981" />
                        <h4 style={{ margin: 0 }}>Resume Uploaded!</h4>
                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{file?.name}</p>
                        <button type="button" className="btn-secondary upload-btn" onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setUploadSuccess(false);
                          setResumeText('');
                        }}>
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={48} className="upload-icon" />
                        <h4>Upload your resume</h4>
                        <p>PDF, DOCX up to 5MB</p>
                        <button type="button" className="btn-secondary upload-btn" onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}>
                          Browse Files
                        </button>
                        <span className="upload-note">The AI will use this to personalize questions based on your experience.</span>
                        {uploadError && <div style={{ color: '#ef4444', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={14}/> {uploadError}</div>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="setup-footer">
              <button type="submit" className="btn-primary start-btn">
                Start Interview Now
                <ArrowRight size={20} />
              </button>
            </div>

          </form>

        </div>
      </main>
    </div>
  );
}
