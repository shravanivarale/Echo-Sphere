import { motion } from 'framer-motion';
import { CheckCircle, TrendingUp, MessageSquare, User, Briefcase, Star, AlertTriangle, ThumbsUp, RotateCcw } from 'lucide-react';
import './Report.css';

const SCORE_COLOR = (score) => {
  if (score >= 8) return '#10b981';
  if (score >= 6) return '#3b82f6';
  if (score >= 4) return '#eab308';
  return '#ef4444';
};

const RECOMMENDATION_CONFIG = {
  'Strong Hire':  { color: '#10b981', icon: '🚀', bg: 'rgba(16,185,129,0.1)' },
  'Hire':         { color: '#3b82f6', icon: '✅', bg: 'rgba(59,130,246,0.1)' },
  'Borderline':   { color: '#eab308', icon: '⚖️', bg: 'rgba(234,179,8,0.1)' },
  'No Hire':      { color: '#ef4444', icon: '❌', bg: 'rgba(239,68,68,0.1)' },
};

function ScoreRing({ value, max = 10, color, label }) {
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const fill = (value / max) * circ;
  return (
    <div className="score-ring-wrap">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
        <circle
          cx="45" cy="45" r={radius}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={circ - fill}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="45" y="49" textAnchor="middle" fill={color} fontSize="14" fontWeight="700">{value}</text>
      </svg>
      <p className="score-ring-label">{label}</p>
    </div>
  );
}

export default function Report({ report, session, onRestart }) {
  if (!report) return null;
  const rec = RECOMMENDATION_CONFIG[report.recommendation] || RECOMMENDATION_CONFIG['Borderline'];

  return (
    <div className="report-page">
      <div className="report-container">
        {/* Header */}
        <motion.div className="report-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="report-logo">ES</div>
          <div>
            <h1 className="report-title">Interview Assessment</h1>
            <p className="report-subtitle">EchoSphere MVP V1 — AI Panel Report</p>
          </div>
        </motion.div>

        {/* Candidate Info */}
        <motion.div className="report-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="report-card-row">
            <div className="info-item"><User size={16} className="info-icon" /><div><p className="info-label">Candidate</p><p className="info-value">{report.candidate_name}</p></div></div>
            <div className="info-item"><Briefcase size={16} className="info-icon" /><div><p className="info-label">Role</p><p className="info-value">{report.role}</p></div></div>
            <div className="info-item"><MessageSquare size={16} className="info-icon" /><div><p className="info-label">Interview Turns</p><p className="info-value">{report.turn_count}</p></div></div>
          </div>
        </motion.div>

        {/* Recommendation */}
        <motion.div
          className="recommendation-banner"
          style={{ background: rec.bg, borderColor: rec.color }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          <span className="rec-icon">{rec.icon}</span>
          <div>
            <p className="rec-label">Panel Recommendation</p>
            <p className="rec-value" style={{ color: rec.color }}>{report.recommendation}</p>
          </div>
        </motion.div>

        {/* Scores */}
        <motion.div className="report-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="section-title"><TrendingUp size={16} /> Score Breakdown</h3>
          <div className="scores-row">
            <ScoreRing value={report.overall_score}        color={SCORE_COLOR(report.overall_score)}        label="Overall" />
            <ScoreRing value={report.technical_score}      color={SCORE_COLOR(report.technical_score)}      label="Technical" />
            <ScoreRing value={report.product_score}        color={SCORE_COLOR(report.product_score)}        label="Product" />
            <ScoreRing value={report.communication_score}  color={SCORE_COLOR(report.communication_score)}  label="Communication" />
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div className="report-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h3 className="section-title"><Star size={16} /> Summary</h3>
          <p className="summary-text">{report.summary}</p>
        </motion.div>

        {/* Strengths & Weaknesses */}
        <motion.div className="report-card-row-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="report-card">
            <h3 className="section-title strengths"><ThumbsUp size={16} /> Strengths</h3>
            <ul className="feedback-list">
              {report.strengths?.map((s, i) => (
                <li key={i} className="feedback-item strength"><CheckCircle size={14} />{s}</li>
              ))}
            </ul>
          </div>
          <div className="report-card">
            <h3 className="section-title weaknesses"><AlertTriangle size={16} /> Areas to Improve</h3>
            <ul className="feedback-list">
              {report.weaknesses?.map((w, i) => (
                <li key={i} className="feedback-item weakness"><AlertTriangle size={14} />{w}</li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div className="report-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <button className="btn-restart" onClick={onRestart}>
            <RotateCcw size={16} /> Start New Interview
          </button>
        </motion.div>
      </div>
    </div>
  );
}
