from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from models import SessionStatus


class SessionCreate(BaseModel):
    candidate_name: str
    role: str


class SessionResponse(BaseModel):
    id: str
    candidate_name: str
    role: str
    status: SessionStatus
    state: Dict[str, Any]
    sandbox_state: Dict[str, Any]
    assessment_report: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Candidate's spoken/typed answer")


class SandboxUpdate(BaseModel):
    sandbox_state: Dict[str, Any] = Field(..., description="Full sandbox JSON state")
