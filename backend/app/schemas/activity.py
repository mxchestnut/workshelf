"""
Activity stream and event tracking schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class ActivityType(str, Enum):
    """Types of activities."""
    DOCUMENT_CREATED = "document_created"
    DOCUMENT_PUBLISHED = "document_published"
    DOCUMENT_UPDATED = "document_updated"
    COMMENT_ADDED = "comment_added"
    USER_FOLLOWED = "user_followed"
    COLLECTION_CREATED = "collection_created"
    BETA_REQUEST = "beta_request"
    ACHIEVEMENT = "achievement"


class ActivityVisibility(str, Enum):
    """Activity visibility."""
    PUBLIC = "public"
    FOLLOWERS = "followers"
    PRIVATE = "private"


class ActivityEvent(BaseModel):
    """Activity event data."""
    type: ActivityType
    actor_id: str
    target_id: Optional[str] = None  # Document, user, etc.
    metadata: Optional[Dict[str, Any]] = None
    visibility: ActivityVisibility = ActivityVisibility.PUBLIC


class ActivityResponse(BaseModel):
    """Activity feed item."""
    id: str
    type: ActivityType
    actor_id: str
    actor_username: str
    actor_avatar: Optional[str]
    target_id: Optional[str]
    target_title: Optional[str]
    message: str
    metadata: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityFeedResponse(BaseModel):
    """Activity feed."""
    activities: List[ActivityResponse]
    total: int
    page: int
    page_size: int
    has_more: bool
