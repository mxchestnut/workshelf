"""
Phase 4 Feedback & Collaboration Models
Models for comments, beta reading, groups, and messaging
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum, JSON, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.models.base import Base, TimestampMixin


# ============================================================================
# Comments & Reactions
# ============================================================================

class Comment(Base, TimestampMixin):
    """
    Comments on documents
    Supports threaded replies and inline anchoring
    """
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Document being commented on
    document_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Comment author
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Comment content
    content = Column(Text, nullable=False)
    
    # Threading support
    parent_id = Column(Integer, ForeignKey('comments.id', ondelete='CASCADE'), nullable=True, index=True)
    
    # Inline comment anchor (text selection info)
    anchor = Column(JSON, nullable=True)  # {start, end, text}
    
    # Edit tracking
    is_edited = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    document = relationship("Document", back_populates="comments")
    user = relationship("User", back_populates="comments")
    reactions = relationship("CommentReaction", back_populates="comment", cascade="all, delete-orphan")
    
    # Self-referential for threading
    # The parent relationship uses remote_side=[id] - this makes parent the "many" side
    # The replies relationship is the "one" side and can use cascade delete-orphan
    parent = relationship("Comment", remote_side=[id], back_populates="replies", foreign_keys=[parent_id])
    replies = relationship("Comment", back_populates="parent", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_document_comments', 'document_id', 'created_at'),
        Index('idx_user_comments', 'user_id', 'created_at'),
    )


class CommentReaction(Base, TimestampMixin):
    """
    Reactions to comments (emoji-style reactions)
    """
    __tablename__ = "comment_reactions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    comment_id = Column(Integer, ForeignKey('comments.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    reaction_type = Column(String(50), nullable=False)  # emoji or reaction name
    
    # Relationships
    comment = relationship("Comment", back_populates="reactions")
    user = relationship("User", back_populates="comment_reactions")
    
    __table_args__ = (
        Index('idx_comment_user_reaction', 'comment_id', 'user_id', 'reaction_type', unique=True),
    )


# ============================================================================
# Beta Reading
# ============================================================================

class BetaRequestStatus(enum.Enum):
    """Beta reading request status."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class BetaRequest(Base, TimestampMixin):
    """
    Beta reading requests from authors to readers
    """
    __tablename__ = "beta_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Document being beta read
    document_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Author making the request
    author_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Beta reader
    reader_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Request details
    message = Column(Text, nullable=True)
    status = Column(SQLEnum(BetaRequestStatus), nullable=False, default=BetaRequestStatus.PENDING)
    deadline = Column(DateTime(timezone=True), nullable=True)
    
    # Completion tracking
    completed_at = Column(DateTime(timezone=True), nullable=True)
    feedback_document_id = Column(Integer, ForeignKey('documents.id', ondelete='SET NULL'), nullable=True)
    
    # Relationships
    document = relationship("Document", foreign_keys=[document_id], back_populates="beta_requests")
    author = relationship("User", foreign_keys=[author_id], back_populates="beta_requests_sent")
    reader = relationship("User", foreign_keys=[reader_id], back_populates="beta_requests_received")
    feedback_document = relationship("Document", foreign_keys=[feedback_document_id], viewonly=True)
    __table_args__ = (
        Index('idx_reader_status', 'reader_id', 'status'),
        Index('idx_author_status', 'author_id', 'status'),
    )


class BetaFeedback(Base, TimestampMixin):
    """
    Structured feedback from beta readers
    """
    __tablename__ = "beta_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    
    beta_request_id = Column(Integer, ForeignKey('beta_requests.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Feedback content
    overall_impression = Column(Text, nullable=True)
    pacing_notes = Column(Text, nullable=True)
    character_notes = Column(Text, nullable=True)
    plot_notes = Column(Text, nullable=True)
    technical_notes = Column(Text, nullable=True)
    
    # Structured ratings (1-5)
    rating_overall = Column(Integer, nullable=True)
    rating_pacing = Column(Integer, nullable=True)
    rating_characters = Column(Integer, nullable=True)
    rating_plot = Column(Integer, nullable=True)
    rating_writing = Column(Integer, nullable=True)
    
    # Relationship
    beta_request = relationship("BetaRequest")


# ============================================================================
# Groups & Communities
# ============================================================================

class GroupPrivacyType(enum.Enum):
    """Group privacy levels."""
    PUBLIC = "public"
    PRIVATE = "private"
    UNLISTED = "unlisted"


class GroupMemberRole(enum.Enum):
    """Group member roles."""
    OWNER = "owner"
    ADMIN = "admin"
    MODERATOR = "moderator"
    MEMBER = "member"


class Group(Base, TimestampMixin):
    """
    Writing groups and communities
    """
    __tablename__ = "groups"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Group identity
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    tags = Column(JSON, nullable=True)
    rules = Column(Text, nullable=True)
    
    # Settings
    is_public = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Admin approval for custom subdomains
    subdomain_requested = Column(String(100), nullable=True, index=True)  # Requested subdomain (e.g., 'writers')
    subdomain_approved = Column(Boolean, default=False, nullable=False)
    subdomain_approved_at = Column(DateTime(timezone=True), nullable=True)
    subdomain_approved_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    subdomain_rejection_reason = Column(Text, nullable=True)
    
    # Custom domain capability (unlocked when subdomain approved)
    can_use_custom_domain = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    posts = relationship("GroupPost", back_populates="group", cascade="all, delete-orphan")
    custom_domains = relationship("GroupCustomDomain", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base, TimestampMixin):
    """
    Group membership and roles
    """
    __tablename__ = "group_members"
    
    id = Column(Integer, primary_key=True, index=True)
    
    group_id = Column(Integer, ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    role = Column(SQLEnum(GroupMemberRole), nullable=False, default=GroupMemberRole.MEMBER)
    
    # Relationships
    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="group_memberships")
    
    __table_args__ = (
        Index('idx_group_user', 'group_id', 'user_id', unique=True),
    )


class GroupPost(Base, TimestampMixin):
    """
    Posts within groups
    """
    __tablename__ = "group_posts"
    
    id = Column(Integer, primary_key=True, index=True)
    
    group_id = Column(Integer, ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    
    is_pinned = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    group = relationship("Group", back_populates="posts")
    author = relationship("User", back_populates="group_posts")
    reactions = relationship("GroupPostReaction", back_populates="post", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_group_posts', 'group_id', 'created_at'),
    )


class GroupPostReaction(Base, TimestampMixin):
    """
    Reactions to group posts
    """
    __tablename__ = "group_post_reactions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    post_id = Column(Integer, ForeignKey('group_posts.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    reaction_type = Column(String(50), nullable=False)
    
    # Relationships
    post = relationship("GroupPost", back_populates="reactions")
    user = relationship("User")
    
    __table_args__ = (
        Index('idx_post_user_reaction', 'post_id', 'user_id', 'reaction_type', unique=True),
    )


# ============================================================================
# Messaging
# ============================================================================

class MessageThreadType(enum.Enum):
    """Message thread types."""
    DIRECT = "direct"
    GROUP = "group"


class MessageThread(Base, TimestampMixin):
    """
    Message conversation threads
    """
    __tablename__ = "message_threads"
    
    id = Column(Integer, primary_key=True, index=True)
    
    thread_type = Column(SQLEnum(MessageThreadType), nullable=False, default=MessageThreadType.DIRECT)
    title = Column(String(255), nullable=True)  # For group threads
    
    # Relationships
    participants = relationship("MessageThreadParticipant", back_populates="thread", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="thread", cascade="all, delete-orphan")


class MessageThreadParticipant(Base, TimestampMixin):
    """
    Participants in message threads
    """
    __tablename__ = "message_thread_participants"
    
    id = Column(Integer, primary_key=True, index=True)
    
    thread_id = Column(Integer, ForeignKey('message_threads.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Read tracking
    last_read_at = Column(DateTime(timezone=True), nullable=True)
    is_archived = Column(Boolean, default=False, nullable=False)
    is_muted = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    thread = relationship("MessageThread", back_populates="participants")
    user = relationship("User")
    
    __table_args__ = (
        Index('idx_thread_user', 'thread_id', 'user_id', unique=True),
    )


class Message(Base, TimestampMixin):
    """
    Individual messages in threads
    """
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    
    thread_id = Column(Integer, ForeignKey('message_threads.id', ondelete='CASCADE'), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    content = Column(Text, nullable=False)
    
    # Edit/delete tracking
    is_edited = Column(Boolean, default=False, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    thread = relationship("MessageThread", back_populates="messages")
    sender = relationship("User")
    
    __table_args__ = (
        Index('idx_thread_messages', 'thread_id', 'created_at'),
    )


class GroupCustomDomain(Base, TimestampMixin):
    """
    Group Custom Domain - Custom domain mappings for groups
    Allows groups to use their own domain (e.g., hieroscope.com) instead of subdomain
    """
    __tablename__ = "group_custom_domains"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Domain info
    domain = Column(String(255), nullable=False, unique=True, index=True)  # e.g., 'hieroscope.com'
    
    # Status tracking
    status = Column(String(50), nullable=False, default='pending', index=True)  # pending, approved, rejected, active
    dns_verified = Column(Boolean, default=False, nullable=False)
    dns_verification_token = Column(String(255), nullable=True)  # Token for DNS verification
    ssl_status = Column(String(50), nullable=True)  # pending, active, failed
    
    # Approval tracking
    requested_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.utcnow())
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Relationships
    group = relationship("Group", back_populates="custom_domains")
    approver = relationship("User", foreign_keys=[approved_by])
    
    def __repr__(self):
        return f"<GroupCustomDomain(domain='{self.domain}', status='{self.status}')>"
