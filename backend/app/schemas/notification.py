"""
Notification system schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class NotificationType(str, Enum):
    """Types of notifications."""
    COMMENT = "comment"
    MENTION = "mention"
    FOLLOW = "follow"
    SHARE = "share"
    COLLABORATION_INVITE = "collaboration_invite"
    BETA_REQUEST = "beta_request"
    LIKE = "like"
    MESSAGE = "message"
    SYSTEM = "system"


class NotificationStatus(str, Enum):
    """Notification status."""
    UNREAD = "unread"
    READ = "read"
    ARCHIVED = "archived"


class NotificationCreate(BaseModel):
    """Create a notification (internal use)."""
    user_id: str
    type: NotificationType
    title: str
    message: str
    link: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class NotificationResponse(BaseModel):
    """Notification response."""
    id: str
    type: NotificationType
    title: str
    message: str
    link: Optional[str]
    metadata: Optional[Dict[str, Any]]
    status: NotificationStatus
    created_at: datetime
    read_at: Optional[datetime]

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """List of notifications."""
    notifications: List[NotificationResponse]
    unread_count: int
    total: int
    page: int
    page_size: int


class MarkAsReadRequest(BaseModel):
    """Mark notifications as read."""
    notification_ids: List[str]
