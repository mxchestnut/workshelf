"""
Beta reading workflow schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class BetaReadStatus(str, Enum):
    """Beta read status."""
    REQUESTED = "requested"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DECLINED = "declined"


class FeedbackType(str, Enum):
    """Type of feedback."""
    GENERAL = "general"
    PLOT = "plot"
    CHARACTER = "character"
    PACING = "pacing"
    DIALOGUE = "dialogue"
    STYLE = "style"


class BetaRequestCreate(BaseModel):
    """Request beta reading."""
    document_id: str
    reader_id: str
    message: Optional[str] = None
    deadline: Optional[datetime] = None
    focus_areas: Optional[List[str]] = None


class BetaRequestResponse(BaseModel):
    """Beta request response."""
    id: str
    document_id: str
    document_title: str
    author_id: str
    reader_id: str
    reader_username: str
    status: BetaReadStatus
    message: Optional[str]
    deadline: Optional[datetime]
    focus_areas: Optional[List[str]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BetaFeedbackCreate(BaseModel):
    """Submit beta feedback."""
    beta_request_id: str
    overall_rating: int = Field(..., ge=1, le=5)
    feedback_type: FeedbackType
    content: str
    suggestions: Optional[str] = None
    highlights: Optional[str] = None


class BetaFeedbackResponse(BaseModel):
    """Beta feedback response."""
    id: str
    beta_request_id: str
    reader_id: str
    reader_username: str
    overall_rating: int
    feedback_type: FeedbackType
    content: str
    suggestions: Optional[str]
    highlights: Optional[str]
    helpful_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class BetaReaderStats(BaseModel):
    """Beta reader statistics."""
    total_reads: int
    completed_reads: int
    average_rating_given: float
    feedback_helpfulness_score: float
    badge_count: int
    achievements: List[str]
