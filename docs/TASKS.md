# EchoSphere MVP V1 — Task Tracker

## TASK-001

Title: Initialize Foundation (Phase 1)
Owner: AI Engineer
Priority: P0
Status: VERIFIED
Dependencies: None
Files: docs/PROJECT_STATUS.md, frontend/..., backend/...
Acceptance Criteria:
- React frontend starts on local dev server.
- FastAPI backend starts on local dev server.
- Health endpoint `/health` works and returns 200 OK.
- Environment configuration is setup (`.env.example`).
- Error handling middleware is in place for FastAPI.
Verification: Backend health endpoint responds with 200 OK. Vite frontend starts on localhost:5173.
Notes: Initialized the project from an empty directory.

## TASK-002

Title: Interview Session Core (Phase 2)
Owner: AI Engineer
Priority: P1
Status: VERIFIED
Dependencies: TASK-001
Files: backend/database.py, backend/models.py, frontend/src/pages/Setup.jsx
Acceptance Criteria:
- Initialize SQLite database using SQLAlchemy.
- Create API endpoints to start a new interview session.
- Build candidate setup screen on frontend.
- Generate and persist session ID.
Verification: Backend POST `/api/v1/sessions` creates session and persists to SQLite. Frontend `Setup.jsx` connects to backend and logs session ID.
Notes: Core session flow is working.

## TASK-003

Title: Voice Infrastructure - Agora (Phase 3)
Owner: AI Engineer
Priority: P2
Status: NOT STARTED
Dependencies: TASK-002
Files: backend/main.py, frontend/src/pages/InterviewRoom.jsx
Acceptance Criteria:
- Create endpoint `/sessions/{session_id}/agora-token` on Backend (supports mock mode logic).
- Build Interview Room UI.
- Implement Agora WebRTC logic for joining channel on frontend.
- Ask for and handle candidate microphone permissions.
Verification: Pending
Notes: Will need to use `agora-rtc-sdk-ng` on the frontend.
