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
    interests: Optional[List[str]] = None
    rules: Optional[str] = None
    tagline: Optional[str] = Field(None, max_length=500)
    hero_image_url: Optional[str] = Field(None, max_length=500)
    about_page: Optional[str] = None
    featured_posts: Optional[List[int]] = None  # List of post IDs


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
    interests: Optional[List[str]]
    rules: Optional[str]
    tagline: Optional[str]
    hero_image_url: Optional[str]
    about_page: Optional[str]
    featured_posts: Optional[List[int]]
    subdomain_requested: Optional[str]
    subdomain_approved: bool = False
    can_use_custom_domain: bool = False
    has_scholarship: bool = False
    scholarship_plan: Optional[str]
    scholarship_discount_percent: Optional[int]
    scholarship_monthly_price: Optional[float]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Custom Role Schemas
# ============================================================================

class GroupRoleCreate(BaseModel):
    """Schema for creating a custom group role."""
    name: str = Field(..., min_length=1, max_length=100)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    position: int = Field(default=0)
    
    # Content moderation permissions
    can_delete_posts: bool = False
    can_delete_comments: bool = False
    can_pin_posts: bool = False
    can_lock_threads: bool = False
    can_manage_tags: bool = False
    
    # Member management permissions
    can_approve_members: bool = False
    can_kick_members: bool = False
    can_ban_members: bool = False
    can_invite_members: bool = False
    can_view_member_list: bool = True
    
    # Publishing permissions
    can_approve_publications: bool = False
    can_edit_publications: bool = False
    can_feature_publications: bool = False
    
    # Settings permissions
    can_edit_group_info: bool = False
    can_manage_roles: bool = False
    can_view_analytics: bool = False
    can_export_data: bool = False


class GroupRoleUpdate(BaseModel):
    """Schema for updating a custom group role."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    position: Optional[int] = None
    
    # Content moderation permissions
    can_delete_posts: Optional[bool] = None
    can_delete_comments: Optional[bool] = None
    can_pin_posts: Optional[bool] = None
    can_lock_threads: Optional[bool] = None
    can_manage_tags: Optional[bool] = None
    
    # Member management permissions
    can_approve_members: Optional[bool] = None
    can_kick_members: Optional[bool] = None
    can_ban_members: Optional[bool] = None
    can_invite_members: Optional[bool] = None
    can_view_member_list: Optional[bool] = None
    
    # Publishing permissions
    can_approve_publications: Optional[bool] = None
    can_edit_publications: Optional[bool] = None
    can_feature_publications: Optional[bool] = None
    
    # Settings permissions
    can_edit_group_info: Optional[bool] = None
    can_manage_roles: Optional[bool] = None
    can_view_analytics: Optional[bool] = None
    can_export_data: Optional[bool] = None


class GroupRoleResponse(BaseModel):
    """Schema for group role response."""
    id: int
    group_id: int
    name: str
    color: Optional[str]
    position: int
    
    # Content moderation permissions
    can_delete_posts: bool
    can_delete_comments: bool
    can_pin_posts: bool
    can_lock_threads: bool
    can_manage_tags: bool
    
    # Member management permissions
    can_approve_members: bool
    can_kick_members: bool
    can_ban_members: bool
    can_invite_members: bool
    can_view_member_list: bool
    
    # Publishing permissions
    can_approve_publications: bool
    can_edit_publications: bool
    can_feature_publications: bool
    
    # Settings permissions
    can_edit_group_info: bool
    can_manage_roles: bool
    can_view_analytics: bool
    can_export_data: bool
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class GroupMemberRoleAssignment(BaseModel):
    """Schema for assigning a role to a member."""
    role_id: int


# ============================================================================
# Scholarship Schemas
# ============================================================================

class ScholarshipRequestCreate(BaseModel):
    """Schema for creating a scholarship request."""
    group_id: int
    request_type: str = Field(..., pattern="^(free|sliding_scale)$")
    current_financial_situation: str = Field(..., min_length=50, max_length=2000)
    why_important: str = Field(..., min_length=50, max_length=2000)
    how_will_use: str = Field(..., min_length=50, max_length=2000)
    additional_info: Optional[str] = Field(None, max_length=2000)
    monthly_budget: Optional[float] = Field(None, ge=0, le=10000)


class ScholarshipRequestResponse(BaseModel):
    """Schema for scholarship request response."""
    id: int
    group_id: int
    user_id: int
    status: str
    request_type: str
    current_financial_situation: str
    why_important: str
    how_will_use: str
    additional_info: Optional[str]
    monthly_budget: Optional[float]
    approved_plan: Optional[str]
    approved_discount_percent: Optional[int]
    approved_monthly_price: Optional[float]
    staff_notes: Optional[str]
    rejection_reason: Optional[str]
    requested_at: datetime
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[int]
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ScholarshipDecision(BaseModel):
    """Schema for staff decision on scholarship."""
    approved: bool
    approved_plan: Optional[str] = Field(None, pattern="^(free|basic|pro|custom)$")
    approved_discount_percent: Optional[int] = Field(None, ge=0, le=100)
    approved_monthly_price: Optional[float] = Field(None, ge=0)
    staff_notes: Optional[str] = Field(None, max_length=2000)
    rejection_reason: Optional[str] = Field(None, max_length=2000)
    duration_months: Optional[int] = Field(12, ge=1, le=36)  # Default 1 year


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
