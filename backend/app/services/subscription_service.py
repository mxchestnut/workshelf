"""
Subscription Service
Handles subscription creation, updates, cancellations, and Stripe integration
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import joinedload
import stripe
import os

from app.models import (
    User, Subscription, SubscriptionTier, Payment,
    SubscriptionStatus, BillingInterval, PaymentStatus
)


# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_")


class SubscriptionService:
    """Service for managing subscriptions and Stripe integration"""
    
    @staticmethod
    async def get_active_tiers(db: AsyncSession) -> List[SubscriptionTier]:
        """Get all active subscription tiers"""
        result = await db.execute(
            select(SubscriptionTier)
            .where(SubscriptionTier.is_active == True)
            .order_by(SubscriptionTier.monthly_price_cents)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_tier_by_id(db: AsyncSession, tier_id: int) -> Optional[SubscriptionTier]:
        """Get subscription tier by ID"""
        result = await db.execute(
            select(SubscriptionTier).where(SubscriptionTier.id == tier_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_subscription(db: AsyncSession, user_id: int) -> Optional[Subscription]:
        """Get user's active subscription"""
        result = await db.execute(
            select(Subscription)
            .options(joinedload(Subscription.tier))
            .where(
                and_(
                    Subscription.user_id == user_id,
                    Subscription.status.in_([
                        SubscriptionStatus.ACTIVE,
                        SubscriptionStatus.TRIALING,
                        SubscriptionStatus.PAST_DUE
                    ])
                )
            )
            .order_by(Subscription.created_at.desc())
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_subscription(
        db: AsyncSession,
        user_id: int,
        tier_id: int,
        interval: str,
        payment_method_id: str,
        trial_days: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Create a new subscription with Stripe
        
        Returns:
            Dict with subscription and any errors
        """
        try:
            # Get user
            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            if not user:
                return {"error": "User not found"}
            
            # Get tier
            tier = await SubscriptionService.get_tier_by_id(db, tier_id)
            if not tier or not tier.is_active:
                return {"error": "Invalid subscription tier"}
            
            # Check if user already has an active subscription
            existing = await SubscriptionService.get_user_subscription(db, user_id)
            if existing:
                return {"error": "User already has an active subscription"}
            
            # Create or retrieve Stripe customer
            if not user.stripe_customer_id:
                stripe_customer = stripe.Customer.create(
                    email=user.email,
                    name=user.username,
                    payment_method=payment_method_id,
                    invoice_settings={"default_payment_method": payment_method_id}
                )
                user.stripe_customer_id = stripe_customer.id
                await db.commit()
            else:
                # Attach payment method to existing customer
                stripe.PaymentMethod.attach(
                    payment_method_id,
                    customer=user.stripe_customer_id
                )
                stripe.Customer.modify(
                    user.stripe_customer_id,
                    invoice_settings={"default_payment_method": payment_method_id}
                )
            
            # Determine Stripe price ID
            if interval == BillingInterval.MONTHLY.value:
                stripe_price_id = tier.stripe_monthly_price_id
                price_cents = tier.monthly_price_cents
            else:
                stripe_price_id = tier.stripe_yearly_price_id
                price_cents = tier.yearly_price_cents
            
            # Create Stripe subscription
            stripe_sub_params = {
                "customer": user.stripe_customer_id,
                "items": [{"price": stripe_price_id}],
                "payment_behavior": "default_incomplete",
                "payment_settings": {"save_default_payment_method": "on_subscription"},
                "expand": ["latest_invoice.payment_intent"]
            }
            
            if trial_days:
                stripe_sub_params["trial_period_days"] = trial_days
            
            stripe_subscription = stripe.Subscription.create(**stripe_sub_params)
            
            # Create local subscription record
            now = datetime.now(timezone.utc)
            subscription = Subscription(
                user_id=user_id,
                tier_id=tier_id,
                status=SubscriptionStatus.TRIALING if trial_days else SubscriptionStatus.ACTIVE,
                interval=BillingInterval(interval),
                current_period_start=datetime.fromtimestamp(stripe_subscription.current_period_start),
                current_period_end=datetime.fromtimestamp(stripe_subscription.current_period_end),
                stripe_customer_id=user.stripe_customer_id,
                stripe_subscription_id=stripe_subscription.id,
                stripe_payment_method_id=payment_method_id
            )
            
            if trial_days:
                subscription.trial_start = now
                subscription.trial_end = now + timedelta(days=trial_days)
            
            db.add(subscription)
            await db.commit()
            await db.refresh(subscription)
            
            # Load tier relationship
            await db.refresh(subscription, ["tier"])
            
            return {
                "subscription": subscription,
                "client_secret": stripe_subscription.latest_invoice.payment_intent.client_secret if hasattr(stripe_subscription.latest_invoice, 'payment_intent') else None
            }
        
        except stripe.error.StripeError as e:
            return {"error": f"Stripe error: {str(e)}"}
        except Exception as e:
            return {"error": f"Error creating subscription: {str(e)}"}
    
    @staticmethod
    async def cancel_subscription(
        db: AsyncSession,
        subscription_id: int,
        user_id: int,
        cancel_at_period_end: bool = True
    ) -> Dict[str, Any]:
        """Cancel a subscription"""
        try:
            # Get subscription
            result = await db.execute(
                select(Subscription).where(
                    and_(
                        Subscription.id == subscription_id,
                        Subscription.user_id == user_id
                    )
                )
            )
            subscription = result.scalar_one_or_none()
            if not subscription:
                return {"error": "Subscription not found"}
            
            if subscription.status == SubscriptionStatus.CANCELED:
                return {"error": "Subscription already canceled"}
            
            # Cancel in Stripe
            if cancel_at_period_end:
                stripe_subscription = stripe.Subscription.modify(
                    subscription.stripe_subscription_id,
                    cancel_at_period_end=True
                )
                subscription.cancel_at_period_end = True
                subscription.canceled_at = datetime.now(timezone.utc)
            else:
                stripe_subscription = stripe.Subscription.delete(
                    subscription.stripe_subscription_id
                )
                subscription.status = SubscriptionStatus.CANCELED
                subscription.canceled_at = datetime.now(timezone.utc)
                subscription.ended_at = datetime.now(timezone.utc)
            
            await db.commit()
            await db.refresh(subscription)
            
            return {"subscription": subscription}
        
        except stripe.error.StripeError as e:
            return {"error": f"Stripe error: {str(e)}"}
        except Exception as e:
            return {"error": f"Error canceling subscription: {str(e)}"}
    
    @staticmethod
    async def update_subscription_tier(
        db: AsyncSession,
        subscription_id: int,
        user_id: int,
        new_tier_id: int,
        new_interval: Optional[str] = None
    ) -> Dict[str, Any]:
        """Upgrade or downgrade subscription"""
        try:
            # Get current subscription
            result = await db.execute(
                select(Subscription)
                .options(joinedload(Subscription.tier))
                .where(
                    and_(
                        Subscription.id == subscription_id,
                        Subscription.user_id == user_id
                    )
                )
            )
            subscription = result.scalar_one_or_none()
            if not subscription:
                return {"error": "Subscription not found"}
            
            # Get new tier
            new_tier = await SubscriptionService.get_tier_by_id(db, new_tier_id)
            if not new_tier or not new_tier.is_active:
                return {"error": "Invalid subscription tier"}
            
            # Determine interval (keep current if not specified)
            interval = new_interval if new_interval else subscription.interval.value
            
            # Get Stripe price ID
            if interval == BillingInterval.MONTHLY.value:
                stripe_price_id = new_tier.stripe_monthly_price_id
            else:
                stripe_price_id = new_tier.stripe_yearly_price_id
            
            # Update Stripe subscription
            stripe_subscription = stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                items=[{
                    "id": stripe.Subscription.retrieve(subscription.stripe_subscription_id).items.data[0].id,
                    "price": stripe_price_id
                }],
                proration_behavior="always_invoice"  # Immediate proration
            )
            
            # Update local record
            subscription.tier_id = new_tier_id
            subscription.interval = BillingInterval(interval)
            subscription.current_period_start = datetime.fromtimestamp(stripe_subscription.current_period_start)
            subscription.current_period_end = datetime.fromtimestamp(stripe_subscription.current_period_end)
            
            await db.commit()
            await db.refresh(subscription)
            await db.refresh(subscription, ["tier"])
            
            return {"subscription": subscription}
        
        except stripe.error.StripeError as e:
            return {"error": f"Stripe error: {str(e)}"}
        except Exception as e:
            return {"error": f"Error updating subscription: {str(e)}"}
    
    @staticmethod
    async def get_payment_history(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> List[Payment]:
        """Get user's payment history"""
        result = await db.execute(
            select(Payment)
            .where(Payment.user_id == user_id)
            .order_by(Payment.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def handle_stripe_webhook(
        db: AsyncSession,
        event_type: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Handle Stripe webhook events
        
        Supported events:
        - customer.subscription.updated
        - customer.subscription.deleted
        - invoice.payment_succeeded
        - invoice.payment_failed
        """
        try:
            if event_type == "customer.subscription.updated":
                return await SubscriptionService._handle_subscription_updated(db, event_data)
            
            elif event_type == "customer.subscription.deleted":
                return await SubscriptionService._handle_subscription_deleted(db, event_data)
            
            elif event_type == "invoice.payment_succeeded":
                return await SubscriptionService._handle_payment_succeeded(db, event_data)
            
            elif event_type == "invoice.payment_failed":
                return await SubscriptionService._handle_payment_failed(db, event_data)
            
            return {"status": "ignored", "message": f"Unhandled event type: {event_type}"}
        
        except Exception as e:
            return {"error": f"Error handling webhook: {str(e)}"}
    
    @staticmethod
    async def _handle_subscription_updated(db: AsyncSession, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle subscription.updated webhook"""
        stripe_sub_id = data["object"]["id"]
        
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        subscription = result.scalar_one_or_none()
        if not subscription:
            return {"error": "Subscription not found"}
        
        # Update subscription status
        stripe_status = data["object"]["status"]
        status_mapping = {
            "active": SubscriptionStatus.ACTIVE,
            "trialing": SubscriptionStatus.TRIALING,
            "past_due": SubscriptionStatus.PAST_DUE,
            "canceled": SubscriptionStatus.CANCELED,
            "unpaid": SubscriptionStatus.UNPAID,
            "incomplete": SubscriptionStatus.INCOMPLETE
        }
        
        subscription.status = status_mapping.get(stripe_status, SubscriptionStatus.ACTIVE)
        subscription.current_period_start = datetime.fromtimestamp(data["object"]["current_period_start"])
        subscription.current_period_end = datetime.fromtimestamp(data["object"]["current_period_end"])
        
        if data["object"].get("cancel_at_period_end"):
            subscription.cancel_at_period_end = True
        
        await db.commit()
        return {"status": "success"}
    
    @staticmethod
    async def _handle_subscription_deleted(db: AsyncSession, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle subscription.deleted webhook"""
        stripe_sub_id = data["object"]["id"]
        
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        subscription = result.scalar_one_or_none()
        if not subscription:
            return {"error": "Subscription not found"}
        
        subscription.status = SubscriptionStatus.CANCELED
        subscription.ended_at = datetime.now(timezone.utc)
        
        await db.commit()
        return {"status": "success"}
    
    @staticmethod
    async def _handle_payment_succeeded(db: AsyncSession, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle invoice.payment_succeeded webhook"""
        invoice = data["object"]
        
        # Find subscription
        stripe_sub_id = invoice.get("subscription")
        if not stripe_sub_id:
            return {"status": "ignored", "message": "No subscription ID"}
        
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        subscription = result.scalar_one_or_none()
        if not subscription:
            return {"error": "Subscription not found"}
        
        # Create payment record
        payment = Payment(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            amount_cents=invoice["amount_paid"],
            currency=invoice["currency"].upper(),
            status=PaymentStatus.SUCCEEDED,
            description=f"Subscription payment - {subscription.tier.name if hasattr(subscription, 'tier') else 'Unknown'}",
            invoice_url=invoice.get("hosted_invoice_url"),
            receipt_url=invoice.get("receipt_url"),
            stripe_payment_intent_id=invoice.get("payment_intent"),
            stripe_charge_id=invoice.get("charge"),
            stripe_invoice_id=invoice["id"],
            paid_at=datetime.fromtimestamp(invoice["status_transitions"]["paid_at"]) if invoice.get("status_transitions", {}).get("paid_at") else datetime.now(timezone.utc)
        )
        
        db.add(payment)
        await db.commit()
        
        return {"status": "success", "payment_id": payment.id}
    
    @staticmethod
    async def _handle_payment_failed(db: AsyncSession, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle invoice.payment_failed webhook"""
        invoice = data["object"]
        
        # Find subscription
        stripe_sub_id = invoice.get("subscription")
        if not stripe_sub_id:
            return {"status": "ignored", "message": "No subscription ID"}
        
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        subscription = result.scalar_one_or_none()
        if not subscription:
            return {"error": "Subscription not found"}
        
        # Update subscription status
        subscription.status = SubscriptionStatus.PAST_DUE
        
        # Create payment record
        payment = Payment(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            amount_cents=invoice["amount_due"],
            currency=invoice["currency"].upper(),
            status=PaymentStatus.FAILED,
            description=f"Failed subscription payment - {subscription.tier.name if hasattr(subscription, 'tier') else 'Unknown'}",
            stripe_payment_intent_id=invoice.get("payment_intent"),
            stripe_invoice_id=invoice["id"]
        )
        
        db.add(payment)
        await db.commit()
        
        return {"status": "success", "payment_id": payment.id}
