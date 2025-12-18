"""Messaging API - Direct messaging and conversations"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List

from app.core.database import get_db
from app.core.azure_auth import get_current_user
from app.services import user_service
from app.services.messaging_service import MessagingService
from app.schemas.collaboration import (
    ConversationCreate, ConversationResponse,
    MessageCreate, MessageResponse,
    UnreadCountResponse
)

router = APIRouter(prefix="/messaging", tags=["messaging"])


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new conversation."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Ensure current user is in participant list
    if user.id not in conversation_data.participant_ids:
        conversation_data.participant_ids.append(user.id)
    
    # For direct messages (2 participants), check if conversation exists
    if not conversation_data.is_group and len(conversation_data.participant_ids) == 2:
        other_user_id = [uid for uid in conversation_data.participant_ids if uid != user.id][0]
        existing = await MessagingService.get_direct_conversation(db, user.id, other_user_id)
        if existing:
            return existing
    
    conversation = await MessagingService.create_conversation(
        db,
        conversation_data.participant_ids,
        conversation_data.is_group,
        conversation_data.title
    )
    return conversation


@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    limit: int = 50,
    offset: int = 0,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all conversations for current user."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    conversations = await MessagingService.get_user_conversations(db, user.id, limit, offset)
    return conversations


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific conversation."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    conversation = await MessagingService.get_conversation_by_id(db, conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify user is a participant
    if user.id not in conversation.participant_ids:
        raise HTTPException(status_code=403, detail="Not authorized to access this conversation")
    
    return conversation


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    conversation_id: int,
    limit: int = 50,
    offset: int = 0,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get messages in a conversation."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Verify user is a participant
    conversation = await MessagingService.get_conversation_by_id(db, conversation_id)
    if not conversation or user.id not in conversation.participant_ids:
        raise HTTPException(status_code=403, detail="Not authorized to access this conversation")
    
    messages = await MessagingService.get_messages(db, conversation_id, limit, offset)
    return messages


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: int,
    message_data: MessageCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a message in a conversation."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Verify user is a participant
    conversation = await MessagingService.get_conversation_by_id(db, conversation_id)
    if not conversation or user.id not in conversation.participant_ids:
        raise HTTPException(status_code=403, detail="Not authorized to send messages in this conversation")
    
    message = await MessagingService.send_message(db, conversation_id, user.id, message_data.content)
    return message


@router.put("/messages/{message_id}/read", response_model=MessageResponse)
async def mark_message_read(
    message_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a message as read."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    message = await MessagingService.mark_as_read(db, message_id, user.id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return message


@router.put("/conversations/{conversation_id}/read", response_model=Dict[str, int])
async def mark_conversation_read(
    conversation_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark all messages in a conversation as read."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Verify user is a participant
    conversation = await MessagingService.get_conversation_by_id(db, conversation_id)
    if not conversation or user.id not in conversation.participant_ids:
        raise HTTPException(status_code=403, detail="Not authorized to access this conversation")
    
    count = await MessagingService.mark_conversation_as_read(db, conversation_id, user.id)
    return {"marked_read": count}


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    conversation_id: int = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get unread message count."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    count = await MessagingService.get_unread_count(db, user.id, conversation_id)
    return UnreadCountResponse(count=count, conversation_id=conversation_id)
