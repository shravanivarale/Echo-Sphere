# EchoSphere MVP V1 — Environment Configuration

This document lists the environment variables required for the project.

## Backend (`backend/.env`)

```env
# Application Mode
ENVIRONMENT=development
MOCK_MODE=true

# Database
DATABASE_URL=sqlite:///./echosphere.db

# Security
SECRET_KEY=your_secret_key_here
CORS_ORIGINS=http://localhost:5173

# AI & LLM Providers (Required when MOCK_MODE=false)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Speech-to-Text (Required when MOCK_MODE=false)
DEEPGRAM_API_KEY=

# Text-to-Speech (Required when MOCK_MODE=false)
CARTESIA_API_KEY=

# Agora Real-time Voice (Required when MOCK_MODE=false)
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
```

## Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_AGORA_APP_ID=
VITE_MOCK_MODE=true
```
