"""
Phase 3 Reading & Discovery Models
Models for bookmarks, reading lists, reading progress, and categories
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, JSON, Float, Index
from sqlalchemy.orm import relationship
from datetime import datetime

from app.models.base import Base, TimestampMixin


# ============================================================================
# Bookmarks
# ============================================================================

class Bookmark(Base, TimestampMixin):
    """
    User bookmarks for documents
    Save documents for later reading
    """
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User who bookmarked
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Document bookmarked
    document_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Optional notes about why bookmarked
    notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="bookmarks")
    document = relationship("Document", back_populates="bookmarks")
    
    # Unique constraint: one bookmark per user per document
    __table_args__ = (
        Index('idx_user_document_bookmark', 'user_id', 'document_id', unique=True),
    )


# ============================================================================
# Reading Lists (Collections of documents)
# ============================================================================

class ReadingList(Base, TimestampMixin):
    """
    User-curated reading lists
    Collections of documents grouped by theme/interest
    """
    __tablename__ = "reading_lists"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Owner of the list
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # List details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="reading_lists")
    items = relationship("ReadingListItem", back_populates="reading_list", cascade="all, delete-orphan")
    
    # Index for finding user's lists
    __table_args__ = (
        Index('idx_user_reading_lists', 'user_id'),
    )


class ReadingListItem(Base, TimestampMixin):
    """
    Items in a reading list
    Join table between reading lists and documents
    """
    __tablename__ = "reading_list_items"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Reading list this belongs to
    reading_list_id = Column(Integer, ForeignKey('reading_lists.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Document in the list
    document_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Order in the list
    position = Column(Integer, default=0, nullable=False)
    
    # Optional notes about this specific document in this list
    notes = Column(Text, nullable=True)
    
    # Relationships
    reading_list = relationship("ReadingList", back_populates="items")
    document = relationship("Document", back_populates="reading_list_items")
    
    # Unique constraint: one document per list
    # Index for ordering
    __table_args__ = (
        Index('idx_reading_list_document', 'reading_list_id', 'document_id', unique=True),
        Index('idx_reading_list_position', 'reading_list_id', 'position'),
    )


# ============================================================================
# Reading Progress
# ============================================================================

class ReadingProgress(Base, TimestampMixin):
    """
    Track user's reading progress through documents
    """
    __tablename__ = "reading_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User reading
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Document being read
    document_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Progress tracking
    progress_percentage = Column(Integer, default=0, nullable=False)  # 0-100
    last_position = Column(JSON, nullable=True)  # Store scroll position, paragraph, etc.
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    last_read = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="reading_progress")
    document = relationship("Document", back_populates="reading_progress")
    
    # Unique constraint: one progress record per user per document
    __table_args__ = (
        Index('idx_user_document_progress', 'user_id', 'document_id', unique=True),
        Index('idx_user_recent_reading', 'user_id', 'last_read'),
    )


# ============================================================================
# Categories (for discovery)
# ============================================================================

class Category(Base, TimestampMixin):
    """
    Content categories for discovery
    """
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Category details
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)  # Icon name or emoji
    
    # Display order
    sort_order = Column(Integer, default=0, nullable=False)
    
    # Metadata
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Index for active categories
    __table_args__ = (
        Index('idx_active_categories', 'is_active', 'sort_order'),
    )
