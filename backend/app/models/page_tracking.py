"""
Page tracking models for version control and user view tracking
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base


class PageStatus(Base):
    """
    Tracks the overall status of each page
    - construction: Page is under development, not ready for user review
    - ready: Page is ready for review/feedback
    - stable: Page is complete and stable
    """
    __tablename__ = "page_status"

    id = Column(Integer, primary_key=True, index=True)
    page_path = Column(String(255), unique=True, index=True, nullable=False)
    status = Column(String(50), nullable=False, index=True)  # construction, ready, stable
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    versions = relationship("PageVersion", back_populates="page_status", cascade="all, delete-orphan")


class PageVersion(Base):
    """
    Version history for each page with changelog
    Versions follow format: 0.0.01, 0.0.02, etc.
    """
    __tablename__ = "page_versions"

    id = Column(Integer, primary_key=True, index=True)
    page_path = Column(String(255), nullable=False, index=True)
    version = Column(String(20), nullable=False)
    changes = Column(Text, nullable=True)  # Description of what changed
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationship to page status
    page_status = relationship("PageStatus", back_populates="versions", foreign_keys=[page_path], primaryjoin="PageVersion.page_path == PageStatus.page_path")


class UserPageView(Base):
    """
    Tracks when users view pages and mark them as reviewed
    Used to calculate status icons:
    - star-half: New version exists since last view OR page is ready but not marked
    - star: User has marked page as viewed
    - moon-star: No changes since last view
    """
    __tablename__ = "user_page_views"
    __table_args__ = (
        UniqueConstraint('user_id', 'page_path', name='uq_user_page_views_user_page'),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    page_path = Column(String(255), nullable=False, index=True)
    last_viewed_at = Column(DateTime(timezone=True), nullable=True)
    marked_as_viewed = Column(Boolean, nullable=False, default=False)
    marked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship to user
    user = relationship("User", foreign_keys=[user_id])
