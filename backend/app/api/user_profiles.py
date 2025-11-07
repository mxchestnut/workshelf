"""
User Profile API endpoints
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.schemas.user_profile import (
    UserProfileUpdate, UserProfileResponse, PublicUserProfile
)
from app.services import user_profile_service, user_service

router = APIRouter(prefix="/users", tags=["users"])


class UserAccountUpdate(BaseModel):
    """Schema for updating user account information"""
    username: Optional[str] = None
    phone_number: Optional[str] = None
    birth_year: Optional[int] = None
    interests: Optional[list[str]] = None


class FullUserProfile(BaseModel):
    """Complete user profile including account info"""
    # User account info
    id: int
    email: str
    username: str
    phone_number: Optional[str] = None
    birth_year: Optional[int] = None
    interests: Optional[list[str]] = None
    
    # Profile info
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    website_url: Optional[str] = None
    twitter_handle: Optional[str] = None
    location: Optional[str] = None


@router.get("/me/profile", response_model=FullUserProfile)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get current user's complete profile"""
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    profile = await user_profile_service.get_user_profile(db, user.id)
    
    return FullUserProfile(
        id=user.id,
        email=user.email,
        username=user.username or "",
        phone_number=user.phone_number,
        birth_year=user.birth_year,
        interests=user.interests or [],
        display_name=user.display_name,
        bio=profile.bio if profile else None,
        avatar_url=profile.avatar_url if profile else None,
        website_url=profile.website if profile else None,
        twitter_handle=profile.twitter_handle if profile else None,
        location=profile.location if profile else None
    )


@router.put("/me/profile", response_model=FullUserProfile)
async def update_my_profile(
    profile_data: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile information (bio, avatar, etc)"""
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    profile = await user_profile_service.update_user_profile(
        db, user.id, profile_data, user.id
    )
    
    return FullUserProfile(
        id=user.id,
        email=user.email,
        username=user.username or "",
        phone_number=user.phone_number,
        birth_year=user.birth_year,
        interests=user.interests or [],
        display_name=user.display_name,
        bio=profile.bio if profile else None,
        avatar_url=profile.avatar_url if profile else None,
        website_url=profile.website if profile else None,
        twitter_handle=profile.twitter_handle if profile else None,
        location=profile.location if profile else None
    )


@router.put("/me/account", response_model=FullUserProfile)
async def update_my_account(
    account_data: UserAccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update current user's account information (username, interests, etc)"""
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Update fields if provided
    if account_data.username is not None:
        # Check if username is already taken
        from sqlalchemy import select
        from app.models import User
        result = await db.execute(
            select(User).where(User.username == account_data.username, User.id != user.id)
        )
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = account_data.username
    
    if account_data.phone_number is not None:
        user.phone_number = account_data.phone_number
    
    if account_data.birth_year is not None:
        user.birth_year = account_data.birth_year
    
    if account_data.interests is not None:
        user.interests = account_data.interests
    
    await db.commit()
    await db.refresh(user)
    
    profile = await user_profile_service.get_user_profile(db, user.id)
    
    return FullUserProfile(
        id=user.id,
        email=user.email,
        username=user.username or "",
        phone_number=user.phone_number,
        birth_year=user.birth_year,
        interests=user.interests or [],
        display_name=user.display_name,
        bio=profile.bio if profile else None,
        avatar_url=profile.avatar_url if profile else None,
        website_url=profile.website if profile else None,
        twitter_handle=profile.twitter_handle if profile else None,
        location=profile.location if profile else None
    )


@router.get("/{user_id}/profile", response_model=PublicUserProfile)
async def get_public_profile(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get public user profile"""
    
    user = await user_profile_service.get_public_profile(db, user_id)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    
    return PublicUserProfile(
        id=user.id,
        display_name=user.display_name,
        avatar_url=user.profile.avatar_url if user.profile else None,
        bio=user.profile.bio if user.profile else None,
        location=user.profile.location if user.profile else None,
        created_at=user.created_at
    )
