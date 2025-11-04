"""Groups API - Writing group management"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services import user_service
from app.services.group_service import GroupService
from app.schemas.collaboration import (
    GroupCreate, GroupUpdate, GroupResponse,
    GroupMemberAdd, GroupMemberRoleUpdate, GroupMemberResponse,
    ScholarshipRequestCreate, ScholarshipRequestResponse
)

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    group_data: GroupCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new writing group."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    group = await GroupService.create_group(
        db,
        user.id,
        group_data.name,
        group_data.description,
        group_data.slug,
        group_data.is_public,
        group_data.avatar_url,
        group_data.tags,
        group_data.rules
    )
    return group


@router.get("", response_model=List[GroupResponse])
async def get_groups(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Get all public groups."""
    groups = await GroupService.get_public_groups(db, limit, offset)
    return groups


@router.get("/my-groups", response_model=List[GroupResponse])
async def get_my_groups(
    limit: int = 50,
    offset: int = 0,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get groups current user is a member of."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    groups = await GroupService.get_user_groups(db, user.id, limit, offset)
    return groups


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific group."""
    group = await GroupService.get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


@router.get("/slug/{slug}", response_model=GroupResponse)
async def get_group_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a group by slug."""
    group = await GroupService.get_group_by_slug(db, slug)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    group_data: GroupUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a group (admin/owner only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Create dict of updates, excluding None values
    updates = {k: v for k, v in group_data.dict(exclude_unset=True).items() if v is not None}
    
    group = await GroupService.update_group(db, group_id, user.id, **updates)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or not authorized")
    return group


@router.get("/{group_id}/members", response_model=List[GroupMemberResponse])
async def get_group_members(
    group_id: int,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """Get all members of a group."""
    members = await GroupService.get_group_members(db, group_id, active_only)
    return members


@router.post("/{group_id}/members", response_model=GroupMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_group_member(
    group_id: int,
    member_data: GroupMemberAdd,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a member to a group."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # For now, allow self-join for public groups, require admin for private
    # In production, you'd add more complex permission checks
    member = await GroupService.add_member(db, group_id, member_data.user_id, member_data.role)
    return member


@router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_group_member(
    group_id: int,
    user_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a member from a group (admin/owner only)."""
    current_user_obj = await user_service.get_or_create_user_from_keycloak(db, current_user)
    success = await GroupService.remove_member(db, group_id, user_id, current_user_obj.id)
    if not success:
        raise HTTPException(status_code=404, detail="Member not found or not authorized")
    return None


@router.put("/{group_id}/members/{user_id}/role", response_model=GroupMemberResponse)
async def update_member_role(
    group_id: int,
    user_id: int,
    role_data: GroupMemberRoleUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a member's role (owner only)."""
    current_user_obj = await user_service.get_or_create_user_from_keycloak(db, current_user)
    member = await GroupService.update_member_role(db, group_id, user_id, role_data.role, current_user_obj.id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found or not authorized")
    return member


# ============================================================================
# Scholarship Endpoints
# ============================================================================

@router.post("/{group_id}/scholarship", response_model=ScholarshipRequestResponse, status_code=status.HTTP_201_CREATED)
async def request_scholarship(
    group_id: int,
    scholarship_data: ScholarshipRequestCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Request scholarship/sliding scale pricing for a group."""
    from app.models.collaboration import ScholarshipRequest
    from datetime import datetime
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Verify group exists and user is owner/admin
    group = await GroupService.get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is group owner/admin
    is_admin = await GroupService.is_group_admin(db, group_id, user.id)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only group owners/admins can request scholarships")
    
    # Check for existing pending request
    from sqlalchemy import select
    result = await db.execute(
        select(ScholarshipRequest).where(
            ScholarshipRequest.group_id == group_id,
            ScholarshipRequest.status == 'pending'
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="A scholarship request is already pending for this group")
    
    # Create request
    request = ScholarshipRequest(
        group_id=group_id,
        user_id=user.id,
        status='pending',
        request_type=scholarship_data.request_type,
        current_financial_situation=scholarship_data.current_financial_situation,
        why_important=scholarship_data.why_important,
        how_will_use=scholarship_data.how_will_use,
        additional_info=scholarship_data.additional_info,
        monthly_budget=scholarship_data.monthly_budget,
        requested_at=datetime.utcnow()
    )
    
    db.add(request)
    await db.commit()
    await db.refresh(request)
    
    return request


@router.get("/{group_id}/scholarship", response_model=List[ScholarshipRequestResponse])
async def get_group_scholarship_requests(
    group_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get scholarship requests for a group (owner/admin only)."""
    from app.models.collaboration import ScholarshipRequest
    from sqlalchemy import select
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user is group owner/admin
    is_admin = await GroupService.is_group_admin(db, group_id, user.id)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only group owners/admins can view scholarship requests")
    
    result = await db.execute(
        select(ScholarshipRequest)
        .where(ScholarshipRequest.group_id == group_id)
        .order_by(ScholarshipRequest.created_at.desc())
    )
    
    return result.scalars().all()

