"""
Database models for Work Shelf
AUTO-GENERATED from existing model files
"""

from app.models.base import Base

from app.models.advanced import (
    IntegrityCheckType,
    IntegrityCheckStatus,
    IntegrityCheck,
    ExportFormat,
    ExportStatus,
    ExportType,
    ExportJob,
)
from app.models.ai_templates import (
    AIGeneratedTemplate,
    TemplateInterestMapping,
    AIGenerationLog,
)
from app.models.author import (
    Author,
    AuthorEdit,
    UserFollowsAuthor,
)
from app.models.book_suggestion import (
    SuggestionStatus,
    BookSuggestion,
)
from app.models.vault import (
    ArticleType,
    ArticleStatus,
    Article,
)
from app.models.collaboration import (
    ReaderRole,
    WriterReaderRelationship,
    Comment,
    CommentReaction,
    ModerationActionType,
    ModerationAction,
    BetaRequestStatus,
    BetaRequest,
    BetaFeedback,
    BetaReaderAppointment,
    BetaRelease,
    GroupPrivacyType,
    GroupMemberRole,
    PrivacyLevel,
    Group,
    GroupFollower,
    GroupMember,
    GroupPost,
    GroupPostReaction,
    GroupRole,
    GroupMemberCustomRole,
    MessageThreadType,
    MessageThread,
    MessageThreadParticipant,
    Message,
    GroupCustomDomain,
    ScholarshipRequest,
    GroupInvitationStatus,
    GroupInvitation,
)
from app.models.collection import (
    CollectionItemType,
    Collection,
    CollectionItem,
)
from app.models.document import (
    DocumentStatus,
    DocumentMode,
    DocumentVisibility,
    CollaboratorRole,
    Document,
    DocumentVersion,
    DocumentCollaborator,
    Tag,
    DocumentTag,
)
from app.models.epub_submission import (
    SubmissionStatus,
    EpubSubmission,
    VerificationLog,
)
from app.models.folder import (
    Folder,
)
from app.models.frozen_username import (
    FrozenUsername,
)
from app.models.group_analytics import (
    GroupAnalytics,
)
from app.models.group_customization import (
    GroupTheme,
)
from app.models.invitation import (
    InvitationStatus,
    Invitation,
)
from app.models.monetization import (
    SubscriptionTierType,
    BillingInterval,
    SubscriptionTier,
    SubscriptionStatus,
    Subscription,
    PaymentStatus,
    Payment,
    CreatorEarnings,
    PayoutStatus,
    Payout,
)
from app.models.page_tracking import (
    PageStatus,
    PageVersion,
    UserPageView,
)
from app.models.project import (
    Project,
)
from app.models.reading import (
    Bookmark,
    ReadingList,
    ReadingListItem,
    ReadingProgress,
    Category,
)
from app.models.role import (
    Permission,
    Role,
    RolePermission,
    UserRole,
)
from app.models.social import (
    UserFollow,
    ShareLink,
    NotificationType,
    Notification,
    ActivityEventType,
    ActivityEvent,
)
from app.models.store import (
    StoreItemStatus,
    PurchaseStatus,
    StoreItem,
    Purchase,
    AuthorEarnings,
    AudiobookSubmissionStatus,
    AudiobookSubmission,
)
from app.models.studio import (
    StudioMemberRole,
    Studio,
    StudioMember,
)
from app.models.studio_customization import (
    StudioTheme,
    StudioCustomDomain,
    DocumentView,
    StudioAnalytics,
)
from app.models.tags import (
    ContentTag,
    PostTag,
)
from app.models.templates import (
    ProjectTemplate,
    TemplateSection,
    TemplateSearch,
)
from app.models.tenant import (
    Tenant,
    TenantSettings,
)
from app.models.user import (
    User,
    UserProfile,
    UserBadge,
    BetaReaderReview,
    BetaReaderProfile,
)

__all__ = [
    "AIGeneratedTemplate",
    "AIGenerationLog",
    "ActivityEvent",
    "ActivityEventType",
    "AudiobookSubmission",
    "AudiobookSubmissionStatus",
    "Author",
    "AuthorEarnings",
    "AuthorEdit",
    "Base",
    "BetaFeedback",
    "BetaReaderAppointment",
    "BetaReaderProfile",
    "BetaReaderReview",
    "BetaRelease",
    "BetaRequest",
    "BetaRequestStatus",
    "BillingInterval",
    "BookSuggestion",
    "Bookmark",
    "BookshelfItem",
    "BookshelfItemType",
    "BookshelfStatus",
    "Category",
    "CollaboratorRole",
    "Collection",
    "CollectionItem",
    "CollectionItemType",
    "Comment",
    "CommentReaction",
    "ContentTag",
    "CreatorEarnings",
    "DiceRoll",
    "DiceSystem",
    "Document",
    "DocumentCollaborator",
    "DocumentMode",
    "DocumentStatus",
    "DocumentTag",
    "DocumentVersion",
    "DocumentView",
    "DocumentVisibility",
    "EpubSubmission",
    "ExportFormat",
    "ExportJob",
    "ExportStatus",
    "ExportType",
    "Folder",
    "FrozenUsername",
    "Group",
    "GroupAnalytics",
    "GroupCustomDomain",
    "GroupFollower",
    "GroupInvitation",
    "GroupInvitationStatus",
    "GroupMember",
    "GroupMemberCustomRole",
    "GroupMemberRole",
    "GroupPost",
    "GroupPostReaction",
    "GroupPrivacyType",
    "GroupRole",
    "GroupTheme",
    "IntegrityCheck",
    "IntegrityCheckStatus",
    "IntegrityCheckType",
    "Invitation",
    "InvitationStatus",
    "LoreEntry",
    "Message",
    "MessageThread",
    "MessageThreadParticipant",
    "MessageThreadType",
    "ModerationAction",
    "ModerationActionType",
    "Notification",
    "NotificationType",
    "PageStatus",
    "PageVersion",
    "PassageReaction",
    "Payment",
    "PaymentStatus",
    "Payout",
    "PayoutStatus",
    "Permission",
    "PostTag",
    "PostingOrder",
    "PrivacyLevel",
    "Project",
    "ProjectTemplate",
    "Purchase",
    "PurchaseStatus",
    "ReaderRole",
    "ReadingList",
    "ReadingListItem",
    "ReadingProgress",
    "Role",
    "RolePermission",
    "ScholarshipRequest",
    "ShareLink",
    "StoreItem",
    "StoreItemStatus",
    "Studio",
    "StudioAnalytics",
    "StudioCustomDomain",
    "StudioMember",
    "StudioMemberRole",
    "StudioTheme",
    "SubmissionStatus",
    "Subscription",
    "SubscriptionStatus",
    "SubscriptionTier",
    "SubscriptionTierType",
    "SuggestionStatus",
    "Tag",
    "TemplateInterestMapping",
    "TemplateSearch",
    "TemplateSection",
    "Tenant",
    "TenantSettings",
    "User",
    "UserBadge",
    "UserFollow",
    "UserFollowsAuthor",
    "UserPageView",
    "UserProfile",
    "UserRole",
    "VerificationLog",
    "WriterReaderRelationship",
]
