"""
Commenting system schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CommentCreate(BaseModel):
    """Create a comment."""
    content: str = Field(..., min_length=1)
    parent_id: Optional[str] = None  # For threaded comments
    anchor: Optional[str] = None  # Text selection anchor for inline comments


class CommentUpdate(BaseModel):
    """Update a comment."""
    content: str = Field(..., min_length=1)


class ReactionType(BaseModel):
    """Available reaction types."""
    type: str  # emoji or predefined type
    count: int


class CommentResponse(BaseModel):
    """Comment response."""
    id: str
    document_id: str
    author_id: str
    author_username: str
    author_avatar: Optional[str]
    content: str
    parent_id: Optional[str]
    anchor: Optional[str]
    reactions: List[ReactionType]
    reply_count: int
    created_at: datetime
    updated_at: datetime
    is_edited: bool
    user_reaction: Optional[str] = None

    class Config:
        from_attributes = True


class CommentThreadResponse(BaseModel):
    """Comment with nested replies."""
    comment: CommentResponse
    replies: List["CommentThreadResponse"]


class AddReactionRequest(BaseModel):
    """Add a reaction to a comment."""
    reaction: str  # emoji or type
