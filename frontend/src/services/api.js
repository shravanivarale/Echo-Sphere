/**
 * EchoSphere API client service.
 * All backend calls go through here — never directly in components.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
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
