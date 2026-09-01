import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, ArrowRight, Loader2 } from 'lucide-react';

export default function Setup({ onSessionCreated }) {
  const [formData, setFormData] = useState({ candidate_name: '', role: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create interview session. Please ensure backend is running.');
      }

      const data = await response.json();
      onSessionCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="glass-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
          <Mic size={32} color="var(--accent)" />
        </div>
        <h1 className="title">EchoSphere AI</h1>
        <p className="subtitle">Prepare for your technical interview with our AI panel.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="candidate_name">Your Name</label>
          <input
            id="candidate_name"
            type="text"
            className="form-input"
            placeholder="e.g. Jane Doe"
            value={formData.candidate_name}
            onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="role">Target Role</label>
          <input
            id="role"
            type="text"
            className="form-input"
            placeholder="e.g. Senior Frontend Engineer"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '2rem' }}>
          {loading ? (
            <>
              <Loader2 className="spin" size={20} />
              Initializing...
            </>
          ) : (
            <>
              Start Interview
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
