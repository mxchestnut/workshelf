"""
Project and folder organization schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ProjectType(str, Enum):
    """Project types."""
    NOVEL = "novel"
    NOVELLA = "novella"
    SHORT_STORY = "short_story"
    SCREENPLAY = "screenplay"
    POETRY = "poetry"
    NON_FICTION = "non_fiction"
    MEMOIR = "memoir"
    BLANK = "blank"
    ESSAY = "essay"
    SCRIPT = "script"
    BLOG = "blog"
    OTHER = "other"


class FolderCreate(BaseModel):
    """Request to create a folder."""
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[int] = None
    project_id: Optional[int] = None
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = None


class FolderUpdate(BaseModel):
    """Request to update a folder."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    parent_id: Optional[int] = None
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = None


class FolderResponse(BaseModel):
    """Folder response."""
    id: int
    name: str
    parent_id: Optional[int]
    project_id: Optional[int]
    color: Optional[str]
    icon: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    document_count: Optional[int] = None
    subfolder_count: Optional[int] = None

    class Config:
        from_attributes = True


class ProjectCreate(BaseModel):
    """Request to create a project."""
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    project_type: ProjectType
    target_word_count: Optional[int] = None
    folder_id: Optional[str] = None


class ProjectUpdate(BaseModel):
    """Request to update a project."""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    project_type: Optional[ProjectType] = None
    target_word_count: Optional[int] = None


class ProjectResponse(BaseModel):
    """Project response."""
    id: int
    title: str
    description: Optional[str]
    project_type: ProjectType
    target_word_count: Optional[int]
    current_word_count: Optional[int] = None
    folder_id: Optional[int]
    template_id: Optional[int] = None
    ai_template_id: Optional[int] = None
    prompt_responses: Optional[List[dict]] = None
    created_at: datetime
    updated_at: datetime
    
    # Computed fields (can be added later via service layer)
    progress_percentage: Optional[float] = None
    document_count: Optional[int] = None

    class Config:
        from_attributes = True


class DocumentMetadataUpdate(BaseModel):
    """Update document metadata."""
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None
