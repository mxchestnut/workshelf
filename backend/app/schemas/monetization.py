from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, validator
from decimal import Decimal


# ==================== Subscription Tier Schemas ====================

class SubscriptionTierBase(BaseModel):
    """Base schema for subscription tier"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    monthly_price_cents: int = Field(..., ge=0)
    yearly_price_cents: int = Field(..., ge=0)
    
    # Feature limits
    max_documents: Optional[int] = Field(None, ge=0)
    max_storage_mb: Optional[int] = Field(None, ge=0)
    max_studios: Optional[int] = Field(None, ge=0)
    max_collaborators: Optional[int] = Field(None, ge=0)
    
    # Feature flags
    custom_domains: bool = False
    priority_support: bool = False
    analytics: bool = False
    monetization_enabled: bool = False
    api_access: bool = False


class SubscriptionTierResponse(SubscriptionTierBase):
    """Response schema for subscription tier"""
    id: int
    tier_type: str
    stripe_monthly_price_id: Optional[str] = None
    stripe_yearly_price_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    monthly_price_usd: Decimal = Field(default=Decimal("0.00"))
    yearly_price_usd: Decimal = Field(default=Decimal("0.00"))
    yearly_savings_usd: Decimal = Field(default=Decimal("0.00"))
    
    @validator("monthly_price_usd", pre=False, always=True)
    def compute_monthly_price(cls, v, values):
        if "monthly_price_cents" in values:
            return Decimal(values["monthly_price_cents"]) / 100
        return v
    
    @validator("yearly_price_usd", pre=False, always=True)
    def compute_yearly_price(cls, v, values):
        if "yearly_price_cents" in values:
            return Decimal(values["yearly_price_cents"]) / 100
        return v
    
    @validator("yearly_savings_usd", pre=False, always=True)
    def compute_yearly_savings(cls, v, values):
        if "monthly_price_cents" in values and "yearly_price_cents" in values:
            monthly_total = (Decimal(values["monthly_price_cents"]) * 12) / 100
            yearly = Decimal(values["yearly_price_cents"]) / 100
            return monthly_total - yearly
        return v
    
    class Config:
        from_attributes = True


# ==================== Subscription Schemas ====================

class SubscriptionCreate(BaseModel):
    """Create subscription request"""
    tier_id: int
    interval: str = Field(..., pattern="^(MONTHLY|YEARLY)$")
    payment_method_id: str = Field(..., min_length=1)  # Stripe payment method ID
    trial_days: Optional[int] = Field(None, ge=0, le=90)


class SubscriptionUpdateTier(BaseModel):
    """Update subscription tier request"""
    tier_id: int
    interval: Optional[str] = Field(None, pattern="^(MONTHLY|YEARLY)$")


class SubscriptionCancel(BaseModel):
    """Cancel subscription request"""
    cancel_at_period_end: bool = True
    reason: Optional[str] = Field(None, max_length=500)


class SubscriptionResponse(BaseModel):
    """Response schema for subscription"""
    id: int
    user_id: int
    tier_id: int
    tier: SubscriptionTierResponse
    status: str
    interval: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    canceled_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    is_active: bool = False
    is_trialing: bool = False
    days_until_renewal: Optional[int] = None
    
    @validator("is_active", pre=False, always=True)
    def compute_is_active(cls, v, values):
        return values.get("status") == "ACTIVE"
    
    @validator("is_trialing", pre=False, always=True)
    def compute_is_trialing(cls, v, values):
        return values.get("status") == "TRIALING"
    
    @validator("days_until_renewal", pre=False, always=True)
    def compute_days_until_renewal(cls, v, values):
        if "current_period_end" in values:
            period_end = values["current_period_end"]
            if isinstance(period_end, datetime):
                delta = period_end - datetime.utcnow()
                return max(0, delta.days)
        return None
    
    class Config:
        from_attributes = True


# ==================== Payment Schemas ====================

class PaymentResponse(BaseModel):
    """Response schema for payment"""
    id: int
    user_id: int
    subscription_id: Optional[int] = None
    amount_cents: int
    currency: str
    status: str
    description: Optional[str] = None
    invoice_url: Optional[str] = None
    receipt_url: Optional[str] = None
    paid_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None
    created_at: datetime
    
    # Computed fields
    amount_usd: Decimal = Field(default=Decimal("0.00"))
    
    @validator("amount_usd", pre=False, always=True)
    def compute_amount_usd(cls, v, values):
        if "amount_cents" in values and values.get("currency") == "USD":
            return Decimal(values["amount_cents"]) / 100
        return v
    
    class Config:
        from_attributes = True


# ==================== Creator Earnings Schemas ====================

class CreatorEarningsResponse(BaseModel):
    """Response schema for creator earnings"""
    id: int
    user_id: int
    total_earned_cents: int
    pending_payout_cents: int
    paid_out_cents: int
    subscriber_count: int
    monthly_recurring_revenue_cents: int
    platform_fee_percentage: Decimal
    stripe_connect_enabled: bool
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    total_earned_usd: Decimal = Field(default=Decimal("0.00"))
    pending_payout_usd: Decimal = Field(default=Decimal("0.00"))
    paid_out_usd: Decimal = Field(default=Decimal("0.00"))
    mrr_usd: Decimal = Field(default=Decimal("0.00"))
    available_for_payout_usd: Decimal = Field(default=Decimal("0.00"))
    
    @validator("total_earned_usd", pre=False, always=True)
    def compute_total_earned(cls, v, values):
        if "total_earned_cents" in values:
            return Decimal(values["total_earned_cents"]) / 100
        return v
    
    @validator("pending_payout_usd", pre=False, always=True)
    def compute_pending_payout(cls, v, values):
        if "pending_payout_cents" in values:
            return Decimal(values["pending_payout_cents"]) / 100
        return v
    
    @validator("paid_out_usd", pre=False, always=True)
    def compute_paid_out(cls, v, values):
        if "paid_out_cents" in values:
            return Decimal(values["paid_out_cents"]) / 100
        return v
    
    @validator("mrr_usd", pre=False, always=True)
    def compute_mrr(cls, v, values):
        if "monthly_recurring_revenue_cents" in values:
            return Decimal(values["monthly_recurring_revenue_cents"]) / 100
        return v
    
    @validator("available_for_payout_usd", pre=False, always=True)
    def compute_available_for_payout(cls, v, values):
        # Available = Pending - Platform Fee
        if "pending_payout_cents" in values and "platform_fee_percentage" in values:
            pending = Decimal(values["pending_payout_cents"])
            fee_pct = Decimal(str(values["platform_fee_percentage"]))
            net = pending * (1 - fee_pct)
            return net / 100
        return v
    
    class Config:
        from_attributes = True


# ==================== Payout Schemas ====================

class PayoutRequest(BaseModel):
    """Request payout"""
    amount_cents: int = Field(..., gt=0)
    payout_method: str = Field(..., pattern="^(stripe|paypal|bank_transfer)$")
    notes: Optional[str] = Field(None, max_length=500)
    
    @validator("amount_cents")
    def validate_minimum_payout(cls, v):
        # Minimum payout: $10
        if v < 1000:
            raise ValueError("Minimum payout amount is $10.00")
        return v


class PayoutResponse(BaseModel):
    """Response schema for payout"""
    id: int
    creator_earnings_id: int
    amount_cents: int
    currency: str
    fee_cents: int
    net_amount_cents: int
    payout_method: str
    status: str
    requested_at: datetime
    processed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    amount_usd: Decimal = Field(default=Decimal("0.00"))
    fee_usd: Decimal = Field(default=Decimal("0.00"))
    net_amount_usd: Decimal = Field(default=Decimal("0.00"))
    
    @validator("amount_usd", pre=False, always=True)
    def compute_amount_usd(cls, v, values):
        if "amount_cents" in values:
            return Decimal(values["amount_cents"]) / 100
        return v
    
    @validator("fee_usd", pre=False, always=True)
    def compute_fee_usd(cls, v, values):
        if "fee_cents" in values:
            return Decimal(values["fee_cents"]) / 100
        return v
    
    @validator("net_amount_usd", pre=False, always=True)
    def compute_net_amount_usd(cls, v, values):
        if "net_amount_cents" in values:
            return Decimal(values["net_amount_cents"]) / 100
        return v
    
    class Config:
        from_attributes = True


# ==================== Stripe Webhook Schemas ====================

class StripeWebhookEvent(BaseModel):
    """Stripe webhook event"""
    type: str
    data: dict
