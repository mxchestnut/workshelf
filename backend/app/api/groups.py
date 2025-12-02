"""Groups API - Writing group management"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Dict, Any, List
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services import user_service
from app.services.group_service import GroupService
from app.services.group_customization_service import GroupCustomizationService
from app.models.collaboration import GroupInvitation, GroupInvitationStatus, GroupMember
from app.schemas.collaboration import (
    GroupCreate, GroupUpdate, GroupResponse,
    GroupMemberAdd, GroupMemberRoleUpdate, GroupMemberResponse,
    ScholarshipRequestCreate, ScholarshipRequestResponse,
    GroupRoleCreate, GroupRoleUpdate, GroupRoleResponse,
    GroupMemberRoleAssignment
)
from app.schemas.group_customization import (
    GroupThemeCreate, GroupThemeResponse, GroupThemeUpdate,
    GroupCustomDomainCreate, GroupCustomDomainResponse,
    GroupFollowerResponse, FollowerInfo, FollowersListResponse,
    GroupMetricsResponse, GroupTimeSeriesResponse
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


@router.get("/suggestions", response_model=List[GroupResponse])
async def get_suggested_groups(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 10
):
    """
    Get group suggestions based on user interests
    Matches user interests with group tags and interests
    """
    from app.models.collaboration import Group, GroupMember
    from app.models.user import User
    from sqlalchemy import select, and_, or_, func
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Get groups user is already a member of
    member_query = select(GroupMember.group_id).where(GroupMember.user_id == user.id)
    member_result = await db.execute(member_query)
    member_group_ids = [row[0] for row in member_result.all()]
    
    # If user has no interests, return popular public groups
    if not user.interests or len(user.interests) == 0:
        query = (
            select(Group, func.count(GroupMember.id).label('member_count'))
            .outerjoin(GroupMember, Group.id == GroupMember.group_id)
            .where(
                and_(
                    Group.is_public == True,
                    Group.is_active == True,
                    Group.id.notin_(member_group_ids) if member_group_ids else True
                )
            )
            .group_by(Group.id)
            .order_by(func.count(GroupMember.id).desc())
            .limit(limit)
        )
        result = await db.execute(query)
        return [row[0] for row in result.all()]
    
    # Find groups matching user interests (tags or interests field)
    # This is a simple keyword match - could be enhanced with better matching logic
    interest_conditions = []
    for interest in user.interests:
        # Check if interest appears in group tags (JSON) or interests (ARRAY)
        interest_conditions.append(Group.tags.contains(interest.lower()))
        interest_conditions.append(Group.interests.contains([interest.lower()]))
    
    query = (
        select(Group)
        .where(
            and_(
                Group.is_public == True,
                Group.is_active == True,
                Group.id.notin_(member_group_ids) if member_group_ids else True,
                or_(*interest_conditions) if interest_conditions else True
            )
        )
        .limit(limit)
    )
    
    result = await db.execute(query)
    suggested_groups = result.scalars().all()
    
    # If not enough matches, fill with popular groups
    if len(suggested_groups) < limit:
        remaining = limit - len(suggested_groups)
        suggested_ids = [g.id for g in suggested_groups]
        exclude_ids = member_group_ids + suggested_ids
        
        popular_query = (
            select(Group, func.count(GroupMember.id).label('member_count'))
            .outerjoin(GroupMember, Group.id == GroupMember.group_id)
            .where(
                and_(
                    Group.is_public == True,
                    Group.is_active == True,
                    Group.id.notin_(exclude_ids) if exclude_ids else True
                )
            )
            .group_by(Group.id)
            .order_by(func.count(GroupMember.id).desc())
            .limit(remaining)
        )
        popular_result = await db.execute(popular_query)
        suggested_groups.extend([row[0] for row in popular_result.all()])
    
    return suggested_groups


# ============================================================================
# Custom Role Management Endpoints
# ============================================================================

@router.get("/{group_id}/roles", response_model=List[GroupRoleResponse])
async def get_group_roles(
    group_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all custom roles for a group."""
    from app.models.collaboration import GroupRole
    from sqlalchemy import select
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Verify user is a member or staff
    is_member = await GroupService.is_group_member(db, group_id, user.id)
    if not is_member and not user.is_staff:
        raise HTTPException(status_code=403, detail="Not authorized to view group roles")
    
    result = await db.execute(
        select(GroupRole)
        .where(GroupRole.group_id == group_id)
        .order_by(GroupRole.position.desc())
    )
    
    return result.scalars().all()


@router.post("/{group_id}/roles", response_model=GroupRoleResponse, status_code=status.HTTP_201_CREATED)
async def create_group_role(
    group_id: int,
    role_data: GroupRoleCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new custom role for a group (owner/can_manage_roles only)."""
    from app.models.collaboration import GroupRole
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user can manage roles
    can_manage = await GroupService.can_manage_roles(db, group_id, user.id)
    if not can_manage and not user.is_staff:
        raise HTTPException(status_code=403, detail="Not authorized to create roles")
    
    # Create the role
    role = GroupRole(
        group_id=group_id,
        name=role_data.name,
        color=role_data.color,
        position=role_data.position,
        can_delete_posts=role_data.can_delete_posts,
        can_delete_comments=role_data.can_delete_comments,
        can_pin_posts=role_data.can_pin_posts,
        can_lock_threads=role_data.can_lock_threads,
        can_manage_tags=role_data.can_manage_tags,
        can_approve_members=role_data.can_approve_members,
        can_kick_members=role_data.can_kick_members,
        can_ban_members=role_data.can_ban_members,
        can_invite_members=role_data.can_invite_members,
        can_view_member_list=role_data.can_view_member_list,
        can_approve_publications=role_data.can_approve_publications,
        can_edit_publications=role_data.can_edit_publications,
        can_feature_publications=role_data.can_feature_publications,
        can_edit_group_info=role_data.can_edit_group_info,
        can_manage_roles=role_data.can_manage_roles,
        can_view_analytics=role_data.can_view_analytics,
        can_export_data=role_data.can_export_data
    )
    
    db.add(role)
    await db.commit()
    await db.refresh(role)
    
    return role


@router.get("/{group_id}/roles/{role_id}", response_model=GroupRoleResponse)
async def get_group_role(
    group_id: int,
    role_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get details of a specific custom role."""
    from app.models.collaboration import GroupRole
    from sqlalchemy import select
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Verify user is a member or staff
    is_member = await GroupService.is_group_member(db, group_id, user.id)
    if not is_member and not user.is_staff:
        raise HTTPException(status_code=403, detail="Not authorized to view group roles")
    
    result = await db.execute(
        select(GroupRole).where(
            GroupRole.id == role_id,
            GroupRole.group_id == group_id
        )
    )
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    return role


@router.patch("/{group_id}/roles/{role_id}", response_model=GroupRoleResponse)
async def update_group_role(
    group_id: int,
    role_id: int,
    role_data: GroupRoleUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a custom role (owner/can_manage_roles only)."""
    from app.models.collaboration import GroupRole
    from sqlalchemy import select
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user can manage roles
    can_manage = await GroupService.can_manage_roles(db, group_id, user.id)
    if not can_manage and not user.is_staff:
        raise HTTPException(status_code=403, detail="Not authorized to update roles")
    
    # Get the role
    result = await db.execute(
        select(GroupRole).where(
            GroupRole.id == role_id,
            GroupRole.group_id == group_id
        )
    )
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Update fields
    update_data = role_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)
    
    await db.commit()
    await db.refresh(role)
    
    return role


@router.delete("/{group_id}/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group_role(
    group_id: int,
    role_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a custom role (owner/can_manage_roles only)."""
    from app.models.collaboration import GroupRole
    from sqlalchemy import select
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user can manage roles
    can_manage = await GroupService.can_manage_roles(db, group_id, user.id)
    if not can_manage and not user.is_staff:
        raise HTTPException(status_code=403, detail="Not authorized to delete roles")
    
    # Get the role
    result = await db.execute(
        select(GroupRole).where(
            GroupRole.id == role_id,
            GroupRole.group_id == group_id
        )
    )
    role = result.scalar_one_or_none()
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    await db.delete(role)
    await db.commit()
    
    return None


# ============================================================================
# Role Assignment Endpoints
# ============================================================================

@router.get("/{group_id}/members/{member_id}/roles", response_model=List[GroupRoleResponse])
async def get_member_roles(
    group_id: int,
    member_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all custom roles assigned to a specific member."""
    from app.models.collaboration import GroupRole, GroupMemberCustomRole
    from sqlalchemy import select
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Verify user is a member or staff
    is_member = await GroupService.is_group_member(db, group_id, user.id)
    if not is_member and not user.is_staff:
        raise HTTPException(status_code=403, detail="Not authorized to view member roles")
    
    result = await db.execute(
        select(GroupRole)
        .join(GroupMemberCustomRole, GroupRole.id == GroupMemberCustomRole.role_id)
        .where(GroupMemberCustomRole.group_member_id == member_id)
        .order_by(GroupRole.position.desc())
    )
    
    return result.scalars().all()


@router.post("/{group_id}/members/{member_id}/roles/{role_id}", status_code=status.HTTP_201_CREATED)
async def assign_role_to_member(
    group_id: int,
    member_id: int,
    role_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Assign a custom role to a member (owner/can_manage_roles only)."""
    from app.models.collaboration import GroupMemberCustomRole, GroupRole, GroupMember
    from sqlalchemy import select
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user can manage roles
    can_manage = await GroupService.can_manage_roles(db, group_id, user.id)
    if not can_manage and not user.is_staff:
        raise HTTPException(status_code=403, detail="Not authorized to assign roles")
    
    # Verify role exists and belongs to this group
    role_result = await db.execute(
        select(GroupRole).where(
            GroupRole.id == role_id,
            GroupRole.group_id == group_id
        )
    )
    role = role_result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Verify member exists and belongs to this group
    member_result = await db.execute(
        select(GroupMember).where(
            GroupMember.id == member_id,
            GroupMember.group_id == group_id
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Check if assignment already exists
    existing_result = await db.execute(
        select(GroupMemberCustomRole).where(
            GroupMemberCustomRole.group_member_id == member_id,
            GroupMemberCustomRole.role_id == role_id
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Role already assigned to this member")
    
    # Create assignment
    assignment = GroupMemberCustomRole(
        group_member_id=member_id,
        role_id=role_id,
        assigned_by=user.id
    )
    
    db.add(assignment)
    await db.commit()
    
    return {"message": "Role assigned successfully"}


@router.delete("/{group_id}/members/{member_id}/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_role_from_member(
    group_id: int,
    member_id: int,
    role_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a custom role from a member (owner/can_manage_roles only)."""
    from app.models.collaboration import GroupMemberCustomRole, GroupMember
    from sqlalchemy import select
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user can manage roles
    can_manage = await GroupService.can_manage_roles(db, group_id, user.id)
    if not can_manage and not user.is_staff:
        raise HTTPException(status_code=403, detail="Not authorized to remove roles")
    
    # Verify member belongs to this group
    member_result = await db.execute(
        select(GroupMember).where(
            GroupMember.id == member_id,
            GroupMember.group_id == group_id
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Find and delete assignment
    assignment_result = await db.execute(
        select(GroupMemberCustomRole).where(
            GroupMemberCustomRole.group_member_id == member_id,
            GroupMemberCustomRole.role_id == role_id
        )
    )
    assignment = assignment_result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Role assignment not found")
    
    await db.delete(assignment)
    await db.commit()
    
    return None


# ============================================================================
# Group Posts Endpoints
# ============================================================================

@router.get("/{group_id}/posts", response_model=List[Dict[str, Any]])
async def get_group_posts(
    group_id: int,
    limit: int = 50,
    offset: int = 0,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all posts in a group (public groups: anyone, private groups: members only)."""
    from app.models.collaboration import GroupPost, Group, GroupMember
    from sqlalchemy import select, desc
    
    # Get group to check if it's public
    group_result = await db.execute(
        select(Group).where(Group.id == group_id)
    )
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # If group is private, check membership
    if not group.is_public:
        user = await user_service.get_or_create_user_from_keycloak(db, current_user)
        member_result = await db.execute(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user.id
            )
        )
        member = member_result.scalar_one_or_none()
        if not member:
            raise HTTPException(status_code=403, detail="Must be a group member to view posts in private groups")
    
    result = await db.execute(
        select(GroupPost)
        .where(GroupPost.group_id == group_id)
        .order_by(desc(GroupPost.is_pinned), desc(GroupPost.created_at))
        .limit(limit)
        .offset(offset)
    )
    posts = result.scalars().all()
    
    # Convert to dict and include author info
    post_dicts = []
    for post in posts:
        post_dict = {
            "id": post.id,
            "group_id": post.group_id,
            "author_id": post.author_id,
            "title": post.title,
            "content": post.content,
            "is_pinned": post.is_pinned,
            "is_locked": post.is_locked,
            "created_at": post.created_at.isoformat(),
            "updated_at": post.updated_at.isoformat()
        }
        post_dicts.append(post_dict)
    
    return post_dicts


@router.post("/{group_id}/posts", status_code=status.HTTP_201_CREATED)
async def create_group_post(
    group_id: int,
    post_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new post in a group (members only)."""
    from app.models.collaboration import GroupPost, GroupMember
    from sqlalchemy import select
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user is a member
    member_result = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user.id
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Must be a group member to post")
    
    # Create post
    post = GroupPost(
        group_id=group_id,
        author_id=user.id,
        title=post_data.get("title", ""),
        content=post_data.get("content", ""),
        is_pinned=False
    )
    
    db.add(post)
    await db.commit()
    await db.refresh(post)
    
    return {
        "id": post.id,
        "group_id": post.group_id,
        "author_id": post.author_id,
        "title": post.title,
        "content": post.content,
        "is_pinned": post.is_pinned,
        "is_locked": post.is_locked,
        "created_at": post.created_at.isoformat(),
        "updated_at": post.updated_at.isoformat()
    }


@router.post("/{group_id}/join", status_code=status.HTTP_201_CREATED)
async def join_group(
    group_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Join a group (public groups only, or with invite for private)."""
    from app.models.collaboration import Group, GroupMember, GroupMemberRole
    from sqlalchemy import select
    
    try:
        user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    except Exception as e:
        print(f"Error getting/creating user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get user: {str(e)}")
    
    # Get group
    group_result = await db.execute(
        select(Group).where(Group.id == group_id)
    )
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if already a member
    existing_result = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user.id
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        return {"message": "Already a member"}
    
    # For now, allow joining public groups only
    if not group.is_public:
        raise HTTPException(status_code=403, detail="Cannot join private group without invite")
    
    # Add member
    member = GroupMember(
        group_id=group_id,
        user_id=user.id,
        role=GroupMemberRole.MEMBER
    )
    
    db.add(member)
    await db.commit()
    await db.refresh(member)
    
    return {
        "id": member.id,
        "group_id": member.group_id,
        "user_id": member.user_id,
        "role": member.role.value,
        "created_at": member.created_at.isoformat(),
        "updated_at": member.updated_at.isoformat()
    }


# ============================================================================
# GROUP THEME CUSTOMIZATION
# ============================================================================

@router.post("/{group_id}/theme", response_model=GroupThemeResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_group_theme(
    group_id: int,
    theme_data: GroupThemeCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create or update group theme (owner/admin only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user is group owner/admin
    is_admin = await GroupService.is_group_admin(db, group_id, user.id)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only group owners/admins can customize theme")
    
    # Create or update theme
    theme = await GroupCustomizationService.create_or_update_theme(
        db=db,
        group_id=group_id,
        primary_color=theme_data.primary_color,
        secondary_color=theme_data.secondary_color,
        accent_color=theme_data.accent_color,
        background_color=theme_data.background_color,
        text_color=theme_data.text_color,
        heading_font=theme_data.heading_font,
        body_font=theme_data.body_font,
        logo_url=theme_data.logo_url,
        banner_url=theme_data.banner_url,
        favicon_url=theme_data.favicon_url,
        custom_css=theme_data.custom_css,
        layout_config=theme_data.layout_config,
        is_active=theme_data.is_active
    )
    
    return theme


@router.get("/{group_id}/theme", response_model=GroupThemeResponse)
async def get_group_theme(
    group_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get group theme (public endpoint)."""
    theme = await GroupCustomizationService.get_group_theme(db, group_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return theme


@router.put("/{group_id}/theme", response_model=GroupThemeResponse)
async def update_group_theme(
    group_id: int,
    theme_data: GroupThemeUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update group theme (partial update, owner/admin only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user is group owner/admin
    is_admin = await GroupService.is_group_admin(db, group_id, user.id)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only group owners/admins can customize theme")
    
    # Get current theme
    existing_theme = await GroupCustomizationService.get_group_theme(db, group_id)
    if not existing_theme:
        raise HTTPException(status_code=404, detail="Theme not found. Create one first with POST.")
    
    # Update theme with only provided fields
    update_data = theme_data.model_dump(exclude_unset=True)
    theme = await GroupCustomizationService.create_or_update_theme(
        db=db,
        group_id=group_id,
        **update_data
    )
    
    return theme


@router.delete("/{group_id}/theme", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group_theme(
    group_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete group theme (revert to defaults, owner/admin only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user is group owner/admin
    is_admin = await GroupService.is_group_admin(db, group_id, user.id)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only group owners/admins can delete theme")
    
    deleted = await GroupCustomizationService.delete_theme(db, group_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Theme not found")


# ============================================================================
# GROUP CUSTOM DOMAINS
# ============================================================================

@router.post("/{group_id}/custom-domains", response_model=GroupCustomDomainResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_domain(
    group_id: int,
    domain_data: GroupCustomDomainCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a custom domain to group (owner/admin only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user is group owner/admin
    is_admin = await GroupService.is_group_admin(db, group_id, user.id)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only group owners/admins can add custom domains")
    
    # Check if group has subdomain approved (requirement for custom domain)
    from sqlalchemy import select
    from app.models.collaboration import Group
    result = await db.execute(select(Group).filter(Group.id == group_id))
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if not group.can_use_custom_domain:
        raise HTTPException(
            status_code=403,
            detail="Custom domains are only available after subdomain approval"
        )
    
    # Create custom domain
    domain = await GroupCustomizationService.create_custom_domain(
        db, group_id, domain_data.domain
    )
    return domain


@router.get("/{group_id}/custom-domains", response_model=List[GroupCustomDomainResponse])
async def list_custom_domains(
    group_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all custom domains for a group."""
    domains = await GroupCustomizationService.get_group_domains(db, group_id)
    return domains


@router.post("/{group_id}/custom-domains/{domain_id}/verify", response_model=GroupCustomDomainResponse)
async def verify_custom_domain(
    group_id: int,
    domain_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Verify a custom domain (owner/admin only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user is group owner/admin
    is_admin = await GroupService.is_group_admin(db, group_id, user.id)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only group owners/admins can verify domains")
    
    domain = await GroupCustomizationService.verify_custom_domain(db, domain_id)
    if not domain:
        raise HTTPException(status_code=404, detail="Custom domain not found")
    
    return domain


@router.delete("/{group_id}/custom-domains/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_domain(
    group_id: int,
    domain_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a custom domain (owner/admin only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user is group owner/admin
    is_admin = await GroupService.is_group_admin(db, group_id, user.id)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only group owners/admins can delete domains")
    
    deleted = await GroupCustomizationService.delete_custom_domain(db, domain_id, group_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Custom domain not found")


# ============================================================================
# GROUP FOLLOWER ENDPOINTS
# ============================================================================

@router.post("/{group_id}/follow", response_model=GroupFollowerResponse, status_code=status.HTTP_201_CREATED)
async def follow_group(
    group_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Follow a group to receive updates."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Verify group exists
    group = await GroupService.get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Follow the group
    follow = await GroupCustomizationService.follow_group(db, group_id, user.id)
    return follow


@router.delete("/{group_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_group(
    group_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Unfollow a group."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Unfollow the group
    unfollowed = await GroupCustomizationService.unfollow_group(db, group_id, user.id)
    if not unfollowed:
        raise HTTPException(status_code=404, detail="Not following this group")


@router.get("/{group_id}/followers", response_model=FollowersListResponse)
async def get_group_followers(
    group_id: int,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Get list of users following a group (public endpoint)."""
    # Verify group exists
    group = await GroupService.get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get followers
    followers, total = await GroupCustomizationService.get_group_followers(db, group_id, skip, limit)
    
    # Build response
    from app.models.collaboration import GroupFollower
    follower_infos = []
    for follower in followers:
        result = await db.execute(
            select(GroupFollower).filter(
                and_(
                    GroupFollower.user_id == follower.id,
                    GroupFollower.group_id == group_id,
                    GroupFollower.is_active == True
                )
            )
        )
        follow = result.scalar_one_or_none()
        follower_infos.append(
            FollowerInfo(
                id=follower.id,
                email=follower.email,
                full_name=follower.full_name,
                avatar_url=follower.avatar_url,
                followed_at=follow.created_at if follow else None
            )
        )
    
    return FollowersListResponse(total=total, followers=follower_infos)


@router.get("/{group_id}/is-following")
async def check_if_following(
    group_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if current user is following a group."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    is_following = await GroupCustomizationService.is_following_group(db, group_id, user.id)
    follower_count = await GroupCustomizationService.get_follower_count(db, group_id)
    
    return {
        "is_following": is_following,
        "follower_count": follower_count
    }


# ============================================================================
# GROUP ANALYTICS ENDPOINTS
# ============================================================================

@router.get("/{group_id}/analytics", response_model=GroupMetricsResponse)
async def get_group_analytics(
    group_id: int,
    start_date: str = None,
    end_date: str = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get group analytics and metrics (owner/admin only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user is group owner/admin
    is_admin = await GroupService.is_group_admin(db, group_id, user.id)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only group owners/admins can view analytics")
    
    from datetime import datetime
    from app.services.group_analytics_service import GroupAnalyticsService
    
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    
    metrics = await GroupAnalyticsService.get_group_metrics(db, group_id, start, end)
    return metrics


@router.get("/{group_id}/analytics/time-series", response_model=GroupTimeSeriesResponse)
async def get_group_time_series(
    group_id: int,
    metric: str = "followers",
    days: int = 30,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get time series data for group analytics (owner/admin only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user is group owner/admin
    is_admin = await GroupService.is_group_admin(db, group_id, user.id)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only group owners/admins can view analytics")
    
    from app.services.group_analytics_service import GroupAnalyticsService
    
    data = await GroupAnalyticsService.get_time_series_data(db, group_id, metric, days)
    return {"metric": metric, "data": data}


# ============================================================================
# Group Invitations (Public)
# ============================================================================

@router.get("/invitations/verify/{token}")
async def verify_group_invitation(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify a group invitation token (public endpoint)
    Returns invitation details if valid
    """
    result = await db.execute(
        select(GroupInvitation).filter(GroupInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        return {
            "valid": False,
            "message": "Invalid invitation token"
        }
    
    if invitation.status != GroupInvitationStatus.PENDING:
        return {
            "valid": False,
            "message": f"This invitation has been {invitation.status.value}"
        }
    
    if invitation.expires_at < datetime.utcnow():
        invitation.status = GroupInvitationStatus.EXPIRED
        await db.commit()
        return {
            "valid": False,
            "message": "This invitation has expired"
        }
    
    # Get group info
    group = await GroupService.get_group_by_id(db, invitation.group_id)
    
    return {
        "valid": True,
        "email": invitation.email,
        "group_id": invitation.group_id,
        "group_name": group.name if group else None,
        "role": invitation.role.value,
        "message": invitation.message
    }


@router.post("/invitations/accept/{token}")
async def accept_group_invitation(
    token: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Accept a group invitation (authenticated user)
    User must match the invitation email
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Get the invitation
    result = await db.execute(
        select(GroupInvitation).filter(GroupInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    # Verify status
    if invitation.status != GroupInvitationStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Invitation has been {invitation.status.value}")
    
    # Verify not expired
    if invitation.expires_at < datetime.utcnow():
        invitation.status = GroupInvitationStatus.EXPIRED
        await db.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired")
    
    # Verify email matches
    if user.email != invitation.email:
        raise HTTPException(status_code=403, detail="This invitation was sent to a different email address")
    
    # Check if already a member
    existing_member = await db.execute(
        select(GroupMember).filter(
            and_(
                GroupMember.group_id == invitation.group_id,
                GroupMember.user_id == user.id
            )
        )
    )
    if existing_member.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You are already a member of this group")
    
    # Join the group
    await GroupService.join_group(db, invitation.group_id, user.id, invitation.role)
    
    # Mark invitation as accepted
    invitation.status = GroupInvitationStatus.ACCEPTED
    invitation.accepted_by = user.id
    invitation.accepted_at = datetime.utcnow()
    await db.commit()
    
    # Get group details
    group = await GroupService.get_group_by_id(db, invitation.group_id)
    
    return {
        "success": True,
        "message": "Successfully joined the group",
        "group": {
            "id": group.id,
            "name": group.name,
            "slug": group.slug
        }
    }
