"""
Content tags system models - Simple, fast, flexible
Each content type gets its own join table (avoids polymorphic anti-pattern)
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import TSVECTOR
from app.models.base import Base, TimestampMixin


class Tag(Base, TimestampMixin):
    """
    Universal tags for content (posts, ebooks, articles, etc.)
    Simple design: just name, slug, usage count, full-text search
    """
    __tablename__ = "content_tags"  # Renamed to avoid conflict with document tags table
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    
    # Usage tracking
    usage_count = Column(Integer, default=0, nullable=False, index=True)
    
    # Full-text search (auto-updated by PostgreSQL trigger)
    search_vector = Column(TSVECTOR, nullable=True)
    
    # Relationships (each content type gets its own join table)
    post_tags = relationship("PostTag", back_populates="tag", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('ix_content_tags_search_vector', 'search_vector', postgresql_using='gin'),
    )


class PostTag(Base):
    """
    Many-to-many relationship between group posts and tags
    Dedicated table (not polymorphic) for performance
    """
    __tablename__ = "post_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey('group_posts.id', ondelete='CASCADE'), nullable=False, index=True)
    tag_id = Column(Integer, ForeignKey('content_tags.id', ondelete='CASCADE'), nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), nullable=False)
    
    # Relationships
    post = relationship("GroupPost", back_populates="post_tags")
    tag = relationship("Tag", back_populates="post_tags")
    
    __table_args__ = (
        UniqueConstraint('post_id', 'tag_id', name='uq_post_tag'),
    )
