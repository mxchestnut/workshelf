"""
User Models
Users belong to tenants and can have multiple roles
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    JSON,
    ARRAY,
)
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin, TenantMixin


class User(Base, TimestampMixin, TenantMixin):
    """
    User account within a tenant
    Integrated with Keycloak for authentication
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # Authentication integration (supporting both Keycloak and Azure AD during migration)
    keycloak_id = Column(
        String(255), unique=True, index=True, nullable=True
    )  # Legacy Keycloak ID
    azure_object_id = Column(
        String(255), unique=True, index=True, nullable=True
    )  # Microsoft Entra ID object ID

    # Basic info
    email = Column(String(255), nullable=False, index=True)
    username = Column(
        String(100), nullable=True, index=True
    )  # Nullable - set during onboarding
    display_name = Column(String(255))
    phone_number = Column(
        String(20), unique=True, index=True, nullable=True
    )  # E.164 format: +1234567890

    # Registration preferences
    newsletter_opt_in = Column(Boolean, default=False, nullable=False)
    sms_opt_in = Column(Boolean, default=False, nullable=False)
    house_rules_accepted = Column(Boolean, default=False, nullable=False)
    birth_year = Column(Integer, nullable=True)  # For age verification (18+)
    interests = Column(
        ARRAY(String), nullable=True
    )  # User interests for group suggestions

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_staff = Column(Boolean, default=False, nullable=False)
    is_approved = Column(
        Boolean, default=False, nullable=False
    )  # Staff must approve new registrations

    # Reputation Scores (1-5 scale)
    reading_score = Column(
        Integer, default=0, nullable=False
    )  # Based on book reviews quality/quantity
    beta_score = Column(
        Integer, default=0, nullable=False
    )  # Based on beta reading feedback quality
    writer_score = Column(
        Integer, default=0, nullable=False
    )  # Based on beta writer reviews, feedback received

    # Account dates
    last_login = Column(DateTime(timezone=True))

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    profile = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    badges = relationship(
        "UserBadge", back_populates="user", cascade="all, delete-orphan"
    )
    roles = relationship(
        "UserRole", back_populates="user", cascade="all, delete-orphan"
    )
    documents = relationship(
        "Document", back_populates="owner", cascade="all, delete-orphan"
    )
    document_collaborations = relationship(
        "DocumentCollaborator",
        back_populates="user",
        foreign_keys="DocumentCollaborator.user_id",
        cascade="all, delete-orphan",
    )
    studio_memberships = relationship(
        "StudioMember",
        back_populates="user",
        foreign_keys="StudioMember.user_id",
        cascade="all, delete-orphan",
    )
    tags = relationship("Tag", back_populates="user", cascade="all, delete-orphan")
    projects = relationship(
        "Project", back_populates="user", cascade="all, delete-orphan"
    )
    folders = relationship(
        "Folder", back_populates="user", cascade="all, delete-orphan"
    )

    # Phase 2: Social relationships
    following = relationship(
        "UserFollow",
        foreign_keys="UserFollow.follower_id",
        back_populates="follower",
        cascade="all, delete-orphan",
    )
    followers = relationship(
        "UserFollow",
        foreign_keys="UserFollow.following_id",
        back_populates="following",
        cascade="all, delete-orphan",
    )
    notifications = relationship(
        "Notification",
        foreign_keys="Notification.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    activity_events = relationship(
        "ActivityEvent", back_populates="user", cascade="all, delete-orphan"
    )

    # Phase 3: Reading & Discovery
    bookmarks = relationship(
        "Bookmark", back_populates="user", cascade="all, delete-orphan"
    )
    reading_lists = relationship(
        "ReadingList", back_populates="user", cascade="all, delete-orphan"
    )
    reading_progress = relationship(
        "ReadingProgress", back_populates="user", cascade="all, delete-orphan"
    )
    vault_articles = relationship(
        "Article", back_populates="user", cascade="all, delete-orphan"
    )
    book_suggestions = relationship(
        "BookSuggestion",
        foreign_keys="BookSuggestion.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    # author_follows replaced by UserFollowsAuthor in author.py (consolidated system)
    epub_submissions = relationship(
        "EpubSubmission",
        foreign_keys="EpubSubmission.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    store_items = relationship(
        "StoreItem",
        foreign_keys="StoreItem.seller_id",
        back_populates="seller",
        cascade="all, delete-orphan",
    )
    purchases = relationship(
        "Purchase", back_populates="user", cascade="all, delete-orphan"
    )

    # Collaboration
    comments = relationship(
        "Comment", back_populates="user", cascade="all, delete-orphan"
    )
    comment_reactions = relationship(
        "CommentReaction", back_populates="user", cascade="all, delete-orphan"
    )
    beta_requests_sent = relationship(
        "BetaRequest",
        foreign_keys="BetaRequest.author_id",
        back_populates="author",
        cascade="all, delete-orphan",
    )
    beta_requests_received = relationship(
        "BetaRequest",
        foreign_keys="BetaRequest.reader_id",
        back_populates="reader",
        cascade="all, delete-orphan",
    )
    group_memberships = relationship(
        "GroupMember", back_populates="user", cascade="all, delete-orphan"
    )
    group_posts = relationship(
        "GroupPost", back_populates="author", cascade="all, delete-orphan"
    )
    group_follows = relationship(
        "GroupFollower", back_populates="user", cascade="all, delete-orphan"
    )
    messages_sent = relationship(
        "Message", back_populates="sender", cascade="all, delete-orphan"
    )

    # Writer-Reader relationships (alpha/beta readers)
    my_readers = relationship(
        "WriterReaderRelationship",
        foreign_keys="WriterReaderRelationship.writer_id",
        back_populates="writer",
        cascade="all, delete-orphan",
    )
    reading_for_writers = relationship(
        "WriterReaderRelationship",
        foreign_keys="WriterReaderRelationship.reader_id",
        back_populates="reader",
        cascade="all, delete-orphan",
    )

    # Bookmark folders (renamed from collections)
    bookmark_folders = relationship(
        "BookmarkFolder", back_populates="user", cascade="all, delete-orphan"
    )

    # Workspaces
    owned_workspaces = relationship(
        "Workspace", back_populates="owner", cascade="all, delete-orphan"
    )
    workspace_memberships = relationship(
        "WorkspaceMember", back_populates="user", cascade="all, delete-orphan"
    )

    # Phase 6: Monetization
    subscriptions = relationship(
        "Subscription", back_populates="user", cascade="all, delete-orphan"
    )
    payments = relationship(
        "Payment", back_populates="user", cascade="all, delete-orphan"
    )
    creator_earnings = relationship(
        "CreatorEarnings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # Phase 7: Advanced Features
    integrity_checks = relationship(
        "IntegrityCheck", back_populates="user", cascade="all, delete-orphan"
    )
    export_jobs = relationship(
        "ExportJob", back_populates="user", cascade="all, delete-orphan"
    )
    accessibility_settings = Column(JSON, nullable=True)  # Flexible A11y settings

    # Matrix messaging credentials
    matrix_user_id = Column(String(255), unique=True, index=True, nullable=True)
    matrix_access_token = Column(Text, nullable=True)
    matrix_homeserver = Column(String(255), nullable=True)
    matrix_onboarding_seen = Column(
        Boolean, default=False, nullable=False
    )  # Track if user has seen Matrix explanation

    # Unique constraint: email must be unique within a tenant
    __table_args__ = ({"schema": None},)  # Will add unique constraint in migration

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"


class UserProfile(Base, TimestampMixin):
    """
    Extended user profile information
    """

    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )

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
    profile_visibility = Column(
        String(20), default="public"
    )  # public, private, followers
    show_email = Column(Boolean, default=False)

    # Notifications
    email_notifications = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="profile")

    def __repr__(self):
        return f"<UserProfile(user_id={self.user_id})>"


class UserBadge(Base, TimestampMixin):
    """
    Badges earned by users for achievements
    """

    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Badge type and details
    badge_type = Column(
        String(50), nullable=False
    )  # AUTHOR, SOCIAL_MILESTONE, BETA_MASTER, etc.
    badge_name = Column(
        String(100), nullable=False
    )  # "Published Author", "100 Followers", etc.
    badge_description = Column(Text)
    badge_icon = Column(String(500))  # URL or icon identifier

    # Achievement details
    earned_for = Column(String(255))  # What specifically earned this badge
    milestone_value = Column(Integer)  # e.g., 100 for "100 followers"

    # Metadata
    is_visible = Column(Boolean, default=True, nullable=False)  # User can hide badges
    display_order = Column(Integer, default=0)  # For sorting on profile

    # Relationships
    user = relationship("User", back_populates="badges")

    __table_args__ = ({"schema": None},)

    def __repr__(self):
        return f"<UserBadge(user_id={self.user_id}, badge='{self.badge_name}')>"


class BetaReaderReview(Base, TimestampMixin):
    """
    Reviews of beta readers by authors (for beta_score calculation)
    """

    __tablename__ = "beta_reader_reviews"

    id = Column(Integer, primary_key=True, index=True)
    beta_request_id = Column(
        Integer,
        ForeignKey("beta_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )  # Author who is reviewing
    beta_reader_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )  # Beta reader being reviewed

    # Review content
    rating = Column(Integer, nullable=False)  # 1-5 stars
    review_text = Column(Text)

    # Specific feedback categories
    feedback_quality = Column(Integer)  # 1-5: How useful was the feedback?
    communication = Column(Integer)  # 1-5: How was their communication?
    timeliness = Column(Integer)  # 1-5: Did they meet deadlines?
    professionalism = Column(Integer)  # 1-5: How professional were they?

    # Metadata
    would_work_again = Column(Boolean, default=True)
    is_public = Column(Boolean, default=True)  # Show on beta reader's profile

    # Relationships
    beta_request = relationship("BetaRequest", foreign_keys=[beta_request_id])
    author = relationship("User", foreign_keys=[author_id])
    beta_reader = relationship("User", foreign_keys=[beta_reader_id])

    __table_args__ = ({"schema": None},)

    def __repr__(self):
        return f"<BetaReaderReview(beta_reader_id={self.beta_reader_id}, rating={self.rating})>"


class BetaReaderProfile(Base, TimestampMixin):
    """
    Professional profile for beta readers to showcase their services
    Acts as a resume/portfolio for the beta reader marketplace
    """

    __tablename__ = "beta_reader_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Availability status
    availability = Column(
        String(20), default="available", nullable=False
    )  # available, busy, not_accepting

    # Professional details
    bio = Column(Text)  # About me, experience, what I offer
    genres = Column(ARRAY(String), nullable=True)  # Genres they specialize in
    specialties = Column(
        ARRAY(String), nullable=True
    )  # e.g., ["plot holes", "character development", "pacing"]

    # Pricing (nullable = open to free work)
    hourly_rate = Column(Integer, nullable=True)  # Cents (e.g., 2500 = $25.00/hour)
    per_word_rate = Column(
        Integer, nullable=True
    )  # Cents per word (e.g., 5 = $0.05/word)
    per_manuscript_rate = Column(Integer, nullable=True)  # Flat rate in cents

    # Capacity & turnaround
    turnaround_days = Column(Integer, nullable=True)  # Average days to complete
    max_concurrent_projects = Column(Integer, default=3)  # How many projects at once

    # Portfolio links
    portfolio_links = Column(JSON, nullable=True)  # Array of {title, url, description}

    # Contact preferences
    preferred_contact = Column(String(50), default="platform")  # platform, email, other

    # Visibility
    is_active = Column(Boolean, default=True)  # Show in marketplace
    is_featured = Column(
        Boolean, default=False
    )  # Featured beta readers (admin can set)

    # Stats (auto-calculated)
    total_projects_completed = Column(Integer, default=0)
    average_rating = Column(Integer, default=0)  # Cached from BetaReaderReview

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = ({"schema": None},)

    def __repr__(self):
        return f"<BetaReaderProfile(user_id={self.user_id}, availability={self.availability})>"
