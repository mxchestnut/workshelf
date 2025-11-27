"""
Subscription and payment schemas.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum
from decimal import Decimal


class SubscriptionTier(str, Enum):
    """Subscription tiers."""
    FREE = "free"
    READER = "reader"
    CREATOR = "creator"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class BillingInterval(str, Enum):
    """Billing intervals."""
    MONTHLY = "monthly"
    YEARLY = "yearly"


class PaymentStatus(str, Enum):
    """Payment status."""
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"


class SubscriptionCreate(BaseModel):
    """Create/upgrade subscription."""
    tier: SubscriptionTier
    interval: BillingInterval = BillingInterval.MONTHLY
    payment_method_id: str  # Stripe payment method


class SubscriptionResponse(BaseModel):
    """Subscription details."""
    id: str
    user_id: str
    tier: SubscriptionTier
    interval: BillingInterval
    status: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    stripe_subscription_id: Optional[str]

    class Config:
        from_attributes = True


class PaymentHistoryItem(BaseModel):
    """Payment history item."""
    id: str
    amount: Decimal
    currency: str
    status: PaymentStatus
    description: str
    created_at: datetime
    invoice_url: Optional[str]


class CreatorEarnings(BaseModel):
    """Creator earnings summary."""
    total_earned: Decimal
    pending_payout: Decimal
    last_payout: Optional[Decimal]
    last_payout_date: Optional[datetime]
    subscriber_count: int
    monthly_recurring_revenue: Decimal


class PayoutRequest(BaseModel):
    """Request a payout."""
    amount: Decimal = Field(..., gt=0)
    method: str  # stripe, paypal, etc.
