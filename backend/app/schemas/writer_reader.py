"""
Schemas for Writer-Reader relationships (Alpha/Beta readers)
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ReaderRole(str, Enum):
    """Reader role types"""
    ALPHA = "alpha"
    BETA = "beta"


class WriterReaderRelationshipCreate(BaseModel):
    """Create a writer-reader relationship"""
    reader_id: int
    role: ReaderRole
    custom_label: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class WriterReaderRelationshipUpdate(BaseModel):
    """Update a writer-reader relationship"""
    is_active: Optional[bool] = None
    custom_label: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class WriterReaderRelationshipResponse(BaseModel):
    """Writer-reader relationship response"""
    id: int
    writer_id: int
    reader_id: int
    role: ReaderRole
    is_active: bool
    custom_label: Optional[str] = None
    notes: Optional[str] = None
    documents_shared: int
    feedback_provided: int
    created_at: datetime
    updated_at: datetime
    
    # Reader info
    reader_username: Optional[str] = None
    reader_display_name: Optional[str] = None
    reader_avatar_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class ReaderProfileInfo(BaseModel):
    """Reader profile information for display"""
    user_id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    has_beta_profile: bool = False
    bio: Optional[str] = None
    genres: Optional[list[str]] = None
    specialties: Optional[list[str]] = None
    is_alpha_reader_for_me: bool = False
    is_beta_reader_for_me: bool = False
    is_following_me: bool = False
    am_i_following: bool = False
    
    class Config:
        from_attributes = True
