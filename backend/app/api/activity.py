"""Activity Feed API"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any

from app.core.database import get_db
from app.core.azure_auth import get_current_user
from app.services import user_service
from app.schemas.social import ActivityFeedResponse
from app.services.activity_service import ActivityService
from app.models.user import User

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("/feed", response_model=ActivityFeedResponse)
async def get_activity_feed(skip: int = 0, limit: int = 50, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    events, total = await ActivityService.get_activity_feed(db, user.id, skip, limit)
    return ActivityFeedResponse(total=total, events=events)


@router.get("/user/{user_id}", response_model=ActivityFeedResponse)
async def get_user_activity(user_id: int, skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    events, total = await ActivityService.get_user_activity(db, user_id, skip, limit)
    public_events = [e for e in events if e.is_public]
    return ActivityFeedResponse(total=len(public_events), events=public_events)


@router.get("/me", response_model=ActivityFeedResponse)
async def get_my_activity(skip: int = 0, limit: int = 50, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    events, total = await ActivityService.get_user_activity(db, user.id, skip, limit)
    return ActivityFeedResponse(total=total, events=events)
