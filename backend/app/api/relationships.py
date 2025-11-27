"""Relationships API - User follow/unfollow"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select
from typing import Dict, Any

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services import user_service
from app.schemas.social import UserFollowCreate, UserFollowResponse, FollowersListResponse, FollowingListResponse, FollowerInfo
from app.services.relationships_service import RelationshipsService
from app.services.notification_service import NotificationService
from app.services.activity_service import ActivityService
from app.models.social import UserFollow
from app.models.user import User

router = APIRouter(prefix="/relationships", tags=["relationships"])


@router.post("/follow", response_model=UserFollowResponse, status_code=status.HTTP_201_CREATED)
async def follow_user(follow_data: UserFollowCreate, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    if user.id == follow_data.following_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    result = await db.execute(select(User).filter(User.id == follow_data.following_id))
    user_to_follow = result.scalar_one_or_none()
    if not user_to_follow:
        raise HTTPException(status_code=404, detail="User not found")
    
    follow = await RelationshipsService.follow_user(db, user.id, follow_data.following_id)
    await NotificationService.notify_new_follower(db, follow_data.following_id, user.id, user.full_name or user.email)
    await ActivityService.log_user_followed(db, user.id, follow_data.following_id, user_to_follow.full_name or user_to_follow.email)
    
    return follow


@router.delete("/unfollow/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_user(user_id: int, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    if not await RelationshipsService.unfollow_user(db, user.id, user_id):
        raise HTTPException(status_code=404, detail="Follow relationship not found")


@router.get("/followers", response_model=FollowersListResponse)
async def get_my_followers(skip: int = 0, limit: int = 50, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    followers, total = await RelationshipsService.get_followers(db, user.id, skip, limit)
    
    follower_infos = []
    for follower in followers:
        result = await db.execute(select(UserFollow).filter(and_(UserFollow.follower_id == follower.id, UserFollow.following_id == user.id, UserFollow.is_active == True)))
        follow = result.scalar_one_or_none()
        follower_infos.append(FollowerInfo(id=follower.id, email=follower.email, full_name=follower.full_name, avatar_url=follower.avatar_url, followed_at=follow.created_at if follow else None))
    
    return FollowersListResponse(total=total, followers=follower_infos)


@router.get("/following", response_model=FollowingListResponse)
async def get_my_following(skip: int = 0, limit: int = 50, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    following, total = await RelationshipsService.get_following(db, user.id, skip, limit)
    
    following_infos = []
    for followed_user in following:
        result = await db.execute(select(UserFollow).filter(and_(UserFollow.follower_id == user.id, UserFollow.following_id == followed_user.id, UserFollow.is_active == True)))
        follow = result.scalar_one_or_none()
        following_infos.append(FollowerInfo(id=followed_user.id, email=followed_user.email, full_name=followed_user.full_name, avatar_url=followed_user.avatar_url, followed_at=follow.created_at if follow else None))
    
    return FollowingListResponse(total=total, following=following_infos)
