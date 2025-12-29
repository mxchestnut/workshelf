"""
Group Admin API - Subdomain Owner/Admin Endpoints
Allows group owners to manage their own groups
Secured via Keycloak authentication
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, EmailStr
import secrets

from app.core.database import get_db
from app.core.auth import get_current_user, get_current_user_from_db
from app.models.collaboration import (
    Group, GroupMember, GroupPost, GroupMemberRole, 
    ModerationAction, ModerationActionType,
    GroupInvitation, GroupInvitationStatus
)
from app.models.user import User
from app.services.email_service import email_service

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
    
    model_config = ConfigDict(from_attributes=True)


class SubdomainRequest(BaseModel):
    """Request a custom subdomain for a group"""
    subdomain: str  # e.g., 'writers' for writers.workshelf.dev


class GroupMemberInfo(BaseModel):
    """Group member information"""
    id: int
    user_id: int
    username: str
    email: str
    role: str
    joined_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class GroupPostCreate(BaseModel):
    """Create a new group post"""
    title: str
    content: str
    is_pinned: bool = False


class GroupPostInfo(BaseModel):
    """Group post information"""
    id: int
    title: str
    content: str
    author_id: int
    author_username: str
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class MemberRoleUpdate(BaseModel):
    """Update member role"""
    role: GroupMemberRole


# ============================================================================
# Helper Functions
# ============================================================================

async def get_group_owner_or_admin(
    group_id: int,
    db: AsyncSession,
    current_user: User
) -> Group:
    """
    Verify user owns or is admin of the group (or is staff)
    
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
    
    # Staff users bypass membership checks
    if current_user.is_staff:
        return group
    
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
    
    # Check if user has admin or owner role
    if member.role not in [GroupMemberRole.OWNER, GroupMemberRole.ADMIN]:
        raise HTTPException(
            status_code=403,
            detail="Only group owners and admins can perform this action"
        )
    
    return group


async def get_group_moderator_or_above(
    group_id: int,
    db: AsyncSession,
    current_user: User
) -> tuple[Group, GroupMember]:
    """
    Verify user is at least a moderator of the group (or is staff)
    
    Returns:
        Tuple of (Group, GroupMember) if user has permission
        
    Raises:
        HTTPException: If group not found or user lacks permission
    """
    # Get the group
    result = await db.execute(select(Group).filter(Group.id == group_id))
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Staff users bypass membership checks
    if current_user.is_staff:
        # Create a virtual member object for staff
        virtual_member = GroupMember(
            group_id=group_id,
            user_id=current_user.id,
            role=GroupMemberRole.ADMIN
        )
        return group, virtual_member
    
    # Check if user is a member with moderator, admin, or owner role
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
    
    # Check if user has moderator, admin, or owner role
    if member.role not in [GroupMemberRole.OWNER, GroupMemberRole.ADMIN, GroupMemberRole.MODERATOR]:
        raise HTTPException(
            status_code=403,
            detail="Only group moderators, admins, and owners can perform this action"
        )
    
    return group, member


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
    
    # Check if subdomain conflicts with existing usernames (to prevent URL collision)
    username_check = await db.execute(
        select(User).filter(User.username == subdomain)
    )
    if username_check.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"'{subdomain}' is already taken as a username. Please choose a different subdomain."
        )
    
    # Check if subdomain is already requested or taken by another group
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


# ============================================================================
# Member Management Endpoints
# ============================================================================

@router.get("/groups/{group_id}/members", response_model=List[GroupMemberInfo])
async def get_group_members(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Get all members of the group (requires group membership)
    
    **Requires**: Keycloak authentication + group membership
    """
    # Verify user is a member
    group, _ = await get_group_moderator_or_above(group_id, db, current_user)
    
    # Get all group members with user info
    result = await db.execute(
        select(GroupMember, User).join(User).filter(
            GroupMember.group_id == group_id
        ).order_by(GroupMember.created_at.desc())
    )
    members_with_users = result.all()
    
    return [
        GroupMemberInfo(
            id=member.id,
            user_id=member.user_id,
            username=user.username or user.email.split('@')[0],
            email=user.email,
            role=member.role.value,
            joined_at=member.created_at
        )
        for member, user in members_with_users
    ]


@router.put("/groups/{group_id}/members/{user_id}/role")
async def update_member_role(
    group_id: int,
    user_id: int,
    role_update: MemberRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Update a member's role (owner/admin only)
    
    **Requires**: Keycloak authentication + group owner/admin role
    """
    group = await get_group_owner_or_admin(group_id, db, current_user)
    
    # Get the member to update
    member_result = await db.execute(
        select(GroupMember).filter(
            and_(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id
            )
        )
    )
    member = member_result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Prevent changing owner role unless you're the owner
    if member.role == GroupMemberRole.OWNER:
        # Check if current user is also an owner
        current_member_result = await db.execute(
            select(GroupMember).filter(
                and_(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == current_user.id,
                    GroupMember.role == GroupMemberRole.OWNER
                )
            )
        )
        if not current_member_result.scalar_one_or_none():
            raise HTTPException(
                status_code=403,
                detail="Only owners can change other owners' roles"
            )
    
    # Update the role
    member.role = role_update.role
    await db.commit()
    await db.refresh(member)
    
    return {
        "success": True,
        "message": f"Member role updated to {role_update.role.value}",
        "member": {
            "id": member.id,
            "user_id": member.user_id,
            "role": member.role.value
        }
    }


@router.delete("/groups/{group_id}/members/{user_id}")
async def remove_member(
    group_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Remove a member from the group (moderator/admin/owner only)
    
    **Requires**: Keycloak authentication + group moderator/admin/owner role
    """
    group, current_member = await get_group_moderator_or_above(group_id, db, current_user)
    
    # Get the member to remove
    member_result = await db.execute(
        select(GroupMember).filter(
            and_(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id
            )
        )
    )
    member = member_result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Role hierarchy check: can't remove someone with equal or higher role
    role_hierarchy = {
        GroupMemberRole.MEMBER: 1,
        GroupMemberRole.MODERATOR: 2,
        GroupMemberRole.ADMIN: 3,
        GroupMemberRole.OWNER: 4
    }
    
    if role_hierarchy[member.role] >= role_hierarchy[current_member.role]:
        raise HTTPException(
            status_code=403,
            detail="You cannot remove a member with equal or higher role"
        )
    
    # Log moderation action
    audit_log = ModerationAction(
        group_id=group_id,
        moderator_id=current_user.id,
        action_type=ModerationActionType.KICK_MEMBER,
        target_type='member',
        target_id=member.id,
        target_user_id=user_id,
        action_metadata={"kicked_role": member.role.value}
    )
    db.add(audit_log)
    
    # Remove the member
    await db.delete(member)
    await db.commit()
    
    return {
        "success": True,
        "message": "Member removed successfully"
    }


# ============================================================================
# Group Posts Management Endpoints
# ============================================================================

@router.get("/groups/{group_id}/posts", response_model=List[GroupPostInfo])
async def get_group_posts(
    group_id: int,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Get all posts in the group (requires group membership)
    
    **Requires**: Keycloak authentication + group membership
    """
    # Verify user is a member
    group, _ = await get_group_moderator_or_above(group_id, db, current_user)
    
    # Get posts with author info
    result = await db.execute(
        select(GroupPost, User).join(User, GroupPost.author_id == User.id).filter(
            GroupPost.group_id == group_id
        ).order_by(
            GroupPost.is_pinned.desc(),
            GroupPost.created_at.desc()
        ).limit(limit).offset(offset)
    )
    posts_with_users = result.all()
    
    return [
        GroupPostInfo(
            id=post.id,
            title=post.title,
            content=post.content,
            author_id=post.author_id,
            author_username=user.username or user.email.split('@')[0],
            is_pinned=post.is_pinned,
            created_at=post.created_at,
            updated_at=post.updated_at
        )
        for post, user in posts_with_users
    ]


@router.post("/groups/{group_id}/posts")
async def create_group_post(
    group_id: int,
    post_data: GroupPostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Create a new post in the group (requires group membership)
    
    **Requires**: Keycloak authentication + group membership
    """
    # Verify user is a member (at least member level can post)
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
            detail="You must be a member of this group to post"
        )
    
    # Create the post
    new_post = GroupPost(
        group_id=group_id,
        author_id=current_user.id,
        title=post_data.title,
        content=post_data.content,
        is_pinned=post_data.is_pinned if member.role in [GroupMemberRole.OWNER, GroupMemberRole.ADMIN, GroupMemberRole.MODERATOR] else False
    )
    
    db.add(new_post)
    await db.commit()
    await db.refresh(new_post)
    
    return {
        "success": True,
        "message": "Post created successfully",
        "post": {
            "id": new_post.id,
            "title": new_post.title,
            "content": new_post.content,
            "created_at": new_post.created_at
        }
    }


@router.put("/groups/{group_id}/posts/{post_id}/pin")
async def toggle_post_pin(
    group_id: int,
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Pin/unpin a post (moderator/admin/owner only)
    
    **Requires**: Keycloak authentication + group moderator/admin/owner role
    """
    group, _ = await get_group_moderator_or_above(group_id, db, current_user)
    
    # Get the post
    post_result = await db.execute(
        select(GroupPost).filter(
            and_(
                GroupPost.id == post_id,
                GroupPost.group_id == group_id
            )
        )
    )
    post = post_result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Toggle pin status
    post.is_pinned = not post.is_pinned
    
    # Log moderation action
    audit_log = ModerationAction(
        group_id=group_id,
        moderator_id=current_user.id,
        action_type=ModerationActionType.PIN_POST if post.is_pinned else ModerationActionType.UNPIN_POST,
        target_type='post',
        target_id=post_id,
        target_user_id=post.author_id,
        action_metadata={"post_title": post.title if hasattr(post, 'title') else None}
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {
        "success": True,
        "message": f"Post {'pinned' if post.is_pinned else 'unpinned'} successfully",
        "post": {
            "id": post.id,
            "is_pinned": post.is_pinned
        }
    }


class FeedPinRequest(BaseModel):
    """Request to pin/unpin a post to specific feeds"""
    feeds: List[str]  # e.g., ['global', 'discover', 'personal']


@router.put("/groups/{group_id}/posts/{post_id}/pin-to-feeds")
async def pin_post_to_feeds(
    group_id: int,
    post_id: int,
    request: FeedPinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Pin/unpin a post to specific feeds (global, personal, discover, etc.)
    
    **Requires**: Keycloak authentication + group moderator/admin/owner role
    
    Valid feeds: 'group', 'personal', 'global', 'discover', 'updates', 'beta-feed'
    """
    valid_feeds = {'group', 'personal', 'global', 'discover', 'updates', 'beta-feed'}
    
    # Validate feed names
    invalid_feeds = set(request.feeds) - valid_feeds
    if invalid_feeds:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid feed names: {', '.join(invalid_feeds)}. Valid feeds: {', '.join(valid_feeds)}"
        )
    
    group, _ = await get_group_moderator_or_above(group_id, db, current_user)
    
    # Get the post
    post_result = await db.execute(
        select(GroupPost).filter(
            and_(
                GroupPost.id == post_id,
                GroupPost.group_id == group_id
            )
        )
    )
    post = post_result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Update pinned_feeds
    post.pinned_feeds = request.feeds
    
    # Update is_pinned for backwards compatibility
    post.is_pinned = 'group' in request.feeds
    
    # Log moderation action
    audit_log = ModerationAction(
        group_id=group_id,
        moderator_id=current_user.id,
        action_type=ModerationActionType.PIN_POST,
        target_type='post',
        target_id=post_id,
        target_user_id=post.author_id,
        action_metadata={
            "post_title": post.title if hasattr(post, 'title') else None,
            "pinned_feeds": request.feeds
        }
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {
        "success": True,
        "message": f"Post pinned to feeds: {', '.join(request.feeds) if request.feeds else 'none'}",
        "post": {
            "id": post.id,
            "is_pinned": post.is_pinned,
            "pinned_feeds": post.pinned_feeds
        }
    }


@router.delete("/groups/{group_id}/posts/{post_id}")
async def delete_post(
    group_id: int,
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Delete a post (author, moderator, admin, or owner)
    
    **Requires**: Keycloak authentication + (post author OR group moderator/admin/owner)
    """
    # Get the post
    post_result = await db.execute(
        select(GroupPost).filter(
            and_(
                GroupPost.id == post_id,
                GroupPost.group_id == group_id
            )
        )
    )
    post = post_result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if user is the author
    if post.author_id == current_user.id:
        # Author can delete their own post
        await db.delete(post)
        await db.commit()
        return {
            "success": True,
            "message": "Post deleted successfully"
        }
    
    # If not the author, must be moderator/admin/owner
    group, _ = await get_group_moderator_or_above(group_id, db, current_user)
    
    # Log moderation action (only when deleted by moderator, not author)
    audit_log = ModerationAction(
        group_id=group_id,
        moderator_id=current_user.id,
        action_type=ModerationActionType.DELETE_POST,
        target_type='post',
        target_id=post_id,
        target_user_id=post.author_id,
        action_metadata={"post_title": post.title if hasattr(post, 'title') else None, "post_content_preview": post.content[:100] if post.content else None}
    )
    db.add(audit_log)
    
    await db.delete(post)
    await db.commit()
    
    return {
        "success": True,
        "message": "Post deleted successfully"
    }


@router.put("/groups/{group_id}/posts/{post_id}/lock")
async def toggle_post_lock(
    group_id: int,
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Lock/unlock a post thread (moderator/admin/owner only)
    
    **Requires**: Keycloak authentication + group moderator/admin/owner role
    """
    group, _ = await get_group_moderator_or_above(group_id, db, current_user)
    
    # Get the post
    post_result = await db.execute(
        select(GroupPost).filter(
            and_(
                GroupPost.id == post_id,
                GroupPost.group_id == group_id
            )
        )
    )
    post = post_result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Toggle lock status
    post.is_locked = not post.is_locked
    
    # Log moderation action
    audit_log = ModerationAction(
        group_id=group_id,
        moderator_id=current_user.id,
        action_type=ModerationActionType.LOCK_THREAD if post.is_locked else ModerationActionType.UNLOCK_THREAD,
        target_type='post',
        target_id=post_id,
        target_user_id=post.author_id,
        action_metadata={"post_title": post.title if hasattr(post, 'title') else None}
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {
        "success": True,
        "message": f"Post thread {'locked' if post.is_locked else 'unlocked'} successfully",
        "post": {
            "id": post.id,
            "is_locked": post.is_locked
        }
    }


@router.put("/groups/{group_id}/members/{user_id}/ban")
async def ban_member(
    group_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Ban a member from the group (moderator/admin/owner only)
    Removes member and prevents them from rejoining
    
    **Requires**: Keycloak authentication + group moderator/admin/owner role
    """
    group, current_member = await get_group_moderator_or_above(group_id, db, current_user)
    
    # Get the member to ban
    member_result = await db.execute(
        select(GroupMember).filter(
            and_(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id
            )
        )
    )
    member = member_result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Role hierarchy check: can't ban someone with equal or higher role
    role_hierarchy = {
        GroupMemberRole.MEMBER: 1,
        GroupMemberRole.MODERATOR: 2,
        GroupMemberRole.ADMIN: 3,
        GroupMemberRole.OWNER: 4
    }
    
    if role_hierarchy[member.role] >= role_hierarchy[current_member.role]:
        raise HTTPException(
            status_code=403,
            detail="You cannot ban a member with equal or higher role"
        )
    
    # Log moderation action
    audit_log = ModerationAction(
        group_id=group_id,
        moderator_id=current_user.id,
        action_type=ModerationActionType.BAN_MEMBER,
        target_type='member',
        target_id=member.id,
        target_user_id=user_id,
        action_metadata={"banned_role": member.role.value}
    )
    db.add(audit_log)
    
    # For now, banning just removes the member
    # In a full implementation, you'd create a BannedMember table to track bans
    await db.delete(member)
    await db.commit()
    
    return {
        "success": True,
        "message": "Member banned successfully"
    }


@router.get("/groups/{group_id}/audit-log")
async def get_audit_log(
    group_id: int,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    action_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Get moderation audit log for a group (moderator/admin/owner only)
    
    **Requires**: Keycloak authentication + group moderator/admin/owner role
    """
    group, _ = await get_group_moderator_or_above(group_id, db, current_user)
    
    # Build query
    query = select(ModerationAction).filter(ModerationAction.group_id == group_id)
    
    # Filter by action type if specified
    if action_type:
        try:
            action_enum = ModerationActionType(action_type)
            query = query.filter(ModerationAction.action_type == action_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid action_type: {action_type}")
    
    # Order by most recent first
    query = query.order_by(ModerationAction.created_at.desc())
    
    # Apply pagination
    query = query.limit(limit).offset(offset)
    
    # Execute query
    result = await db.execute(query)
    actions = result.scalars().all()
    
    # Get moderator and target user info
    action_list = []
    for action in actions:
        # Fetch moderator info
        moderator_name = None
        if action.moderator_id:
            mod_result = await db.execute(select(User).filter(User.id == action.moderator_id))
            moderator = mod_result.scalar_one_or_none()
            if moderator:
                moderator_name = moderator.username or moderator.email
        
        # Fetch target user info
        target_user_name = None
        if action.target_user_id:
            user_result = await db.execute(select(User).filter(User.id == action.target_user_id))
            target_user = user_result.scalar_one_or_none()
            if target_user:
                target_user_name = target_user.username or target_user.email
        
        action_list.append({
            "id": action.id,
            "action_type": action.action_type.value,
            "moderator_id": action.moderator_id,
            "moderator_name": moderator_name,
            "target_type": action.target_type,
            "target_id": action.target_id,
            "target_user_id": action.target_user_id,
            "target_user_name": target_user_name,
            "reason": action.reason,
            "metadata": action.action_metadata,
            "created_at": action.created_at.isoformat() if action.created_at else None
        })
    
    return {
        "success": True,
        "logs": action_list,
        "count": len(action_list),
        "limit": limit,
        "offset": offset
    }


# ============================================================================
# Group Invitations
# ============================================================================

class GroupInvitationCreate(BaseModel):
    """Create a group invitation"""
    email: EmailStr
    role: GroupMemberRole = GroupMemberRole.MEMBER
    message: Optional[str] = None


class GroupInvitationResponse(BaseModel):
    """Group invitation response"""
    id: int
    email: str
    token: str
    role: str
    message: Optional[str]
    status: str
    invited_by: Optional[int]
    inviter_name: Optional[str]
    expires_at: str
    created_at: str


@router.post("/groups/{group_id}/invitations")
async def create_group_invitation(
    group_id: int,
    invitation: GroupInvitationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Send an invitation to join the group (admin/owner with invite permission)
    
    **Requires**: Keycloak authentication + group admin/owner/moderator with can_invite_members
    """
    # Check if user has permission to invite
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
        raise HTTPException(status_code=403, detail="You are not a member of this group")
    
    # Only admin/owner or moderator with can_invite_members can invite
    if member.role not in [GroupMemberRole.OWNER, GroupMemberRole.ADMIN]:
        # TODO: Check custom role permissions (can_invite_members)
        raise HTTPException(status_code=403, detail="You don't have permission to invite members")
    
    # Check if user is already a member
    existing_member = await db.execute(
        select(GroupMember).filter(
            and_(
                GroupMember.group_id == group_id,
                GroupMember.user_id == select(User.id).where(User.email == invitation.email).scalar_subquery()
            )
        )
    )
    if existing_member.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already a member of this group")
    
    # Check if there's already a pending invitation
    existing_invitation = await db.execute(
        select(GroupInvitation).filter(
            and_(
                GroupInvitation.group_id == group_id,
                GroupInvitation.email == invitation.email,
                GroupInvitation.status == GroupInvitationStatus.PENDING,
                GroupInvitation.expires_at > datetime.now(timezone.utc)
            )
        )
    )
    if existing_invitation.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A pending invitation already exists for this email")
    
    # Create invitation
    new_invitation = GroupInvitation(
        group_id=group_id,
        email=invitation.email,
        token=secrets.token_urlsafe(32),
        invited_by=current_user.id,
        role=invitation.role,
        message=invitation.message,
        status=GroupInvitationStatus.PENDING,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)  # 7 day expiration
    )
    
    db.add(new_invitation)
    await db.commit()
    await db.refresh(new_invitation)
    
    # Get group details for email
    group_result = await db.execute(
        select(Group).filter(Group.id == group_id)
    )
    group = group_result.scalar_one()
    
    # Get inviter name
    inviter_name = current_user.display_name or current_user.username or current_user.email
    
    # Send invitation email
    try:
        email_sent = await email_service.send_group_invitation(
            to_email=invitation.email,
            group_name=group.name,
            inviter_name=inviter_name,
            invitation_token=new_invitation.token,
            role=invitation.role.value,
            message=invitation.message
        )
        if not email_sent:
            # Log warning but don't fail the request
            # Invitation is still created, user just won't get email
            print(f"Warning: Failed to send invitation email to {invitation.email}")
    except Exception as e:
        print(f"Error sending invitation email: {str(e)}")
    
    return {
        "success": True,
        "invitation": {
            "id": new_invitation.id,
            "email": new_invitation.email,
            "token": new_invitation.token,
            "role": new_invitation.role.value,
            "message": new_invitation.message,
            "status": new_invitation.status.value,
            "expires_at": new_invitation.expires_at.isoformat()
        }
    }


@router.get("/groups/{group_id}/invitations")
async def get_group_invitations(
    group_id: int,
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Get all invitations for a group (admin/owner only)
    
    **Requires**: Keycloak authentication + group admin/owner
    """
    # Verify user is admin/owner
    group, _ = await get_group_admin_or_above(group_id, db, current_user)
    
    # Build query
    query = select(GroupInvitation).filter(GroupInvitation.group_id == group_id)
    
    if status:
        try:
            status_enum = GroupInvitationStatus(status)
            query = query.filter(GroupInvitation.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    
    query = query.order_by(GroupInvitation.created_at.desc())
    
    result = await db.execute(query)
    invitations = result.scalars().all()
    
    # Get inviter names
    invitation_list = []
    for inv in invitations:
        inviter_name = None
        if inv.invited_by:
            inviter_result = await db.execute(select(User).filter(User.id == inv.invited_by))
            inviter = inviter_result.scalar_one_or_none()
            if inviter:
                inviter_name = inviter.username or inviter.email
        
        invitation_list.append({
            "id": inv.id,
            "email": inv.email,
            "token": inv.token,
            "role": inv.role.value,
            "message": inv.message,
            "status": inv.status.value,
            "invited_by": inv.invited_by,
            "inviter_name": inviter_name,
            "expires_at": inv.expires_at.isoformat(),
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
            "accepted_at": inv.accepted_at.isoformat() if inv.accepted_at else None
        })
    
    return {
        "success": True,
        "invitations": invitation_list,
        "count": len(invitation_list)
    }


@router.delete("/groups/{group_id}/invitations/{invitation_id}")
async def revoke_group_invitation(
    group_id: int,
    invitation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_db)
):
    """
    Revoke/cancel a group invitation (admin/owner only)
    
    **Requires**: Keycloak authentication + group admin/owner
    """
    # Verify user is admin/owner
    group, _ = await get_group_admin_or_above(group_id, db, current_user)
    
    # Get the invitation
    result = await db.execute(
        select(GroupInvitation).filter(
            and_(
                GroupInvitation.id == invitation_id,
                GroupInvitation.group_id == group_id
            )
        )
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    # Mark as revoked
    invitation.status = GroupInvitationStatus.REVOKED
    await db.commit()
    
    return {
        "success": True,
        "message": "Invitation revoked successfully"
    }


