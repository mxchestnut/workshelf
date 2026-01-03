"""
Bookmark Folders - Universal bookmarking system for any content type
Users can create named folders and save posts, ebooks, documents, etc. to read later
Renamed from 'collections' to avoid conflict with workspace collections
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Text,
    Index,
    Enum as SQLEnum,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
import enum

from app.models.base import Base, TimestampMixin


class BookmarkItemType(str, enum.Enum):
    """Types of items that can be saved to bookmark folders"""

    POST = "post"  # GroupPost
    DOCUMENT = "document"  # Document
    EBOOK = "ebook"  # Future: EpubSubmission or StoreItem
    AUTHOR = "author"  # Author profile
    GROUP = "group"  # Group
    USER = "user"  # User profile
    ARTICLE = "article"  # Future: blog posts, articles
    # Extensible for future content types


class BookmarkFolder(Base, TimestampMixin):
    """
    User-created bookmark folders for organizing saved content to read later
    Like browser bookmarks folders or Pinterest boards
    Renamed from Collection to avoid conflict with workspace collections
    """

    __tablename__ = "bookmark_folders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_public = Column(
        Integer, default=0
    )  # 0=private, 1=public (future: share folders)

    # Relationships
    user = relationship("User", back_populates="bookmark_folders")
    items = relationship(
        "BookmarkFolderItem", back_populates="folder", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("idx_user_bookmark_folders", "user_id", "created_at"),)

    def __repr__(self):
        return f"<BookmarkFolder(id={self.id}, user_id={self.user_id}, name='{self.name}')>"


class BookmarkFolderItem(Base, TimestampMixin):
    """
    Items saved to a bookmark folder
    Polymorphic - can reference any content type via item_type + item_id
    """

    __tablename__ = "bookmark_folder_items"

    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(
        Integer,
        ForeignKey("bookmark_folders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Polymorphic reference
    item_type = Column(SQLEnum(BookmarkItemType), nullable=False)
    item_id = Column(Integer, nullable=False)  # ID of the post/document/ebook/etc.

    # Optional: user's personal note about this saved item
    note = Column(Text, nullable=True)

    # Relationships
    folder = relationship("BookmarkFolder", back_populates="items")

    __table_args__ = (
        UniqueConstraint(
            "folder_id", "item_type", "item_id", name="uq_bookmark_folder_item"
        ),
        Index("idx_bookmark_folder_items", "folder_id", "created_at"),
        Index("idx_item_lookup", "item_type", "item_id"),
    )

    def __repr__(self):
        return f"<BookmarkFolderItem(id={self.id}, folder_id={self.folder_id}, item_type={self.item_type}, item_id={self.item_id})>"


# Keep old names as aliases for backwards compatibility during transition
Collection = BookmarkFolder
CollectionItem = BookmarkFolderItem
CollectionItemType = BookmarkItemType
