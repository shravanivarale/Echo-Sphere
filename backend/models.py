from sqlalchemy import Column, String, DateTime, JSON, Enum
import enum
import datetime
from database import Base
import uuid

class SessionStatus(str, enum.Enum):
    CREATED = "CREATED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    candidate_name = Column(String, index=True)
    role = Column(String)
    job_description = Column(String, nullable=True)
    status = Column(String, default=SessionStatus.CREATED)
    
    # Stores the LangGraph/Interview state as JSON
    state = Column(JSON, default=dict)
    
    # Stores the architecture sandbox state
    sandbox_state = Column(JSON, default=dict)
    
    # Store the final assessment report
    assessment_report = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
