import { Shield, FileText, Bell } from 'lucide-react';
import { useState } from 'react';

export default function SettingsTab() {
  const [weeklyReport, setWeeklyReport] = useState(true);
  return (
    <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>Account Settings</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Manage your security, interview defaults, and notifications.</p>
      </div>

      <div className="dashboard-bento" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        
        {/* Interview Preferences Card */}
        <div className="glass-panel bento-card span-1">
          <div className="card-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
            <FileText size={20} color="var(--accent-primary)" />
            Interview Defaults
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>These settings will be used as the default for your new practice sessions.</p>
          
          <form>
            <div className="input-group">
              <label>Target Role</label>
              <select className="input-field">
                <option>Frontend Engineer</option>
                <option selected>Full Stack Developer</option>
                <option>Backend Engineer</option>
                <option>Engineering Manager</option>
              </select>
            </div>
            <div className="input-group">
              <label>Experience Level</label>
              <select className="input-field">
                <option>Junior (0-2 years)</option>
                <option selected>Mid-Level (3-5 years)</option>
                <option>Senior (5+ years)</option>
              </select>
            </div>
          </form>
        </div>

        {/* Security & Password Card */}
        <div className="glass-panel bento-card span-1">
          <div className="card-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
            <Shield size={20} color="var(--accent-primary)" />
            Security
          </div>
          
          <form>
            <div className="input-group">
              <label>Current Password</label>
              <input type="password" className="input-field" placeholder="••••••••" />
            </div>
            <div className="input-group">
              <label>New Password</label>
              <input type="password" className="input-field" placeholder="••••••••" />
            </div>
            <div className="input-group">
              <label>Confirm New Password</label>
              <input type="password" className="input-field" placeholder="••••••••" />
            </div>
          </form>
        </div>

        {/* Notifications Card */}
        <div className="glass-panel bento-card span-2">
          <div className="card-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
            <Bell size={20} color="var(--accent-primary)" />
            Notifications
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Weekly Progress Report</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Receive a weekly email summarizing your interview performance.</div>
            </div>
            <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
              <input 
                type="checkbox" 
                checked={weeklyReport} 
                onChange={(e) => setWeeklyReport(e.target.checked)} 
                style={{ opacity: 0, width: 0, height: 0 }} 
              />
              <span style={{ 
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundColor: weeklyReport ? 'var(--accent-primary)' : '#4b5563', 
                borderRadius: '24px', transition: '.4s' 
              }}></span>
              <span style={{ 
                position: 'absolute', content: '""', height: '18px', width: '18px', left: '3px', bottom: '3px', 
                backgroundColor: 'white', transition: '.4s', borderRadius: '50%', 
                transform: weeklyReport ? 'translateX(20px)' : 'translateX(0px)' 
              }}></span>
            </label>
          </div>
        </div>

      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
        <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '0.75rem 2rem' }}>Cancel</button>
        <button type="button" className="btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }}>Save Settings</button>
      </div>

    </div>
  );
}
