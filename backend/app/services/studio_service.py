"""
Studio service - Business logic for studio operations
"""

from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.studio import Studio, StudioMember, StudioMemberRole as MemberRole
from app.schemas.studio import StudioCreate, StudioUpdate, StudioMemberAdd
from app.core.exceptions import NotFoundError, ForbiddenError


async def create_studio(
    db: AsyncSession,
    studio_data: StudioCreate,
    owner_id: int,
    tenant_id: int
) -> Studio:
    """Create a new studio and add owner as admin"""
    
    # Generate slug from name
    slug = studio_data.name.lower().replace(" ", "-").replace("_", "-")
    # Remove special characters
    import re
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    
    # Create studio
    studio = Studio(
        name=studio_data.name,
        slug=slug,
        description=studio_data.description,
        is_public=studio_data.is_public,
        is_active=studio_data.is_active,
        tenant_id=tenant_id
    )
    
    db.add(studio)
    await db.flush()  # Get the studio ID
    
    # Add owner as admin member
    member = StudioMember(
        user_id=owner_id,
        studio_id=studio.id,
        role=MemberRole.ADMIN,
        is_active=True,
        is_approved=True
    )
    db.add(member)
    
    await db.commit()
    await db.refresh(studio)
    
    return studio


async def get_studio_by_id(db: AsyncSession, studio_id: int) -> Optional[Studio]:
    """Get a studio by ID"""
    result = await db.execute(
        select(Studio).where(Studio.id == studio_id)
    )
    return result.scalar_one_or_none()


async def list_user_studios(
    db: AsyncSession,
    user_id: int,
    skip: int = 0,
    limit: int = 20
) -> tuple[List[Studio], int]:
    """List studios where user is a member"""
    
    # Query for studios where user is a member
    query = (
        select(Studio)
        .join(StudioMember)
        .where(StudioMember.user_id == user_id)
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(query)
    studios = result.scalars().all()
    
    # Get total count
    count_query = (
        select(func.count(Studio.id))
        .join(StudioMember)
        .where(StudioMember.user_id == user_id)
    )
    total = await db.scalar(count_query)
    
    return list(studios), total or 0


async def update_studio(
    db: AsyncSession,
    studio_id: int,
    studio_data: StudioUpdate,
    user_id: int
) -> Studio:
    """Update a studio (only owner or admins)"""
    
    # Get studio
    studio = await get_studio_by_id(db, studio_id)
    if not studio:
        raise NotFoundError(f"Studio {studio_id} not found")
    
    # Check if user is owner or admin
    is_authorized = await is_studio_admin(db, studio_id, user_id)
    if not is_authorized:
        raise ForbiddenError("You don't have permission to update this studio")
    
    # Update fields
    update_data = studio_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(studio, field, value)
    
    await db.commit()
    await db.refresh(studio)
    
    return studio


async def delete_studio(db: AsyncSession, studio_id: int, user_id: int) -> None:
    """Delete a studio (only owner/admin)"""
    
    studio = await get_studio_by_id(db, studio_id)
    if not studio:
        raise NotFoundError(f"Studio {studio_id} not found")
    
    # Check if user is admin
    is_authorized = await is_studio_admin(db, studio_id, user_id)
    if not is_authorized:
        raise ForbiddenError("Only studio admins can delete it")
    
    await db.delete(studio)
    await db.commit()


async def is_studio_admin(db: AsyncSession, studio_id: int, user_id: int) -> bool:
    """Check if user is studio admin"""
    
    # Check if admin member
    result = await db.execute(
        select(StudioMember)
        .where(
            StudioMember.studio_id == studio_id,
            StudioMember.user_id == user_id,
            StudioMember.role.in_([MemberRole.OWNER, MemberRole.ADMIN])
        )
    )
    member = result.scalar_one_or_none()
    return member is not None


async def add_studio_member(
    db: AsyncSession,
    studio_id: int,
    member_data: StudioMemberAdd,
    requester_id: int
) -> StudioMember:
    """Add a member to a studio"""
    
    # Check authorization
    is_authorized = await is_studio_admin(db, studio_id, requester_id)
    if not is_authorized:
        raise ForbiddenError("You don't have permission to add members")
    
    # Create member
    member = StudioMember(
        user_id=member_data.user_id,
        studio_id=studio_id,
        role=member_data.role,
        is_active=True,
        is_approved=True
    )
    
    db.add(member)
    await db.commit()
    await db.refresh(member)
    
    return member


async def remove_studio_member(
    db: AsyncSession,
    studio_id: int,
    user_id: int,
    requester_id: int
) -> None:
    """Remove a member from a studio"""
    
    # Check authorization
    is_authorized = await is_studio_admin(db, studio_id, requester_id)
    if not is_authorized:
        raise ForbiddenError("You don't have permission to remove members")
    
    # Remove member
    result = await db.execute(
        select(StudioMember)
        .where(
            StudioMember.studio_id == studio_id,
            StudioMember.user_id == user_id
        )
    )
    member = result.scalar_one_or_none()
    
    if member:
        await db.delete(member)
        await db.commit()
