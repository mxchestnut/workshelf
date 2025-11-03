from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List
from enum import Enum


# Enums
class NotificationType(str, Enum):
    FOLLOW = "follow"
    COMMENT = "comment"
    MENTION = "mention"
    LIKE = "like"
    SHARE = "share"
    COLLABORATION_INVITE = "collaboration_invite"
    BETA_REQUEST = "beta_request"
    SYSTEM = "system"


class ActivityEventType(str, Enum):
    DOCUMENT_CREATED = "document_created"
    DOCUMENT_PUBLISHED = "document_published"
    DOCUMENT_UPDATED = "document_updated"
    DOCUMENT_SHARED = "document_shared"
    USER_FOLLOWED = "user_followed"
    PROJECT_CREATED = "project_created"
    COMMENT_ADDED = "comment_added"
    COLLABORATION_STARTED = "collaboration_started"
    MILESTONE_REACHED = "milestone_reached"


# User Follow Schemas
class UserFollowCreate(BaseModel):
    following_id: int = Field(..., description="ID of user to follow")


class UserFollowResponse(BaseModel):
    id: int
    follower_id: int
    following_id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class FollowerInfo(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    followed_at: datetime
    
    class Config:
        from_attributes = True


class FollowersListResponse(BaseModel):
    total: int
    followers: List[FollowerInfo]


class FollowingListResponse(BaseModel):
    total: int
    following: List[FollowerInfo]


# Share Link Schemas
class ShareLinkCreate(BaseModel):
    document_id: int
    password: Optional[str] = None
    expires_at: Optional[datetime] = None
    allow_downloads: bool = True
    allow_comments: bool = False


class ShareLinkResponse(BaseModel):
    id: int
    document_id: int
    created_by: int
    token: str
    expires_at: Optional[datetime]
    is_active: bool
    allow_downloads: bool
    allow_comments: bool
    view_count: int
    last_accessed_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ShareLinkUpdate(BaseModel):
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None
    allow_downloads: Optional[bool] = None
    allow_comments: Optional[bool] = None


class ShareLinkAccessRequest(BaseModel):
    password: Optional[str] = None


# Notification Schemas
class NotificationCreate(BaseModel):
    user_id: int
    type: NotificationType
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    action_url: Optional[str] = None
    actor_id: Optional[int] = None
    metadata: Optional[dict] = None


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    entity_type: Optional[str]
    entity_id: Optional[int]
    action_url: Optional[str]
    is_read: bool
    read_at: Optional[datetime]
    actor_id: Optional[int]
    metadata: Optional[dict]
    created_at: datetime
    
    class Config:
        from_attributes = True


class NotificationsListResponse(BaseModel):
    total: int
    unread_count: int
    notifications: List[NotificationResponse]


class NotificationMarkRead(BaseModel):
    is_read: bool = True


# Activity Event Schemas
class ActivityEventCreate(BaseModel):
    user_id: int
    event_type: ActivityEventType
    description: str
    entity_type: str
    entity_id: int
    is_public: bool = True
    metadata: Optional[dict] = None


class ActivityEventResponse(BaseModel):
    id: int
    user_id: int
    event_type: str
    description: str
    entity_type: str
    entity_id: int
    is_public: bool
    metadata: Optional[dict]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ActivityFeedResponse(BaseModel):
    total: int
    events: List[ActivityEventResponse]
