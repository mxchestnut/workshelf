"""
Pydantic schemas for Phase 4 Collaboration features.
"""
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field

from app.models.collaboration import BetaRequestStatus, GroupMemberRole


# ============================================================================
# Comment Schemas
# ============================================================================

class CommentCreate(BaseModel):
    """Schema for creating a comment."""
    content: str = Field(..., min_length=1)
    parent_id: Optional[int] = None
    anchor: Optional[Dict] = None


class CommentUpdate(BaseModel):
    """Schema for updating a comment."""
    content: str = Field(..., min_length=1)


class CommentReactionCreate(BaseModel):
    """Schema for creating a reaction."""
    reaction_type: str = Field(..., min_length=1, max_length=50)


class UserBasic(BaseModel):
    """Basic user info for responses."""
    id: int
    keycloak_id: str
    username: str
    email: Optional[str] = None
    
    class Config:
        from_attributes = True


class CommentResponse(BaseModel):
    """Schema for comment response."""
    id: int
    document_id: int
    user_id: int
    user: UserBasic
    content: str
    parent_id: Optional[int]
    anchor: Optional[Dict]
    is_edited: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CommentReactionResponse(BaseModel):
    """Schema for comment reaction response."""
    id: int
    comment_id: int
    user_id: int
    user: UserBasic
    reaction_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Beta Reading Schemas
# ============================================================================

class BetaRequestCreate(BaseModel):
    """Schema for creating a beta request."""
    document_id: int
    reader_id: int
    message: Optional[str] = None
    deadline: Optional[datetime] = None


class BetaRequestUpdate(BaseModel):
    """Schema for updating beta request status."""
    status: BetaRequestStatus


class BetaFeedbackCreate(BaseModel):
    """Schema for creating beta feedback."""
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    rating: Optional[int] = Field(None, ge=1, le=5)
    strengths: Optional[List[str]] = None
    improvements: Optional[List[str]] = None
    is_private: bool = False


class DocumentBasic(BaseModel):
    """Basic document info for responses."""
    id: int
    title: str
    owner_id: int
    
    class Config:
        from_attributes = True


class BetaRequestResponse(BaseModel):
    """Schema for beta request response."""
    id: int
    document_id: int
    author_id: int
    reader_id: int
    status: BetaRequestStatus
    message: Optional[str]
    deadline: Optional[datetime]
    accepted_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class BetaFeedbackResponse(BaseModel):
    """Schema for beta feedback response."""
    id: int
    request_id: int
    title: str
    content: str
    rating: Optional[int]
    strengths: Optional[List[str]]
    improvements: Optional[List[str]]
    is_private: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Group Schemas
# ============================================================================

class GroupCreate(BaseModel):
    """Schema for creating a group."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    slug: Optional[str] = Field(None, max_length=255)
    is_public: bool = False
    avatar_url: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = None
    rules: Optional[str] = None


class GroupUpdate(BaseModel):
    """Schema for updating a group."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: Optional[bool] = None
    avatar_url: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = None
    rules: Optional[str] = None


class GroupMemberAdd(BaseModel):
    """Schema for adding a member to a group."""
    user_id: int
    role: GroupMemberRole = GroupMemberRole.MEMBER


class GroupMemberRoleUpdate(BaseModel):
    """Schema for updating member role."""
    role: GroupMemberRole


class GroupMemberResponse(BaseModel):
    """Schema for group member response."""
    id: int
    group_id: int
    user_id: int
    user: UserBasic
    role: GroupMemberRole
    is_active: bool
    joined_at: datetime
    
    class Config:
        from_attributes = True


class GroupResponse(BaseModel):
    """Schema for group response."""
    id: int
    name: str
    description: Optional[str]
    slug: str
    is_public: bool
    is_active: bool
    avatar_url: Optional[str]
    tags: Optional[List[str]]
    rules: Optional[str]
    subdomain_requested: Optional[str]
    subdomain_approved: bool = False
    can_use_custom_domain: bool = False
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Messaging Schemas
# ============================================================================

class ConversationCreate(BaseModel):
    """Schema for creating a conversation."""
    participant_ids: List[int] = Field(..., min_length=2)
    is_group: bool = False
    title: Optional[str] = Field(None, max_length=255)


class MessageCreate(BaseModel):
    """Schema for creating a message."""
    content: str = Field(..., min_length=1)


class MessageResponse(BaseModel):
    """Schema for message response."""
    id: int
    conversation_id: int
    sender_id: int
    sender: UserBasic
    content: str
    read_by: Optional[Dict[str, str]]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    """Schema for conversation response."""
    id: int
    is_group: bool
    title: Optional[str]
    participant_ids: List[int]
    last_message_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    """Schema for unread count response."""
    count: int
    conversation_id: Optional[int] = None
