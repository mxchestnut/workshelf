"""
Writer-Reader Relationship API Endpoints
Manage alpha and beta reader relationships
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import List, Optional
from app.core.database import get_db
from app.core.auth import get_current_user
from app.services import user_service
from app.models.collaboration import WriterReaderRelationship, ReaderRole
from app.models.user import User, BetaReaderProfile
from app.models.social import UserFollow
from app.schemas.writer_reader import (
    WriterReaderRelationshipCreate,
    WriterReaderRelationshipUpdate,
    WriterReaderRelationshipResponse,
    ReaderProfileInfo
)

router = APIRouter(prefix="/writer-readers", tags=["writer-readers"])


@router.get("/my-readers", response_model=List[WriterReaderRelationshipResponse])
async def get_my_readers(
    role: Optional[str] = Query(None, description="Filter by role: alpha or beta"),
    active_only: bool = Query(True, description="Only show active relationships"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all my alpha/beta readers"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Build query
    conditions = [WriterReaderRelationship.writer_id == user.id]
    
    if role:
        conditions.append(WriterReaderRelationship.role == role)
    
    if active_only:
        conditions.append(WriterReaderRelationship.is_active == True)
    
    stmt = select(WriterReaderRelationship).where(and_(*conditions)).order_by(WriterReaderRelationship.created_at.desc())
    result = await db.execute(stmt)
    relationships = result.scalars().all()
    
    # Enrich with reader info
    responses = []
    for rel in relationships:
        # Get reader user info
        reader_stmt = select(User).where(User.id == rel.reader_id)
        reader_result = await db.execute(reader_stmt)
        reader = reader_result.scalar_one_or_none()
        
        response = WriterReaderRelationshipResponse.model_validate(rel)
        if reader:
            response.reader_username = reader.username
            response.reader_display_name = reader.display_name
            response.reader_avatar_url = reader.avatar_url
        
        responses.append(response)
    
    return responses


@router.get("/reading-for", response_model=List[WriterReaderRelationshipResponse])
async def get_writers_i_read_for(
    role: Optional[str] = Query(None, description="Filter by role: alpha or beta"),
    active_only: bool = Query(True, description="Only show active relationships"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all writers I'm reading for (as alpha or beta reader)"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Build query
    conditions = [WriterReaderRelationship.reader_id == user.id]
    
    if role:
        conditions.append(WriterReaderRelationship.role == role)
    
    if active_only:
        conditions.append(WriterReaderRelationship.is_active == True)
    
    stmt = select(WriterReaderRelationship).where(and_(*conditions)).order_by(WriterReaderRelationship.created_at.desc())
    result = await db.execute(stmt)
    relationships = result.scalars().all()
    
    # Enrich with writer info
    responses = []
    for rel in relationships:
        # Get writer user info
        writer_stmt = select(User).where(User.id == rel.writer_id)
        writer_result = await db.execute(writer_stmt)
        writer = writer_result.scalar_one_or_none()
        
        response = WriterReaderRelationshipResponse.model_validate(rel)
        if writer:
            response.reader_username = writer.username
            response.reader_display_name = writer.display_name
            response.reader_avatar_url = writer.avatar_url
        
        responses.append(response)
    
    return responses


@router.post("/", response_model=WriterReaderRelationshipResponse, status_code=status.HTTP_201_CREATED)
async def add_reader(
    data: WriterReaderRelationshipCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add an alpha or beta reader"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Verify reader exists
    reader_stmt = select(User).where(User.id == data.reader_id)
    reader_result = await db.execute(reader_stmt)
    reader = reader_result.scalar_one_or_none()
    
    if not reader:
        raise HTTPException(status_code=404, detail="Reader not found")
    
    # Can't add yourself
    if reader.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a reader")
    
    # Check if they're following each other (optional - you can remove this check if you want)
    follow_stmt = select(UserFollow).where(
        or_(
            and_(UserFollow.follower_id == user.id, UserFollow.following_id == reader.id),
            and_(UserFollow.follower_id == reader.id, UserFollow.following_id == user.id)
        )
    )
    follow_result = await db.execute(follow_stmt)
    follows = follow_result.scalar_one_or_none()
    
    if not follows:
        raise HTTPException(status_code=403, detail="You must be following each other to add them as a reader")
    
    # Check if relationship already exists
    existing_stmt = select(WriterReaderRelationship).where(
        and_(
            WriterReaderRelationship.writer_id == user.id,
            WriterReaderRelationship.reader_id == data.reader_id,
            WriterReaderRelationship.role == data.role
        )
    )
    existing_result = await db.execute(existing_stmt)
    existing = existing_result.scalar_one_or_none()
    
    if existing:
        # Reactivate if inactive
        if not existing.is_active:
            existing.is_active = True
            existing.custom_label = data.custom_label
            existing.notes = data.notes
            await db.commit()
            await db.refresh(existing)
            response = WriterReaderRelationshipResponse.model_validate(existing)
            response.reader_username = reader.username
            response.reader_display_name = reader.display_name
            response.reader_avatar_url = reader.avatar_url
            return response
        else:
            raise HTTPException(status_code=400, detail=f"Reader already added as {data.role}")
    
    # Create new relationship
    relationship = WriterReaderRelationship(
        writer_id=user.id,
        reader_id=data.reader_id,
        role=data.role,
        custom_label=data.custom_label,
        notes=data.notes
    )
    
    db.add(relationship)
    await db.commit()
    await db.refresh(relationship)
    
    response = WriterReaderRelationshipResponse.model_validate(relationship)
    response.reader_username = reader.username
    response.reader_display_name = reader.display_name
    response.reader_avatar_url = reader.avatar_url
    
    return response


@router.patch("/{relationship_id}", response_model=WriterReaderRelationshipResponse)
async def update_reader_relationship(
    relationship_id: int,
    data: WriterReaderRelationshipUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a reader relationship"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Get relationship
    stmt = select(WriterReaderRelationship).where(
        and_(
            WriterReaderRelationship.id == relationship_id,
            WriterReaderRelationship.writer_id == user.id
        )
    )
    result = await db.execute(stmt)
    relationship = result.scalar_one_or_none()
    
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    # Update fields
    if data.is_active is not None:
        relationship.is_active = data.is_active
    if data.custom_label is not None:
        relationship.custom_label = data.custom_label
    if data.notes is not None:
        relationship.notes = data.notes
    
    await db.commit()
    await db.refresh(relationship)
    
    # Get reader info
    reader_stmt = select(User).where(User.id == relationship.reader_id)
    reader_result = await db.execute(reader_stmt)
    reader = reader_result.scalar_one_or_none()
    
    response = WriterReaderRelationshipResponse.model_validate(relationship)
    if reader:
        response.reader_username = reader.username
        response.reader_display_name = reader.display_name
        response.reader_avatar_url = reader.avatar_url
    
    return response


@router.delete("/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_reader(
    relationship_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Remove a reader relationship"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Get relationship
    stmt = select(WriterReaderRelationship).where(
        and_(
            WriterReaderRelationship.id == relationship_id,
            WriterReaderRelationship.writer_id == user.id
        )
    )
    result = await db.execute(stmt)
    relationship = result.scalar_one_or_none()
    
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    await db.delete(relationship)
    await db.commit()


@router.get("/profile/{user_id}", response_model=ReaderProfileInfo)
async def get_reader_profile_info(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get reader profile info for a specific user (to see if you can add them)"""
    me = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Get target user
    user_stmt = select(User).where(User.id == user_id)
    user_result = await db.execute(user_stmt)
    target_user = user_result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if they have a beta reader profile
    beta_profile_stmt = select(BetaReaderProfile).where(
        and_(
            BetaReaderProfile.user_id == user_id,
            BetaReaderProfile.is_active == True
        )
    )
    beta_profile_result = await db.execute(beta_profile_stmt)
    beta_profile = beta_profile_result.scalar_one_or_none()
    
    # Check follow relationships
    follow_stmt = select(UserFollow).where(
        or_(
            and_(UserFollow.follower_id == me.id, UserFollow.following_id == user_id),
            and_(UserFollow.follower_id == user_id, UserFollow.following_id == me.id)
        )
    )
    follow_result = await db.execute(follow_stmt)
    follows = follow_result.scalars().all()
    
    am_i_following = any(f.follower_id == me.id for f in follows)
    is_following_me = any(f.follower_id == user_id for f in follows)
    
    # Check existing reader relationships
    reader_rel_stmt = select(WriterReaderRelationship).where(
        and_(
            WriterReaderRelationship.writer_id == me.id,
            WriterReaderRelationship.reader_id == user_id,
            WriterReaderRelationship.is_active == True
        )
    )
    reader_rel_result = await db.execute(reader_rel_stmt)
    reader_rels = reader_rel_result.scalars().all()
    
    is_alpha_reader = any(r.role == ReaderRole.ALPHA for r in reader_rels)
    is_beta_reader = any(r.role == ReaderRole.BETA for r in reader_rels)
    
    # Build response
    profile_info = ReaderProfileInfo(
        user_id=target_user.id,
        username=target_user.username,
        display_name=target_user.display_name,
        avatar_url=target_user.avatar_url,
        has_beta_profile=beta_profile is not None,
        bio=beta_profile.bio if beta_profile else None,
        genres=beta_profile.genres if beta_profile else None,
        specialties=beta_profile.specialties if beta_profile else None,
        is_alpha_reader_for_me=is_alpha_reader,
        is_beta_reader_for_me=is_beta_reader,
        is_following_me=is_following_me,
        am_i_following=am_i_following
    )
    
    return profile_info
