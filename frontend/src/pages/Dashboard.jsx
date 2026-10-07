import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Video, 
  BarChart3, 
  Settings, 
  LogOut,
  Search,
  Bell,
  User,
  Plus,
  ChevronDown,
  Sun,
  Moon,
  Mic,
  Flame,
  Play
} from 'lucide-react';

import api from '../services/api';
import OverviewTab from '../components/dashboard/OverviewTab';
import InterviewsTab from '../components/dashboard/InterviewsTab';
import AnalyticsTab from '../components/dashboard/AnalyticsTab';
import SettingsTab from '../components/dashboard/SettingsTab';
import ProfileTab from '../components/dashboard/ProfileTab';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [targetRole, setTargetRole] = useState('All');
  const [sidebarData, setSidebarData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [scheduledInterviews, setScheduledInterviews] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLightMode, setIsLightMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      if (saved === 'light') document.documentElement.classList.add('light-theme');
      return saved === 'light';
    }
    return document.documentElement.classList.contains('light-theme');
  });
  
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    
    const fetchSidebarData = async () => {
      try {
        const res = await api.get('/interviews/sidebar');
        setSidebarData(res.data);
      } catch (error) {
        console.error("Failed to fetch sidebar data", error);
      }
    };
    
    const fetchProfileData = async () => {
      try {
        const res = await api.get('/profile/me');
        const data = res.data;
        if (data.avatar_url) {
          data.avatar_url = `${data.avatar_url}?t=${new Date().getTime()}`;
        }
        setUserProfile(data);
      } catch (error) {
        console.error("Failed to fetch profile data", error);
      }
    };
    
    const fetchScheduled = async () => {
      try {
        const res = await api.get('/interviews/scheduled');
        setScheduledInterviews(res.data);
      } catch (error) {
        console.error("Failed to fetch scheduled interviews", error);
      }
    };
    
    fetchSidebarData();
    fetchProfileData();
    fetchScheduled();
    
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [navigate]);

    const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (e) {}
    navigate('/login');
  };

  const toggleTheme = () => {
    if (isLightMode) {
      document.documentElement.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
      setIsLightMode(false);
    } else {
      document.documentElement.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
      setIsLightMode(true);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab targetRole={targetRole} searchQuery={searchQuery} />;
      case 'interviews':
        return <InterviewsTab targetRole={targetRole} searchQuery={searchQuery} />;
      case 'analytics':
        return <AnalyticsTab targetRole={targetRole} />;
      case 'settings':
        return <SettingsTab />;
      case 'profile':
        return <ProfileTab onProfileUpdate={(updates) => setUserProfile(prev => ({...prev, ...updates}))} />;
      default:
        return <OverviewTab targetRole={targetRole} searchQuery={searchQuery} />;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <Link to="/" className="sidebar-logo">
          <span className="text-gradient" style={{ background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>InterviewPilot</span> AI
        </Link>
        
        <nav className="sidebar-nav">
          <div style={{ marginBottom: '1.5rem', padding: '0 0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>Target Role</label>
            <div style={{ position: 'relative' }}>
              <select 
                className="filter-select"
                style={{ width: '100%', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '0.5rem', outline: 'none', cursor: 'pointer' }}
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              >
                <option value="All" style={{ background: '#1f2937', color: '#fff', padding: '0.5rem' }}>All Roles</option>
                <option value="Frontend Developer" style={{ background: '#1f2937', color: '#fff', padding: '0.5rem' }}>Frontend Developer</option>
                <option value="Backend Developer" style={{ background: '#1f2937', color: '#fff', padding: '0.5rem' }}>Backend Developer</option>
                <option value="Full Stack Engineer" style={{ background: '#1f2937', color: '#fff', padding: '0.5rem' }}>Full Stack Engineer</option>
                <option value="System Design" style={{ background: '#1f2937', color: '#fff', padding: '0.5rem' }}>System Design</option>
              </select>
            </div>
          </div>
          
          <button 
            className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button 
            className={`sidebar-link ${activeTab === 'interviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('interviews')}
          >
            <Video size={20} />
            Interviews
          </button>
          <button 
            className={`sidebar-link ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={20} />
            Analysis
          </button>
          <button 
            className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            Settings
          </button>
          
          <div className="readiness-widget">
            <div className="pulse-ring-container">
              <div className="pulse-ring"></div>
              <div className="pulse-glow" style={{ background: sidebarData?.streak > 0 ? '#f97316' : '#818cf8' }}></div>
              <div className="pulse-score">
                {sidebarData?.streak > 0 ? (
                  <Flame size={24} color="#f97316" />
                ) : (
                  "0%"
                )}
              </div>
            </div>
            <div className="readiness-text">
              {sidebarData?.streak > 0 ? `${sidebarData.streak}-Day Streak!` : "Ready to Start?"}
            </div>
            <div className="readiness-subtext">
              {sidebarData?.streak > 0 ? "Keep up the momentum" : "Start your prep today"}
            </div>
            
            {sidebarData?.in_progress_session_id ? (
              <button 
                className="quick-pitch-btn" 
                style={{ background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)', animation: 'pulse 2s infinite' }}
                onClick={() => navigate(`/interview/${sidebarData.in_progress_session_id}`)}
              >
                <Play size={16} color="#fff" fill="#fff" />
                Resume Interview
              </button>
            ) : (
              <button className="quick-pitch-btn" onClick={() => navigate('/interview/setup')}>
                <Mic size={16} color="#fff" />
                Quick Pitch
              </button>
            )}
          </div>
          
          <div style={{ paddingBottom: '1rem' }}>
            <button 
              className="sidebar-link" 
              onClick={handleLogout}
              style={{border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'center', fontSize: '1rem', color: '#fff', borderRadius: '9999px', justifyContent: 'center'}}
            >
              <LogOut size={18} />
              Log Out
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Remove orbs in premium theme */}
        {!isLightMode && (
          <>
            <div className="orb orb-1" style={{ top: '-10%', right: '10%', left: 'auto' }}></div>
            <div className="orb orb-2" style={{ bottom: '-10%', left: '10%', right: 'auto' }}></div>
          </>
        )}
        
        {/* Header */}
        <header className="dashboard-header" style={{ borderBottom: isLightMode ? 'none' : undefined, background: isLightMode ? 'transparent' : undefined }}>
          <div className="header-search">
            <Search size={18} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Search interviews, feedback..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="header-actions">
            <button className="btn-primary" onClick={() => navigate('/interview/setup')}>
              <Plus size={18} />
              New Interview
            </button>
            
            <button 
              className="icon-btn-outline" 
              onClick={toggleTheme}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              {isLightMode ? <Moon size={24} /> : <Sun size={24} />}
            </button>
            
            <div className="notification-bell" ref={notificationRef} style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <Bell size={24} />
                {scheduledInterviews.length > 0 && <div className="notification-dot"></div>}
              </button>
              
              <div className={`dropdown-menu ${showNotifications ? 'show' : ''}`} style={{ width: '300px', right: 0 }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>
                  Notifications
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {scheduledInterviews.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      No new notifications
                    </div>
                  ) : (
                    scheduledInterviews.map((interview) => (
                      <div key={interview.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                          Upcoming {interview.role} Interview
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          Scheduled for: {new Date(interview.scheduled_at + "Z").toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            <div className="profile-dropdown" ref={dropdownRef}>
              <button className="profile-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <img 
                  src={userProfile?.avatar_url ? `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}${userProfile.avatar_url}` : "/images/candidate.jpg"} 
                  alt="Profile" 
                  className="avatar-img"
                  style={{ objectFit: 'cover' }}
                />
                <span style={{ fontWeight: 500 }}>{userProfile?.name || 'Loading...'}</span>
                <ChevronDown size={16} color="var(--text-secondary)" />
              </button>
              
              <div className={`dropdown-menu ${showProfileMenu ? 'show' : ''}`}>
                <button 
                  className="dropdown-item" 
                  onClick={() => { setActiveTab('profile'); setShowProfileMenu(false); }}
                  style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                  <User size={16} /> Profile
                </button>
                <button 
                  className="dropdown-item" 
                  onClick={() => { setActiveTab('settings'); setShowProfileMenu(false); }}
                  style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                  <Settings size={16} /> Settings
                </button>
                <button className="dropdown-item" onClick={handleLogout} style={{ color: '#ef4444' }}>
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Tab Content */}
        {renderTabContent()}

      </main>
    </div>
  );
}
