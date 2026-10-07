import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import api from '../../services/api';

export default function InterviewsTab({ targetRole = 'All', searchQuery = '' }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [allSessions, setAllSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  // Reset pagination when role prop changes
  useEffect(() => {
    setPage(0);
    setAllSessions([]);
    setHasMore(true);
  }, [targetRole]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const params = { skip: page * LIMIT, limit: LIMIT };
        if (targetRole && targetRole !== 'All') {
          params.role = targetRole;
        }

        const res = await api.get('/interviews/history', { params });
        if (res.data.length < LIMIT) {
          setHasMore(false);
        }
        
        if (page === 0) {
          setAllSessions(res.data);
        } else {
          setAllSessions(prev => [...prev, ...res.data]);
        }
      } catch (error) {
        console.error("Failed to fetch interview history", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [targetRole, page]);

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to delete this in-progress interview?")) return;
    try {
      await api.delete(`/interviews/${sessionId}`);
      setAllSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error("Failed to delete interview", error);
      alert("An error occurred while deleting.");
    }
  };

  const filtered = allSessions.filter(session => {
    const matchesLocalSearch = session.role.toLowerCase().includes(search.toLowerCase());
    const matchesGlobalSearch = searchQuery === '' || session.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'All' || session.role === filterRole;
    const matchesStatus = filterStatus === 'All' || session.status === filterStatus;
    return matchesLocalSearch && matchesGlobalSearch && matchesRole && matchesStatus;
  });

  const roles = ['All', ...new Set(allSessions.map(s => s.role))];

  return (
    <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="glass-panel bento-card" style={{ padding: '0', background: 'linear-gradient(135deg, rgba(129, 140, 248, 0.05) 0%, rgba(192, 132, 252, 0.1) 100%)', display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Ready for your next challenge?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '500px' }}>
            Simulate a real technical interview with our AI. Choose your role, select your experience level, and start practicing instantly.
          </p>
          <div>
            <button className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }} onClick={() => navigate('/interview/setup')}>
              <Plus size={20} />
              Start New Interview
            </button>
          </div>
        </div>
        <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '100px', background: 'linear-gradient(to right, var(--glass-bg), transparent)', zIndex: 1 }}></div>
          <img src="/images/interviewer.jpg" alt="AI Interviewer" style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: '300px' }} />
        </div>
      </div>

      <div className="glass-panel bento-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ color: 'var(--text-primary)' }}>Interview History</h2>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="header-search" style={{ width: '250px' }}>
              <Search size={16} color="var(--text-secondary)" />
              <input 
                type="text" 
                placeholder="Search roles..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <select className="filter-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            
            <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Processing">Processing</option>
              <option value="In Progress">In Progress</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
             <div style={{ padding: '2rem', textAlign: 'center' }}>Loading interview history...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map(session => (
                    <tr key={session.id}>
                      <td style={{ fontWeight: 500 }}>{session.role}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{session.date}</td>
                      <td style={{ fontWeight: session.score ? 600 : 400, color: session.score ? 'inherit' : 'var(--text-secondary)' }}>
                        {session.score ? `${session.score}%` : '--'}
                      </td>
                      <td>
                        <span className={`status-badge status-${session.status.toLowerCase().replace(' ', '-')}`}>
                          {session.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', width: 'auto' }}
                            onClick={() => {
                              if (session.status === 'Completed') {
                                navigate(`/interview/${session.id}/report`);
                              } else {
                                navigate(`/interview/${session.id}`);
                              }
                            }}
                          >
                            <ExternalLink size={14} /> {session.status === 'Completed' ? 'Report' : 'Resume'}
                          </button>
                          
                          <button
                            className="icon-btn-outline"
                            style={{ padding: '0.25rem 0.5rem', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => handleDeleteSession(session.id)}
                            title="Delete Interview"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No past interviews found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {hasMore && !loading && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '0.5rem 2rem' }}
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
