import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="hero-section">
      <div className="hero-content">
        <h1 className="hero-title">Master Your Next Interview with <span className="text-gradient">AI</span></h1>
        <p className="hero-subtitle">
          Practice technical questions, get real-time feedback, and boost your confidence before the big day. Our AI interviewer simulates real-world scenarios tailored to your experience.
        </p>
        <div className="hero-buttons">
          <Link to="/register" className="btn-primary">Start Practicing Free</Link>
          <Link to="/login" className="btn-secondary">View Demo</Link>
        </div>
      </div>
      <div className="hero-image-container">
        <img src="/images/hero.jpg" alt="AI Interview Illustration" className="hero-image" />
        <div className="hero-image-glow"></div>
      </div>
    </div>
  );
}
