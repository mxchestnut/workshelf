"""
Collections - Universal bookmarking system for any content type
Users can create named collections and save posts, ebooks, documents, etc.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Index, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.models.base import Base, TimestampMixin


class CollectionItemType(str, enum.Enum):
    """Types of items that can be saved to collections"""
    POST = "post"  # GroupPost
    DOCUMENT = "document"  # Document
    EBOOK = "ebook"  # Future: EpubSubmission or StoreItem
    AUTHOR = "author"  # Author profile
    GROUP = "group"  # Group
    USER = "user"  # User profile
    ARTICLE = "article"  # Future: blog posts, articles
    # Extensible for future content types


class Collection(Base, TimestampMixin):
    """
    User-created collections (folders) for organizing saved content
    Like browser bookmarks folders or Pinterest boards
    """
    __tablename__ = "collections"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_public = Column(Integer, default=0)  # 0=private, 1=public (future: share collections)
    
    # Relationships
    user = relationship("User", back_populates="collections")
    items = relationship("CollectionItem", back_populates="collection", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_user_collections', 'user_id', 'created_at'),
    )
    
    def __repr__(self):
        return f"<Collection(id={self.id}, user_id={self.user_id}, name='{self.name}')>"


class CollectionItem(Base, TimestampMixin):
    """
    Items saved to a collection
    Polymorphic - can reference any content type via item_type + item_id
    """
    __tablename__ = "collection_items"
    
    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Polymorphic reference
    item_type = Column(SQLEnum(CollectionItemType), nullable=False)
    item_id = Column(Integer, nullable=False)  # ID of the post/document/ebook/etc.
    
    # Optional: user's personal note about this saved item
    note = Column(Text, nullable=True)
    
    # Relationships
    collection = relationship("Collection", back_populates="items")
    
    __table_args__ = (
        UniqueConstraint('collection_id', 'item_type', 'item_id', name='uq_collection_item'),
        Index('idx_collection_items', 'collection_id', 'created_at'),
        Index('idx_item_lookup', 'item_type', 'item_id'),
    )
    
    def __repr__(self):
        return f"<CollectionItem(id={self.id}, collection_id={self.collection_id}, item_type={self.item_type}, item_id={self.item_id})>"
