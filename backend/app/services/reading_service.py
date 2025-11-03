"""
Reading Service - Reading progress and public document viewing
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select, func, or_
from datetime import datetime
from typing import List, Optional, Dict, Any

from ..models.reading import ReadingProgress
from ..models.document import Document
from ..models.user import User


class ReadingService:
    """Service for managing reading progress and public document views."""
    
    @staticmethod
    async def get_or_create_progress(
        db: AsyncSession,
        user_id: int,
        document_id: int
    ) -> ReadingProgress:
        """Get or create reading progress for a document."""
        stmt = select(ReadingProgress).filter(
            and_(
                ReadingProgress.user_id == user_id,
                ReadingProgress.document_id == document_id
            )
        )
        result = await db.execute(stmt)
        progress = result.scalar_one_or_none()
        
        if not progress:
            progress = ReadingProgress(
                user_id=user_id,
                document_id=document_id,
                progress_percentage=0,
                started_at=datetime.utcnow(),
                last_read=datetime.utcnow(),
                completed=False
            )
            db.add(progress)
            await db.commit()
            await db.refresh(progress)
        
        return progress
    
    @staticmethod
    async def update_progress(
        db: AsyncSession,
        user_id: int,
        document_id: int,
        progress_percentage: int,
        last_position: Optional[Dict[str, Any]] = None
    ) -> ReadingProgress:
        """Update reading progress."""
        progress = await ReadingService.get_or_create_progress(db, user_id, document_id)
        
        progress.progress_percentage = min(100, max(0, progress_percentage))
        progress.last_position = last_position
        progress.last_read = datetime.utcnow()
        
        # Mark as completed if 100%
        if progress.progress_percentage >= 100 and not progress.completed:
            progress.completed = True
            progress.completed_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(progress)
        return progress
    
    @staticmethod
    async def get_progress(
        db: AsyncSession,
        user_id: int,
        document_id: int
    ) -> Optional[ReadingProgress]:
        """Get reading progress for a specific document."""
        stmt = select(ReadingProgress).filter(
            and_(
                ReadingProgress.user_id == user_id,
                ReadingProgress.document_id == document_id
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_reading_history(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[ReadingProgress], int]:
        """Get user's reading history."""
        stmt = select(ReadingProgress).filter(
            ReadingProgress.user_id == user_id
        ).order_by(ReadingProgress.last_read.desc()).offset(skip).limit(limit)
        
        result = await db.execute(stmt)
        items = list(result.scalars().all())
        
        # Count total
        count_stmt = select(func.count()).select_from(ReadingProgress).filter(
            ReadingProgress.user_id == user_id
        )
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        return items, total
    
    @staticmethod
    async def get_currently_reading(
        db: AsyncSession,
        user_id: int,
        limit: int = 10
    ) -> List[ReadingProgress]:
        """Get documents user is currently reading (in progress)."""
        stmt = select(ReadingProgress).filter(
            and_(
                ReadingProgress.user_id == user_id,
                ReadingProgress.completed == False,
                ReadingProgress.progress_percentage > 0
            )
        ).order_by(ReadingProgress.last_read.desc()).limit(limit)
        
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    @staticmethod
    async def delete_progress(
        db: AsyncSession,
        user_id: int,
        document_id: int
    ) -> bool:
        """Delete reading progress."""
        progress = await ReadingService.get_progress(db, user_id, document_id)
        if not progress:
            return False
        
        await db.delete(progress)
        await db.commit()
        return True
