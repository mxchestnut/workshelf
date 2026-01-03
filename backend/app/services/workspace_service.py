"""
Workspace service for managing collaborative workspaces.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.workspace import (
    Workspace,
    WorkspaceCollection,
    WorkspaceMember,
    WorkspaceRole,
    WorkspaceType,
    WorkspaceVisibility,
    CollectionItem,
)
from app.schemas.workspace import (
    WorkspaceCollectionCreate,
    WorkspaceCollectionUpdate,
    WorkspaceCreate,
    WorkspaceMemberInvite,
    WorkspaceMemberUpdate,
    WorkspaceUpdate,
)
from app.schemas.collection_item import CollectionItemCreate


def _generate_slug(name: str) -> str:
    """Generate URL-friendly slug from workspace name."""
    import re

    slug = name.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug[:255]


class WorkspaceService:
    """Service for workspace operations."""

    @staticmethod
    async def create_workspace(
        db: AsyncSession, user_id: int, workspace_data: WorkspaceCreate
    ) -> Workspace:
        """Create a new workspace and add creator as owner."""
        # Generate slug
        base_slug = _generate_slug(workspace_data.name)
        slug = base_slug

        # Ensure unique slug
        counter = 1
        while True:
            result = await db.execute(select(Workspace).where(Workspace.slug == slug))
            if not result.scalar_one_or_none():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1

        # Create workspace
        workspace = Workspace(
            name=workspace_data.name,
            slug=slug,
            description=workspace_data.description,
            type=workspace_data.type,
            visibility=workspace_data.visibility,
            owner_id=user_id,
            avatar_url=workspace_data.avatar_url,
        )
        db.add(workspace)
        await db.flush()

        # Add creator as owner member
        member = WorkspaceMember(
            workspace_id=workspace.id,
            user_id=user_id,
            role=WorkspaceRole.OWNER,
            can_create_collections=True,
            can_edit_workspace=True,
            can_manage_members=True,
        )
        db.add(member)
        await db.commit()
        await db.refresh(workspace)

        return workspace

    @staticmethod
    async def get_workspace(
        db: AsyncSession, workspace_id: int, user_id: Optional[int] = None
    ) -> Optional[Workspace]:
        """Get workspace by ID with optional user permission check."""
        query = select(Workspace).where(Workspace.id == workspace_id)

        if user_id:
            # Check if user is a member
            query = query.outerjoin(
                WorkspaceMember,
                and_(
                    WorkspaceMember.workspace_id == Workspace.id,
                    WorkspaceMember.user_id == user_id,
                ),
            ).where(
                or_(
                    Workspace.visibility == "private",
                    WorkspaceMember.user_id == user_id,
                )
            )

        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_user_workspaces(
        db: AsyncSession, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[Workspace]:
        """List all workspaces where user is a member."""
        query = (
            select(Workspace)
            .join(WorkspaceMember)
            .where(and_(WorkspaceMember.user_id == user_id, Workspace.is_active))
            .order_by(Workspace.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_workspace(
        db: AsyncSession,
        workspace_id: int,
        user_id: int,
        workspace_data: WorkspaceUpdate,
    ) -> Optional[Workspace]:
        """Update workspace (requires edit permission)."""
        # Check permission
        member = await WorkspaceService.get_member(db, workspace_id, user_id)
        if not member or not member.can_edit_workspace:
            return None

        workspace = await WorkspaceService.get_workspace(db, workspace_id)
        if not workspace:
            return None

        # Update fields
        update_data = workspace_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(workspace, field, value)

        workspace.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(workspace)
        return workspace

    @staticmethod
    async def delete_workspace(
        db: AsyncSession, workspace_id: int, user_id: int
    ) -> bool:
        """Delete workspace (owner only)."""
        workspace = await WorkspaceService.get_workspace(db, workspace_id)
        if not workspace or workspace.owner_id != user_id:
            return False

        await db.delete(workspace)
        await db.commit()
        return True

    @staticmethod
    async def get_member(
        db: AsyncSession, workspace_id: int, user_id: int
    ) -> Optional[WorkspaceMember]:
        """Get workspace member."""
        result = await db.execute(
            select(WorkspaceMember).where(
                and_(
                    WorkspaceMember.workspace_id == workspace_id,
                    WorkspaceMember.user_id == user_id,
                )
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_members(
        db: AsyncSession, workspace_id: int, skip: int = 0, limit: int = 100
    ) -> List[WorkspaceMember]:
        """List workspace members."""
        query = (
            select(WorkspaceMember)
            .options(joinedload(WorkspaceMember.user))
            .where(WorkspaceMember.workspace_id == workspace_id)
            .order_by(WorkspaceMember.joined_at.desc())
            .offset(skip)
            .limit(limit)
        )

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def add_member(
        db: AsyncSession,
        workspace_id: int,
        inviter_id: int,
        invite_data: WorkspaceMemberInvite,
    ) -> Optional[WorkspaceMember]:
        """Add member to workspace (requires manage_members permission)."""
        # Check permission
        inviter = await WorkspaceService.get_member(db, workspace_id, inviter_id)
        if not inviter or not inviter.can_manage_members:
            return None

        # Check if already a member
        existing = await WorkspaceService.get_member(
            db, workspace_id, invite_data.user_id
        )
        if existing:
            return None

        member = WorkspaceMember(
            workspace_id=workspace_id,
            user_id=invite_data.user_id,
            role=invite_data.role,
            can_create_collections=invite_data.can_create_collections,
            can_edit_workspace=invite_data.can_edit_workspace,
            can_manage_members=invite_data.can_manage_members,
        )
        db.add(member)
        await db.commit()
        await db.refresh(member)
        return member

    @staticmethod
    async def update_member(
        db: AsyncSession,
        workspace_id: int,
        member_user_id: int,
        updater_id: int,
        update_data: WorkspaceMemberUpdate,
    ) -> Optional[WorkspaceMember]:
        """Update member permissions (requires manage_members permission)."""
        # Check permission
        updater = await WorkspaceService.get_member(db, workspace_id, updater_id)
        if not updater or not updater.can_manage_members:
            return None

        member = await WorkspaceService.get_member(db, workspace_id, member_user_id)
        if not member:
            return None

        # Can't modify owner
        if member.role == WorkspaceRole.OWNER:
            return None

        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(member, field, value)

        await db.commit()
        await db.refresh(member)
        return member

    @staticmethod
    async def remove_member(
        db: AsyncSession, workspace_id: int, member_user_id: int, remover_id: int
    ) -> bool:
        """Remove member from workspace."""
        # Check permission
        remover = await WorkspaceService.get_member(db, workspace_id, remover_id)
        if not remover or not remover.can_manage_members:
            return False

        member = await WorkspaceService.get_member(db, workspace_id, member_user_id)
        if not member:
            return False

        # Can't remove owner
        if member.role == WorkspaceRole.OWNER:
            return False

        await db.delete(member)
        await db.commit()
        return True

    @staticmethod
    async def get_member_count(db: AsyncSession, workspace_id: int) -> int:
        """Get member count for workspace."""
        result = await db.execute(
            select(func.count(WorkspaceMember.id)).where(
                WorkspaceMember.workspace_id == workspace_id
            )
        )
        return result.scalar() or 0

    @staticmethod
    async def get_collection_count(db: AsyncSession, workspace_id: int) -> int:
        """Get collection count for workspace."""
        result = await db.execute(
            select(func.count(WorkspaceCollection.id)).where(
                WorkspaceCollection.workspace_id == workspace_id
            )
        )
        return result.scalar() or 0

    @staticmethod
    async def create_personal_workspace(
        db: AsyncSession, user_id: int, username: str
    ) -> Workspace:
        """Create a personal workspace for a new user."""
        workspace_data = WorkspaceCreate(
            name=f"{username}'s Workspace",
            description="Your personal workspace",
            type=WorkspaceType.PERSONAL,
            visibility=WorkspaceVisibility.PRIVATE,
        )
        return await WorkspaceService.create_workspace(db, user_id, workspace_data)

    @staticmethod
    async def create_collection(
        db: AsyncSession,
        workspace_id: int,
        user_id: int,
        collection_data: WorkspaceCollectionCreate,
    ) -> Optional[WorkspaceCollection]:
        """Create a collection in workspace."""
        # Check permission
        member = await WorkspaceService.get_member(db, workspace_id, user_id)
        if not member or not member.can_create_collections:
            return None

        collection = WorkspaceCollection(
            workspace_id=workspace_id,
            name=collection_data.name,
            description=collection_data.description,
            status=collection_data.status,
            created_by=user_id,
        )
        db.add(collection)
        await db.commit()
        await db.refresh(collection)
        return collection

    @staticmethod
    async def list_collections(
        db: AsyncSession, workspace_id: int, skip: int = 0, limit: int = 100
    ) -> List[WorkspaceCollection]:
        """List collections in workspace."""
        query = (
            select(WorkspaceCollection)
            .where(WorkspaceCollection.workspace_id == workspace_id)
            .order_by(WorkspaceCollection.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_collection(
        db: AsyncSession,
        collection_id: int,
        user_id: int,
        collection_data: WorkspaceCollectionUpdate,
    ) -> Optional[WorkspaceCollection]:
        """Update a collection."""
        result = await db.execute(
            select(WorkspaceCollection).where(WorkspaceCollection.id == collection_id)
        )
        collection = result.scalar_one_or_none()
        if not collection:
            return None

        # Check permission
        member = await WorkspaceService.get_member(db, collection.workspace_id, user_id)
        if not member or not member.can_create_collections:
            return None

        # Update fields
        update_dict = collection_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(collection, field, value)

        collection.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(collection)
        return collection

    @staticmethod
    async def delete_collection(
        db: AsyncSession, collection_id: int, user_id: int
    ) -> bool:
        """Delete a collection."""
        result = await db.execute(
            select(WorkspaceCollection).where(WorkspaceCollection.id == collection_id)
        )
        collection = result.scalar_one_or_none()
        if not collection:
            return False

        # Check permission (creator or workspace editor)
        member = await WorkspaceService.get_member(db, collection.workspace_id, user_id)
        if not member:
            return False

        if collection.created_by != user_id and not member.can_edit_workspace:
            return False

        await db.delete(collection)
        await db.commit()
        return True

    # Collection Item methods
    @staticmethod
    async def add_item_to_collection(
        db: AsyncSession,
        workspace_id: int,
        collection_id: int,
        user_id: int,
        item_data: CollectionItemCreate,
    ) -> Optional[CollectionItem]:
        """Add an item to a collection."""
        # Check collection exists and belongs to workspace
        result = await db.execute(
            select(WorkspaceCollection).where(
                and_(
                    WorkspaceCollection.id == collection_id,
                    WorkspaceCollection.workspace_id == workspace_id,
                )
            )
        )
        collection = result.scalar_one_or_none()
        if not collection:
            return None

        # Check user permission
        member = await WorkspaceService.get_member(db, workspace_id, user_id)
        if not member or not member.can_create_collections:
            return None

        # Check if item already exists in collection
        existing = await db.execute(
            select(CollectionItem).where(
                and_(
                    CollectionItem.collection_id == collection_id,
                    CollectionItem.item_type == item_data.item_type,
                    CollectionItem.item_id == item_data.item_id,
                )
            )
        )
        if existing.scalar_one_or_none():
            return None  # Already in collection

        # Create collection item
        item = CollectionItem(
            collection_id=collection_id,
            item_type=item_data.item_type,
            item_id=item_data.item_id,
            note=item_data.note,
            added_by=user_id,
        )

        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def get_collection_items(
        db: AsyncSession, workspace_id: int, collection_id: int, user_id: int
    ) -> List[CollectionItem]:
        """Get all items in a collection."""
        # Check collection exists and belongs to workspace
        result = await db.execute(
            select(WorkspaceCollection).where(
                and_(
                    WorkspaceCollection.id == collection_id,
                    WorkspaceCollection.workspace_id == workspace_id,
                )
            )
        )
        collection = result.scalar_one_or_none()
        if not collection:
            return []

        # Check user has access to workspace
        member = await WorkspaceService.get_member(db, workspace_id, user_id)
        if not member:
            return []

        # Get all items
        result = await db.execute(
            select(CollectionItem)
            .where(CollectionItem.collection_id == collection_id)
            .order_by(CollectionItem.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def remove_item_from_collection(
        db: AsyncSession,
        workspace_id: int,
        collection_id: int,
        item_id: int,
        user_id: int,
    ) -> bool:
        """Remove an item from a collection."""
        # Check collection exists and belongs to workspace
        result = await db.execute(
            select(WorkspaceCollection).where(
                and_(
                    WorkspaceCollection.id == collection_id,
                    WorkspaceCollection.workspace_id == workspace_id,
                )
            )
        )
        collection = result.scalar_one_or_none()
        if not collection:
            return False

        # Check user permission
        member = await WorkspaceService.get_member(db, workspace_id, user_id)
        if not member or not member.can_create_collections:
            return False

        # Get and delete item
        result = await db.execute(
            select(CollectionItem).where(CollectionItem.id == item_id)
        )
        item = result.scalar_one_or_none()
        if not item or item.collection_id != collection_id:
            return False

        await db.delete(item)
        await db.commit()
        return True
