"""
Workspace schemas for collaborative spaces.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.workspace import (
    CollectionStatus,
    WorkspaceRole,
    WorkspaceType,
    WorkspaceVisibility,
)


class WorkspaceCreate(BaseModel):
    """Create a workspace."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    type: WorkspaceType = WorkspaceType.TEAM
    visibility: WorkspaceVisibility = WorkspaceVisibility.PRIVATE
    avatar_url: Optional[str] = None


class WorkspaceUpdate(BaseModel):
    """Update a workspace."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    visibility: Optional[WorkspaceVisibility] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None


class WorkspaceResponse(BaseModel):
    """Workspace response."""

    id: str
    name: str
    slug: str
    description: Optional[str]
    type: WorkspaceType
    visibility: WorkspaceVisibility
    owner_id: str
    avatar_url: Optional[str]
    is_active: bool
    member_count: int
    collection_count: int
    created_at: datetime
    updated_at: datetime
    user_role: Optional[WorkspaceRole] = None

    @field_validator("id", "owner_id", mode="before")
    @classmethod
    def convert_id_to_str(cls, v):
        """Convert integer ID to string."""
        return str(v) if v is not None else None

    class Config:
        from_attributes = True


class WorkspaceMemberResponse(BaseModel):
    """Workspace member response."""

    id: str
    workspace_id: str
    user_id: str
    username: Optional[str] = None
    role: WorkspaceRole
    can_create_collections: bool
    can_edit_workspace: bool
    can_manage_members: bool
    joined_at: datetime

    @field_validator("id", "workspace_id", "user_id", mode="before")
    @classmethod
    def convert_id_to_str(cls, v):
        """Convert integer ID to string."""
        return str(v) if v is not None else None

    class Config:
        from_attributes = True


class WorkspaceMemberInvite(BaseModel):
    """Invite a member to workspace."""

    user_id: int
    role: WorkspaceRole = WorkspaceRole.EDITOR
    can_create_collections: bool = True
    can_edit_workspace: bool = False
    can_manage_members: bool = False


class WorkspaceMemberUpdate(BaseModel):
    """Update workspace member permissions."""

    role: Optional[WorkspaceRole] = None
    can_create_collections: Optional[bool] = None
    can_edit_workspace: Optional[bool] = None
    can_manage_members: Optional[bool] = None


class WorkspaceCollectionCreate(BaseModel):
    """Create a workspace collection."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: CollectionStatus = CollectionStatus.DRAFT


class WorkspaceCollectionUpdate(BaseModel):
    """Update a workspace collection."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[CollectionStatus] = None


class WorkspaceCollectionResponse(BaseModel):
    """Workspace collection response."""

    id: str
    workspace_id: str
    name: str
    description: Optional[str]
    status: CollectionStatus
    created_by: str
    published_at: Optional[datetime]
    item_count: int
    created_at: datetime
    updated_at: datetime

    @field_validator("id", "workspace_id", "created_by", mode="before")
    @classmethod
    def convert_id_to_str(cls, v):
        """Convert integer ID to string."""
        return str(v) if v is not None else None

    class Config:
        from_attributes = True
