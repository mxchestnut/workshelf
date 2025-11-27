"""
User relationships (following/followers) schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class FollowStatus(str, Enum):
    """Follow relationship status."""
    FOLLOWING = "following"
    BLOCKED = "blocked"
    MUTED = "muted"


class FollowRequest(BaseModel):
    """Request to follow a user."""
    user_id: str


class FollowResponse(BaseModel):
    """Follow relationship response."""
    id: str
    follower_id: str
    following_id: str
    status: FollowStatus
    created_at: datetime

    class Config:
        from_attributes = True


class UserSummary(BaseModel):
    """Summary of a user for lists."""
    id: str
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    follower_count: int
    following_count: int
    is_following: bool = False


class FollowerListResponse(BaseModel):
    """List of followers."""
    users: List[UserSummary]
    total: int
    page: int
    page_size: int


class PrivacySettings(BaseModel):
    """User privacy settings."""
    profile_visible: bool = True
    show_followers: bool = True
    show_following: bool = True
    allow_messages: bool = True
    allow_comments: bool = True
