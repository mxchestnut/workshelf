"""
Subscriptions API
Endpoints for subscription management and Stripe integration
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
import stripe
import os

from app.core.database import get_db
from app.core.azure_auth import get_current_user
from app.schemas.monetization import (
    SubscriptionTierResponse,
    SubscriptionCreate,
    SubscriptionUpdateTier,
    SubscriptionCancel,
    SubscriptionResponse,
    PaymentResponse,
    StripeWebhookEvent
)
from app.services.subscription_service import SubscriptionService


router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


# ==================== Subscription Tiers ====================

@router.get("/tiers", response_model=List[SubscriptionTierResponse])
async def get_subscription_tiers(
    db: AsyncSession = Depends(get_db)
):
    """Get all active subscription tiers"""
    tiers = await SubscriptionService.get_active_tiers(db)
    return tiers


@router.get("/tiers/{tier_id}", response_model=SubscriptionTierResponse)
async def get_subscription_tier(
    tier_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get specific subscription tier"""
    tier = await SubscriptionService.get_tier_by_id(db, tier_id)
    if not tier:
        raise HTTPException(status_code=404, detail="Subscription tier not found")
    return tier


# ==================== User Subscriptions ====================

@router.get("/me", response_model=Optional[SubscriptionResponse])
async def get_my_subscription(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's active subscription"""
    subscription = await SubscriptionService.get_user_subscription(db, current_user["id"])
    return subscription


@router.post("/subscribe", response_model=Dict[str, Any])
async def create_subscription(
    subscription_data: SubscriptionCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new subscription
    
    Returns subscription and client_secret for payment confirmation
    """
    result = await SubscriptionService.create_subscription(
        db=db,
        user_id=current_user["id"],
        tier_id=subscription_data.tier_id,
        interval=subscription_data.interval,
        payment_method_id=subscription_data.payment_method_id,
        trial_days=subscription_data.trial_days
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    # Convert subscription to response model
    subscription = result["subscription"]
    
    return {
        "subscription": SubscriptionResponse.from_orm(subscription),
        "client_secret": result.get("client_secret")
    }


@router.post("/cancel")
async def cancel_subscription(
    cancel_data: SubscriptionCancel,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel current subscription"""
    # Get user's subscription
    subscription = await SubscriptionService.get_user_subscription(db, current_user["id"])
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    result = await SubscriptionService.cancel_subscription(
        db=db,
        subscription_id=subscription.id,
        user_id=current_user["id"],
        cancel_at_period_end=cancel_data.cancel_at_period_end
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "message": "Subscription canceled successfully" if not cancel_data.cancel_at_period_end else "Subscription will cancel at period end",
        "subscription": SubscriptionResponse.from_orm(result["subscription"])
    }


@router.post("/upgrade", response_model=SubscriptionResponse)
async def upgrade_subscription(
    upgrade_data: SubscriptionUpdateTier,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upgrade or downgrade subscription"""
    # Get user's subscription
    subscription = await SubscriptionService.get_user_subscription(db, current_user["id"])
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    result = await SubscriptionService.update_subscription_tier(
        db=db,
        subscription_id=subscription.id,
        user_id=current_user["id"],
        new_tier_id=upgrade_data.tier_id,
        new_interval=upgrade_data.interval
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return SubscriptionResponse.from_orm(result["subscription"])


# ==================== Payment History ====================

@router.get("/payments", response_model=List[PaymentResponse])
async def get_payment_history(
    skip: int = 0,
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get payment history"""
    payments = await SubscriptionService.get_payment_history(
        db=db,
        user_id=current_user["id"],
        skip=skip,
        limit=limit
    )
    return payments


# ==================== Stripe Webhooks ====================

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db)
):
    """
    Handle Stripe webhook events
    
    This endpoint processes webhook events from Stripe to keep
    subscription and payment data in sync.
    """
    try:
        # Get raw body
        payload = await request.body()
        
        # Verify webhook signature
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        if webhook_secret:
            try:
                event = stripe.Webhook.construct_event(
                    payload, stripe_signature, webhook_secret
                )
            except stripe.error.SignatureVerificationError:
                raise HTTPException(status_code=400, detail="Invalid signature")
        else:
            # In development, skip signature verification
            import json
            event = json.loads(payload)
        
        # Handle the event
        result = await SubscriptionService.handle_stripe_webhook(
            db=db,
            event_type=event["type"],
            event_data=event["data"]
        )
        
        if "error" in result:
            # Log error but return 200 to acknowledge receipt
            print(f"Webhook error: {result['error']}")
        
        return {"status": "success"}
    
    except Exception as e:
        # Log error but return 200 to prevent Stripe from retrying
        print(f"Webhook exception: {str(e)}")
        return {"status": "error", "message": str(e)}
