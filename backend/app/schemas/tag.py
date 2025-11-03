"""
Tag schemas for document categorization
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class TagBase(BaseModel):
    """Base tag fields"""
    name: str = Field(..., min_length=1, max_length=50)
    color: Optional[str] = Field(None, max_length=7)  # Hex color


class TagCreate(TagBase):
    """Schema for creating a tag"""
    pass


class TagUpdate(BaseModel):
    """Schema for updating a tag"""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    color: Optional[str] = Field(None, max_length=7)


class TagResponse(TagBase):
    """Schema for tag responses"""
    id: int
    user_id: int
    usage_count: int = 0
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TagListResponse(BaseModel):
    """Schema for paginated tag list"""
    tags: List[TagResponse]
    total: int
    page: int
    page_size: int
    has_more: bool
