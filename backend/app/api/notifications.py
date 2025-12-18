"""Notifications API"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.core.database import get_db
from app.core.azure_auth import get_current_user
from app.services import user_service
from app.schemas.social import NotificationsListResponse, NotificationResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationsListResponse)
async def get_notifications(unread_only: bool = False, skip: int = 0, limit: int = 50, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    notifications, total, unread_count = await NotificationService.get_notifications(db, user.id, unread_only, skip, limit)
    return NotificationsListResponse(total=total, unread_count=unread_count, notifications=notifications)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(notification_id: int, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    notification = await NotificationService.mark_as_read(db, notification_id, user.id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification


@router.put("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    count = await NotificationService.mark_all_as_read(db, user.id)
    return {"message": f"Marked {count} notifications as read"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(notification_id: int, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    if not await NotificationService.delete_notification(db, notification_id, user.id):
        raise HTTPException(status_code=404, detail="Notification not found")
