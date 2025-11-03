"""
Phase 2 Social Infrastructure Models
Models for relationships, notifications, sharing, and activity tracking
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.models.base import Base, TimestampMixin


# ============================================================================
# User Relationships
# ============================================================================

class UserFollow(Base, TimestampMixin):
    """
    User follow relationships
    Enables following other users to see their activity
    """
    __tablename__ = "user_follows"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Who is following
    follower_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Who is being followed
    following_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Is the follow active (can be muted without unfollowing)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following = relationship("User", foreign_keys=[following_id], back_populates="followers")
    
    def __repr__(self):
        return f"<UserFollow(follower={self.follower_id}, following={self.following_id})>"


# ============================================================================
# Sharing & Permissions
# ============================================================================

class ShareLink(Base, TimestampMixin):
    """
    Shareable links for documents
    Enables public/private sharing with expiration
    """
    __tablename__ = "share_links"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Document being shared
    document_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Creator of the link
    created_by = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Unique share token/slug
    token = Column(String(50), unique=True, nullable=False, index=True)
    
    # Optional password protection
    password_hash = Column(String(255), nullable=True)
    
    # Expiration
    expires_at = Column(DateTime, nullable=True)
    
    # Access control
    is_active = Column(Boolean, default=True, nullable=False)
    allow_downloads = Column(Boolean, default=True, nullable=False)
    allow_comments = Column(Boolean, default=False, nullable=False)
    
    # Analytics
    view_count = Column(Integer, default=0)
    last_accessed_at = Column(DateTime, nullable=True)
    
    # Relationships
    document = relationship("Document", back_populates="share_links")
    creator = relationship("User")
    
    def __repr__(self):
        return f"<ShareLink(token={self.token}, document_id={self.document_id})>"


# ============================================================================
# Notifications
# ============================================================================

class NotificationType(str, enum.Enum):
    """Notification types"""
    FOLLOW = "follow"  # Someone followed you
    COMMENT = "comment"  # Comment on your document
    MENTION = "mention"  # You were mentioned
    LIKE = "like"  # Someone liked your content
    SHARE = "share"  # Your document was shared
    COLLABORATION_INVITE = "collaboration_invite"  # Invited to collaborate
    BETA_REQUEST = "beta_request"  # Beta reading request
    SYSTEM = "system"  # System notifications


class Notification(Base, TimestampMixin):
    """
    User notifications
    Generic notification system for all features
    """
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Recipient
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Notification details
    type = Column(SQLEnum(NotificationType), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Related entity (polymorphic)
    entity_type = Column(String(50), nullable=True)  # document, user, comment, etc.
    entity_id = Column(Integer, nullable=True)
    
    # Link to take action
    action_url = Column(String(500), nullable=True)
    
    # State
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True)
    
    # Actor (who triggered the notification)
    actor_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # Additional data (JSON) - using 'extra_data' to avoid SQLAlchemy reserved 'metadata'
    extra_data = Column('metadata', JSON, nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="notifications")
    actor = relationship("User", foreign_keys=[actor_id])
    
    def __repr__(self):
        return f"<Notification(id={self.id}, type={self.type}, user_id={self.user_id}, read={self.is_read})>"


# ============================================================================
# Activity Tracking
# ============================================================================

class ActivityEventType(str, enum.Enum):
    """Activity event types"""
    DOCUMENT_CREATED = "document_created"
    DOCUMENT_PUBLISHED = "document_published"
    DOCUMENT_UPDATED = "document_updated"
    DOCUMENT_SHARED = "document_shared"
    USER_FOLLOWED = "user_followed"
    PROJECT_CREATED = "project_created"
    COMMENT_ADDED = "comment_added"
    COLLABORATION_STARTED = "collaboration_started"
    MILESTONE_REACHED = "milestone_reached"


class ActivityEvent(Base, TimestampMixin):
    """
    Activity event log
    Tracks user activities for feeds and discovery
    """
    __tablename__ = "activity_events"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Actor (who did the action)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Event details
    event_type = Column(SQLEnum(ActivityEventType), nullable=False, index=True)
    description = Column(Text, nullable=False)
    
    # Related entity (polymorphic)
    entity_type = Column(String(50), nullable=False)  # document, project, etc.
    entity_id = Column(Integer, nullable=False)
    
    # Visibility
    is_public = Column(Boolean, default=True, nullable=False, index=True)
    
    # Additional data (JSON) - using 'extra_data' to avoid SQLAlchemy reserved 'metadata'
    extra_data = Column('metadata', JSON, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="activity_events")
    
    def __repr__(self):
        return f"<ActivityEvent(id={self.id}, type={self.event_type}, user_id={self.user_id})>"
