"""
Content integrity (plagiarism, AI detection) schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class IntegrityCheckType(str, Enum):
    """Types of integrity checks."""
    PLAGIARISM = "plagiarism"
    AI_DETECTION = "ai_detection"
    BOTH = "both"


class IntegrityCheckRequest(BaseModel):
    """Request integrity check."""
    document_id: str
    check_type: IntegrityCheckType


class PlagiarismMatch(BaseModel):
    """Plagiarism match result."""
    source_url: str
    matched_text: str
    similarity_percentage: float


class IntegrityCheckResponse(BaseModel):
    """Integrity check results."""
    id: str
    document_id: str
    check_type: IntegrityCheckType
    plagiarism_score: Optional[float] = None
    ai_probability: Optional[float] = None
    plagiarism_matches: Optional[List[PlagiarismMatch]] = None
    checked_at: datetime
    is_flagged: bool

    class Config:
        from_attributes = True
