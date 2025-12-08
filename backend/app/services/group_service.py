"""
Group service for managing writing groups and memberships.
"""
from typing import Optional, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.models import Group, GroupMember, GroupMemberRole, GroupPrivacyType
from app.models.collaboration import PrivacyLevel
from app.models.user import User


class GroupService:
    """Service for managing writing groups and members."""
    
    @staticmethod
    async def check_group_access(
        db: AsyncSession,
        group: Group,
        user_id: Optional[int] = None,
        require_member: bool = False
    ) -> bool:
        """
        Check if a user has access to a group based on privacy level.
        
        Args:
            db: Database session
            group: The group to check access for
            user_id: The user ID (None for not logged in)
            require_member: If True, only allow members (for posts/members lists)
        
        Returns:
            True if access is allowed, False otherwise
        
        Privacy Levels:
            - PUBLIC: Anyone can see (no login required)
            - GUARDED: Only logged-in users can see
            - PRIVATE: Only members can see posts/members, but name is searchable
            - SECRET: Not searchable, only accessible by members
        """
        # Check privacy level
        if group.privacy_level == PrivacyLevel.PUBLIC:
            # Public groups are accessible to everyone
            if require_member and user_id:
                # For member-only content, check membership
                return await GroupService.is_group_member(db, group.id, user_id)
            return True
        
        elif group.privacy_level == PrivacyLevel.GUARDED:
            # Guarded groups require login
            if not user_id:
                return False
            if require_member:
                # For member-only content, check membership
                return await GroupService.is_group_member(db, group.id, user_id)
            return True
        
        elif group.privacy_level == PrivacyLevel.PRIVATE:
            # Private groups require membership for posts/members
            # But basic info (name, description) is searchable
            if not user_id:
                return not require_member  # Allow search, but not content
            if require_member:
                return await GroupService.is_group_member(db, group.id, user_id)
            return True  # Logged-in users can see basic info
        
        elif group.privacy_level == PrivacyLevel.SECRET:
            # Secret groups require membership for everything
            if not user_id:
                return False
            return await GroupService.is_group_member(db, group.id, user_id)
        
        # Default: deny access
        return False
    
    @staticmethod
    async def create_group(
        db: AsyncSession,
        owner_id: int,
        name: str,
        description: Optional[str] = None,
        slug: Optional[str] = None,
        privacy_level: str = "public",
        is_public: bool = False,
        avatar_url: Optional[str] = None,
        tags: Optional[List[str]] = None,
        rules: Optional[str] = None
    ) -> Group:
        """Create a new group with privacy level support."""
        # Generate slug if not provided
        if not slug:
            slug = name.lower().replace(' ', '-')
        
        # Map privacy_level to is_public for backward compatibility
        if privacy_level == "public":
            is_public = True
        
        group = Group(
            name=name,
            description=description,
            slug=slug,
            privacy_level=privacy_level,
            is_public=is_public,
            avatar_url=avatar_url,
            tags=tags,
            rules=rules
        )
        db.add(group)
        await db.flush()  # Flush to get group ID
        
        # Add owner as OWNER member
        owner_member = GroupMember(
            group_id=group.id,
            user_id=owner_id,
            role=GroupMemberRole.OWNER
        )
        db.add(owner_member)
        
        # Add warpxth as ADMIN to all groups (if not already the owner)
        warpxth_result = await db.execute(
            select(User).where(User.username == "warpxth")
        )
        warpxth = warpxth_result.scalar_one_or_none()
        if warpxth and warpxth.id != owner_id:
            warpxth_member = GroupMember(
                group_id=group.id,
                user_id=warpxth.id,
                role=GroupMemberRole.ADMIN
            )
            db.add(warpxth_member)
        
        await db.commit()
        await db.refresh(group)
        
        # Matrix integration removed - space creation disabled
        
        # Load members
        result = await db.execute(
            select(Group)
            .options(selectinload(Group.members))
            .where(Group.id == group.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def get_group_by_id(db: AsyncSession, group_id: int) -> Optional[Group]:
        """Get a group by ID."""
        result = await db.execute(
            select(Group)
            .options(selectinload(Group.members))
            .where(Group.id == group_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_group_by_slug(
        db: AsyncSession, 
        slug: str,
        user_id: Optional[int] = None,
        check_access: bool = True
    ) -> Optional[Group]:
        """
        Get a group by slug with optional access control.
        
        Args:
            db: Database session
            slug: Group slug
            user_id: Current user ID (None if not logged in)
            check_access: If True, check privacy level access
        
        Returns:
            Group if found and accessible, None otherwise
        """
        result = await db.execute(
            select(Group)
            .options(selectinload(Group.members))
            .where(Group.slug == slug)
        )
        group = result.scalar_one_or_none()
        
        if not group:
            return None
        
        # Check access if requested
        if check_access:
            has_access = await GroupService.check_group_access(db, group, user_id, require_member=False)
            if not has_access:
                return None
        
        return group
    
    @staticmethod
    async def update_group(
        db: AsyncSession,
        group_id: int,
        user_id: int,
        **updates
    ) -> Optional[Group]:
        """Update group details (owner/admin only)."""
        # Check if user is owner or admin
        member_result = await db.execute(
            select(GroupMember).where(
                and_(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == user_id,
                    GroupMember.role.in_([GroupMemberRole.OWNER, GroupMemberRole.ADMIN])
                )
            )
        )
        member = member_result.scalar_one_or_none()
        
        if not member:
            return None
        
        result = await db.execute(
            select(Group).where(Group.id == group_id)
        )
        group = result.scalar_one_or_none()
        
        if not group:
            return None
        
        # Privacy protection: once private, cannot become public
        if 'is_public' in updates and updates['is_public'] == True:
            if not group.is_public:
                # Group is currently private, cannot make it public
                raise ValueError("Private groups cannot be made public. This protects member privacy.")
        
        # Update fields
        for key, value in updates.items():
            if hasattr(group, key):
                setattr(group, key, value)
        
        await db.commit()
        await db.refresh(group)
        
        # Load members
        result = await db.execute(
            select(Group)
            .options(selectinload(Group.members))
            .where(Group.id == group.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def get_discoverable_groups(
        db: AsyncSession,
        user_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Group]:
        """
        Get groups that are discoverable based on privacy level and user status.
        
        Privacy visibility:
        - PUBLIC: Always visible in search
        - GUARDED: Visible to logged-in users
        - PRIVATE: Visible in search (name only)
        - SECRET: Never visible in search (invitation only)
        """
        # Build query based on user status
        if user_id:
            # Logged-in users can see PUBLIC, GUARDED, and PRIVATE groups
            query = select(Group).where(
                and_(
                    Group.is_active == True,
                    Group.privacy_level.in_([
                        PrivacyLevel.PUBLIC,
                        PrivacyLevel.GUARDED,
                        PrivacyLevel.PRIVATE
                    ])
                )
            )
        else:
            # Not logged in: only see PUBLIC and PRIVATE (searchable) groups
            query = select(Group).where(
                and_(
                    Group.is_active == True,
                    Group.privacy_level.in_([
                        PrivacyLevel.PUBLIC,
                        PrivacyLevel.PRIVATE
                    ])
                )
            )
        
        query = query.order_by(Group.created_at.desc()).limit(limit).offset(offset)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_user_groups(
        db: AsyncSession,
        user_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> List[Group]:
        """Get all groups a user is a member of."""
        result = await db.execute(
            select(Group)
            .join(GroupMember)
            .where(
                and_(
                    GroupMember.user_id == user_id,
                    Group.is_active == True
                )
            )
            .order_by(GroupMember.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()
    
    @staticmethod
    async def add_member(
        db: AsyncSession,
        group_id: int,
        user_id: int,
        role: GroupMemberRole = GroupMemberRole.MEMBER
    ) -> GroupMember:
        """Add a member to a group."""
        # Check if already a member
        result = await db.execute(
            select(GroupMember).where(
                and_(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == user_id
                )
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            # Reactivate if inactive
            if not existing.is_active:
                existing.is_active = True
                await db.commit()
                await db.refresh(existing)
            return existing
        
        member = GroupMember(
            group_id=group_id,
            user_id=user_id,
            role=role
        )
        db.add(member)
        await db.commit()
        await db.refresh(member)
        
        # Invite user to the group's Matrix Space (if it exists)
        # Get group to find space_id
        group_result = await db.execute(
            select(Group).where(Group.id == group_id)
        )
        group = group_result.scalar_one_or_none()
        
        if group and group.matrix_space_id:
            # Get an admin/owner to do the invite
            admin_result = await db.execute(
                select(GroupMember).where(
                    and_(
                        GroupMember.group_id == group_id,
                        GroupMember.role.in_([GroupMemberRole.OWNER, GroupMemberRole.ADMIN])
                    )
                ).limit(1)
            )
            admin_member = admin_result.scalar_one_or_none()
            
            # Matrix integration removed - space invites disabled
        
        # Load user relationship
        result = await db.execute(
            select(GroupMember)
            .options(selectinload(GroupMember.user))
            .where(GroupMember.id == member.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def remove_member(
        db: AsyncSession,
        group_id: int,
        user_id: int,
        removed_by_id: int
    ) -> bool:
        """Remove a member from a group (admin only)."""
        # Check if remover is admin/owner
        remover_result = await db.execute(
            select(GroupMember).where(
                and_(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == removed_by_id,
                    GroupMember.role.in_([GroupMemberRole.OWNER, GroupMemberRole.ADMIN])
                )
            )
        )
        remover = remover_result.scalar_one_or_none()
        
        if not remover:
            return False
        
        # Get member to remove
        result = await db.execute(
            select(GroupMember).where(
                and_(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == user_id
                )
            )
        )
        member = result.scalar_one_or_none()
        
        if not member:
            return False
        
        # Can't remove owner
        if member.role == GroupMemberRole.OWNER:
            return False
        
        member.is_active = False
        await db.commit()
        return True
    
    @staticmethod
    async def update_member_role(
        db: AsyncSession,
        group_id: int,
        user_id: int,
        new_role: GroupMemberRole,
        updated_by_id: int
    ) -> Optional[GroupMember]:
        """Update a member's role (owner only)."""
        # Check if updater is owner
        updater_result = await db.execute(
            select(GroupMember).where(
                and_(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == updated_by_id,
                    GroupMember.role == GroupMemberRole.OWNER
                )
            )
        )
        updater = updater_result.scalar_one_or_none()
        
        if not updater:
            return None
        
        # Get member to update
        result = await db.execute(
            select(GroupMember).where(
                and_(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == user_id
                )
            )
        )
        member = result.scalar_one_or_none()
        
        if not member:
            return None
        
        member.role = new_role
        await db.commit()
        await db.refresh(member)
        
        # Load user relationship
        result = await db.execute(
            select(GroupMember)
            .options(selectinload(GroupMember.user))
            .where(GroupMember.id == member.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def get_group_members(
        db: AsyncSession,
        group_id: int,
        active_only: bool = True
    ) -> List[GroupMember]:
        """Get all members of a group."""
        from app.models.user import UserProfile
        
        query = select(GroupMember).options(
            selectinload(GroupMember.user).selectinload(User.profile)
        ).where(GroupMember.group_id == group_id)
        
        # Order by created_at (from TimestampMixin)
        query = query.order_by(GroupMember.created_at)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def is_group_admin(
        db: AsyncSession,
        group_id: int,
        user_id: int
    ) -> bool:
        """Check if user is group owner or admin."""
        result = await db.execute(
            select(GroupMember).where(
                and_(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == user_id,
                    GroupMember.role.in_([GroupMemberRole.OWNER, GroupMemberRole.ADMIN])
                )
            )
        )
        member = result.scalar_one_or_none()
        return member is not None

    @staticmethod
    async def is_group_member(
        db: AsyncSession,
        group_id: int,
        user_id: int
    ) -> bool:
        """Check if user is a member of the group."""
        result = await db.execute(
            select(GroupMember).where(
                and_(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == user_id
                )
            )
        )
        member = result.scalar_one_or_none()
        return member is not None

    @staticmethod
    async def can_manage_roles(
        db: AsyncSession,
        group_id: int,
        user_id: int
    ) -> bool:
        """Check if user can manage roles (owner or has can_manage_roles permission)."""
        from app.models.collaboration import GroupRole, GroupMemberCustomRole
        
        # Check if owner
        result = await db.execute(
            select(GroupMember).where(
                and_(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == user_id,
                    GroupMember.role == GroupMemberRole.OWNER
                )
            )
        )
        member = result.scalar_one_or_none()
        
        if member:
            return True
        
        # Check if has can_manage_roles permission via custom role
        result = await db.execute(
            select(GroupMember).where(
                and_(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == user_id
                )
            )
        )
        member = result.scalar_one_or_none()
        
        if not member:
            return False
        
        # Check custom roles
        roles_result = await db.execute(
            select(GroupRole)
            .join(GroupMemberCustomRole, GroupRole.id == GroupMemberCustomRole.role_id)
            .where(
                and_(
                    GroupMemberCustomRole.group_member_id == member.id,
                    GroupRole.can_manage_roles == True
                )
            )
        )
        
        has_permission = roles_result.first() is not None
        return has_permission


