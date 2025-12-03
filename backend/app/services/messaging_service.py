"""
Messaging service for managing conversations and direct messages.
"""
from typing import Optional, List
from datetime import datetime, timezone
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import MessageThread, Message


class MessagingService:
    """Service for managing conversations and messages."""
    
    @staticmethod
    async def create_conversation(
        db: AsyncSession,
        participant_ids: List[int],
        is_group: bool = False,
        title: Optional[str] = None
    ) -> MessageThread:
        """Create a new conversation."""
        conversation = MessageThread(
            is_group=is_group,
            title=title,
            participant_ids=participant_ids
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        return conversation
    
    @staticmethod
    async def get_conversation_by_id(
        db: AsyncSession,
        conversation_id: int
    ) -> Optional[MessageThread]:
        """Get a conversation by ID."""
        result = await db.execute(
            select(MessageThread).where(MessageThread.id == conversation_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_conversations(
        db: AsyncSession,
        user_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> List[MessageThread]:
        """Get all conversations for a user."""
        # Query conversations where user_id is in participant_ids JSON array
        result = await db.execute(
            select(MessageThread)
            .where(
                func.jsonb_exists(
                    MessageThread.participant_ids.cast(db.bind.dialect.JSONB),
                    str(user_id)
                )
            )
            .order_by(MessageThread.last_message_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_direct_conversation(
        db: AsyncSession,
        user1_id: int,
        user2_id: int
    ) -> Optional[MessageThread]:
        """Get existing direct conversation between two users."""
        # Sort IDs to ensure consistent ordering
        participant_ids = sorted([user1_id, user2_id])
        
        result = await db.execute(
            select(MessageThread).where(
                and_(
                    MessageThread.is_group == False,
                    MessageThread.participant_ids == participant_ids
                )
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def send_message(
        db: AsyncSession,
        conversation_id: int,
        sender_id: int,
        content: str
    ) -> Message:
        """Send a message in a conversation."""
        message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
            read_by={}  # Initialize empty read tracking
        )
        db.add(message)
        
        # Update conversation's last_message_at
        conversation = await MessagingService.get_conversation_by_id(db, conversation_id)
        if conversation:
            conversation.last_message_at = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(message)
        
        # Load sender relationship
        result = await db.execute(
            select(Message)
            .options(selectinload(Message.sender))
            .where(Message.id == message.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def get_messages(
        db: AsyncSession,
        conversation_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> List[Message]:
        """Get messages for a conversation."""
        result = await db.execute(
            select(Message)
            .options(selectinload(Message.sender))
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()
    
    @staticmethod
    async def mark_as_read(
        db: AsyncSession,
        message_id: int,
        user_id: int
    ) -> Optional[Message]:
        """Mark a message as read by a user."""
        result = await db.execute(
            select(Message).where(Message.id == message_id)
        )
        message = result.scalar_one_or_none()
        
        if not message:
            return None
        
        # Update read_by JSON
        if message.read_by is None:
            message.read_by = {}
        
        message.read_by[str(user_id)] = datetime.now(timezone.utc).isoformat()
        
        await db.commit()
        await db.refresh(message)
        return message
    
    @staticmethod
    async def mark_conversation_as_read(
        db: AsyncSession,
        conversation_id: int,
        user_id: int
    ) -> int:
        """Mark all messages in a conversation as read by a user."""
        # Get all unread messages in the conversation
        result = await db.execute(
            select(Message).where(
                and_(
                    Message.conversation_id == conversation_id,
                    Message.sender_id != user_id  # Don't mark own messages
                )
            )
        )
        messages = result.scalars().all()
        
        count = 0
        for message in messages:
            if message.read_by is None:
                message.read_by = {}
            
            # Only mark if not already read
            if str(user_id) not in message.read_by:
                message.read_by[str(user_id)] = datetime.now(timezone.utc).isoformat()
                count += 1
        
        await db.commit()
        return count
    
    @staticmethod
    async def get_unread_count(
        db: AsyncSession,
        user_id: int,
        conversation_id: Optional[int] = None
    ) -> int:
        """Get count of unread messages for a user."""
        query = select(func.count(Message.id)).where(
            Message.sender_id != user_id  # Don't count own messages
        )
        
        if conversation_id:
            query = query.where(Message.conversation_id == conversation_id)
        else:
            # Get all conversations for the user
            conv_result = await db.execute(
                select(MessageThread.id).where(
                    func.jsonb_exists(
                        MessageThread.participant_ids.cast(db.bind.dialect.JSONB),
                        str(user_id)
                    )
                )
            )
            conversation_ids = [row[0] for row in conv_result]
            query = query.where(Message.conversation_id.in_(conversation_ids))
        
        # Check if message is not in read_by for this user
        # This is a simplified version - in production you'd use a more efficient query
        result = await db.execute(query)
        total = result.scalar()
        
        # Now subtract the ones that are read
        read_query = select(func.count(Message.id)).where(
            and_(
                Message.sender_id != user_id,
                func.jsonb_exists(
                    Message.read_by.cast(db.bind.dialect.JSONB),
                    str(user_id)
                )
            )
        )
        
        if conversation_id:
            read_query = read_query.where(Message.conversation_id == conversation_id)
        else:
            read_query = read_query.where(Message.conversation_id.in_(conversation_ids))
        
        read_result = await db.execute(read_query)
        read_count = read_result.scalar()
        
        return total - read_count
