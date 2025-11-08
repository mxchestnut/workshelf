"""
Bookshelf Models
Track books and Work Shelf documents in user's personal library
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum

from app.models.base import Base, TimestampMixin


class BookshelfItemType(str, Enum):
    """Type of bookshelf item"""
    DOCUMENT = "document"  # Work Shelf document
    BOOK = "book"  # External book (ISBN)


class BookshelfStatus(str, Enum):
    """Reading status"""
    READING = "reading"  # Currently reading
    READ = "read"  # Finished reading
    WANT_TO_READ = "want-to-read"  # Want to read (TBR pile)
    FAVORITES = "favorites"  # All-time favorites
    DNF = "dnf"  # Did not finish / disliked


class BookshelfItem(Base, TimestampMixin):
    """
    User's bookshelf - tracks both Work Shelf documents and external books
    
    This allows users to:
    - Track books they're reading (like Goodreads)
    - Add Work Shelf documents to their library
    - Rate and review books
    - Organize by reading status (reading, read, want-to-read, favorites, DNF)
    - Display their bookshelf on their public profile
    """
    __tablename__ = "bookshelf_items"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Owner of this bookshelf item
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Item type: 'document' or 'book'
    item_type = Column(String(20), nullable=False)
    
    # ========================================================================
    # For Work Shelf documents (item_type='document')
    # ========================================================================
    document_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), nullable=True, index=True)
    
    # ========================================================================
    # For external books (item_type='book')
    # ========================================================================
    isbn = Column(String(20), nullable=True, index=True)  # ISBN-10 or ISBN-13
    title = Column(String(500), nullable=True)
    author = Column(String(500), nullable=True)  # Keep for backwards compatibility
    author_id = Column(Integer, ForeignKey('authors.id', ondelete='SET NULL'), nullable=True, index=True)  # Link to Author table
    cover_url = Column(String(1000), nullable=True)
    publisher = Column(String(255), nullable=True)
    publish_year = Column(Integer, nullable=True)
    page_count = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    genres = Column(ARRAY(String), nullable=True)
    
    # EPUB reading support
    epub_url = Column(String(1000), nullable=True)  # URL to EPUB file for reading
    reading_progress = Column(Float, nullable=True)  # Percentage read (0-100)
    last_location = Column(String(500), nullable=True)  # EPUB CFI location for resuming
    
    # ========================================================================
    # Reading status and user data (applies to both types)
    # ========================================================================
    status = Column(String(20), nullable=False, index=True)  # reading, read, want-to-read, favorites, dnf
    
    # User's ratings and reviews
    rating = Column(Integer, nullable=True)  # 1-5 stars
    review = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)  # Private notes
    is_favorite = Column(Boolean, default=False, index=True)
    review_public = Column(Boolean, default=True)  # Show review on public profile
    
    # Reading dates
    started_reading = Column(DateTime(timezone=True), nullable=True)
    finished_reading = Column(DateTime(timezone=True), nullable=True)
    added_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # ========================================================================
    # Relationships
    # ========================================================================
    user = relationship("User", back_populates="bookshelf_items")
    document = relationship("Document", back_populates="bookshelf_items")
    
    # ========================================================================
    # Constraints and indexes
    # ========================================================================
    __table_args__ = (
        # Ensure valid item types
        CheckConstraint(
            "(item_type = 'document' AND document_id IS NOT NULL) OR "
            "(item_type = 'book' AND title IS NOT NULL)",
            name='check_bookshelf_item_valid'
        ),
        # Rating must be 1-5 or null
        CheckConstraint(
            "rating IS NULL OR (rating >= 1 AND rating <= 5)",
            name='check_bookshelf_rating_range'
        ),
        # Valid statuses
        CheckConstraint(
            "status IN ('reading', 'read', 'want-to-read', 'favorites', 'dnf')",
            name='check_bookshelf_status'
        ),
        # Indexes
        Index('idx_bookshelf_user_status', 'user_id', 'status'),
        Index('idx_bookshelf_user_favorites', 'user_id', 'is_favorite'),
    )
