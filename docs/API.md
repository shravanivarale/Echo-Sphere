# EchoSphere MVP V1 — API Documentation

This document will outline the backend REST API endpoints.

## Base URL
`/api/v1`

## Endpoints (Planned)

### System
- `GET /health` - System health check.

### Session
- `POST /sessions` - Create a new interview session.
- `GET /sessions/{session_id}` - Get session details and current state.
- `PUT /sessions/{session_id}/end` - End the interview session.

### AI Engine & Messaging
- `POST /sessions/{session_id}/message` - Send candidate message/transcript and receive AI response.

### Voice & Realtime (Agora)
- `POST /sessions/{session_id}/agora-token` - Generate Agora connection token.

### Sandbox
- `POST /sessions/{session_id}/sandbox` - Update sandbox state.

### Assessment
- `GET /sessions/{session_id}/report` - Retrieve final assessment report.
