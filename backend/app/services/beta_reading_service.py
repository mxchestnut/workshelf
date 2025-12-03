"""
Beta reading service for managing beta requests and feedback.
"""
from typing import Optional, List
from datetime import datetime, timezone
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import BetaRequest, BetaFeedback, BetaRequestStatus


class BetaReadingService:
    """Service for managing beta reading requests and feedback."""
    
    @staticmethod
    async def create_request(
        db: AsyncSession,
        document_id: int,
        author_id: int,
        reader_id: int,
        message: Optional[str] = None,
        deadline: Optional[datetime] = None
    ) -> BetaRequest:
        """Create a beta reading request."""
        request = BetaRequest(
            document_id=document_id,
            author_id=author_id,
            reader_id=reader_id,
            message=message,
            deadline=deadline,
            status=BetaRequestStatus.PENDING
        )
        db.add(request)
        await db.commit()
        await db.refresh(request)
        
        # Load relationships
        result = await db.execute(
            select(BetaRequest)
            .options(
                selectinload(BetaRequest.author),
                selectinload(BetaRequest.reader),
                selectinload(BetaRequest.document)
            )
            .where(BetaRequest.id == request.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def get_request_by_id(
        db: AsyncSession,
        request_id: int
    ) -> Optional[BetaRequest]:
        """Get a beta request by ID."""
        result = await db.execute(
            select(BetaRequest)
            .options(
                selectinload(BetaRequest.author),
                selectinload(BetaRequest.reader),
                selectinload(BetaRequest.document)
            )
            .where(BetaRequest.id == request_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_sent_requests(
        db: AsyncSession,
        author_id: int,
        status: Optional[BetaRequestStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[BetaRequest]:
        """Get beta requests sent by the author."""
        query = select(BetaRequest).options(
            selectinload(BetaRequest.reader),
            selectinload(BetaRequest.document)
        ).where(BetaRequest.author_id == author_id)
        
        if status:
            query = query.where(BetaRequest.status == status)
        
        query = query.order_by(BetaRequest.created_at.desc()).limit(limit).offset(offset)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_received_requests(
        db: AsyncSession,
        reader_id: int,
        status: Optional[BetaRequestStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[BetaRequest]:
        """Get beta requests received by the reader."""
        query = select(BetaRequest).options(
            selectinload(BetaRequest.author),
            selectinload(BetaRequest.document)
        ).where(BetaRequest.reader_id == reader_id)
        
        if status:
            query = query.where(BetaRequest.status == status)
        
        query = query.order_by(BetaRequest.created_at.desc()).limit(limit).offset(offset)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def update_request_status(
        db: AsyncSession,
        request_id: int,
        user_id: int,
        status: BetaRequestStatus
    ) -> Optional[BetaRequest]:
        """Update the status of a beta request (reader only)."""
        result = await db.execute(
            select(BetaRequest).where(
                and_(
                    BetaRequest.id == request_id,
                    BetaRequest.reader_id == user_id
                )
            )
        )
        request = result.scalar_one_or_none()
        
        if not request:
            return None
        
        request.status = status
        
        # Set timestamps based on status
        if status == BetaRequestStatus.ACCEPTED:
            request.accepted_at = datetime.now(timezone.utc)
        elif status == BetaRequestStatus.COMPLETED:
            request.completed_at = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(request)
        
        # Load relationships
        result = await db.execute(
            select(BetaRequest)
            .options(
                selectinload(BetaRequest.author),
                selectinload(BetaRequest.reader),
                selectinload(BetaRequest.document)
            )
            .where(BetaRequest.id == request.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def create_feedback(
        db: AsyncSession,
        request_id: int,
        title: str,
        content: str,
        rating: Optional[int] = None,
        strengths: Optional[List[str]] = None,
        improvements: Optional[List[str]] = None,
        is_private: bool = False
    ) -> BetaFeedback:
        """Create feedback for a beta request."""
        feedback = BetaFeedback(
            request_id=request_id,
            title=title,
            content=content,
            rating=rating,
            strengths=strengths,
            improvements=improvements,
            is_private=is_private
        )
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)
        
        # Load request relationship
        result = await db.execute(
            select(BetaFeedback)
            .options(selectinload(BetaFeedback.request))
            .where(BetaFeedback.id == feedback.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def get_feedback_by_request(
        db: AsyncSession,
        request_id: int,
        user_id: Optional[int] = None
    ) -> List[BetaFeedback]:
        """Get all feedback for a beta request."""
        query = select(BetaFeedback).where(BetaFeedback.request_id == request_id)
        
        # If user_id provided, filter out private feedback not belonging to them
        if user_id:
            query = query.join(BetaRequest).where(
                or_(
                    BetaFeedback.is_private == False,
                    BetaRequest.author_id == user_id,
                    BetaRequest.reader_id == user_id
                )
            )
        else:
            # Only public feedback if no user
            query = query.where(BetaFeedback.is_private == False)
        
        query = query.order_by(BetaFeedback.created_at.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_feedback_by_id(
        db: AsyncSession,
        feedback_id: int
    ) -> Optional[BetaFeedback]:
        """Get feedback by ID."""
        result = await db.execute(
            select(BetaFeedback)
            .options(selectinload(BetaFeedback.request))
            .where(BetaFeedback.id == feedback_id)
        )
        return result.scalar_one_or_none()
