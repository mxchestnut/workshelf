"""
Document sharing and permissions schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PermissionLevel(str, Enum):
    """Permission levels for shared documents."""
    VIEW = "view"
    COMMENT = "comment"
    EDIT = "edit"
    ADMIN = "admin"


class ShareMethod(str, Enum):
    """How document is shared."""
    DIRECT = "direct"  # Shared with specific user
    LINK = "link"      # Anyone with link
    PUBLIC = "public"  # Public on platform


class ShareDocumentRequest(BaseModel):
    """Request to share a document."""
    user_id: Optional[str] = None  # For direct sharing
    permission: PermissionLevel = PermissionLevel.VIEW
    method: ShareMethod
    expiration: Optional[datetime] = None
    message: Optional[str] = None


class ShareLinkCreate(BaseModel):
    """Create a shareable link."""
    permission: PermissionLevel = PermissionLevel.VIEW
    expiration: Optional[datetime] = None
    password: Optional[str] = None


class ShareLinkResponse(BaseModel):
    """Shareable link response."""
    id: str
    document_id: str
    token: str
    permission: PermissionLevel
    expiration: Optional[datetime]
    has_password: bool
    view_count: int
    created_at: datetime
    url: str  # Full URL with token

    class Config:
        from_attributes = True


class CollaboratorResponse(BaseModel):
    """Document collaborator."""
    id: str
    user_id: str
    username: str
    avatar_url: Optional[str]
    permission: PermissionLevel
    added_at: datetime
    last_accessed: Optional[datetime]

    class Config:
        from_attributes = True


class DocumentPermissionsResponse(BaseModel):
    """Complete document permissions."""
    document_id: str
    owner_id: str
    is_public: bool
    collaborators: List[CollaboratorResponse]
    share_links: List[ShareLinkResponse]
