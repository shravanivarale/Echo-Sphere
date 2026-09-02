/**
 * EchoSphere resilient API client service.
 * Tries configured API URL and localhost/127.0.0.1 fallbacks automatically.
 */

const CANDIDATE_URLS = Array.from(new Set([
  import.meta.env.VITE_API_BASE_URL,
  'http://localhost:8000/api/v1',
  'http://127.0.0.1:8000/api/v1',
])).filter(Boolean);

let activeBaseUrl = CANDIDATE_URLS[0];

async function request(path, options = {}) {
  let lastErr = null;

  // Try active working base URL first, then try alternatives if network fails
  const urlsToTry = Array.from(new Set([activeBaseUrl, ...CANDIDATE_URLS]));

  for (const baseUrl of urlsToTry) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Server returned error' }));
        throw new Error(err.detail || `Request failed with status ${res.status}`);
      }
      activeBaseUrl = baseUrl; // Save working base URL
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (err.message && !err.message.toLowerCase().includes('fetch')) {
        throw err; // HTTP error response from server, do not try next URL
      }
    }
  }

  throw new Error(
    lastErr?.message ||
      'Backend server is unreachable. Please ensure Python FastAPI backend is running on http://127.0.0.1:8000.'
  );
}

export const api = {
  health: () => request('/health'),

  createSession: (data) =>
    request('/sessions', { method: 'POST', body: JSON.stringify(data) }),

  getSession: (id) => request(`/sessions/${id}`),

  sendMessage: (sessionId, text) =>
    request(`/sessions/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  endSession: (sessionId) =>
    request(`/sessions/${sessionId}/end`, { method: 'PUT' }),

  getReport: (sessionId) => request(`/sessions/${sessionId}/report`),

  getAgoraToken: (sessionId) =>
    request(`/sessions/${sessionId}/agora-token`, { method: 'POST' }),

  updateSandbox: (sessionId, sandboxState) =>
    request(`/sessions/${sessionId}/sandbox`, {
      method: 'POST',
      body: JSON.stringify({ sandbox_state: sandboxState }),
    }),
};
