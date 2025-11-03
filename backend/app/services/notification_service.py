from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select, func
from datetime import datetime
from typing import List, Optional

from ..models.social import Notification, NotificationType


class NotificationService:
    """Service for managing notifications."""
    
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: int,
        notification_type: NotificationType,
        title: str,
        message: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        action_url: Optional[str] = None,
        actor_id: Optional[int] = None,
        metadata: Optional[dict] = None
    ) -> Notification:
        """Create a new notification."""
        notification = Notification(
            user_id=user_id,
            type=notification_type.value,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            action_url=action_url,
            actor_id=actor_id,
            extra_data=metadata,
            is_read=False
        )
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        return notification
    
    @staticmethod
    async def get_notifications(
        db: AsyncSession,
        user_id: int,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[Notification], int, int]:
        """Get notifications for a user."""
        stmt = select(Notification).filter(Notification.user_id == user_id)
        
        if unread_only:
            stmt = stmt.filter(Notification.is_read == False)
        
        # Get paginated results
        result = await db.execute(stmt.order_by(Notification.created_at.desc()).offset(skip).limit(limit))
        notifications = list(result.scalars().all())
        
        # Count total (matching filter)
        count_stmt = select(func.count()).select_from(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            count_stmt = count_stmt.filter(Notification.is_read == False)
        total_result = await db.execute(count_stmt)
        total = total_result.scalar()
        
        # Count unread
        unread_stmt = select(func.count()).select_from(Notification).filter(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        )
        unread_result = await db.execute(unread_stmt)
        unread_count = unread_result.scalar()
        
        return notifications, total, unread_count
    
    @staticmethod
    async def mark_as_read(db: AsyncSession, notification_id: int, user_id: int) -> Optional[Notification]:
        """Mark a notification as read."""
        result = await db.execute(
            select(Notification).filter(
                and_(
                    Notification.id == notification_id,
                    Notification.user_id == user_id
                )
            )
        )
        notification = result.scalar_one_or_none()
        
        if not notification:
            return None
        
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        notification.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(notification)
        return notification
    
    @staticmethod
    async def mark_all_as_read(db: AsyncSession, user_id: int) -> int:
        """Mark all notifications as read for a user."""
        result = await db.execute(
            select(Notification).filter(
                and_(
                    Notification.user_id == user_id,
                    Notification.is_read == False
                )
            )
        )
        notifications = result.scalars().all()
        count = 0
        for notification in notifications:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            notification.updated_at = datetime.utcnow()
            count += 1
        await db.commit()
        return count
    
    @staticmethod
    async def delete_notification(db: AsyncSession, notification_id: int, user_id: int) -> bool:
        """Delete a notification."""
        result = await db.execute(
            select(Notification).filter(
                and_(
                    Notification.id == notification_id,
                    Notification.user_id == user_id
                )
            )
        )
        notification = result.scalar_one_or_none()
        
        if not notification:
            return False
        
        await db.delete(notification)
        await db.commit()
        return True
    
    # Convenience methods for creating specific notification types
    
    @staticmethod
    async def notify_new_follower(
        db: AsyncSession,
        user_id: int,
        follower_id: int,
        follower_name: str
    ) -> Notification:
        """Create notification for new follower."""
        return await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            notification_type=NotificationType.FOLLOW,
            title="New Follower",
            message=f"{follower_name} started following you",
            entity_type="user",
            entity_id=follower_id,
            action_url=f"/users/{follower_id}",
            actor_id=follower_id
        )
    
    @staticmethod
    async def notify_document_shared(
        db: AsyncSession,
        user_id: int,
        document_id: int,
        document_title: str,
        sharer_id: int,
        sharer_name: str
    ) -> Notification:
        """Create notification for shared document."""
        return await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            notification_type=NotificationType.SHARE,
            title="Document Shared",
            message=f"{sharer_name} shared '{document_title}' with you",
            entity_type="document",
            entity_id=document_id,
            action_url=f"/documents/{document_id}",
            actor_id=sharer_id
        )
