"""
Direct messaging schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class MessageCreate(BaseModel):
    """Create a message."""
    recipient_id: Optional[str] = None  # For DM
    conversation_id: Optional[str] = None  # For existing conversation
    content: str = Field(..., min_length=1, max_length=5000)
    attachments: Optional[List[str]] = None


class MessageResponse(BaseModel):
    """Message response."""
    id: str
    conversation_id: str
    sender_id: str
    sender_username: str
    sender_avatar: Optional[str]
    content: str
    attachments: Optional[List[str]]
    created_at: datetime
    read_at: Optional[datetime]
    is_read: bool

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    """Conversation summary."""
    id: str
    participant_ids: List[str]
    participant_usernames: List[str]
    last_message: Optional[MessageResponse]
    unread_count: int
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    """List of conversations."""
    conversations: List[ConversationResponse]
    total: int
    unread_total: int
