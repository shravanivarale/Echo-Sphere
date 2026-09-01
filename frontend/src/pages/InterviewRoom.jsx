import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Square, Volume2, VolumeX, ChevronRight, Clock, Bot, User, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useSpeech } from '../hooks/useSpeech';
import './InterviewRoom.css';

const INTERVIEWER_LABELS = {
  SYSTEM_ARCHITECT: { name: 'Dr. Alex Chen', title: 'System Architect', color: '#3b82f6' },
  PRODUCT_MANAGER:  { name: 'Sarah Mitchell', title: 'Product Manager',  color: '#8b5cf6' },
};

function Timer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  return <span className="timer-display"><Clock size={14} /> {m}:{s}</span>;
}

function SpeakingIndicator({ active, color }) {
  return (
    <div className={`speaking-indicator ${active ? 'active' : ''}`} style={{ '--dot-color': color }}>
      <span /><span /><span />
    </div>
  );
}

function TranscriptEntry({ entry, index }) {
  const isAI = entry.role === 'ai';
  const info = INTERVIEWER_LABELS[entry.interviewer] || INTERVIEWER_LABELS.SYSTEM_ARCHITECT;
  return (
    <motion.div
      className={`transcript-entry ${isAI ? 'ai' : 'candidate'}`}
      initial={{ opacity: 0, x: isAI ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
    >
      <div className="entry-avatar" style={{ background: isAI ? info.color : '#10b981' }}>
        {isAI ? <Bot size={14} /> : <User size={14} />}
      </div>
      <div className="entry-content">
        <div className="entry-meta">
          <span className="entry-speaker">{isAI ? info.name : 'You'}</span>
          {isAI && <span className="entry-role-badge" style={{ color: info.color }}>{info.title}</span>}
        </div>
        <p className="entry-text">{entry.text}</p>
      </div>
    </motion.div>
  );
}

export default function InterviewRoom({ session, onSessionEnd }) {
  const [state, setState] = useState({
    currentQuestion: session.state?.current_question || '',
    activeInterviewer: session.state?.active_interviewer || 'SYSTEM_ARCHITECT',
    turnCount: session.state?.turn_count || 0,
    techScore: session.state?.tech_score || {},
    pmScore: session.state?.pm_score || {},
  });
  const [transcript, setTranscript] = useState(() => {
    // Pre-populate with the opening question from session state
    const q = session.state?.current_question;
    if (q) {
      return [{ role: 'ai', text: q, interviewer: session.state?.active_interviewer || 'SYSTEM_ARCHITECT' }];
    }
    return [];
  });
  const [candidateInput, setCandidateInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [startTime] = useState(Date.now());
  const transcriptEndRef = useRef(null);

  const { isListening, isSpeaking, transcript: sttText, sttAvailable, ttsAvailable, speak, stopSpeaking, startListening, stopListening, resetTranscript } = useSpeech();

  // STT result -> fill input box
  useEffect(() => {
    if (sttText) setCandidateInput(sttText);
  }, [sttText]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Speak the first question when room loads
  useEffect(() => {
    if (state.currentQuestion && ttsEnabled && ttsAvailable) {
      speak(state.currentQuestion);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendAnswer = useCallback(async () => {
    const text = candidateInput.trim();
    if (!text || loading) return;

    stopListening();
    stopSpeaking();
    setError(null);
    setCandidateInput('');
    resetTranscript();

    // Append candidate's answer to local transcript
    setTranscript(prev => [...prev, { role: 'candidate', text }]);
    setLoading(true);

    try {
      const res = await api.sendMessage(session.id, text);
      setState({
        currentQuestion: res.question,
        activeInterviewer: res.active_interviewer,
        turnCount: res.turn_count,
        techScore: res.tech_score || {},
        pmScore: res.pm_score || {},
      });

      // Append AI question to transcript
      const aiEntry = { role: 'ai', text: res.question, interviewer: res.active_interviewer };
      setTranscript(prev => [...prev, aiEntry]);

      // TTS: speak the AI response
      if (ttsEnabled && ttsAvailable) {
        speak(res.question);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [candidateInput, loading, session.id, ttsEnabled, ttsAvailable, speak, stopListening, stopSpeaking, resetTranscript]);

  // Submit on Enter (Shift+Enter = newline)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAnswer();
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end the interview and generate your report?')) return;
    setEnding(true);
    stopSpeaking();
    try {
      const res = await api.endSession(session.id);
      onSessionEnd(res.report);
    } catch (err) {
      setError(err.message);
      setEnding(false);
    }
  };

  const interviewerInfo = INTERVIEWER_LABELS[state.activeInterviewer] || INTERVIEWER_LABELS.SYSTEM_ARCHITECT;
  const isMockMode = import.meta.env.VITE_MOCK_MODE === 'true';

  return (
    <div className="interview-room">
      {/* ── Header ─────────────────────────────────── */}
      <header className="room-header">
        <div className="room-header-left">
          <div className="logo-mark">ES</div>
          <div>
            <p className="room-candidate-name">{session.candidate_name}</p>
            <p className="room-role">{session.role}</p>
          </div>
        </div>

        <div className="room-header-center">
          {isMockMode && <span className="mock-badge">⚡ DEMO MODE</span>}
          <Timer startTime={startTime} />
          <span className="turn-badge">Turn {state.turnCount}</span>
        </div>

        <div className="room-header-right">
          <button
            className="btn-tts-toggle"
            onClick={() => { ttsEnabled ? stopSpeaking() : null; setTtsEnabled(v => !v); }}
            title={ttsEnabled ? 'Mute AI voice' : 'Enable AI voice'}
          >
            {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button className="btn-end-session" onClick={handleEndSession} disabled={ending}>
            {ending ? <Loader2 size={16} className="spin" /> : <Square size={16} />}
            End Interview
          </button>
        </div>
      </header>

      <div className="room-body">
        {/* ── Left panel: Transcript ──────────────── */}
        <div className="transcript-panel">
          <div className="panel-header">
            <h3>Interview Transcript</h3>
            <span className="entries-count">{transcript.length} messages</span>
          </div>
          <div className="transcript-scroll">
            {transcript.map((entry, i) => (
              <TranscriptEntry key={i} entry={entry} index={i} />
            ))}
            {loading && (
              <div className="transcript-entry ai">
                <div className="entry-avatar" style={{ background: interviewerInfo.color }}>
                  <Bot size={14} />
                </div>
                <div className="entry-content">
                  <div className="entry-meta">
                    <span className="entry-speaker">{interviewerInfo.name}</span>
                    <SpeakingIndicator active color={interviewerInfo.color} />
                  </div>
                  <div className="thinking-dots"><span /><span /><span /></div>
                </div>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* ── Right panel: Input + Status ─────────── */}
        <div className="input-panel">
          {/* AI Interviewer Card */}
          <motion.div
            className="interviewer-card"
            style={{ borderColor: interviewerInfo.color }}
            key={state.activeInterviewer}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="interviewer-avatar" style={{ background: interviewerInfo.color }}>
              <Bot size={22} />
            </div>
            <div>
              <p className="interviewer-name">{interviewerInfo.name}</p>
              <p className="interviewer-title">{interviewerInfo.title}</p>
            </div>
            {isSpeaking && <SpeakingIndicator active color={interviewerInfo.color} />}
          </motion.div>

          {/* Current Question */}
          <AnimatePresence mode="wait">
            <motion.div
              className="question-box"
              key={state.currentQuestion}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <p className="question-label">Current Question</p>
              <p className="question-text">{state.currentQuestion || 'Loading first question…'}</p>
            </motion.div>
          </AnimatePresence>

          {/* Error banner */}
          {error && (
            <div className="error-banner">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Answer input */}
          <div className="answer-section">
            <p className="answer-label">Your Answer</p>
            <textarea
              className="answer-textarea"
              placeholder={
                isListening
                  ? '🎙️ Listening… speak now'
                  : sttAvailable
                  ? 'Type your answer or click the mic to speak…'
                  : 'Type your answer here…'
              }
              value={candidateInput}
              onChange={(e) => setCandidateInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || ending}
              rows={5}
            />

            <div className="answer-actions">
              {sttAvailable && (
                <button
                  className={`btn-mic ${isListening ? 'listening' : ''}`}
                  onClick={isListening ? stopListening : startListening}
                  disabled={loading || ending || isSpeaking}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                  {isListening ? 'Stop' : 'Speak'}
                </button>
              )}
              <button
                className="btn-send"
                onClick={handleSendAnswer}
                disabled={!candidateInput.trim() || loading || ending}
              >
                {loading ? <Loader2 size={18} className="spin" /> : <ChevronRight size={18} />}
                {loading ? 'Processing…' : 'Send Answer'}
              </button>
            </div>
          </div>

          {/* Scores */}
          {(state.turnCount > 0) && (
            <div className="score-panel">
              <p className="score-panel-title">Live Scores</p>
              <div className="score-grid">
                {state.techScore?.depth != null && (
                  <div className="score-item">
                    <span className="score-label">Technical Depth</span>
                    <div className="score-bar-wrap">
                      <div className="score-bar" style={{ width: `${state.techScore.depth * 10}%`, background: '#3b82f6' }} />
                    </div>
                    <span className="score-value">{state.techScore.depth}/10</span>
                  </div>
                )}
                {state.pmScore?.depth != null && (
                  <div className="score-item">
                    <span className="score-label">Product Thinking</span>
                    <div className="score-bar-wrap">
                      <div className="score-bar" style={{ width: `${state.pmScore.depth * 10}%`, background: '#8b5cf6' }} />
                    </div>
                    <span className="score-value">{state.pmScore.depth}/10</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
