# EchoSphere MVP V1 — Architecture

## 1. System Overview

EchoSphere is an AI-powered interview platform consisting of a React frontend and a FastAPI backend. It utilizes LangGraph for AI orchestration, integrating multiple specialized AI personas (System Architect and Product Manager) to conduct interviews. It features voice interaction via Agora, Speech-to-Text (Deepgram), and Text-to-Speech (Cartesia), as well as an interactive architecture sandbox.

## 2. Component Diagram

                 CANDIDATE
                     |
                     v
              React Frontend
                     |
             +-------+-------+
             |               |
             v               v
          Agora          FastAPI
             |               |
             |               v
             |          Interview State
             |               |
             |               v
             |           LangGraph
             |               |
             |       +-------+-------+
             |       |               |
             |       v               v
             |   Tech Agent       PM Agent
             |       |               |
             |       +-------+-------+
             |               |
             |               v
             |              LLM
             |               |
             |               v
             |              TTS
             |               |
             +<--------------+

## 3. Key Components

- **Frontend:** React (Vite). Contains components, pages, services, hooks, agora integration, and sandbox.
- **Backend:** FastAPI. Contains API routes, AI agents, services, data models, and schemas.
- **Database:** SQLite (MVP). Stores interview sessions, states, transcripts, and reports.
- **State Orchestration:** LangGraph manages the conversation flow and determines the active AI persona based on the context.
- **Audio:**
  - Real-time communication: Agora.
  - STT (Speech-to-Text): Deepgram (or fallback/mock).
  - TTS (Text-to-Speech): Cartesia (or fallback/mock).

## 4. Subsystems

### Sandbox
Candidate -> Architecture Canvas -> Structured JSON -> FastAPI -> LangGraph Context

### Assessment
Transcript + Agent Analysis + Sandbox State -> Assessment Engine -> Final Report

## 5. Security Principles
- Secrets stored only in environment variables (never in frontend).
- Validate API requests and AI structured outputs using Pydantic.
- Validate sandbox operations.
- CORS configured properly.
