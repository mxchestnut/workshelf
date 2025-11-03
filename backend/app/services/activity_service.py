from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, select, func
from datetime import datetime
from typing import List

from ..models.social import ActivityEvent, ActivityEventType, UserFollow


class ActivityService:
    """Service for managing activity events and feeds."""
    
    @staticmethod
    async def log_event(
        db: AsyncSession,
        user_id: int,
        event_type: ActivityEventType,
        description: str,
        entity_type: str,
        entity_id: int,
        is_public: bool = True,
        metadata: dict = None
    ) -> ActivityEvent:
        """Log an activity event."""
        event = ActivityEvent(
            user_id=user_id,
            event_type=event_type.value,
            description=description,
            entity_type=entity_type,
            entity_id=entity_id,
            is_public=is_public,
            extra_data=metadata
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)
        return event
    
    @staticmethod
    async def get_user_activity(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[ActivityEvent], int]:
        """Get activity events for a specific user."""
        stmt = select(ActivityEvent).filter(ActivityEvent.user_id == user_id)
        
        # Get count
        count_stmt = select(func.count()).select_from(ActivityEvent).filter(ActivityEvent.user_id == user_id)
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        # Get events
        result = await db.execute(
            stmt.order_by(ActivityEvent.created_at.desc()).offset(skip).limit(limit)
        )
        events = list(result.scalars().all())
        
        return events, total
    
    @staticmethod
    async def get_activity_feed(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[ActivityEvent], int]:
        """
        Get activity feed for a user.
        Shows activities from users they follow + their own activities.
        """
        # Get IDs of users being followed
        following_result = await db.execute(
            select(UserFollow.following_id).filter(
                and_(
                    UserFollow.follower_id == user_id,
                    UserFollow.is_active == True
                )
            )
        )
        following_ids = [row[0] for row in following_result.all()]
        
        # Get activities from followed users + own activities
        stmt = select(ActivityEvent).filter(
            and_(
                ActivityEvent.is_public == True,
                or_(
                    ActivityEvent.user_id == user_id,
                    ActivityEvent.user_id.in_(following_ids) if following_ids else False
                )
            )
        )
        
        # Get count
        count_stmt = select(func.count()).select_from(ActivityEvent).filter(
            and_(
                ActivityEvent.is_public == True,
                or_(
                    ActivityEvent.user_id == user_id,
                    ActivityEvent.user_id.in_(following_ids) if following_ids else False
                )
            )
        )
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        # Get events
        result = await db.execute(
            stmt.order_by(ActivityEvent.created_at.desc()).offset(skip).limit(limit)
        )
        events = list(result.scalars().all())
        
        return events, total
    
    # Convenience methods for logging specific events
    
    @staticmethod
    async def log_document_created(
        db: AsyncSession,
        user_id: int,
        document_id: int,
        document_title: str,
        is_public: bool = True
    ) -> ActivityEvent:
        """Log document creation."""
        return await ActivityService.log_event(
            db=db,
            user_id=user_id,
            event_type=ActivityEventType.DOCUMENT_CREATED,
            description=f"Created document '{document_title}'",
            entity_type="document",
            entity_id=document_id,
            is_public=is_public,
            metadata={"title": document_title}
        )
    
    @staticmethod
    async def log_document_published(
        db: AsyncSession,
        user_id: int,
        document_id: int,
        document_title: str
    ) -> ActivityEvent:
        """Log document publication."""
        return await ActivityService.log_event(
            db=db,
            user_id=user_id,
            event_type=ActivityEventType.DOCUMENT_PUBLISHED,
            description=f"Published document '{document_title}'",
            entity_type="document",
            entity_id=document_id,
            is_public=True,
            metadata={"title": document_title}
        )
    
    @staticmethod
    async def log_user_followed(
        db: AsyncSession,
        user_id: int,
        followed_user_id: int,
        followed_user_name: str
    ) -> ActivityEvent:
        """Log user follow."""
        return await ActivityService.log_event(
            db=db,
            user_id=user_id,
            event_type=ActivityEventType.USER_FOLLOWED,
            description=f"Started following {followed_user_name}",
            entity_type="user",
            entity_id=followed_user_id,
            is_public=True,
            metadata={"name": followed_user_name}
        )
    
    @staticmethod
    async def log_project_created(
        db: AsyncSession,
        user_id: int,
        project_id: int,
        project_name: str,
        is_public: bool = False
    ) -> ActivityEvent:
        """Log project creation."""
        return await ActivityService.log_event(
            db=db,
            user_id=user_id,
            event_type=ActivityEventType.PROJECT_CREATED,
            description=f"Created project '{project_name}'",
            entity_type="project",
            entity_id=project_id,
            is_public=is_public,
            metadata={"name": project_name}
        )
