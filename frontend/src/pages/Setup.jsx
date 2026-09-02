import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, ArrowRight, Loader2, FileText, Sparkles, Cpu, Users } from 'lucide-react';
import { api } from '../services/api';

const JOB_ROLES = [
  'Senior System Architect',
  'Lead Backend Engineer / Tech Lead',
  'Senior Full Stack Engineer',
  'Principal Product Manager',
  'AI / ML Platform Engineer',
  'Cloud & DevOps Solutions Architect',
  'Engineering Manager',
  'Technical Product Lead',
  'Site Reliability Engineer (SRE)',
  'Data Architect / Lead Data Engineer',
  'Security Architect',
  'Frontend Architect',
  'Mobile Tech Lead (iOS / Android)',
  'Distributed Systems Engineer',
  'Product Owner / Lead Analyst',
];

const SAMPLE_JDS = {
  'Senior System Architect': `We are seeking a Senior System Architect to lead the design and evolution of our high-scale, distributed microservices platform handling over 500,000 transactions/sec. Key responsibilities include defining API contracts, designing multi-region database replication strategies (PostgreSQL, Redis, Cassandra), ensuring strict SLA guarantees (99.99% uptime), and mentoring technical leads on architectural trade-offs.`,
  'Principal Product Manager': `Looking for a Principal Product Manager to own our core developer platform roadmap. You will partner closely with engineering leads and executive stakeholders to define product strategy, drive customer discovery, prioritize MVP features for quarterly sprints, evaluate ROI metrics, and optimize onboarding conversion rates.`,
  'Lead Backend Engineer / Tech Lead': `Seeking a Lead Backend Engineer to architect resilient RESTful and gRPC microservices in Go/Python. You will oversee database optimization, message queues (Kafka, NATS), rate-limiting middleware, CI/CD pipelines, and collaborate with product managers to balance feature velocity with technical debt reduction.`,
};

export default function Setup({ onSessionCreated }) {
  const [formData, setFormData] = useState({
    candidate_name: '',
    role: JOB_ROLES[0],
    job_description: SAMPLE_JDS['Senior System Architect'],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    const sample = SAMPLE_JDS[selectedRole] || `Role: ${selectedRole}. Responsible for architecture, technical execution, cross-functional collaboration, performance optimization, and product delivery.`;
    setFormData((prev) => ({
      ...prev,
      role: selectedRole,
      job_description: sample,
    }));
  };

  const handleLoadSampleJD = () => {
    const sample = SAMPLE_JDS[formData.role] || SAMPLE_JDS['Senior System Architect'];
    setFormData((prev) => ({ ...prev, job_description: sample }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api.createSession(formData);
      onSessionCreated(data);
    } catch (err) {
      setError(err.message || 'Failed to create interview session. Please check backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="glass-card"
      style={{ maxWidth: '680px', margin: '0 auto' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(59, 130, 246, 0.12)',
            borderRadius: '20px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            marginBottom: '1rem',
            color: '#60a5fa',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <Cpu size={16} /> Orchestrated Multi-Agent Panel • Agora Voice Engine
        </div>
        <h1 className="title" style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>EchoSphere AI</h1>
        <p className="subtitle">
          Supervised AI panel interview with System Architect Dr. Alex Chen & Product Manager Sarah Mitchell.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="candidate_name">
            Candidate Name
          </label>
          <input
            id="candidate_name"
            type="text"
            className="form-input"
            placeholder="e.g. Rahul Sharma"
            value={formData.candidate_name}
            onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="role">
            Target Job Role
          </label>
          <select
            id="role"
            className="form-input"
            value={formData.role}
            onChange={handleRoleChange}
            disabled={loading}
            style={{ appearance: 'auto', background: 'rgba(15, 23, 42, 0.8)' }}
          >
            {JOB_ROLES.map((r) => (
              <option key={r} value={r} style={{ background: '#0f172a', color: '#fff' }}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="form-label" htmlFor="job_description" style={{ marginBottom: 0 }}>
              Job Description (JD)
            </label>
            <button
              type="button"
              onClick={handleLoadSampleJD}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 500,
              }}
            >
              <Sparkles size={13} /> Load Sample JD
            </button>
          </div>
          <textarea
            id="job_description"
            className="form-input"
            rows={5}
            placeholder="Paste full job description text here..."
            value={formData.job_description}
            onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
            disabled={loading}
            style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: '1.5' }}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1.5rem' }}>
          {loading ? (
            <>
              <Loader2 className="spin" size={20} />
              Initializing Panel & Agora Engine...
            </>
          ) : (
            <>
              Start AI Panel Interview
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
