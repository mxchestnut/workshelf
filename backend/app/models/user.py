"""
User Models
Users belong to tenants and can have multiple roles
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin, TenantMixin


class User(Base, TimestampMixin, TenantMixin):
    """
    User account within a tenant
    Integrated with Keycloak for authentication
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Keycloak integration
    keycloak_id = Column(String(255), unique=True, index=True, nullable=False)
    
    # Basic info
    email = Column(String(255), nullable=False, index=True)
    username = Column(String(100), nullable=True, index=True)  # Nullable - set during onboarding
    display_name = Column(String(255))
    phone_number = Column(String(20), unique=True, index=True, nullable=True)  # E.164 format: +1234567890
    
    # Registration preferences
    newsletter_opt_in = Column(Boolean, default=False, nullable=False)
    sms_opt_in = Column(Boolean, default=False, nullable=False)
    house_rules_accepted = Column(Boolean, default=False, nullable=False)
    birth_year = Column(Integer, nullable=True)  # For age verification (18+)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_staff = Column(Boolean, default=False, nullable=False)
    
    # Account dates
    last_login = Column(DateTime)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    document_collaborations = relationship("DocumentCollaborator", back_populates="user", foreign_keys="DocumentCollaborator.user_id", cascade="all, delete-orphan")
    studio_memberships = relationship("StudioMember", back_populates="user", foreign_keys="StudioMember.user_id", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="user", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    folders = relationship("Folder", back_populates="user", cascade="all, delete-orphan")
    
    # Phase 2: Social relationships
    following = relationship("UserFollow", foreign_keys="UserFollow.follower_id", back_populates="follower", cascade="all, delete-orphan")
    followers = relationship("UserFollow", foreign_keys="UserFollow.following_id", back_populates="following", cascade="all, delete-orphan")
    notifications = relationship("Notification", foreign_keys="Notification.user_id", back_populates="user", cascade="all, delete-orphan")
    activity_events = relationship("ActivityEvent", back_populates="user", cascade="all, delete-orphan")
    
    # Phase 3: Reading & Discovery
    bookmarks = relationship("Bookmark", back_populates="user", cascade="all, delete-orphan")
    reading_lists = relationship("ReadingList", back_populates="user", cascade="all, delete-orphan")
    reading_progress = relationship("ReadingProgress", back_populates="user", cascade="all, delete-orphan")
    
    # Phase 4: Collaboration
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    comment_reactions = relationship("CommentReaction", back_populates="user", cascade="all, delete-orphan")
    beta_requests_sent = relationship("BetaRequest", foreign_keys="BetaRequest.author_id", back_populates="author", cascade="all, delete-orphan")
    beta_requests_received = relationship("BetaRequest", foreign_keys="BetaRequest.reader_id", back_populates="reader", cascade="all, delete-orphan")
    group_memberships = relationship("GroupMember", back_populates="user", cascade="all, delete-orphan")
    group_posts = relationship("GroupPost", back_populates="author", cascade="all, delete-orphan")
    messages_sent = relationship("Message", back_populates="sender", cascade="all, delete-orphan")
    
    # Phase 6: Monetization
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    creator_earnings = relationship("CreatorEarnings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    # Phase 7: Advanced Features
    integrity_checks = relationship("IntegrityCheck", back_populates="user", cascade="all, delete-orphan")
    export_jobs = relationship("ExportJob", back_populates="user", cascade="all, delete-orphan")
    accessibility_settings = Column(JSON, nullable=True)  # Flexible A11y settings
    
    # Unique constraint: email must be unique within a tenant
    __table_args__ = (
        {'schema': None},  # Will add unique constraint in migration
    )
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"


class UserProfile(Base, TimestampMixin):
    """
    Extended user profile information
    """
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    
    # Profile info
    bio = Column(Text)
    avatar_url = Column(String(500))
    website = Column(String(500))
    location = Column(String(255))
    
    # Social links
    twitter_handle = Column(String(100))
    github_handle = Column(String(100))
    
    # Preferences
    timezone = Column(String(50), default="UTC")
    language = Column(String(10), default="en")
    theme = Column(String(20), default="system")  # light, dark, system
    
    # Privacy settings
    profile_visibility = Column(String(20), default="public")  # public, private, followers
    show_email = Column(Boolean, default=False)
    
    # Notifications
    email_notifications = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", back_populates="profile")
    
    def __repr__(self):
        return f"<UserProfile(user_id={self.user_id})>"
