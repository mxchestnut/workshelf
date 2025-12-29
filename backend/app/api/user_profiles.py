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
    """Get public user profile by user ID"""
    
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


@router.get("/username/{username}")
async def get_public_profile_by_username(
    username: str,
    db: AsyncSession = Depends(get_db)
):
    """Get public user profile by username"""
    from sqlalchemy import select
    from app.models import User, UserProfile
    
    # Find user by username
    result = await db.execute(
        select(User).where(User.username == username)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get profile
    profile_result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == user.id)
    )
    profile = profile_result.scalar_one_or_none()
    
    # Get public document count
    from app.models import Document, DocumentVisibility
    doc_result = await db.execute(
        select(Document).where(
            Document.user_id == user.id,
            Document.visibility == DocumentVisibility.PUBLIC
        )
    )
    public_docs = doc_result.scalars().all()
    
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "bio": profile.bio if profile else None,
        "avatar_url": profile.avatar_url if profile else None,
        "location": profile.location if profile else None,
        "website": profile.website if profile else None,
        "twitter_handle": profile.twitter_handle if profile else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "interests": user.interests or [],
        "public_document_count": len(public_docs)
    }


@router.get("/{user_id}/documents/public")
async def get_user_public_documents(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get user's public documents"""
    from sqlalchemy import select
    from app.models import Document, DocumentVisibility, DocumentStatus
    
    result = await db.execute(
        select(Document).where(
            Document.user_id == user_id,
            Document.visibility == DocumentVisibility.PUBLIC,
            Document.status == DocumentStatus.PUBLISHED
        ).order_by(Document.updated_at.desc())
    )
    documents = result.scalars().all()
    
    return {
        "documents": [
            {
                "id": doc.id,
                "title": doc.title,
                "description": doc.description,
                "word_count": doc.word_count or 0,
                "reading_time": doc.reading_time or 0,
                "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
                "status": doc.status.value if doc.status else "draft"
            }
            for doc in documents
        ]
    }

