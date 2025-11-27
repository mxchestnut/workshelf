"""
User Profile service - Business logic for user profiles
"""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserProfile
from app.schemas.user_profile import UserProfileUpdate
from app.core.exceptions import NotFoundError, ForbiddenError


async def get_user_profile(db: AsyncSession, user_id: int) -> Optional[UserProfile]:
    """Get user profile by user ID"""
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def update_user_profile(
    db: AsyncSession,
    user_id: int,
    profile_data: UserProfileUpdate,
    requester_id: int
) -> UserProfile:
    """Update user profile"""
    
    if user_id != requester_id:
        raise ForbiddenError("You can only update your own profile")
    
    profile = await get_user_profile(db, user_id)
    if not profile:
        raise NotFoundError(f"Profile for user {user_id} not found")
    
    # Update fields
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    await db.commit()
    await db.refresh(profile)
    
    return profile


async def get_public_profile(db: AsyncSession, user_id: int) -> Optional[User]:
    """Get public user profile"""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()
