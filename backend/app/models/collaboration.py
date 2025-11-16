"""
Phase 4 Feedback & Collaboration Models
Models for comments, beta reading, groups, and messaging
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum, JSON, Index, Numeric, ARRAY
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


class CommentReaction(Base, TimestampMixin):
    """Reactions to comments (like, love, etc.)"""
    __tablename__ = "comment_reactions"
    
    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey('comments.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    reaction_type = Column(String(50), nullable=False)  # 'like', 'love', 'laugh', etc.
    
    # Relationships
    comment = relationship("Comment", back_populates="reactions")
    user = relationship("User")
    
    __table_args__ = (
        Index('idx_comment_reactions', 'comment_id', 'user_id', unique=True),
    )


# ============================================================================
# Moderation Audit Log
# ============================================================================

class ModerationActionType(enum.Enum):
    """Types of moderation actions."""
    DELETE_POST = "delete_post"
    DELETE_COMMENT = "delete_comment"
    PIN_POST = "pin_post"
    UNPIN_POST = "unpin_post"
    LOCK_THREAD = "lock_thread"
    UNLOCK_THREAD = "unlock_thread"
    BAN_MEMBER = "ban_member"
    KICK_MEMBER = "kick_member"
    WARN_MEMBER = "warn_member"


class ModerationAction(Base, TimestampMixin):
    """
    Audit log for moderation actions
    Tracks who did what, when, and why
    """
    __tablename__ = "moderation_actions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Which group this action occurred in
    group_id = Column(Integer, ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Who performed the action
    moderator_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # What type of action
    action_type = Column(SQLEnum(ModerationActionType), nullable=False, index=True)
    
    # Target of the action
    target_type = Column(String(50), nullable=True)  # 'post', 'comment', 'member'
    target_id = Column(Integer, nullable=True)  # ID of the post/comment/member
    target_user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)  # If action targets a user
    
    # Optional reason/notes
    reason = Column(Text, nullable=True)
    
    # Additional context (JSON for flexibility)
    action_metadata = Column(JSON, nullable=True)  # e.g., {"post_title": "...", "comment_text": "..."}
    
    # Relationships
    group = relationship("Group")
    moderator = relationship("User", foreign_keys=[moderator_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
    
    __table_args__ = (
        Index('idx_moderation_group_date', 'group_id', 'created_at'),
        Index('idx_moderation_moderator', 'moderator_id', 'created_at'),
        Index('idx_moderation_action_type', 'action_type', 'created_at'),
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


class BetaReaderAppointment(Base, TimestampMixin):
    """
    Writers can appoint trusted beta readers for ongoing collaboration.
    This is separate from one-off beta requests - it's a trusted relationship.
    """
    __tablename__ = "beta_reader_appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Writer appointing the beta reader
    writer_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Beta reader being appointed
    beta_reader_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Status
    status = Column(String(20), nullable=False, default='active')  # active, inactive, removed
    
    # Optional: Give the appointment a title/description
    appointment_title = Column(String(255), nullable=True)  # e.g., "Primary Beta Reader", "Genre Expert"
    notes = Column(Text, nullable=True)  # Private notes from writer
    
    # Stats
    releases_count = Column(Integer, default=0, nullable=False)  # How many documents released to this reader
    completed_reads = Column(Integer, default=0, nullable=False)  # How many they've finished
    
    # Relationships
    writer = relationship("User", foreign_keys=[writer_id])
    beta_reader = relationship("User", foreign_keys=[beta_reader_id])
    releases = relationship("BetaRelease", back_populates="appointment", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_writer_beta_reader', 'writer_id', 'beta_reader_id', unique=True),
        Index('idx_beta_reader_active', 'beta_reader_id', 'status'),
    )


class BetaRelease(Base, TimestampMixin):
    """
    A specific document released to a beta reader.
    Beta readers see these in their feed.
    """
    __tablename__ = "beta_releases"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # The appointment this release is part of
    appointment_id = Column(Integer, ForeignKey('beta_reader_appointments.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Document being released
    document_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Release details
    release_message = Column(Text, nullable=True)  # Message from writer to beta reader
    release_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Optional deadline
    deadline = Column(DateTime, nullable=True)
    
    # Reading status
    status = Column(String(20), nullable=False, default='unread')  # unread, reading, completed
    started_reading_at = Column(DateTime, nullable=True)
    completed_reading_at = Column(DateTime, nullable=True)
    
    # Feedback tracking
    feedback_submitted = Column(Boolean, default=False, nullable=False)
    feedback_submitted_at = Column(DateTime, nullable=True)
    
    # Relationships
    appointment = relationship("BetaReaderAppointment", back_populates="releases")
    document = relationship("Document")
    
    __table_args__ = (
        Index('idx_beta_reader_feed', 'appointment_id', 'release_date'),
        Index('idx_document_releases', 'document_id', 'release_date'),
    )


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
    interests = Column(ARRAY(String), nullable=True)  # User-defined interests for AI template generation
    rules = Column(Text, nullable=True)
    
    # Homepage content
    tagline = Column(String(500), nullable=True)  # Short catchy tagline
    hero_image_url = Column(String(500), nullable=True)  # Hero/banner image
    about_page = Column(Text, nullable=True)  # Rich text about page content
    featured_posts = Column(JSON, nullable=True)  # Array of featured post IDs or objects
    
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
    
    # Matrix Space integration
    matrix_space_id = Column(String(255), nullable=True, index=True)  # Matrix Space ID for group chat
    
    # Scholarship/sliding scale
    has_scholarship = Column(Boolean, default=False, nullable=False)
    scholarship_plan = Column(String(50), nullable=True)  # 'free', 'basic', 'pro', 'custom'
    scholarship_discount_percent = Column(Integer, nullable=True)  # 0-100
    scholarship_monthly_price = Column(Numeric(10, 2), nullable=True)
    scholarship_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    posts = relationship("GroupPost", back_populates="group", cascade="all, delete-orphan")
    custom_domains = relationship("GroupCustomDomain", back_populates="group", cascade="all, delete-orphan")
    scholarship_requests = relationship("ScholarshipRequest", back_populates="group", cascade="all, delete-orphan")
    custom_roles = relationship("GroupRole", back_populates="group", cascade="all, delete-orphan")
    theme = relationship("GroupTheme", back_populates="group", uselist=False, cascade="all, delete-orphan")
    followers = relationship("GroupFollower", back_populates="group", cascade="all, delete-orphan")
    analytics = relationship("GroupAnalytics", back_populates="group", cascade="all, delete-orphan")


class GroupFollower(Base, TimestampMixin):
    """
    Group follower relationships
    Users can follow groups without being members to stay updated
    """
    __tablename__ = "group_followers"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Group being followed
    group_id = Column(Integer, ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # User who is following
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Is the follow active (can be muted without unfollowing)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    group = relationship("Group", back_populates="followers")
    user = relationship("User", back_populates="group_follows")
    
    __table_args__ = (
        Index('idx_group_follower', 'group_id', 'user_id', unique=True),
        Index('idx_group_followers_active', 'group_id', 'is_active'),
    )


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
    custom_roles = relationship("GroupMemberCustomRole", back_populates="group_member", cascade="all, delete-orphan")
    
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
    is_locked = Column(Boolean, default=False, nullable=False)
    
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
# Custom Group Roles (Discord-style)
# ============================================================================

class GroupRole(Base, TimestampMixin):
    """
    Custom roles for groups with granular permissions
    Similar to Discord's role system
    """
    __tablename__ = "group_roles"
    
    id = Column(Integer, primary_key=True, index=True)
    
    group_id = Column(Integer, ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Role identity
    name = Column(String(100), nullable=False)
    color = Column(String(7), nullable=True)  # Hex color code (e.g., '#FF5733')
    position = Column(Integer, default=0, nullable=False)  # Hierarchy (higher = more power)
    
    # Permissions (JSON object with boolean flags)
    # Content moderation
    can_delete_posts = Column(Boolean, default=False, nullable=False)
    can_delete_comments = Column(Boolean, default=False, nullable=False)
    can_pin_posts = Column(Boolean, default=False, nullable=False)
    can_lock_threads = Column(Boolean, default=False, nullable=False)
    can_manage_tags = Column(Boolean, default=False, nullable=False)
    
    # Member management
    can_approve_members = Column(Boolean, default=False, nullable=False)
    can_kick_members = Column(Boolean, default=False, nullable=False)
    can_ban_members = Column(Boolean, default=False, nullable=False)
    can_invite_members = Column(Boolean, default=False, nullable=False)
    can_view_member_list = Column(Boolean, default=True, nullable=False)
    
    # Publishing
    can_approve_publications = Column(Boolean, default=False, nullable=False)
    can_edit_publications = Column(Boolean, default=False, nullable=False)
    can_feature_publications = Column(Boolean, default=False, nullable=False)
    
    # Settings
    can_edit_group_info = Column(Boolean, default=False, nullable=False)
    can_manage_roles = Column(Boolean, default=False, nullable=False)
    can_view_analytics = Column(Boolean, default=False, nullable=False)
    can_export_data = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    group = relationship("Group", back_populates="custom_roles")
    member_roles = relationship("GroupMemberCustomRole", back_populates="role", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_group_roles', 'group_id', 'position'),
    )


class GroupMemberCustomRole(Base, TimestampMixin):
    """
    Assignment of custom roles to group members
    A member can have multiple custom roles
    """
    __tablename__ = "group_member_custom_roles"
    
    id = Column(Integer, primary_key=True, index=True)
    
    group_member_id = Column(Integer, ForeignKey('group_members.id', ondelete='CASCADE'), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey('group_roles.id', ondelete='CASCADE'), nullable=False, index=True)
    
    assigned_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # Relationships
    group_member = relationship("GroupMember", back_populates="custom_roles")
    role = relationship("GroupRole", back_populates="member_roles")
    assigner = relationship("User", foreign_keys=[assigned_by])
    
    __table_args__ = (
        Index('idx_member_role', 'group_member_id', 'role_id', unique=True),
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
    
    __table_args__ = (
        Index('idx_custom_domain_group', 'group_id'),
        Index('idx_custom_domain_verified', 'dns_verified'),
    )
    
    def __repr__(self):
        return f"<GroupCustomDomain(domain='{self.domain}', status='{self.status}')>"


class ScholarshipRequest(Base, TimestampMixin):
    """
    Scholarship and sliding scale payment requests for groups
    """
    __tablename__ = "scholarship_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    
    group_id = Column(Integer, ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Request details
    status = Column(String(50), nullable=False, default='pending', index=True)  # pending, approved, rejected, negotiating
    request_type = Column(String(50), nullable=False)  # 'free', 'sliding_scale'
    
    # Application questions
    current_financial_situation = Column(Text, nullable=False)
    why_important = Column(Text, nullable=False)
    how_will_use = Column(Text, nullable=False)
    additional_info = Column(Text, nullable=True)
    monthly_budget = Column(Numeric(10, 2), nullable=True)  # What they can afford per month
    
    # Staff decision
    approved_plan = Column(String(50), nullable=True)  # 'free', 'basic', 'pro', 'custom'
    approved_discount_percent = Column(Integer, nullable=True)  # 0-100
    approved_monthly_price = Column(Numeric(10, 2), nullable=True)
    staff_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Timestamps
    requested_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.utcnow())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # When scholarship expires (e.g., 1 year)
    
    # Relationships
    group = relationship("Group", back_populates="scholarship_requests")
    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    
    def __repr__(self):
        return f"<ScholarshipRequest(group_id={self.group_id}, status='{self.status}', type='{self.request_type}')>"


# ============================================================================
# Group Invitations
# ============================================================================

class GroupInvitationStatus(enum.Enum):
    """Status of group invitation"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"
    REVOKED = "revoked"


class GroupInvitation(Base, TimestampMixin):
    """
    Group member invitations - send email invites to join a group
    """
    __tablename__ = "group_invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Group and invitee
    group_id = Column(Integer, ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    
    # Invitation details
    token = Column(String(100), unique=True, nullable=False, index=True)  # Unique token for the invitation link
    invited_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    role = Column(SQLEnum(GroupMemberRole), nullable=False, default=GroupMemberRole.MEMBER)
    message = Column(Text, nullable=True)  # Optional personal message from inviter
    
    # Status tracking
    status = Column(SQLEnum(GroupInvitationStatus), nullable=False, default=GroupInvitationStatus.PENDING, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Acceptance tracking
    accepted_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    group = relationship("Group")
    inviter = relationship("User", foreign_keys=[invited_by])
    accepter = relationship("User", foreign_keys=[accepted_by])
    
    __table_args__ = (
        Index('idx_group_invitations_group_email', 'group_id', 'email'),
        Index('idx_group_invitations_status', 'status', 'expires_at'),
    )
    
    def __repr__(self):
        return f"<GroupInvitation(email='{self.email}', group_id={self.group_id}, status='{self.status.value}')>"


