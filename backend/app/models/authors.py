"""
Author Model
Represents published authors who may have books in the store
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime

from app.models.base import Base, TimestampMixin


class Author(Base, TimestampMixin):
    """
    Represents an author/creator who may publish books on WorkShelf.
    
    Authors can be:
    - Verified users who publish through the platform
    - External authors whose books are available in the store
    - Self-published authors who upload their own work
    """
    __tablename__ = "authors"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Information
    name = Column(String(500), nullable=False, unique=True, index=True)
    bio = Column(Text, nullable=True)
    photo_url = Column(String(1000), nullable=True)
    website = Column(String(500), nullable=True)
    social_links = Column(ARRAY(String), nullable=True)  # URLs to Twitter, Instagram, etc.
    
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
    
    # Indexes
    __table_args__ = (
        Index('idx_authors_verified', 'is_verified', 'name'),
    )
