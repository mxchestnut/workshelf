"""
Schemas package
Pydantic models for API validation
"""
from app.schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentListResponse,
    DocumentDetail,
    DocumentStatus,
    DocumentVisibility
)
from app.schemas.monetization import (
    # Subscription Tier Schemas
    SubscriptionTierBase,
    SubscriptionTierResponse,
    # Subscription Schemas
    SubscriptionCreate,
    SubscriptionUpdateTier,
    SubscriptionCancel,
    SubscriptionResponse,
    # Payment Schemas
    PaymentResponse,
    # Creator Earnings Schemas
    CreatorEarningsResponse,
    # Payout Schemas
    PayoutRequest,
    PayoutResponse,
    # Stripe Webhook Schemas
    StripeWebhookEvent
)
from app.schemas.roleplay import (
    # Roleplay Project Schemas
    RoleplayProjectCreate,
    RoleplayProjectUpdate,
    RoleplayProjectResponse,
    # Character Schemas
    CharacterCreate,
    CharacterUpdate,
    CharacterResponse,
    # Scene Schemas
    SceneCreate,
    SceneUpdate,
    SceneResponse,
    # Passage Schemas
    PassageCreate,
    PassageUpdate,
    PassageResponse,
    PassageReactionCreate,
    PassageReactionResponse,
    # Lore Schemas
    LoreEntryCreate,
    LoreEntryUpdate,
    LoreEntryResponse,
    # Dice Roll Schemas
    DiceRollRequest,
    DiceRollResponse,
    # Compile Schemas
    CompileRequest,
    CompileResponse,
    # List/Filter Params
    PassageListParams,
    CharacterListParams,
    LoreEntryListParams
)

__all__ = [
    "DocumentCreate",
    "DocumentUpdate",
    "DocumentResponse",
    "DocumentListResponse",
    "DocumentDetail",
    "DocumentStatus",
    "DocumentVisibility",
    # Phase 6: Monetization
    "SubscriptionTierBase",
    "SubscriptionTierResponse",
    "SubscriptionCreate",
    "SubscriptionUpdateTier",
    "SubscriptionCancel",
    "SubscriptionResponse",
    "PaymentResponse",
    "CreatorEarningsResponse",
    "PayoutRequest",
    "PayoutResponse",
    "StripeWebhookEvent",
    # Roleplay Studio
    "RoleplayProjectCreate",
    "RoleplayProjectUpdate",
    "RoleplayProjectResponse",
    "CharacterCreate",
    "CharacterUpdate",
    "CharacterResponse",
    "SceneCreate",
    "SceneUpdate",
    "SceneResponse",
    "PassageCreate",
    "PassageUpdate",
    "PassageResponse",
    "PassageReactionCreate",
    "PassageReactionResponse",
    "LoreEntryCreate",
    "LoreEntryUpdate",
    "LoreEntryResponse",
    "DiceRollRequest",
    "DiceRollResponse",
    "CompileRequest",
    "CompileResponse",
    "PassageListParams",
    "CharacterListParams",
    "LoreEntryListParams"
]
