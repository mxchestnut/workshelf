"""
Schemas for beta reader appointment system
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class BetaReaderAppointmentCreate(BaseModel):
    """Schema for appointing a beta reader."""
    beta_reader_id: int
    appointment_title: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class BetaReaderAppointmentUpdate(BaseModel):
    """Schema for updating appointment details."""
    status: Optional[str] = Field(None, pattern="^(active|inactive|removed)$")
    appointment_title: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class BetaReaderAppointmentResponse(BaseModel):
    """Schema for appointment response."""
    id: int
    writer_id: int
    beta_reader_id: int
    status: str
    appointment_title: Optional[str]
    notes: Optional[str]
    releases_count: int
    completed_reads: int
    created_at: datetime
    updated_at: datetime
    
    # Include beta reader details
    beta_reader_username: Optional[str] = None
    beta_reader_display_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class BetaReleaseCreate(BaseModel):
    """Schema for releasing a document to beta reader."""
    document_id: int
    release_message: Optional[str] = None
    deadline: Optional[datetime] = None


class BetaReleaseUpdate(BaseModel):
    """Schema for updating release status."""
    status: Optional[str] = Field(None, pattern="^(unread|reading|completed)$")
    feedback_submitted: Optional[bool] = None


class BetaReleaseResponse(BaseModel):
    """Schema for release response."""
    id: int
    appointment_id: int
    document_id: int
    release_message: Optional[str]
    release_date: datetime
    deadline: Optional[datetime]
    status: str
    started_reading_at: Optional[datetime]
    completed_reading_at: Optional[datetime]
    feedback_submitted: bool
    feedback_submitted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    # Include document details
    document_title: Optional[str] = None
    document_word_count: Optional[int] = None
    writer_username: Optional[str] = None
    writer_display_name: Optional[str] = None
    
    class Config:
        from_attributes = True
