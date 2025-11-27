"""
Reading experience and public document view schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class ReadingMode(str, Enum):
    """Reading mode preferences."""
    STANDARD = "standard"
    FOCUS = "focus"
    DYSLEXIC = "dyslexic"
    SEPIA = "sepia"


class FontSize(str, Enum):
    """Font size options."""
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    EXTRA_LARGE = "extra_large"


class ReaderSettings(BaseModel):
    """Reader preferences."""
    mode: ReadingMode = ReadingMode.STANDARD
    font_size: FontSize = FontSize.MEDIUM
    font_family: str = "Georgia"
    line_height: float = 1.8
    width: int = 680  # Reading column width in px
    background_color: Optional[str] = None
    text_color: Optional[str] = None


class PublicDocumentView(BaseModel):
    """Public view of a document."""
    id: int
    title: str
    content: Dict[str, Any]
    author_id: int
    author_username: str
    author_avatar: Optional[str]
    published_at: datetime
    updated_at: datetime
    word_count: int
    read_time_minutes: int
    view_count: int
    like_count: int
    comment_count: int
    tags: List[str]
    is_liked: bool = False
    is_bookmarked: bool = False


class ReadingProgress(BaseModel):
    """Track reading progress."""
    document_id: int
    progress_percentage: int = Field(..., ge=0, le=100)
    last_position: Optional[Dict[str, Any]] = None


class ReadingProgressResponse(BaseModel):
    """Reading progress response."""
    document_id: int
    progress_percentage: int
    last_position: Optional[Dict[str, Any]]
    started_at: datetime
    last_read: datetime
    completed: bool

    class Config:
        from_attributes = True
