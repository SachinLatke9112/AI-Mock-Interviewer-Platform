import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Award, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function InterviewReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get(`/interviews/${id}/report`);
        setReport(res.data);
      } catch (error) {
        console.error("Failed to fetch interview report", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="layout">
        <div className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="pulse">Loading Report...</div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="layout">
        <div className="main-content" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Report not found</h2>
          <button className="btn-primary" onClick={() => navigate('/dashboard')} style={{ marginTop: '1rem' }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      {/* Header */}
      <header className="header" style={{ padding: '0 2rem' }}>
        <button className="btn-secondary" style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none' }} onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
      </header>

      {/* Main Content */}
      <main className="main-content" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div className="glass-panel" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{report.role} Interview</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Level: {report.level} • Focus: {report.focus}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{report.score ? `${report.score}%` : '--'}</div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 500, marginTop: '0.25rem' }}>Overall Score</div>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          <div className="glass-panel" style={{ background: 'linear-gradient(to bottom, rgba(22, 163, 74, 0.05), transparent)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', marginBottom: '1rem' }}>
              <Award size={20} /> Top Strengths
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {report.strengths.length > 0 ? report.strengths.map((strength, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                  <span style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>{strength}</span>
                </li>
              )) : <li style={{ color: 'var(--text-secondary)' }}>No strengths identified.</li>}
            </ul>
          </div>

          <div className="glass-panel" style={{ background: 'linear-gradient(to bottom, rgba(217, 119, 6, 0.05), transparent)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d97706', marginBottom: '1rem' }}>
              <Target size={20} /> Areas to Improve
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {report.improvements.length > 0 ? report.improvements.map((improvement, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <Target size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                  <span style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>{improvement}</span>
                </li>
              )) : <li style={{ color: 'var(--text-secondary)' }}>No improvements identified.</li>}
            </ul>
          </div>
        </div>

        {/* Transcript Section */}
        <h2 style={{ marginBottom: '1.5rem' }}>Interview Transcript</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {report.qnas.map((qna, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--text-primary)', flex: 1 }}>
                  <span style={{ color: 'var(--primary)', marginRight: '0.5rem' }}>Q{idx + 1}.</span> 
                  {qna.question}
                </h4>
                {qna.score && (
                  <div style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', padding: '0.25rem 0.75rem', borderRadius: '99px', fontWeight: 600, fontSize: '0.875rem', marginLeft: '1rem' }}>
                    {qna.score}/100
                  </div>
                )}
              </div>
              
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>YOUR ANSWER</div>
                <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6 }}>{qna.answer || <i>No answer provided.</i>}</p>
              </div>

              {qna.feedback && (
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#a855f7', marginBottom: '0.5rem' }}>AI FEEDBACK</div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{qna.feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
