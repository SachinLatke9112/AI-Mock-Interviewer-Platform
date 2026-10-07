import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewInterviewSetup from './pages/NewInterviewSetup';
import LiveInterview from './pages/LiveInterview';
import InterviewReport from './pages/InterviewReport';

function PublicNavbar() {
  const [isLightMode, setIsLightMode] = useState(() => {
    return document.documentElement.classList.contains('light-theme');
  });

  useEffect(() => {
    const checkTheme = () => {
      setIsLightMode(document.documentElement.classList.contains('light-theme'));
    };
    window.addEventListener('storage', checkTheme);
    return () => window.removeEventListener('storage', checkTheme);
  }, []);

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

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">
        <span className="text-gradient">InterviewPilot</span> AI
      </Link>
      <div className="nav-links">
        <button 
          className="icon-btn-outline" 
          onClick={toggleTheme}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          title="Toggle Theme"
        >
          {isLightMode ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <Link to="/login" className="nav-link">Log In</Link>
        <Link to="/register" className="btn-primary" style={{ padding: '0.5rem 1rem', width: 'auto' }}>Sign Up</Link>
      </div>
    </nav>
  );
}

function App() {
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.documentElement.classList.add('light-theme');
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className="app-container">
            <PublicNavbar />
            <main className="main-content">
              <div className="orb orb-1"></div>
              <div className="orb orb-2"></div>
              <Home />
            </main>
          </div>
        } />
        <Route path="/login" element={
          <div className="app-container">
            <PublicNavbar />
            <main className="main-content">
              <div className="orb orb-1"></div>
              <div className="orb orb-2"></div>
              <Login />
            </main>
          </div>
        } />
        <Route path="/register" element={
          <div className="app-container">
            <PublicNavbar />
            <main className="main-content">
              <div className="orb orb-1"></div>
              <div className="orb orb-2"></div>
              <Register />
            </main>
          </div>
        } />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/interview/setup" element={<NewInterviewSetup />} />
        <Route path="/interview/:id" element={<LiveInterview />} />
        <Route path="/interview/:id/report" element={<InterviewReport />} />
      </Routes>
    </Router>
  );
}

export default App;
