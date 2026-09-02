import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Square,
  Volume2,
  VolumeX,
  ChevronRight,
  Clock,
  Bot,
  User,
  AlertCircle,
  PauseCircle,
  Play,
  RotateCcw,
  Radio,
  Cpu,
  Layers,
  Loader2,
  Sparkles,
  Volume1,
  Activity,
} from 'lucide-react';
import { api } from '../services/api';
import { useSpeech } from '../hooks/useSpeech';
import { agoraVoice } from '../services/agoraVoice';
import './InterviewRoom.css';

const PANEL_MEMBERS = {
  SYSTEM_ARCHITECT: {
    name: 'Dr. Alex Chen',
    title: 'System Architect',
    focus: 'Distributed Systems & Scalability',
    color: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.3)',
  },
  PRODUCT_MANAGER: {
    name: 'Sarah Mitchell',
    title: 'Product Manager',
    focus: 'Metrics, Scoping & User ROI',
    color: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.3)',
  },
};

function Timer({ startTime, isPaused }) {
  const [elapsed, setElapsed] = useState(0);
  const pausedTimeRef = useRef(0);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime - pausedTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startTime, isPaused]);

  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  return (
    <span className="timer-display">
      <Clock size={14} /> {m}:{s}
    </span>
  );
}

function SpeakingIndicator({ active, color }) {
  return (
    <div className={`speaking-indicator ${active ? 'active' : ''}`} style={{ '--dot-color': color }}>
      <span />
      <span />
      <span />
    </div>
  );
}

function TranscriptEntry({ entry, index }) {
  if (entry.role === 'orchestrator') {
    return (
      <motion.div
        className="orchestrator-entry"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Cpu size={14} color="#a78bfa" />
        <span>{entry.text}</span>
      </motion.div>
    );
  }

  const isAI = entry.role === 'ai';
  const info = PANEL_MEMBERS[entry.interviewer] || PANEL_MEMBERS.SYSTEM_ARCHITECT;

  return (
    <motion.div
      className={`transcript-entry ${isAI ? 'ai' : 'candidate'}`}
      initial={{ opacity: 0, x: isAI ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
    >
      <div
        className="entry-avatar"
        style={{ background: isAI ? info.color : '#10b981' }}
      >
        {isAI ? <Bot size={15} /> : <User size={15} />}
      </div>
      <div className="entry-content">
        <div className="entry-meta">
          <span className="entry-speaker">{isAI ? info.name : 'You'}</span>
          {isAI && (
            <span className="entry-role-badge" style={{ color: info.color }}>
              {info.title}
            </span>
          )}
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
    orchestratorDecision: session.state?.orchestrator_decision || 'Orchestrator Panel Supervisor Active',
    turnCount: session.state?.turn_count || 0,
    techScore: session.state?.tech_score || {},
    pmScore: session.state?.pm_score || {},
  });

  const [transcript, setTranscript] = useState(() => {
    const q = session.state?.current_question;
    const initialArr = [];
    if (session.state?.orchestrator_decision) {
      initialArr.push({ role: 'orchestrator', text: session.state.orchestrator_decision });
    }
    if (q) {
      initialArr.push({
        role: 'ai',
        text: q,
        interviewer: session.state?.active_interviewer || 'SYSTEM_ARCHITECT',
      });
    }
    return initialArr;
  });

  const [candidateInput, setCandidateInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [agoraStatus, setAgoraStatus] = useState('CONNECTED (AGORA VOICE ENGINE)');
  const [startTime] = useState(Date.now());
  const transcriptEndRef = useRef(null);

  const handleSendAnswerRef = useRef(null);

  const {
    isListening,
    isSpeaking,
    isHandsFree,
    isPaused,
    hasMicPermission,
    micStatus,
    audioUnlocked,
    micLevel,
    transcript: sttText,
    autoSubmitCountdown,
    sttAvailable,
    ttsAvailable,
    audioInputs,
    selectedMicId,
    setSelectedMicId,
    refreshDevices,
    unlockAudio,
    requestMicAccess,
    speak,
    testSpeech,
    stopSpeaking,
    startListening,
    stopListening,
    toggleHandsFree,
    pauseInterview,
    resumeInterview,
    resetTranscript,
  } = useSpeech({
    onAutoSubmit: (text) => handleSendAnswerRef.current?.(text),
  });

  // Initialize Agora RTC Voice Channel with production backend token
  useEffect(() => {
    let cancelled = false;

    async function initAgora() {
      try {
        const agoraRes = await api.getAgoraToken(session.id);
        if (cancelled) return;
        if (agoraRes && agoraRes.app_id) {
          await agoraVoice.joinChannel({
            appId: agoraRes.app_id,
            channel: agoraRes.channel || `echosphere_${session.id.substring(0, 8)}`,
            token: agoraRes.token,
            uid: agoraRes.uid,
          });
        } else {
          agoraVoice.joinChannel({
            appId: 'MOCK_AGORA_APP_ID',
            channel: `echosphere_${session.id.substring(0, 8)}`,
            token: 'MOCK_TOKEN',
          });
        }
      } catch (err) {
        console.warn('Agora token fetch notice:', err);
        agoraVoice.joinChannel({
          appId: 'MOCK_AGORA_APP_ID',
          channel: `echosphere_${session.id.substring(0, 8)}`,
          token: 'MOCK_TOKEN',
        });
      }
    }

    initAgora();

    const unsubscribe = agoraVoice.subscribeState((v) => {
      if (v.connectionState) setAgoraStatus(v.connectionState);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      agoraVoice.leaveChannel();
    };
  }, [session.id]);

  // Sync STT output to candidate textarea
  useEffect(() => {
    if (sttText && !isPaused) setCandidateInput(sttText);
  }, [sttText, isPaused]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Speak initial question & handle audio unlock
  const handleEnableAudio = () => {
    unlockAudio();
    if (state.currentQuestion && ttsEnabled && ttsAvailable) {
      speak(state.currentQuestion, state.activeInterviewer);
    }
  };

  useEffect(() => {
    if (state.currentQuestion && ttsEnabled && ttsAvailable && !isPaused && audioUnlocked) {
      speak(state.currentQuestion, state.activeInterviewer);
    }
  }, [audioUnlocked]);

  const handleSendAnswer = useCallback(
    async (textToSend) => {
      const text = (textToSend || candidateInput).trim();
      if (!text || loading || isPaused) return;

      stopSpeaking();
      setError(null);
      setCandidateInput('');
      resetTranscript();

      // Append candidate response
      setTranscript((prev) => [...prev, { role: 'candidate', text }]);
      setLoading(true);

      try {
        const res = await api.sendMessage(session.id, text);

        setState({
          currentQuestion: res.question,
          activeInterviewer: res.active_interviewer,
          orchestratorDecision: res.orchestrator_decision || '',
          turnCount: res.turn_count,
          techScore: res.tech_score || {},
          pmScore: res.pm_score || {},
        });

        // Append Orchestrator notice & AI question to transcript
        setTranscript((prev) => {
          const arr = [...prev];
          if (res.orchestrator_decision) {
            arr.push({ role: 'orchestrator', text: res.orchestrator_decision });
          }
          arr.push({
            role: 'ai',
            text: res.question,
            interviewer: res.active_interviewer,
          });
          return arr;
        });

        // Trigger Indian accent TTS speech for active interviewer
        if (ttsEnabled && ttsAvailable) {
          speak(res.question, res.active_interviewer);
        }
      } catch (err) {
        setError(err.message || 'Failed to submit response.');
      } finally {
        setLoading(false);
      }
    },
    [candidateInput, loading, isPaused, session.id, ttsEnabled, ttsAvailable, speak, stopSpeaking, resetTranscript]
  );

  useEffect(() => {
    handleSendAnswerRef.current = handleSendAnswer;
  }, [handleSendAnswer]);

  const handleRepeatRequest = () => {
    handleSendAnswer('Can you please repeat the question?');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAnswer();
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end the interview and generate your assessment report?')) return;
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

  const activeInfo = PANEL_MEMBERS[state.activeInterviewer] || PANEL_MEMBERS.SYSTEM_ARCHITECT;

  return (
    <div className="interview-room" onClick={() => !audioUnlocked && unlockAudio()}>
      {/* ── Emergency Pause Modal Overlay ────────────────────────── */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            className="pause-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="pause-card"
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
            >
              <div className="pause-icon-wrap">
                <PauseCircle size={36} />
              </div>
              <h2 className="pause-title">Interview Paused</h2>
              <p className="pause-desc">
                The session timer, microphone stream, and AI speech synthesis have been safely suspended.
                Take your time before resuming.
              </p>
              <button className="btn-resume" onClick={resumeInterview}>
                <Play size={18} /> Resume Interview
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Audio Enable Banner if Autoplay Blocked ──────────────── */}
      {!audioUnlocked && (
        <div
          onClick={handleEnableAudio}
          style={{
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            color: 'white',
            padding: '8px 16px',
            textAlign: 'center',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            zIndex: 30,
          }}
        >
          <Volume1 size={18} /> 🔊 Click anywhere to Enable AI Panel Voices & Audio Speech
        </div>
      )}

      {/* ── Header ────────────────────────────────────────── */}
      <header className="room-header">
        <div className="room-header-left">
          <div className="logo-mark">ES</div>
          <div>
            <p className="room-candidate-name">{session.candidate_name}</p>
            <p className="room-role">{session.role}</p>
          </div>
        </div>

        <div className="room-header-center">
          <span className="agora-status-pill">
            <Radio size={12} className="spin" /> {agoraStatus}
          </span>
          <Timer startTime={startTime} isPaused={isPaused} />
          <span className="turn-badge">Turn {state.turnCount}</span>
        </div>

        <div className="room-header-right">
          <button
            className="btn-pause-emergency"
            onClick={pauseInterview}
            title="Emergency Pause"
          >
            <PauseCircle size={16} /> Pause
          </button>

          <button
            className="btn-tts-toggle"
            onClick={() => testSpeech?.()}
            title="Click to test audio sound through your Bluetooth earbuds or speakers"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa' }}
          >
            <Volume2 size={15} /> Test Voice Sound
          </button>

          <button
            className="btn-tts-toggle"
            onClick={() => {
              if (ttsEnabled) stopSpeaking();
              setTtsEnabled((v) => !v);
            }}
            title={ttsEnabled ? 'Mute AI voice' : 'Enable AI voice'}
          >
            {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button className="btn-end-session" onClick={handleEndSession} disabled={ending}>
            {ending ? <Loader2 size={15} className="spin" /> : <Square size={15} />}
            End Interview
          </button>
        </div>
      </header>

      {/* ── Main Body ────────────────────────────────────── */}
      <div className="room-body">
        {/* Left Column: Full Transcript */}
        <div className="transcript-panel">
          <div className="panel-header">
            <h3>
              <Layers size={16} /> Live Panel Transcript
            </h3>
            <span className="entries-count">{transcript.length} events logged</span>
          </div>

          <div className="transcript-scroll">
            {transcript.map((entry, i) => (
              <TranscriptEntry key={i} entry={entry} index={i} />
            ))}

            {loading && (
              <div className="transcript-entry ai">
                <div className="entry-avatar" style={{ background: activeInfo.color }}>
                  <Bot size={15} />
                </div>
                <div className="entry-content">
                  <div className="entry-meta">
                    <span className="entry-speaker">{activeInfo.name}</span>
                    <SpeakingIndicator active color={activeInfo.color} />
                  </div>
                  <div className="thinking-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Right Column: Panel Members & Input Controls */}
        <div className="input-panel">
          {/* Orchestrator Decision Banner */}
          <motion.div
            className="orchestrator-card"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="orchestrator-header">
              <span className="orchestrator-title">
                <Cpu size={14} /> Apex Orchestrator (Supervisor)
              </span>
              <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>Active</span>
            </div>
            <p className="orchestrator-text">{state.orchestratorDecision}</p>
          </motion.div>

          {/* Side-by-Side Agent Cards */}
          <div className="panel-grid">
            {Object.entries(PANEL_MEMBERS).map(([key, info]) => {
              const isActive = state.activeInterviewer === key;
              return (
                <div
                  key={key}
                  className={`agent-card ${isActive ? 'active' : ''}`}
                  style={{
                    borderColor: isActive ? info.color : 'rgba(255,255,255,0.08)',
                    '--card-glow': info.glow,
                  }}
                >
                  <div className="agent-card-top">
                    <div className="agent-avatar" style={{ background: info.color }}>
                      <Bot size={16} />
                    </div>
                    <div>
                      <p className="agent-name">{info.name}</p>
                      <p className="agent-title">{info.title}</p>
                    </div>
                  </div>
                  {isActive && (
                    <span
                      className="active-speaker-tag"
                      style={{ background: info.color, color: 'white' }}
                    >
                      SPEAKING NOW
                    </span>
                  )}
                  {isActive && isSpeaking && (
                    <SpeakingIndicator active color={info.color} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Current Question Box */}
          <AnimatePresence mode="wait">
            <motion.div
              className="question-box"
              key={state.currentQuestion}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.25 }}
            >
              <div className="question-label">
                <span>Active Question • {activeInfo.name}</span>
                <span className="repeat-hint" onClick={handleRepeatRequest}>
                  <RotateCcw size={11} style={{ display: 'inline', marginRight: '3px' }} />
                  Repeat Question
                </span>
              </div>
              <p className="question-text">{state.currentQuestion || 'Preparing question...'}</p>
            </motion.div>
          </AnimatePresence>

          {error && (
            <div className="error-banner">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* Answer Section */}
          <div className="answer-section">
            <div className="answer-header-row">
              <span className="answer-label">Your Response</span>
              {isHandsFree && (
                <span className="handsfree-badge">
                  <Sparkles size={13} /> Continuous Mic (Hands-Free)
                </span>
              )}
            </div>

            <textarea
              className="answer-textarea"
              placeholder={
                isListening
                  ? '🎙️ Hands-Free Mic Active — Speak anytime! Your voice is captured live...'
                  : 'Type your response or enable Continuous Mic to speak...'
              }
              value={candidateInput}
              onChange={(e) => setCandidateInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || ending || isPaused}
              rows={4}
            />

            {/* Live Mic Activity Visualizer & Bluetooth Audio Picker */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '6px 4px', minHeight: '32px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
              {micStatus === 'checking' && (
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Loader2 size={13} className="spin" /> Detecting audio devices...
                </span>
              )}
              {micStatus === 'denied' && (
                <button type="button" onClick={() => requestMicAccess()} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <MicOff size={13} /> Mic blocked — click to allow in browser
                </button>
              )}
              {micStatus === 'unavailable' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                    <MicOff size={13} /> Mic not detected — pair Bluetooth earbuds & click
                  </span>
                  <button type="button" onClick={() => { refreshDevices?.(); requestMicAccess?.(); }} style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.5)', color: '#fbbf24', padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}>
                    Detect Earbuds
                  </button>
                </div>
              )}
              {micStatus === 'granted' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '160px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Activity size={13} color={micLevel > 15 ? '#10b981' : '#64748b'} /> Mic:
                    </span>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${micLevel}%`, height: '100%', background: micLevel > 40 ? '#10b981' : micLevel > 15 ? '#3b82f6' : '#64748b', transition: 'width 0.1s linear' }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: micLevel > 15 ? '#10b981' : '#64748b', fontWeight: 600 }}>
                      {micLevel > 15 ? 'Receiving Audio' : 'Silent'}
                    </span>
                  </div>

                  {audioInputs.length > 0 && (
                    <select
                      value={selectedMicId}
                      onChange={(e) => {
                        setSelectedMicId(e.target.value);
                        requestMicAccess(e.target.value);
                      }}
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#cbd5e1',
                        fontSize: '0.7rem',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        maxWidth: '180px',
                        cursor: 'pointer',
                      }}
                    >
                      {audioInputs.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            <div className="answer-actions">
              {autoSubmitCountdown > 0 && isHandsFree && (
                <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(16,185,129,0.3)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} className="spin" />
                  Auto-submitting in {autoSubmitCountdown}s...
                </span>
              )}

              {sttAvailable && micStatus !== 'denied' && (
                <button
                  className={`btn-mic-handsfree ${isHandsFree && isListening ? 'active' : ''}`}
                  onClick={() => {
                    if (!hasMicPermission) {
                      requestMicAccess();
                    } else {
                      toggleHandsFree();
                    }
                  }}
                  disabled={loading || ending || isPaused || micStatus === 'checking'}
                  title="Toggle Continuous Hands-Free Microphone"
                >
                  {isListening ? <Mic size={17} /> : <MicOff size={17} />}
                  {micStatus === 'checking' ? 'Detecting Mic...' : isHandsFree ? 'Hands-Free ON' : 'Hands-Free OFF'}
                </button>
              )}

              <button
                className="btn-send"
                onClick={() => handleSendAnswer()}
                disabled={!candidateInput.trim() || loading || ending || isPaused}
              >
                {loading ? <Loader2 size={16} className="spin" /> : <ChevronRight size={16} />}
                {loading ? 'Processing...' : 'Send Response'}
              </button>
            </div>
          </div>

          {/* Real-time Scores */}
          {state.turnCount > 0 && (
            <div className="score-panel">
              <p className="score-panel-title">Panel Assessment Scores</p>
              <div className="score-grid">
                {state.techScore?.depth != null && (
                  <div className="score-item">
                    <span className="score-label">Technical Depth</span>
                    <div className="score-bar-wrap">
                      <div
                        className="score-bar"
                        style={{ width: `${state.techScore.depth * 10}%`, background: '#3b82f6' }}
                      />
                    </div>
                    <span className="score-value">{state.techScore.depth}/10</span>
                  </div>
                )}
                {state.pmScore?.depth != null && (
                  <div className="score-item">
                    <span className="score-label">Product Thinking</span>
                    <div className="score-bar-wrap">
                      <div
                        className="score-bar"
                        style={{ width: `${state.pmScore.depth * 10}%`, background: '#8b5cf6' }}
                      />
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
