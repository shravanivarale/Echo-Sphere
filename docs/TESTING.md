# EchoSphere MVP V1 — Testing Strategy

## Overview
This document outlines the testing approach for the EchoSphere MVP.

## 1. Unit Tests
- **Backend:** Test utility functions, Pydantic schema validation, and independent service functions.
- **Frontend:** Test isolated React components (e.g., UI elements, formatting functions).

## 2. API Integration Tests
- Test all FastAPI endpoints using `pytest` and `httpx.AsyncClient` or FastAPI's `TestClient`.
- Specifically test session creation, message handling, and state updates.

## 3. Mock Mode Testing
- Ensure the application can run end-to-end with `MOCK_MODE=true` set in the environment.
- This will mock STT, TTS, and LLM responses to verify the application logic flow without incurring API costs or requiring network calls.

## 4. End-to-End (E2E) Flow Tests
Manual or scripted E2E testing for the following critical flow:
1. Candidate setup
2. Interview start
3. Voice connection
4. STT ingestion
5. LangGraph reasoning / Agent selection
6. Adaptive Follow-up generation
7. TTS playback
8. Sandbox interaction
9. Interview completion & Report generation

## 5. Performance Monitoring
(To be filled during development)
- STT Latency: ...
- LLM Latency: ...
- TTS Latency: ...
- Total Response Latency: ...
