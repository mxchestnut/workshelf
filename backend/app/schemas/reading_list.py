"""
Collections and bookmarking schemas.
NOTE: This conflicts with Phase 0 database - Collections table doesn't exist.
Using 'Reading Lists' concept instead to avoid confusion.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class BookmarkCreate(BaseModel):
    """Create a bookmark."""
    document_id: int
    notes: Optional[str] = None


class BookmarkResponse(BaseModel):
    """Bookmark response."""
    id: int
    user_id: int
    document_id: int
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ReadingListCreate(BaseModel):
    """Create a reading list."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: bool = False


class ReadingListUpdate(BaseModel):
    """Update a reading list."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: Optional[bool] = None


class ReadingListResponse(BaseModel):
    """Reading list response."""
    id: int
    name: str
    description: Optional[str]
    is_public: bool
    document_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AddToReadingListRequest(BaseModel):
    """Add document to reading list."""
    document_id: int
