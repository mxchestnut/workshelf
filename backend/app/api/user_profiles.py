"""
User Profile API endpoints
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.schemas.user_profile import (
    UserProfileUpdate, UserProfileResponse, PublicUserProfile
)
from app.services import user_profile_service, user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me/profile", response_model=UserProfileResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get current user's profile"""
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    profile = await user_profile_service.get_user_profile(db, user.id)
    
    if not profile:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile


@router.put("/me/profile", response_model=UserProfileResponse)
async def update_my_profile(
    profile_data: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile"""
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    profile = await user_profile_service.update_user_profile(
        db, user.id, profile_data, user.id
    )
    
    return profile


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
