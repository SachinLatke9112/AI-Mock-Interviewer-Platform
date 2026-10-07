import { Video, Award, Clock, Target, Sparkles, Calendar, Plus, Edit2, Trash2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';


const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="custom-tooltip-title">{label}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {payload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}` }}></div>
              <span className="custom-tooltip-item-label">{entry.name}:</span>
            </div>
            <span className="custom-tooltip-item-value">{entry.value}%</span>
          </div>
        ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function OverviewTab({ targetRole = 'All', searchQuery = '' }) {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('All');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleRole, setScheduleRole] = useState('Frontend Developer');
  const [scheduleDate, setScheduleDate] = useState('');
  const [editScheduleId, setEditScheduleId] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const params = {};
      if (targetRole && targetRole !== 'All') {
        params.role = targetRole;
      }
      
      const res = await api.get('/interviews/dashboard/metrics', { params });
      setMetrics(res.data);
    } catch (error) {
      console.error("Failed to fetch dashboard metrics", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [targetRole]);

  useEffect(() => {
    if (!metrics?.next_interview?.scheduled_at) return;
    
    const calculateTimeLeft = () => {
      const difference = +new Date(metrics.next_interview.scheduled_at + "Z") - +new Date();
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        
        if (days > 0) setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        else setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft('Ready to Join!');
      }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [metrics?.next_interview]);

  const handleSchedule = async () => {
    if (!scheduleDate) return;
    try {
      // Convert local datetime-local value to UTC ISO string
      const dateObj = new Date(scheduleDate);
      const isoDate = dateObj.toISOString();
      
      const url = editScheduleId 
        ? `/interviews/schedule/${editScheduleId}`
        : '/interviews/schedule';
      
      const payload = {
        role: scheduleRole,
        scheduled_at: isoDate
      };

      if (editScheduleId) {
        await api.put(url, payload);
      } else {
        await api.post(url, payload);
      }

      setIsScheduling(false);
      setEditScheduleId(null);
      setScheduleDate('');
      fetchMetrics();
    } catch (error) {
      console.error("Failed to schedule interview", error);
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this interview?')) return;
    try {
      await api.delete(`/interviews/schedule/${id}`);
      fetchMetrics();
    } catch (error) {
      console.error("Failed to delete interview", error);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to delete this interview?")) return;
    try {
      await api.delete(`/interviews/${sessionId}`);
      fetchMetrics();
    } catch (error) {
      console.error("Failed to delete interview", error);
    }
  };

  const handleEditClick = (interview) => {
    setEditScheduleId(interview.id);
    setScheduleRole(interview.role);
    // Format UTC string to datetime-local format (YYYY-MM-DDTHH:mm)
    const dateObj = new Date(interview.scheduled_at + "Z");
    const localStr = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setScheduleDate(localStr);
    setIsScheduling(true);
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading dashboard data...</div>;
  }

  // Fallback to empty if not fetched
  const safeMetrics = metrics || {
    total_interviews: 0,
    average_score: 0,
    top_strength: "Not enough data yet.",
    area_to_improve: "Not enough data yet.",
    recent_sessions: [],
    performance_trend: [],
    skill_radar: []
  };

  const filteredSessions = safeMetrics.recent_sessions.filter(session => {
    const matchesSearch = searchQuery === '' || session.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || session.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="dashboard-content">
      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span>Total Interviews</span>
            <div className="metric-icon"><Video size={20} /></div>
          </div>
          <div className="metric-value">{safeMetrics.total_interviews}</div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Completed or in progress</span>
        </div>
        
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span>Average Score</span>
            <div className="metric-icon"><Award size={20} /></div>
          </div>
          <div className="metric-value">{safeMetrics.average_score}%</div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Across completed interviews</span>
        </div>
        
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span>Total Practice Hours</span>
            <div className="metric-icon"><Clock size={20} /></div>
          </div>
          <div className="metric-value">{(safeMetrics.total_interviews * 0.5).toFixed(1)}h</div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Estimated</span>
        </div>
        
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span>Next Milestone</span>
            <div className="metric-icon"><Target size={20} /></div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Consistent 90%+</div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>Average</span>
              <span>{safeMetrics.average_score}%</span>
            </div>
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${Math.min(safeMetrics.average_score, 100)}%`, background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Layout */}
      <div className="dashboard-bento">
        {/* Chart Section */}
        <div className="glass-panel bento-card span-2">
          <div className="card-heading" style={{fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem'}}>Performance Trend</div>
          <div style={{ width: '100%', height: 300 }}>
            {safeMetrics.performance_trend.length > 0 ? (
              <ResponsiveContainer>
                <AreaChart data={safeMetrics.performance_trend} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--glass-border)" tick={{fill: 'var(--text-secondary)', fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="var(--glass-border)" tick={{fill: 'var(--text-secondary)', fontSize: 12}} axisLine={false} tickLine={false} dx={-10} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--glass-border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6', boxShadow: '0 0 10px #3b82f6' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Complete an interview to see your performance trend!
              </div>
            )}
          </div>
        </div>

        {/* Radar Chart */}
        <div className="glass-panel bento-card span-1">
          <div className="card-heading" style={{fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem'}}>Skill Breakdown</div>
          <div style={{ width: '100%', height: 300 }}>
            {safeMetrics.skill_radar.length > 0 ? (
              <ResponsiveContainer>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={safeMetrics.skill_radar}>
                  <PolarGrid stroke="var(--glass-border)" strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Candidate" dataKey="score" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.4} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Complete an interview to see your skill breakdown!
              </div>
            )}
          </div>
        </div>
        
        {/* AI Feedback Card */}
        <div className="glass-panel bento-card span-1" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
          <div className="card-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            <Sparkles size={18} color="#a855f7" />
            AI Feedback Summary
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ background: '#dcfce7', padding: '0.4rem', borderRadius: '50%' }}><Award size={16} color="#16a34a" /></div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Top Strength</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {safeMetrics.top_strength || "Complete an interview to see strengths."}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ background: '#fef3c7', padding: '0.4rem', borderRadius: '50%' }}><Target size={16} color="#d97706" /></div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Area to Improve</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {safeMetrics.area_to_improve || "Complete an interview to see areas to improve."}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Scheduled Interview */}
        <div className="glass-panel bento-card span-1">
          <div className="card-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <Calendar size={18} color="#3b82f6" />
              Next Up
            </div>
            {!isScheduling && (
              <button 
                onClick={() => {
                  setEditScheduleId(null);
                  setScheduleDate('');
                  setIsScheduling(true);
                }} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Schedule another interview"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
          
          {isScheduling ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <select className="input-field" value={scheduleRole} onChange={e => setScheduleRole(e.target.value)} style={{ padding: '0.5rem' }}>
                <option value="Frontend Developer">Frontend Developer</option>
                <option value="Backend Developer">Backend Developer</option>
                <option value="Full Stack Engineer">Full Stack Engineer</option>
                <option value="System Design">System Design</option>
              </select>
              <input type="datetime-local" className="input-field" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} style={{ padding: '0.5rem' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-primary" onClick={handleSchedule} style={{ flex: 1, padding: '0.5rem' }}>Save</button>
                <button className="btn-secondary" onClick={() => { setIsScheduling(false); setEditScheduleId(null); }} style={{ flex: 1, padding: '0.5rem' }}>Cancel</button>
              </div>
            </div>
          ) : safeMetrics.next_interview ? (
            <div style={{ marginTop: '0.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Mock: {safeMetrics.next_interview.role}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {new Date(safeMetrics.next_interview.scheduled_at + "Z").toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleEditClick(safeMetrics.next_interview)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.2rem' }} title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDeleteSchedule(safeMetrics.next_interview.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: '0.2rem' }} title="Cancel Interview">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div style={{ color: '#3b82f6', fontSize: '1.25rem', fontWeight: 700, margin: '0.5rem 0', fontFamily: 'monospace' }}>
                {timeLeft}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button 
                  className="btn-primary" 
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', flex: 1, opacity: timeLeft === 'Ready to Join!' ? 1 : 0.5 }}
                  disabled={timeLeft !== 'Ready to Join!'}
                  onClick={() => navigate('/interview/setup')}
                >
                  Join Now
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: 'var(--text-secondary)' }}>
              <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>No upcoming interviews scheduled.</div>
              <button className="btn-secondary" onClick={() => setIsScheduling(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                <Plus size={16} /> Schedule One
              </button>
            </div>
          )}
        </div>
        
        {/* AI Action Plan */}
        <div className="glass-panel bento-card span-1" style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(217, 70, 239, 0.05) 100%)', borderColor: 'rgba(168, 85, 247, 0.2)' }}>
          <div className="card-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            <Sparkles size={18} color="#d946ef" />
            AI Action Plan
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Your personalized next steps based on recent interviews:
            </div>
            <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {safeMetrics.action_plan && safeMetrics.action_plan.map((step, index) => (
                <li key={index} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(217, 70, 239, 0.1)', color: '#d946ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>
                    {index + 1}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {step}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-panel bento-card span-2" style={{ overflowX: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div className="card-title" style={{ margin: 0 }}>Recent Sessions</div>
            <div className="table-filters" style={{ margin: 0 }}>
              <select 
                className="filter-select" 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Completed">Completed</option>
                <option value="Processing">Processing</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>
          </div>
          
          <div className="table-container">
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
                {filteredSessions.length > 0 ? (
                  filteredSessions.map((session) => (
                    <tr key={session.id}>
                      <td style={{ fontWeight: 500 }}>{session.role}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{session.date}</td>
                      <td style={{ fontWeight: session.score ? 600 : 400, color: session.score ? 'inherit' : 'var(--text-secondary)' }}>
                        {session.score ? `${session.score}%` : '--'}
                      </td>
                      <td>
                        <span className={`status-badge status-${session.status.toLowerCase().replace(' ', '-')}`}>
                          {session.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon-btn-outline"
                          style={{ padding: '0.25rem 0.5rem', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={() => handleDeleteSession(session.id)}
                          title="Delete Interview"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No sessions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
