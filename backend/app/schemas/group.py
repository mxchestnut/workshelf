"""
Groups and communities schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class GroupVisibility(str, Enum):
    """Group visibility."""
    PUBLIC = "public"
    PRIVATE = "private"
    SECRET = "secret"


class GroupMemberRole(str, Enum):
    """Group member roles."""
    OWNER = "owner"
    ADMIN = "admin"
    MODERATOR = "moderator"
    MEMBER = "member"


class GroupCreate(BaseModel):
    """Create a group."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    visibility: GroupVisibility = GroupVisibility.PUBLIC
    tags: Optional[List[str]] = None


class GroupUpdate(BaseModel):
    """Update a group."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    visibility: Optional[GroupVisibility] = None
    tags: Optional[List[str]] = None


class GroupResponse(BaseModel):
    """Group response."""
    id: str
    name: str
    slug: str
    description: Optional[str]
    visibility: GroupVisibility
    member_count: int
    document_count: int
    created_at: datetime
    is_member: bool = False
    member_role: Optional[GroupMemberRole] = None

    class Config:
        from_attributes = True


class GroupMemberResponse(BaseModel):
    """Group member."""
    user_id: str
    username: str
    avatar_url: Optional[str]
    role: GroupMemberRole
    joined_at: datetime

    class Config:
        from_attributes = True


class InviteToGroupRequest(BaseModel):
    """Invite user to group."""
    user_id: str
    role: GroupMemberRole = GroupMemberRole.MEMBER
    message: Optional[str] = None
