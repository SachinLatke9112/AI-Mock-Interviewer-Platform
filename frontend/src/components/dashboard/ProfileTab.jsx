import { Upload, Camera, FileText, User, Medal, Target, Flame, Trophy, Lock } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

export default function ProfileTab({ onProfileUpdate }) {
  const [achievements, setAchievements] = useState([]);
  const [profile, setProfile] = useState({ name: '', email: '', bio: '', resume_filename: null });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const res = await api.get('/profile/achievements');
        setAchievements(res.data);
      } catch (error) {
        console.error("Failed to fetch achievements", error);
      }
    };
    
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profile/me');
        const data = res.data;
        if (data.avatar_url) {
          data.avatar_url = `${data.avatar_url.split('?')[0]}?t=${new Date().getTime()}`;
        }
        setProfile({
          name: data.name || '',
          email: data.email || '',
          bio: data.bio || '',
          resume_filename: data.resume_filename || null,
          avatar_url: data.avatar_url || null
        });
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };
    
    fetchAchievements();
    fetchProfile();
  }, []);

  const getIcon = (iconName, unlocked) => {
    const color = unlocked ? "#fbbf24" : "var(--text-secondary)";
    switch(iconName) {
      case 'Medal': return <Medal size={32} color={color} />;
      case 'Target': return <Target size={32} color={color} />;
      case 'Flame': return <Flame size={32} color={color} />;
      default: return <Trophy size={32} color={color} />;
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await api.put('/profile/me', {
        name: profile.name,
        email: profile.email,
        bio: profile.bio
      });
      if (onProfileUpdate) {
        onProfileUpdate({ name: profile.name });
      }
    } catch (error) {
      console.error("Failed to save profile", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/profile/resume', formData);
      setProfile(prev => ({ ...prev, resume_filename: res.data.resume_filename }));
    } catch (error) {
      console.error("Failed to upload resume", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/profile/avatar', formData);
      const updatedAvatarUrl = `${res.data.avatar_url}?t=${new Date().getTime()}`;
      setProfile(prev => ({ ...prev, avatar_url: updatedAvatarUrl }));
      if (onProfileUpdate) {
        onProfileUpdate({ avatar_url: updatedAvatarUrl });
      }
    } catch (error) {
      console.error("Failed to upload avatar", error);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  return (
    <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>My Profile</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Manage your public profile and resume.</p>
      </div>

      <div className="dashboard-bento" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        
        {/* Personal Details Card */}
        <div className="glass-panel bento-card span-1">
          <div className="card-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
            <User size={20} color="var(--accent-primary)" />
            Personal Details
          </div>
          
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', alignItems: 'center' }}>
            <div onClick={() => avatarInputRef.current?.click()} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', background: '#e5e7eb', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: isUploadingAvatar ? 0.5 : 1 }} className="avatar-upload">
              <img src={profile.avatar_url ? `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}${profile.avatar_url}` : "/images/candidate.jpg"} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} className="avatar-overlay">
                <Camera color="#fff" size={24} />
              </div>
            </div>
            <div>
              <button className="btn-secondary" onClick={() => avatarInputRef.current?.click()} disabled={isUploadingAvatar} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', width: 'auto' }}>
                {isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}
              </button>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>JPG or PNG. Max size 2MB.</p>
              <input type="file" accept="image/png, image/jpeg, image/jpg" ref={avatarInputRef} style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </div>
          </div>

          <form>
            <div className="input-group">
              <label>Full Name</label>
              <input type="text" className="input-field" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
            </div>
            <div className="input-group">
              <label>Email Address</label>
              <input type="email" className="input-field" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} />
            </div>
            <div className="input-group">
              <label>Bio (Optional)</label>
              <textarea className="input-field" rows="3" placeholder="A brief summary of your background..." value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})}></textarea>
            </div>
          </form>
        </div>

        {/* Resume Management Card */}
        <div className="glass-panel bento-card span-1">
          <div className="card-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
            <Upload size={20} color="var(--accent-primary)" />
            Resume Management
          </div>
          
          <div className="file-drop-zone" onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed var(--glass-border)', padding: '2rem', borderRadius: '12px', textAlign: 'center', background: 'var(--bg-dark)', cursor: 'pointer', transition: 'all 0.2s', opacity: isUploading ? 0.5 : 1 }}>
            <Upload size={32} color="var(--text-secondary)" style={{ margin: '0 auto 1rem' }} />
            <div style={{ fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{isUploading ? 'Uploading...' : 'Click to upload'}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>PDF up to 5MB</div>
            <input type="file" accept=".pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handleResumeUpload} />
          </div>
          
          {profile.resume_filename && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={20} color="#3b82f6" />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{profile.resume_filename}</div>
              </div>
            </div>
            <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'auto' }}>Replace</button>
          </div>
          )}
        </div>

      </div>

      {/* Trophy Case */}
      <div className="glass-panel bento-card" style={{ width: '100%', marginTop: '1rem', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)', borderColor: 'rgba(251, 191, 36, 0.2)' }}>
        <div className="card-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
          <Trophy size={20} color="#fbbf24" />
          Trophy Case
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {achievements.map((ach) => (
            <div key={ach.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', opacity: ach.unlocked ? 1 : 0.6, position: 'relative', overflow: 'hidden' }}>
              {!ach.unlocked && (
                <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
                  <Lock size={14} color="var(--text-secondary)" />
                </div>
              )}
              <div style={{ 
                width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: ach.unlocked ? 'rgba(251, 191, 36, 0.15)' : 'var(--bg-dark)',
                boxShadow: ach.unlocked ? '0 0 20px rgba(251, 191, 36, 0.2)' : 'none'
              }}>
                {getIcon(ach.icon, ach.unlocked)}
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: ach.unlocked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{ach.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{ach.description}</div>
                {ach.unlockedAt && (
                  <div style={{ fontSize: '0.65rem', color: '#fbbf24', marginTop: '0.5rem', fontWeight: 600 }}>Unlocked {ach.unlockedAt}</div>
                )}
              </div>
            </div>
          ))}
          {achievements.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading achievements...</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
        <button type="button" className="btn-primary" onClick={handleSaveProfile} disabled={isSaving} style={{ width: 'auto', padding: '0.75rem 2rem' }}>
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

    </div>
  );
}
