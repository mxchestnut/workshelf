"""
Document Schemas (DTOs)
Pydantic models for API request/response validation
"""
from pydantic import BaseModel, Field, ConfigDict, field_serializer
from typing import Optional, List, Union
from datetime import datetime
from enum import Enum
import json


class DocumentStatus(str, Enum):
    """Document status values"""
    DRAFT = "draft"
    BETA = "beta"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class DocumentVisibility(str, Enum):
    """Document visibility values"""
    PRIVATE = "private"
    STUDIO = "studio"
    PUBLIC = "public"


# Base schema with common fields
class DocumentBase(BaseModel):
    """Base document fields"""
    title: str = Field(..., min_length=1, max_length=500)
    content: Optional[Union[str, dict]] = None  # Supports both plain text and TipTap/ProseMirror JSON
    description: Optional[str] = Field(None, max_length=1000)  # Changed from excerpt
    status: DocumentStatus = DocumentStatus.DRAFT
    visibility: DocumentVisibility = DocumentVisibility.PRIVATE
    project_id: Optional[int] = None
    studio_id: Optional[int] = None
    tags: Optional[List[str]] = Field(default_factory=list)  # Tag names - stored in Tag/DocumentTag models


# Create schema (for POST requests)
class DocumentCreate(DocumentBase):
    """Schema for creating a new document"""
    pass


# Update schema (for PUT/PATCH requests)
class DocumentUpdate(BaseModel):
    """Schema for updating a document - all fields optional"""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[dict] = None  # TipTap/ProseMirror JSON format
    description: Optional[str] = Field(None, max_length=1000)  # Changed from excerpt
    status: Optional[DocumentStatus] = None
    visibility: Optional[DocumentVisibility] = None
    studio_id: Optional[int] = None
    tags: Optional[List[str]] = None  # Tag names - use tag API to manage document tags


# Response schema (what API returns)
class DocumentResponse(DocumentBase):
    """Schema for document in API responses"""
    id: int
    owner_id: int
    current_version: int  # Changed from version
    word_count: int
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    
    # Owner information (would need to be added via joins)
    # owner_username: Optional[str] = None
    # owner_display_name: Optional[str] = None
    
    # Studio information (would need to be added via joins)
    # studio_name: Optional[str] = None
    # studio_slug: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('content')
    def serialize_content(self, content: Union[str, dict, None], _info):
        """Parse JSON string content back to dict for API response"""
        if content is None:
            return None
        if isinstance(content, str):
            try:
                return json.loads(content)
            except (json.JSONDecodeError, ValueError):
                return content
        return content


# List response
class DocumentListResponse(BaseModel):
    """Schema for paginated document list"""
    documents: List[DocumentResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


# Detailed document with relationships
class DocumentDetail(DocumentResponse):
    """Extended document with full details"""
    # Could include collaborators, versions, etc.
    collaborator_count: Optional[int] = 0
    version_count: Optional[int] = 1
    comment_count: Optional[int] = 0
