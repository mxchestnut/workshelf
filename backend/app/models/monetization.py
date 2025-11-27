"""
Phase 6 Monetization Models
Subscriptions, payments, and creator earnings
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum, Numeric, Index, text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from decimal import Decimal

from app.models.base import Base, TimestampMixin


# ============================================================================
# Subscription Tiers & Plans
# ============================================================================

class SubscriptionTierType(enum.Enum):
    """Subscription tier types."""
    FREE = "free"
    READER = "reader"
    CREATOR = "creator"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class BillingInterval(enum.Enum):
    """Billing intervals."""
    MONTHLY = "monthly"
    YEARLY = "yearly"


class SubscriptionTier(Base, TimestampMixin):
    """
    Subscription tier definitions (pricing plans)
    """
    __tablename__ = "subscription_tiers"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Tier identity
    tier_type = Column(SQLEnum(SubscriptionTierType), nullable=False, unique=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Pricing (in cents to avoid floating point issues)
    monthly_price_cents = Column(Integer, nullable=False, default=0)
    yearly_price_cents = Column(Integer, nullable=False, default=0)
    
    # Feature limits
    max_documents = Column(Integer, nullable=True)  # NULL = unlimited
    max_storage_mb = Column(Integer, nullable=True)  # NULL = unlimited
    max_studios = Column(Integer, nullable=True)
    max_collaborators = Column(Integer, nullable=True)
    
    # Feature flags
    custom_domains = Column(Boolean, default=False, nullable=False)
    priority_support = Column(Boolean, default=False, nullable=False)
    analytics = Column(Boolean, default=False, nullable=False)
    monetization_enabled = Column(Boolean, default=False, nullable=False)
    api_access = Column(Boolean, default=False, nullable=False)
    
    # Stripe integration
    stripe_monthly_price_id = Column(String(255), nullable=True)  # Stripe price ID for monthly
    stripe_yearly_price_id = Column(String(255), nullable=True)   # Stripe price ID for yearly
    
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="tier")


# ============================================================================
# User Subscriptions
# ============================================================================

class SubscriptionStatus(enum.Enum):
    """Subscription status."""
    ACTIVE = "active"
    TRIALING = "trialing"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"
    INCOMPLETE = "incomplete"


class Subscription(Base, TimestampMixin):
    """
    User subscriptions
    """
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User subscription
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    tier_id = Column(Integer, ForeignKey('subscription_tiers.id'), nullable=False, index=True)
    
    # Subscription details
    status = Column(SQLEnum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.ACTIVE)
    interval = Column(SQLEnum(BillingInterval), nullable=False, default=BillingInterval.MONTHLY)
    
    # Billing cycle
    current_period_start = Column(DateTime(timezone=True), nullable=False)
    current_period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Cancellation
    cancel_at_period_end = Column(Boolean, default=False, nullable=False)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    
    # Trial
    trial_start = Column(DateTime(timezone=True), nullable=True)
    trial_end = Column(DateTime(timezone=True), nullable=True)
    
    # Stripe integration
    stripe_customer_id = Column(String(255), nullable=True, index=True)
    stripe_subscription_id = Column(String(255), nullable=True, unique=True, index=True)
    stripe_payment_method_id = Column(String(255), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="subscriptions")
    tier = relationship("SubscriptionTier", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_user_status', 'user_id', 'status'),
        Index('idx_subscription_period', 'current_period_start', 'current_period_end'),
    )


# ============================================================================
# Payments
# ============================================================================

class PaymentStatus(enum.Enum):
    """Payment status."""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELED = "canceled"


class Payment(Base, TimestampMixin):
    """
    Payment records
    """
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Payment details
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey('subscriptions.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Amount (in cents)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False, default='USD')  # ISO 4217 currency code
    
    # Payment status
    status = Column(SQLEnum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING, index=True)
    
    # Description
    description = Column(Text, nullable=True)
    
    # Invoice
    invoice_url = Column(String(500), nullable=True)
    receipt_url = Column(String(500), nullable=True)
    
    # Stripe integration
    stripe_payment_intent_id = Column(String(255), nullable=True, unique=True, index=True)
    stripe_charge_id = Column(String(255), nullable=True, index=True)
    stripe_invoice_id = Column(String(255), nullable=True, index=True)
    
    # Timestamps
    paid_at = Column(DateTime(timezone=True), nullable=True)
    refunded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="payments")
    subscription = relationship("Subscription", back_populates="payments")
    
    __table_args__ = (
        Index('idx_user_payments', 'user_id', 'created_at'),
        Index('idx_payment_status', 'status', 'created_at'),
    )


# ============================================================================
# Creator Earnings & Payouts
# ============================================================================

class CreatorEarnings(Base, TimestampMixin):
    """
    Track creator earnings from paid content
    """
    __tablename__ = "creator_earnings"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Creator
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Earnings tracking
    total_earned_cents = Column(Integer, nullable=False, default=0)  # All-time earnings
    pending_payout_cents = Column(Integer, nullable=False, default=0)  # Ready for payout
    paid_out_cents = Column(Integer, nullable=False, default=0)  # Already paid out
    
    # Subscription-based earnings
    subscriber_count = Column(Integer, nullable=False, default=0)
    monthly_recurring_revenue_cents = Column(Integer, nullable=False, default=0)
    
    # Platform fee (percentage, e.g., 15 = 15%)
    platform_fee_percentage = Column(Integer, nullable=False, default=15)
    
    # Stripe connect
    stripe_connect_account_id = Column(String(255), nullable=True, unique=True, index=True)
    stripe_connect_enabled = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="creator_earnings", uselist=False)
    payouts = relationship("Payout", back_populates="creator_earnings", cascade="all, delete-orphan")


class PayoutStatus(enum.Enum):
    """Payout status."""
    PENDING = "pending"
    PROCESSING = "processing"
    PAID = "paid"
    FAILED = "failed"
    CANCELED = "canceled"


class Payout(Base, TimestampMixin):
    """
    Creator payout requests and history
    """
    __tablename__ = "payouts"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Payout details
    creator_earnings_id = Column(Integer, ForeignKey('creator_earnings.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Amount (in cents)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False, default='USD')
    
    # Platform fee deducted
    fee_cents = Column(Integer, nullable=False)
    net_amount_cents = Column(Integer, nullable=False)  # amount - fee
    
    # Payout method
    payout_method = Column(String(50), nullable=False)  # stripe, paypal, bank_transfer
    
    # Status
    status = Column(SQLEnum(PayoutStatus), nullable=False, default=PayoutStatus.PENDING, index=True)
    
    # Stripe payout
    stripe_payout_id = Column(String(255), nullable=True, unique=True, index=True)
    
    # Timestamps
    requested_at = Column(DateTime(timezone=True), nullable=False, server_default=text('CURRENT_TIMESTAMP'))
    processed_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    failure_reason = Column(Text, nullable=True)
    
    # Relationships
    creator_earnings = relationship("CreatorEarnings", back_populates="payouts")
    
    __table_args__ = (
        Index('idx_creator_payouts', 'creator_earnings_id', 'created_at'),
        Index('idx_payout_status', 'status', 'requested_at'),
    )
