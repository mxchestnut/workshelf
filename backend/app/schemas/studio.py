"""
Studio-related Pydantic schemas for request/response validation
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.models.studio import StudioMemberRole


# ============================================================================
# Studio Schemas
# ============================================================================

class StudioBase(BaseModel):
    """Base studio fields"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: bool = True
    is_active: bool = True


class StudioCreate(StudioBase):
    """Schema for creating a new studio"""
    pass


class StudioUpdate(BaseModel):
    """Schema for updating a studio (all fields optional)"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None


class StudioResponse(StudioBase):
    """Schema for studio responses"""
    id: int
    slug: str
    tenant_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class StudioListResponse(BaseModel):
    """Schema for paginated studio list"""
    studios: List['StudioResponse']
    total: int
    page: int
    page_size: int
    has_more: bool


class StudioMemberResponse(BaseModel):
    """Schema for studio member information"""
    user_id: int
    studio_id: int
    role: StudioMemberRole
    is_active: bool
    is_approved: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class StudioMemberAdd(BaseModel):
    """Schema for adding a member to a studio"""
    user_id: int
    role: StudioMemberRole = StudioMemberRole.MEMBER


class StudioMemberUpdateRole(BaseModel):
    """Schema for updating a member's role"""
    role: StudioMemberRole
