"""
User schemas for request/response validation
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class UserBase(BaseModel):
    """Base user fields"""
    username: str
    email: str
    display_name: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user responses"""
    id: int
    tenant_id: Optional[int]
    keycloak_id: str
    is_active: bool
    is_verified: bool
    is_staff: bool = False
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class PublicUserInfo(BaseModel):
    """Public user info (minimal)"""
    id: int
    username: str
    display_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
