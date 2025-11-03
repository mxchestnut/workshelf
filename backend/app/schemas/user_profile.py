"""
User Profile schemas for request/response validation
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class UserProfileBase(BaseModel):
    """Base user profile fields"""
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=500)
    website_url: Optional[str] = Field(None, max_length=500)
    twitter_handle: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=200)


class UserProfileUpdate(UserProfileBase):
    """Schema for updating user profile"""
    pass


class UserProfileResponse(UserProfileBase):
    """Schema for user profile responses"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PublicUserProfile(BaseModel):
    """Public user profile (limited info)"""
    id: int
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
