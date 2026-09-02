# EchoSphere MVP V1 — Architectural Decisions (ADRs)

This file documents major architectural and technical decisions made during the development of the EchoSphere MVP.

## ADR-001: Initial Tech Stack Selection

**Decision:** Use React (Vite) + FastAPI + SQLite

**Context:** The project requires a fast, modern frontend, a high-performance backend capable of handling AI orchestration efficiently, and a simple database for the MVP phase. The prompt mandates React, FastAPI, and LangGraph.

**Options Considered:**
- Frontend: Create React App, Next.js, Vite + React.
- Backend: Express (Node), Django, FastAPI.
- Database: PostgreSQL, SQLite.

**Chosen Option:** Vite + React for frontend. FastAPI for backend. SQLite for MVP database.

**Reason:** Vite provides a faster development experience than CRA. FastAPI is modern, fast, and excellent for async Python operations, which is crucial for LLM/LangGraph integrations. SQLite is chosen for MVP simplicity to avoid infrastructure overhead while maintaining a relational structure that can be easily migrated to PostgreSQL later.

**Trade-offs:** SQLite is not suitable for high-concurrency production deployments but is sufficient for MVP and local development.

**Date:** 2026-09-01
