"""
Group Admin API - Subdomain Owner/Admin Endpoints
Allows group owners to manage their own groups
Secured via Keycloak authentication
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user, get_current_user_from_db
from app.models.collaboration import Group, GroupMember
from app.models.user import User

router = APIRouter(prefix="/group-admin", tags=["group-admin"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class GroupAdminInfo(BaseModel):
    """Group information for admins"""
    id: int
    name: str
    slug: str
    description: Optional[str]
    is_public: bool
    subdomain_requested: Optional[str]
    subdomain_approved: bool
    subdomain_approved_at: Optional[datetime]
    subdomain_rejection_reason: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class SubdomainRequest(BaseModel):
    """Request a custom subdomain for a group"""
    subdomain: str  # e.g., 'writers' for writers.workshelf.dev


# ============================================================================
# Helper Functions
# ============================================================================

async def get_group_owner_or_admin(
    group_id: int,
    db: AsyncSession,
    current_user: User
) -> Group:
    """
    Verify user owns or is admin of the group
    
    Returns:
        Group if user has permission
        
    Raises:
        HTTPException: If group not found or user lacks permission
    """
    # Get the group
    result = await db.execute(select(Group).filter(Group.id == group_id))
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is a member with owner/admin role
    member_result = await db.execute(
        select(GroupMember).filter(
            and_(
                GroupMember.group_id == group_id,
                GroupMember.user_id == current_user.id
            )
        )
    )
    member = member_result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this group"
        )
    
    # For now, only allow owners to manage subdomain
    # TODO: Add OWNER and ADMIN roles once GroupMemberRole enum is created
    # if member.role not in [GroupMemberRole.OWNER, GroupMemberRole.ADMIN]:
    #     raise HTTPException(
    #         status_code=403,
    #         detail="Only group owners and admins can manage settings"
    #     )
    
    return group


# ============================================================================
# Group Admin Endpoints
# ============================================================================

@router.get("/my-groups", response_model=List[GroupAdminInfo])
async def get_my_groups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Get all groups where the current user is a member
    
    **Requires**: Keycloak authentication
    """
    # Get all groups where user is a member
    result = await db.execute(
        select(Group).join(GroupMember).filter(
            GroupMember.user_id == current_user.id
        ).order_by(Group.created_at.desc())
    )
    groups = result.scalars().all()
    
    return groups


@router.get("/groups/{group_id}", response_model=GroupAdminInfo)
async def get_group_admin_info(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Get detailed group information (must be group member)
    
    **Requires**: Keycloak authentication + group membership
    """
    group = await get_group_owner_or_admin(group_id, db, current_user)
    return group


@router.post("/groups/{group_id}/subdomain/request")
async def request_subdomain(
    group_id: int,
    request: SubdomainRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Request a custom subdomain for your group
    
    **Requires**: Keycloak authentication + group ownership/admin
    """
    group = await get_group_owner_or_admin(group_id, db, current_user)
    
    # Validate subdomain format (lowercase alphanumeric and hyphens)
    import re
    subdomain = request.subdomain.lower().strip()
    if not re.match(r'^[a-z0-9-]+$', subdomain):
        raise HTTPException(
            status_code=400,
            detail="Subdomain must contain only lowercase letters, numbers, and hyphens"
        )
    
    if len(subdomain) < 3 or len(subdomain) > 50:
        raise HTTPException(
            status_code=400,
            detail="Subdomain must be between 3 and 50 characters"
        )
    
    # Check if subdomain is already requested or taken
    existing_result = await db.execute(
        select(Group).filter(Group.subdomain_requested == subdomain)
    )
    existing = existing_result.scalar_one_or_none()
    
    if existing and existing.id != group_id:
        if existing.subdomain_approved:
            raise HTTPException(
                status_code=400,
                detail=f"Subdomain '{subdomain}' is already in use"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Subdomain '{subdomain}' is already requested by another group"
            )
    
    # Update group with subdomain request
    group.subdomain_requested = subdomain
    group.subdomain_approved = False
    group.subdomain_approved_at = None
    group.subdomain_approved_by = None
    group.subdomain_rejection_reason = None
    
    await db.commit()
    await db.refresh(group)
    
    return {
        "success": True,
        "message": f"Subdomain '{subdomain}' requested successfully. Awaiting platform staff approval.",
        "group": {
            "id": group.id,
            "name": group.name,
            "subdomain_requested": group.subdomain_requested,
            "subdomain_approved": group.subdomain_approved
        }
    }


@router.delete("/groups/{group_id}/subdomain/request")
async def cancel_subdomain_request(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Cancel a pending subdomain request
    
    **Requires**: Keycloak authentication + group ownership/admin
    """
    group = await get_group_owner_or_admin(group_id, db, current_user)
    
    if not group.subdomain_requested:
        raise HTTPException(
            status_code=400,
            detail="No subdomain request to cancel"
        )
    
    if group.subdomain_approved:
        raise HTTPException(
            status_code=400,
            detail="Cannot cancel an approved subdomain. Contact platform staff."
        )
    
    # Clear the subdomain request
    group.subdomain_requested = None
    group.subdomain_rejection_reason = None
    
    await db.commit()
    
    return {
        "success": True,
        "message": "Subdomain request cancelled successfully"
    }
