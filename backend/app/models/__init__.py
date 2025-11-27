"""
Database models for Work Shelf
Multi-tenant architecture with Row-Level Security
"""
from app.models.base import Base
from app.models.tenant import Tenant, TenantSettings
from app.models.user import User, UserProfile, UserBadge, BetaReaderReview, BetaReaderProfile
from app.models.role import Role, Permission, RolePermission, UserRole
from app.models.document import Document, DocumentVersion, DocumentCollaborator, Tag, DocumentTag
from app.models.studio import Studio, StudioMember
from app.models.project import Project
from app.models.folder import Folder
from app.models.social import UserFollow, ShareLink, Notification, ActivityEvent
from app.models.reading import Bookmark, ReadingList, ReadingListItem, ReadingProgress, Category
from app.models.bookshelf import BookshelfItem  # Personal bookshelf (Goodreads-style)
from app.models.book_suggestion import BookSuggestion, SuggestionStatus  # User book suggestions
from app.models.author import Author, AuthorEdit, UserFollowsAuthor  # Wiki-style author profiles
from app.models.epub_submission import EpubSubmission, VerificationLog, SubmissionStatus  # EPUB uploads
from app.models.store import StoreItem, Purchase, AuthorEarnings, StoreItemStatus, PurchaseStatus  # WorkShelf Store
from app.models.collaboration import (
    Comment, CommentReaction,
    BetaRequest, BetaFeedback, BetaRequestStatus,
    Group, GroupMember, GroupMemberRole, GroupPrivacyType, GroupFollower,
    GroupPost, GroupPostReaction,
    GroupCustomDomain, ScholarshipRequest,
    MessageThread, MessageThreadParticipant, Message, MessageThreadType,
    GroupInvitation, GroupInvitationStatus
)
from app.models.group_customization import GroupTheme
from app.models.group_analytics import GroupAnalytics
from app.models.studio_customization import (
    StudioTheme, StudioCustomDomain,
    DocumentView, StudioAnalytics
)
from app.models.monetization import (
    SubscriptionTier, SubscriptionTierType, BillingInterval,
    Subscription, SubscriptionStatus,
    Payment, PaymentStatus,
    CreatorEarnings, Payout, PayoutStatus
)
from app.models.advanced import (
    IntegrityCheck, IntegrityCheckType, IntegrityCheckStatus,
    ExportJob, ExportFormat, ExportStatus, ExportType
)
from app.models.templates import (
    ProjectTemplate, TemplateSection, TemplateSearch
)
from app.models.ai_templates import (
    AIGeneratedTemplate, TemplateInterestMapping, AIGenerationLog
)

__all__ = [
    "Base",
    "Tenant",
    "TenantSettings",
    "User",
    "UserProfile",
    "Role",
    "Permission",
    "RolePermission",
    "UserRole",
    "Document",
    "DocumentVersion",
    "DocumentCollaborator",
    "Tag",
    "DocumentTag",
    "Studio",
    "StudioMember",
    "Project",
    "Folder",
    # Phase 2: Social
    "UserFollow",
    "ShareLink",
    "Notification",
    "ActivityEvent",
    # Phase 3: Reading & Discovery
    "Bookmark",
    "ReadingList",
    "ReadingListItem",
    "ReadingProgress",
    "Category",
    "BookshelfItem",
    "BookSuggestion",
    "SuggestionStatus",
    "Author",
    "AuthorEdit",
    "UserFollowsAuthor",
    "EpubSubmission",
    "VerificationLog",
    "SubmissionStatus",
    "StoreItem",
    "Purchase",
    "AuthorEarnings",
    "StoreItemStatus",
    "PurchaseStatus",
    # Phase 4: Collaboration
    "Comment",
    "CommentReaction",
    "BetaRequest",
    "BetaFeedback",
    "BetaRequestStatus",
    "Group",
    "GroupMember",
    "GroupMemberRole",
    "GroupPrivacyType",
    "GroupFollower",
    "GroupPost",
    "GroupPostReaction",
    "GroupCustomDomain",
    "ScholarshipRequest",
    "GroupInvitation",
    "GroupInvitationStatus",
    "MessageThread",
    "MessageThreadParticipant",
    "Message",
    "MessageThreadType",
    # Phase 5: Studio Customization & Group Customization
    "GroupTheme",
    "GroupAnalytics",
    "StudioTheme",
    "StudioCustomDomain",
    "DocumentView",
    "StudioAnalytics",
    # Phase 6: Monetization
    "SubscriptionTier",
    "SubscriptionTierType",
    "BillingInterval",
    "Subscription",
    "SubscriptionStatus",
    "Payment",
    "PaymentStatus",
    "CreatorEarnings",
    "Payout",
    "PayoutStatus",
    # Phase 7: Advanced Features
    "IntegrityCheck",
    "IntegrityCheckType",
    "IntegrityCheckStatus",
    "ExportJob",
    "ExportFormat",
    "ExportStatus",
    "ExportType",
    # Templates
    "ProjectTemplate",
    "TemplateSection",
    "TemplateSearch",
    # AI Templates
    "AIGeneratedTemplate",
    "TemplateInterestMapping",
    "AIGenerationLog",
]
