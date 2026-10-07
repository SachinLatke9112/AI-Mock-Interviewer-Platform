import { useState, useEffect, useRef } from 'react';
import './LiveInterview.css';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Send, CheckCircle2, AlertTriangle, Lightbulb, User,
  Volume2, VolumeX, Mic, MicOff
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import api from '../services/api';

export default function LiveInterview() {
  const { id: sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state || {};

  const [currentQuestion, setCurrentQuestion] = useState(locationState.initialQuestion || null);
  const [answerText, setAnswerText] = useState('');
  const [history, setHistory] = useState([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [summary, setSummary] = useState(null);
  const [sessionDetails, setSessionDetails] = useState({
    role: locationState.role || '',
    level: locationState.level || '',
    focus: locationState.focus || ''
  });

  const [lastSessionId, setLastSessionId] = useState(sessionId);
  if (sessionId !== lastSessionId) {
    setLastSessionId(sessionId);
    setCurrentQuestion(locationState.initialQuestion || null);
    setAnswerText('');
    setHistory([]);
    setIsFinished(false);
    setSummary(null);
    setSessionDetails({
      role: locationState.role || '',
      level: locationState.level || '',
      focus: locationState.focus || ''
    });
  }

  // Audio / Speech States
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const isAudioEnabledRef = useRef(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const answerTextRef = useRef(answerText);
  
  const [micVolume, setMicVolume] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Keep a ref of answerText for the STT callback to use the latest state without causing dependency loops
  useEffect(() => {
    answerTextRef.current = answerText;
  }, [answerText]);

  useEffect(() => {
    isAudioEnabledRef.current = isAudioEnabled;
    if (!isAudioEnabled) {
      window.speechSynthesis.cancel();
      setIsAiSpeaking(false);
    }
  }, [isAudioEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const speakSequence = (text) => {
    if (!isAudioEnabledRef.current || !text) return;
    window.speechSynthesis.cancel();
    
    // Split text into chunks to avoid browser TTS length limits (fixes audio cutoffs)
    const chunks = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
    const validChunks = chunks.map(c => c.trim()).filter(c => c.length > 0);
    
    if (validChunks.length === 0) return;
    
    validChunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      if (index === 0) {
        utterance.onstart = () => setIsAiSpeaking(true);
      }
      if (index === validChunks.length - 1) {
        utterance.onend = () => setIsAiSpeaking(false);
        utterance.onerror = () => setIsAiSpeaking(false);
      }
      window.speechSynthesis.speak(utterance);
    });
  };

  useEffect(() => {
    if (locationState.initialQuestion) {
      // Small delay to allow the page to render and user interaction context to settle
      setTimeout(() => {
        speakSequence(locationState.initialQuestion.text);
      }, 500);
      
      // Clear location state so page refresh fetches fresh from backend
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      navigate('/dashboard');
      return;
    }

    const fetchSession = async () => {
      try {
        const res = await api.get(`/interviews/${sessionId}/current`);
        const data = res.data;
        setSessionDetails({ role: data.role, level: data.level, focus: data.focus });
        setHistory(data.history || []);
        
        if (data.current_question) {
          setCurrentQuestion(data.current_question);
          // Only speak if we didn't just navigate here with initial state
          if (!locationState.initialQuestion && (!data.history || data.history.length === 0)) {
             speakSequence(data.current_question.text);
          }
        } else {
          setIsFinished(true);
        }
      } catch (error) {
        console.error("Failed to fetch session", error);
      }
    };
    
    // Always fetch session to ensure we are up to date (handles page refreshes mid-interview)
    fetchSession();
  }, [sessionId, navigate]);

  // Cleanup on unmount already extracted to top

  const toggleAudio = () => {
    if (!isAudioEnabled && currentQuestion && !isFinished) {
       // if we are turning it on, and there's a question on screen, read it
       const utterance = new SpeechSynthesisUtterance(currentQuestion.text);
       utterance.onstart = () => setIsAiSpeaking(true);
       utterance.onend = () => setIsAiSpeaking(false);
       utterance.onerror = () => setIsAiSpeaking(false);
       window.speechSynthesis.speak(utterance);
    }
    setIsAudioEnabled(!isAudioEnabled);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        // Web Audio API setup for visualizer
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
          if (analyserRef.current !== analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          setMicVolume(avg);
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Cleanup Audio API
          if (audioContextRef.current) {
            audioContextRef.current.close().catch(e => console.log(e));
            audioContextRef.current = null;
          }
          analyserRef.current = null;
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          setMicVolume(0);
          
          // Stop all tracks to release the microphone
          stream.getTracks().forEach(track => track.stop());
          
          setIsTranscribing(true);
          
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          
          try {
            const res = await api.post('/interviews/transcribe', formData);
            
            const data = res.data;
            if (data.text) {
              const currentText = answerTextRef.current;
              setAnswerText(currentText + (currentText && !currentText.endsWith(' ') ? ' ' : '') + data.text);
            }
          } catch (err) {
            console.error("Error sending audio to backend", err);
            alert("Error connecting to transcription service.");
          } finally {
            setIsTranscribing(false);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access denied", err);
        alert("Please allow microphone access to use voice input.");
      }
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerText.trim() || !currentQuestion) return;
    
    // Stop recording if it's active
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    setIsEvaluating(true);
    
    try {
      const response = await api.post(`/interviews/${sessionId}/answer/${currentQuestion.id}`, { answer: answerText });

      const data = response.data;
      
      setHistory(prev => [...prev, {
        question: currentQuestion.text,
        answer: answerText,
        feedback: data.feedback,
        score: data.score
      }]);
      
      setAnswerText('');
      setCurrentQuestion(data.next_question);
      
      speakSequence(`${data.feedback} ... ${data.next_question.text}`);
      
    } catch (err) {
      console.error(err);
      alert('Error evaluating answer.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleFinishInterview = async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    window.speechSynthesis.cancel();
    setIsAiSpeaking(false);
    setIsEvaluating(true);
    
    try {
      const response = await api.post(`/interviews/${sessionId}/finish`);

      const data = response.data;
      setSummary(data);
      setIsFinished(true);
      speakSequence("Interview complete. Your report is ready.");
      
    } catch (err) {
      console.error(err);
      alert('Error finishing interview.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleDeleteInterview = async () => {
    if (window.confirm("Are you sure you want to delete this interview? This action cannot be undone.")) {
      try {
        await api.delete(`/interviews/${sessionId}`);
        navigate('/dashboard');
      } catch (err) {
        console.error("Failed to delete interview", err);
        alert("Failed to delete interview.");
      }
    }
  };

  if (!currentQuestion && !isFinished) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading interview data...</div>;
  }

  const scoreData = summary ? [
    { name: 'Score', value: summary.overall_score, color: '#3b82f6' },
    { name: 'Remaining', value: 100 - summary.overall_score, color: '#e2e8f0' }
  ] : [];

  return (
    <div className="live-interview-container" style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <header className="live-header" style={{ padding: '1rem 2rem', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="back-btn" onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={20} color="var(--text-primary)" />
          </button>
          <h1 className="header-title" style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-primary)' }}>
            Interview for {sessionDetails.role}
          </h1>
          {!isFinished && (
            <button 
              onClick={toggleAudio} 
              className={`audio-toggle-btn ${isAudioEnabled ? 'active' : ''}`}
              title={isAudioEnabled ? "Mute Interviewer" : "Unmute Interviewer"}
            >
              {isAudioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {!isFinished && (
            <button className="btn-secondary" onClick={handleFinishInterview} disabled={isEvaluating} style={{ padding: '0.5rem 1rem' }}>
              End Interview
            </button>
          )}
        </div>
      </header>

      <main className="live-main-content" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        
        {isFinished && summary ? (
          <div className="results-container glass-panel" style={{ padding: '2rem', borderRadius: '1rem' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Interview Completed</h2>
            
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                <h3>Overall Score</h3>
                <div style={{ height: '160px', marginTop: '1rem', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={scoreData} cx="50%" cy="50%" innerRadius={55} outerRadius={70} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                        {scoreData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {Math.round(summary.overall_score)}%
                  </div>
                </div>
                {summary.readiness_verdict && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Verdict</h4>
                    <div style={{ fontWeight: 600, color: 'var(--primary-color)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{summary.readiness_verdict}</div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{summary.readiness_summary}</p>
                  </div>
                )}
              </div>
              
              <div style={{ flex: 2, minWidth: '300px' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
                    <CheckCircle2 size={20} /> Key Strengths
                  </h3>
                  <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                    {summary.strengths.map((s, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{s}</li>)}
                  </ul>
                </div>
                
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
                    <AlertTriangle size={20} /> Areas for Improvement
                  </h3>
                  <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                    {summary.improvements.map((s, i) => (
                      <li key={i} style={{ marginBottom: '1rem' }}>
                        <strong>{typeof s === 'string' ? s : s.issue}</strong>
                        {typeof s === 'object' && s.action_item && (
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                            <span style={{ fontWeight: 500, color: '#f59e0b' }}>Action:</span> {s.action_item}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {summary.recommendation && (
                  <div style={{ marginTop: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: '0.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', fontSize: '1rem' }}>
                      <Lightbulb size={18} /> Next Steps Recommendation
                    </h3>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>{summary.recommendation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="interview-split-layout" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
            {/* AI Avatar Side (Webcam mockup) */}
            <div className="ai-video-container glass-panel" style={{ flex: '1', minWidth: '300px', maxWidth: '400px', borderRadius: '1rem', overflow: 'hidden', position: 'sticky', top: '2rem' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className={`status-dot ${isEvaluating ? 'evaluating' : 'listening'}`}></div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{isEvaluating ? 'AI is thinking...' : 'AI is listening...'}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                  HD
                </div>
              </div>
              <div className="avatar-wrapper" style={{ position: 'relative', width: '100%', aspectRatio: '1/1' }}>
                <img 
                  src="/images/ai-recruiter.jpg" 
                  alt="AI Recruiter" 
                  className={`ai-avatar-img ${isEvaluating ? 'thinking' : ''} ${isAiSpeaking ? 'speaking' : ''}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Voice Visualizer Mockup */}
                <div className="voice-visualizer" style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', opacity: (isAiSpeaking || isEvaluating) ? 1 : 0, transition: 'opacity 0.3s' }}>
                  {[1, 2, 3, 4, 5].map((bar) => (
                    <div 
                      key={bar} 
                      className={`visualizer-bar ${isAiSpeaking ? 'active' : ''}`}
                      style={{ 
                        width: '4px', 
                        height: isEvaluating ? '4px' : '4px', // The CSS animation will override this when active
                        background: 'rgba(255,255,255,0.8)', 
                        borderRadius: '2px',
                        transition: 'height 0.2s ease'
                      }} 
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Chat & Interaction Side */}
            <div className="interview-chat-container" style={{ flex: '2', minWidth: '350px' }}>
              <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                {history.map((item, idx) => (
                  <div key={idx} className="history-item" style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem' }}>
                    <div className="q-block" style={{ marginBottom: '1rem' }}>
                      <strong><User size={16} style={{ display: 'inline', marginRight: '0.5rem' }}/> AI Interviewer:</strong>
                      <p style={{ marginTop: '0.5rem' }}>{item.question}</p>
                    </div>
                    <div className="a-block" style={{ marginBottom: '1rem', paddingLeft: '1.5rem', borderLeft: '3px solid var(--primary-color)' }}>
                      <strong>You:</strong>
                      <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>{item.answer}</p>
                    </div>
                    <div className="f-block" style={{ background: 'rgba(129, 140, 248, 0.1)', padding: '1rem', borderRadius: '0.5rem' }}>
                      <strong style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Lightbulb size={16} /> AI Feedback (Score: {item.score}/100)
                      </strong>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>{item.feedback}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="current-interaction glass-panel" style={{ padding: '2rem', borderRadius: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                    AI
                  </div>
                  <h3 style={{ margin: 0 }}>{currentQuestion.text}</h3>
                </div>
                
                <div className="answer-box">
                  <textarea 
                    className="input-field"
                    placeholder="Type or speak your answer here..."
                    rows={5}
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    style={{ width: '100%', resize: 'vertical', padding: '1rem', marginBottom: '1rem' }}
                    disabled={isEvaluating}
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button 
                      className={`record-btn ${isRecording ? 'recording' : ''}`}
                      onClick={toggleRecording}
                      disabled={isEvaluating || isTranscribing}
                      title={isRecording ? "Stop Recording" : "Start Recording"}
                    >
                      {isRecording ? (
                        <>
                          <MicOff size={18} /> Stop Recording
                          <div style={{ display: 'flex', gap: '3px', alignItems: 'center', marginLeft: '0.5rem', height: '20px' }}>
                            {[1, 2, 3, 4].map(i => (
                               <div key={i} style={{
                                 width: '3px',
                                 backgroundColor: '#ef4444',
                                 height: `${Math.max(4, (micVolume / 255) * 20 * (Math.random() * 0.5 + 0.5))}px`,
                                 transition: 'height 0.05s ease',
                                 borderRadius: '2px'
                               }} />
                            ))}
                          </div>
                        </>
                      ) : isTranscribing ? (
                        <>
                          <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div> Transcribing...
                        </>
                      ) : (
                        <>
                          <Mic size={18} /> Record Answer
                        </>
                      )}
                    </button>
                    
                    <button 
                      className="btn-primary" 
                      onClick={handleSubmitAnswer}
                      disabled={isEvaluating || isTranscribing || !answerText.trim()}
                      style={{ padding: '0.75rem 1.5rem', display: 'flex', gap: '0.5rem' }}
                    >
                      {isEvaluating ? 'Evaluating...' : 'Submit Answer'} 
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
