import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell } from 'recharts';
import { useState, useEffect } from 'react';
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
            <span className="custom-tooltip-item-value">{entry.value}</span>
          </div>
        ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function AnalyticsTab({ targetRole }) {
  const [longTermTrend, setLongTermTrend] = useState([]);
  const [timeSpentData, setTimeSpentData] = useState([]);
  const [radarData, setRadarData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const params = {};
        if (targetRole && targetRole !== 'All' && targetRole !== 'All Roles') {
          params.role = targetRole;
        }
        
        const res = await api.get('/interviews/dashboard/analytics', { params });
        
        const data = res.data;
        setLongTermTrend(data.longTermTrend);
        setTimeSpentData(data.timeSpentData);
        setRadarData(data.radarData);
      } catch (error) {
        console.error("Failed to fetch analytics data", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [targetRole]);

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="pulse" style={{ color: 'var(--primary)', fontWeight: 600 }}>Loading analytics...</div>
      </div>
    );
  }

  // Pre-defined colors for bar chart for a vibrant look
  const barColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

  return (
    <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Overall Progress Area Chart */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>Overall Progress Trend</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>Track your score improvement over time compared to platform averages.</p>
        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer>
            <AreaChart data={longTermTrend} margin={{ top: 20, right: 20, left: -20, bottom: 10 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--glass-border)" tick={{fill: 'var(--text-secondary)', fontSize: 13}} axisLine={false} tickLine={false} dy={10} />
              <YAxis stroke="var(--glass-border)" tick={{fill: 'var(--text-secondary)', fontSize: 13}} axisLine={false} tickLine={false} dx={-10} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--glass-border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }} />
              <Area type="monotone" dataKey="average" name="Platform Avg" stroke="var(--text-secondary)" strokeWidth={2} fillOpacity={1} fill="url(#colorAvg)" />
              <Area type="monotone" dataKey="score" name="Your Score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6', boxShadow: '0 0 10px #3b82f6' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Questions Answered Bar Chart */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>Questions Activity</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>Volume of questions answered across recent sessions.</p>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={timeSpentData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#4c1d95" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--glass-border)" tick={{fill: 'var(--text-secondary)', fontSize: 13}} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="var(--glass-border)" tick={{fill: 'var(--text-secondary)', fontSize: 13}} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'var(--glass-bg)'}} />
                <Bar dataKey="questions" name="Questions" radius={[6, 6, 0, 0]} barSize={36}>
                  {timeSpentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Competency Radar Chart */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>Competency Radar</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>Your relative strengths across different technical domains.</p>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="var(--glass-border)" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickCount={6} />
                <Radar name="Your Competency" dataKey="A" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.4} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.9rem', color: 'var(--text-secondary)', paddingTop: '10px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
    </div>
  );
}
