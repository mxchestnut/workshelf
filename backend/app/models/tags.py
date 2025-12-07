"""
Content tags system models - AO3-inspired tagging for posts, ebooks, articles
Separate from user document tags
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin


class ContentTagCategory(Base, TimestampMixin):
    """
    Tag categories for organizing content tags (e.g., Rating, Genre, Character)
    Similar to AO3's tag wrangling system
    """
    __tablename__ = "content_tag_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=True)  # Hex color for UI
    icon = Column(String(50), nullable=True)  # Emoji or icon name
    
    # Relationships
    tags = relationship("ContentTag", back_populates="category")


class ContentTag(Base, TimestampMixin):
    """
    Tags that can be applied to posts, ebooks, articles
    Supports tag synonyms via canonical_tag_id
    """
    __tablename__ = "content_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    
    # Categorization
    category_id = Column(Integer, ForeignKey('content_tag_categories.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Usage tracking
    usage_count = Column(Integer, default=0, nullable=False, index=True)
    
    # Tag canonicalization (AO3-style tag wrangling)
    is_canonical = Column(Boolean, default=True, nullable=False)
    canonical_tag_id = Column(Integer, ForeignKey('content_tags.id', ondelete='SET NULL'), nullable=True)
    
    # Creator
    created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # Relationships
    category = relationship("ContentTagCategory", back_populates="tags")
    canonical_tag = relationship("ContentTag", remote_side=[id], foreign_keys=[canonical_tag_id])
    taggables = relationship("ContentTaggable", back_populates="tag", cascade="all, delete-orphan")


class ContentTaggable(Base):
    """
    Polymorphic join table for tagging posts, ebooks, articles
    """
    __tablename__ = "content_taggables"
    
    id = Column(Integer, primary_key=True, index=True)
    tag_id = Column(Integer, ForeignKey('content_tags.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Polymorphic association
    taggable_type = Column(String(50), nullable=False)  # 'post', 'ebook', 'article'
    taggable_id = Column(Integer, nullable=False)
    
    created_at = Column(DateTime(timezone=True), nullable=False)
    
    # Relationships
    tag = relationship("ContentTag", back_populates="taggables")
    
    __table_args__ = (
        Index('ix_content_taggables_lookup', 'taggable_type', 'taggable_id'),
        Index('ix_content_taggables_unique', 'taggable_type', 'taggable_id', 'tag_id', unique=True),
    )
