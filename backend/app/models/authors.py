"""
Author Model - Wiki-style author profiles with collaborative editing
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime

from app.models.base import Base, TimestampMixin


class Author(Base, TimestampMixin):
    """
    Central wiki-style author profile.
    
    Authors can be:
    - Verified users who publish through the platform
    - External authors whose books are available in the store
    - Self-published authors who upload their own work
    
    Bio and details are wiki-editable by the community with moderation.
    """
    __tablename__ = "authors"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Information (wiki-editable)
    name = Column(String(500), nullable=False, unique=True, index=True)
    bio = Column(Text, nullable=True)  # Wiki-editable rich text bio
    photo_url = Column(String(1000), nullable=True)
    birth_year = Column(Integer, nullable=True)  # Wiki-editable
    death_year = Column(Integer, nullable=True)  # Wiki-editable
    nationality = Column(String(200), nullable=True)  # Wiki-editable
    website = Column(String(500), nullable=True)
    social_links = Column(JSONB, nullable=True)  # {twitter: url, instagram: url, ...}
    awards = Column(JSONB, nullable=True)  # List of awards - wiki-editable
    
    # Genre & Writing
    genres = Column(ARRAY(String), nullable=True, index=True)  # Primary genres they write
    books_published = Column(Integer, default=0)  # Count of books published on platform
    
    # Platform Integration
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, unique=True)  # If they're a verified user
    is_verified = Column(Boolean, default=False, index=True)  # Verified author status
    is_bestseller = Column(Boolean, default=False)  # Has bestselling books
    
    # Analytics
    follower_count = Column(Integer, default=0)
    total_sales = Column(Integer, default=0)
    total_views = Column(Integer, default=0)
    
    # Payment Integration (Stripe Connect for author payouts)
    stripe_account_id = Column(String(255), nullable=True, unique=True)  # Stripe Connect account
    payout_enabled = Column(Boolean, default=False)  # Can receive payments
    
    # Metadata
    joined_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])  # The user account if verified
    store_items = relationship("StoreItem", back_populates="author", cascade="all, delete-orphan")
    earnings = relationship("AuthorEarnings", back_populates="author", cascade="all, delete-orphan")
    edits = relationship("AuthorEdit", back_populates="author", cascade="all, delete-orphan")
    followers = relationship("UserFollowsAuthor", back_populates="author", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_authors_verified', 'is_verified', 'name'),
    )


class AuthorEdit(Base, TimestampMixin):
    """
    Revision history for wiki-style author profile edits.
    All edits require moderator approval before going live.
    """
    __tablename__ = "author_edits"
    
    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("authors.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # What was edited
    field_name = Column(String(100), nullable=False)  # bio, photo_url, birth_year, etc
    old_value = Column(Text, nullable=True)  # Previous value (for rollback)
    new_value = Column(Text, nullable=False)  # New value
    edit_summary = Column(String(500), nullable=True)  # User's explanation of the edit
    
    # Moderation
    status = Column(String(20), nullable=False, default="pending", index=True)  # pending, approved, rejected
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Relationships
    author = relationship("Author", back_populates="edits")
    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    
    __table_args__ = (
        Index('idx_author_edits_status', 'status', 'created_at'),
    )


class UserFollowsAuthor(Base, TimestampMixin):
    """
    Simple follow relationship - users can follow authors for notifications.
    This replaces the old AuthorFollow model with a cleaner approach.
    """
    __tablename__ = "user_follows_authors"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("authors.id", ondelete="CASCADE"), nullable=False, index=True)
    notify_new_releases = Column(Boolean, default=True)
    followed_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User")
    author = relationship("Author", back_populates="followers")
    
    __table_args__ = (
        Index('idx_user_follows_authors_unique', 'user_id', 'author_id', unique=True),
    )
