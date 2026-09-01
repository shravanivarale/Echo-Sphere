"""
Full EchoSphere FastAPI backend — MVP V1.
All routes for session management, AI engine, voice, sandbox, and assessment.
"""

import os
import datetime
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from database import engine, get_db
import models
import schemas
from agents.interview_graph import run_interview_graph, generate_assessment
from services.agora_service import generate_agora_token

# ── Database bootstrap ──────────────────────────────────────────────────────
models.Base.metadata.create_all(bind=engine)
load_dotenv()

MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"

# ── App setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="EchoSphere API",
    description="Backend for EchoSphere MVP V1 — AI Interview Platform",
    version="1.0.0",
)

origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173")
origins = [o.strip() for o in origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_session_or_404(session_id: str, db: Session):
    db_session = (
        db.query(models.InterviewSession)
        .filter(models.InterviewSession.id == session_id)
        .first()
    )
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    return db_session


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/v1/health", tags=["System"])
async def health_check():
    """System health check — returns mode and environment."""
    return {
        "status": "healthy",
        "mock_mode": MOCK_MODE,
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "1.0.0",
    }


# ── Sessions ─────────────────────────────────────────────────────────────────

@app.post("/api/v1/sessions", response_model=schemas.SessionResponse, tags=["Session"])
def create_session(payload: schemas.SessionCreate, db: Session = Depends(get_db)):
    """Create a new interview session and return it with initial AI question."""
    initial_state = {
        "session_id": "",   # filled after DB insert
        "candidate_name": payload.candidate_name,
        "role": payload.role,
        "conversation_history": [],
        "current_question": "",
        "latest_answer": "",
        "active_interviewer": "SYSTEM_ARCHITECT",
        "tech_score": {},
        "pm_score": {},
        "sandbox_state": {},
        "transcript": [],
        "turn_count": 0,
    }

    db_session = models.InterviewSession(
        candidate_name=payload.candidate_name,
        role=payload.role,
        state=initial_state,
        sandbox_state={},
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    # Patch session_id into state
    state = dict(db_session.state)
    state["session_id"] = db_session.id

    # Generate the first AI question immediately
    state = run_interview_graph(state)

    db_session.state = state
    db.commit()
    db.refresh(db_session)

    return db_session


@app.get("/api/v1/sessions/{session_id}", response_model=schemas.SessionResponse, tags=["Session"])
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Retrieve session state."""
    return _get_session_or_404(session_id, db)


@app.put("/api/v1/sessions/{session_id}/end", tags=["Session"])
def end_session(session_id: str, db: Session = Depends(get_db)):
    """End the interview and generate the assessment report."""
    db_session = _get_session_or_404(session_id, db)

    if db_session.status == models.SessionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Session already completed")

    state = dict(db_session.state)
    report = generate_assessment(state)

    db_session.status = models.SessionStatus.COMPLETED
    db_session.assessment_report = report
    db_session.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(db_session)

    return {"message": "Interview ended", "session_id": session_id, "report": report}


# ── AI Message ───────────────────────────────────────────────────────────────

@app.post("/api/v1/sessions/{session_id}/message", tags=["AI"])
def send_message(
    session_id: str,
    payload: schemas.MessageRequest,
    db: Session = Depends(get_db),
):
    """
    Send candidate's answer. Runs through LangGraph interview graph.
    Returns the AI's next question, active interviewer, and current scores.
    """
    db_session = _get_session_or_404(session_id, db)

    if db_session.status != models.SessionStatus.IN_PROGRESS:
        # Auto-transition to IN_PROGRESS on first message
        if db_session.status == models.SessionStatus.CREATED:
            db_session.status = models.SessionStatus.IN_PROGRESS
        else:
            raise HTTPException(status_code=400, detail=f"Session is {db_session.status}")

    state = dict(db_session.state)
    state["latest_answer"] = payload.text
    state.setdefault("conversation_history", []).append({
        "role": "candidate",
        "text": payload.text,
        "timestamp": datetime.datetime.utcnow().isoformat(),
    })

    # Run interview graph
    state = run_interview_graph(state)

    # Persist updated state
    db_session.state = state
    db_session.updated_at = datetime.datetime.utcnow()
    db.commit()

    return {
        "question": state["current_question"],
        "active_interviewer": state["active_interviewer"],
        "turn_count": state["turn_count"],
        "tech_score": state.get("tech_score", {}),
        "pm_score": state.get("pm_score", {}),
        "mock_mode": MOCK_MODE,
    }


# ── Sandbox ───────────────────────────────────────────────────────────────────

@app.post("/api/v1/sessions/{session_id}/sandbox", tags=["Sandbox"])
def update_sandbox(
    session_id: str,
    payload: schemas.SandboxUpdate,
    db: Session = Depends(get_db),
):
    """Update the architecture sandbox state for the session."""
    db_session = _get_session_or_404(session_id, db)

    db_session.sandbox_state = payload.sandbox_state
    # Also reflect in the interview state so AI can see it
    state = dict(db_session.state)
    state["sandbox_state"] = payload.sandbox_state
    db_session.state = state
    db_session.updated_at = datetime.datetime.utcnow()
    db.commit()

    return {"message": "Sandbox updated", "sandbox_state": payload.sandbox_state}


# ── Voice / Agora ─────────────────────────────────────────────────────────────

@app.post("/api/v1/sessions/{session_id}/agora-token", tags=["Voice"])
def get_agora_token(session_id: str, db: Session = Depends(get_db)):
    """Generate Agora RTC token for the interview voice channel."""
    db_session = _get_session_or_404(session_id, db)
    channel = f"echosphere_{session_id[:8]}"
    token_data = generate_agora_token(channel_name=channel)
    return token_data


# ── Assessment ────────────────────────────────────────────────────────────────

@app.get("/api/v1/sessions/{session_id}/report", tags=["Assessment"])
def get_report(session_id: str, db: Session = Depends(get_db)):
    """Retrieve the final assessment report."""
    db_session = _get_session_or_404(session_id, db)

    if db_session.status != models.SessionStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Report not yet available. End the session first.",
        )

    if not db_session.assessment_report:
        raise HTTPException(status_code=404, detail="Report not found")

    return db_session.assessment_report


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
