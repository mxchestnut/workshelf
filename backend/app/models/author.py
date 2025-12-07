"""Author profile and wiki-style editing models."""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.models.base import Base


class Author(Base):
    """Author profiles with wiki-style bio editing."""
    __tablename__ = "authors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    bio = Column(Text, nullable=True)  # Wiki-editable
    photo_url = Column(String, nullable=True)
    birth_year = Column(Integer, nullable=True)
    death_year = Column(Integer, nullable=True)
    nationality = Column(String, nullable=True)
    website = Column(String, nullable=True)
    social_links = Column(JSONB, nullable=True)  # {twitter, instagram, etc}
    genres = Column(JSONB, nullable=True)  # Primary genres
    awards = Column(JSONB, nullable=True)  # List of awards
    total_books = Column(Integer, default=0)
    total_followers = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    books = relationship("StoreItem", back_populates="author")
    edits = relationship("AuthorEdit", back_populates="author", cascade="all, delete-orphan")
    followers = relationship("UserFollowsAuthor", back_populates="author", cascade="all, delete-orphan")
    earnings = relationship("AuthorEarnings", back_populates="author", cascade="all, delete-orphan")


class AuthorEdit(Base):
    """Revision history for author profile edits with moderation."""
    __tablename__ = "author_edits"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("authors.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name = Column(String, nullable=False)  # bio, photo_url, etc
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=False)
    edit_summary = Column(String, nullable=True)  # User's explanation
    status = Column(String, nullable=False, default="pending", index=True)  # pending, approved, rejected
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    author = relationship("Author", back_populates="edits")
    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class UserFollowsAuthor(Base):
    """Users can follow authors for new release notifications.
    
    Consolidated from old AuthorFollow model - tracks user's relationship with author.
    """
    __tablename__ = "user_follows_authors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("authors.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Follow preferences
    notify_new_releases = Column(Boolean, default=True)
    is_favorite = Column(Boolean, default=False, index=True)  # For recommendations
    
    # Reading status tracking (from old AuthorFollow)
    status = Column(String(20), nullable=False, default="want-to-read", index=True)  # reading, read, want-to-read, favorites
    notes = Column(Text, nullable=True)  # Private notes about this author
    discovery_source = Column(String(100), nullable=True)  # e.g., "bookshelf", "ai-recommendation"
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User")
    author = relationship("Author", back_populates="followers")

    __table_args__ = (
        {'sqlite_autoincrement': True},
    )
