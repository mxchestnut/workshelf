"""
Author Follows Model - DEPRECATED
=================================

⚠️ DEPRECATED: This model has been consolidated into the Author + UserFollowsAuthor system.
See: app/models/author.py

This file is kept temporarily for reference during migration.
After migration a57f855a8f73 runs successfully, this file can be deleted.

Migration Strategy:
- AuthorFollow.author_name → Author.name (normalized, central table)
- AuthorFollow.is_favorite → UserFollowsAuthor.is_favorite
- AuthorFollow.status → UserFollowsAuthor.status
- AuthorFollow.notes → UserFollowsAuthor.notes
- AuthorFollow.discovery_source → UserFollowsAuthor.discovery_source

OLD: Track authors/creators users are interested in or following (denormalized, per-user)
NEW: Use Author table (normalized) + UserFollowsAuthor (relationship tracking)
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum

from app.models.base import Base, TimestampMixin


class AuthorFollowStatus(str, Enum):
    """Author follow status - similar to book reading status"""
    READING = "reading"  # Currently reading their work
    READ = "read"  # Have read their work
    WANT_TO_READ = "want-to-read"  # Want to explore
    FAVORITES = "favorites"  # All-time favorite author


class AuthorFollow(Base, TimestampMixin):
    """
    Track authors/creators that users follow or are interested in
    
    Similar to bookshelf but focused on authors rather than individual books.
    Helps with:
    - Tracking favorite authors
    - Discovery recommendations based on author preferences
    - Auto-suggesting books from favorite authors
    - Understanding user's literary tastes
    """
    __tablename__ = "author_follows"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User who follows this author
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Author information
    author_name = Column(String(500), nullable=False, index=True)
    author_bio = Column(Text, nullable=True)
    author_photo_url = Column(String(1000), nullable=True)
    author_website = Column(String(500), nullable=True)
    genres = Column(ARRAY(String), nullable=True)  # Genres this author writes in
    
    # User's relationship with author
    status = Column(String(20), nullable=False, default="want-to-read", index=True)
    is_favorite = Column(Boolean, default=False, index=True)
    notes = Column(Text, nullable=True)  # Private notes about this author
    discovery_source = Column(String(100), nullable=True)  # e.g., "bookshelf", "ai-recommendation", "friend"
    
    # When did they add this author?
    added_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="author_follows")
    
    # Constraints and indexes
    __table_args__ = (
        # Each user can only follow an author once
        CheckConstraint(
            "status IN ('reading', 'read', 'want-to-read', 'favorites')",
            name='check_author_follow_status'
        ),
        # Prevent duplicate author follows
        Index('idx_author_follows_user_author', 'user_id', 'author_name', unique=True),
    )
