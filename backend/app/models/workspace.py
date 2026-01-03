"""
Workspace Models
Collaborative spaces for creating and managing content before publication
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    Boolean,
    DateTime,
    Enum as SQLEnum,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
import enum

from app.models.base import Base, TimestampMixin


class WorkspaceType(str, enum.Enum):
    """Type of workspace"""

    PERSONAL = "personal"  # Individual user's private workspace
    TEAM = "team"  # Collaborative team workspace
    PROJECT = "project"  # Project-specific workspace


class WorkspaceVisibility(str, enum.Enum):
    """Workspace visibility during content creation"""

    PRIVATE = "private"  # Only members can see
    ORGANIZATION = (
        "organization"  # All users in organization can see (future: multi-tenant)
    )


class WorkspaceRole(str, enum.Enum):
    """Member roles in workspace"""

    OWNER = "owner"  # Full control, can delete workspace
    ADMIN = "admin"  # Can manage members and settings
    EDITOR = "editor"  # Can create and edit content
    VIEWER = "viewer"  # Can only view content


class Workspace(Base, TimestampMixin):
    """
    Collaborative workspace for creating content
    Separate from Groups which are for published content
    """

    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)

    # Identity
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)

    # Type and visibility
    type = Column(SQLEnum(WorkspaceType), nullable=False, index=True)
    visibility = Column(
        SQLEnum(WorkspaceVisibility),
        nullable=False,
        default=WorkspaceVisibility.PRIVATE,
    )

    # Owner
    owner_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="owned_workspaces")
    members = relationship(
        "WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan"
    )
    collections = relationship(
        "WorkspaceCollection", back_populates="workspace", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Workspace(id={self.id}, name='{self.name}', type={self.type})>"


class WorkspaceMember(Base, TimestampMixin):
    """
    Workspace membership with role-based permissions
    """

    __tablename__ = "workspace_members"

    id = Column(Integer, primary_key=True, index=True)

    workspace_id = Column(
        Integer,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    role = Column(SQLEnum(WorkspaceRole), nullable=False, default=WorkspaceRole.EDITOR)

    # Granular permissions (can be customized per member)
    can_create_collections = Column(Boolean, default=True, nullable=False)
    can_edit_workspace = Column(Boolean, default=False, nullable=False)
    can_invite_members = Column(Boolean, default=False, nullable=False)
    can_manage_roles = Column(Boolean, default=False, nullable=False)

    # Relationships
    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspace_memberships")

    __table_args__ = (
        Index("uq_workspace_member", "workspace_id", "user_id", unique=True),
    )

    def __repr__(self):
        return f"<WorkspaceMember(workspace_id={self.workspace_id}, user_id={self.user_id}, role={self.role})>"


class CollectionStatus(str, enum.Enum):
    """Status of collection in workflow"""

    DRAFT = "draft"  # Work in progress
    REVIEW = "review"  # Submitted for review
    PUBLISHED = "published"  # Published to group
    ARCHIVED = "archived"  # Archived/inactive


class CollectionItemType(str, enum.Enum):
    """Types of items that can be added to workspace collections"""

    DOCUMENT = "document"
    POST = "post"
    EBOOK = "ebook"
    PROJECT = "project"


class WorkspaceCollection(Base, TimestampMixin):
    """
    Collections of collaborative content within workspaces
    Different from bookmark folders (which are for saving posts to read later)
    """

    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)

    workspace_id = Column(
        Integer,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Content
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Workflow
    status = Column(
        SQLEnum(CollectionStatus),
        nullable=False,
        default=CollectionStatus.DRAFT,
        index=True,
    )

    # Tracking
    created_by = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    published_at = Column(DateTime(timezone=True), nullable=True)
    published_by = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    workspace = relationship("Workspace", back_populates="collections")
    creator = relationship("User", foreign_keys=[created_by])
    publisher = relationship("User", foreign_keys=[published_by])
    items = relationship("CollectionItem", back_populates="collection", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<WorkspaceCollection(id={self.id}, workspace_id={self.workspace_id}, name='{self.name}', status={self.status})>"


class CollectionItem(Base, TimestampMixin):
    """
    Items within workspace collections (documents, posts, ebooks, projects)
    """

    __tablename__ = "collection_items"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(
        Integer,
        ForeignKey("collections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Polymorphic reference
    item_type = Column(SQLEnum(CollectionItemType), nullable=False)
    item_id = Column(Integer, nullable=False)

    # Optional note about this item
    note = Column(Text, nullable=True)

    # Who added this item
    added_by = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Relationships
    collection = relationship("WorkspaceCollection", back_populates="items")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("collection_id", "item_type", "item_id", name="uq_collection_item"),
        Index("idx_collection_items_lookup", "item_type", "item_id"),
        Index("idx_collection_items_created", "collection_id", "created_at"),
    )

    def __repr__(self):
        return f"<CollectionItem(id={self.id}, collection_id={self.collection_id}, type={self.item_type}, item_id={self.item_id})>"
