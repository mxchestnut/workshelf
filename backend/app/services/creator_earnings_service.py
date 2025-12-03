"""
Creator Earnings Service
Handles creator earnings tracking and payouts
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
import stripe
import os

from app.models import (
    User, CreatorEarnings, Payout,
    PayoutStatus
)


stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_")


class CreatorEarningsService:
    """Service for managing creator earnings and payouts"""
    
    # Platform fee percentage (15%)
    PLATFORM_FEE = Decimal("0.15")
    
    # Minimum payout amount ($10)
    MIN_PAYOUT_CENTS = 1000
    
    @staticmethod
    async def get_or_create_earnings(db: AsyncSession, user_id: int) -> CreatorEarnings:
        """Get or create creator earnings record"""
        result = await db.execute(
            select(CreatorEarnings).where(CreatorEarnings.user_id == user_id)
        )
        earnings = result.scalar_one_or_none()
        
        if not earnings:
            earnings = CreatorEarnings(
                user_id=user_id,
                platform_fee_percentage=CreatorEarningsService.PLATFORM_FEE
            )
            db.add(earnings)
            await db.commit()
            await db.refresh(earnings)
        
        return earnings
    
    @staticmethod
    async def track_earnings(
        db: AsyncSession,
        user_id: int,
        amount_cents: int,
        description: Optional[str] = None
    ) -> CreatorEarnings:
        """
        Track new earnings for a creator
        
        Args:
            user_id: Creator's user ID
            amount_cents: Amount earned in cents
            description: Optional description of earnings source
        """
        earnings = await CreatorEarningsService.get_or_create_earnings(db, user_id)
        
        # Update earnings
        earnings.total_earned_cents += amount_cents
        earnings.pending_payout_cents += amount_cents
        
        await db.commit()
        await db.refresh(earnings)
        
        return earnings
    
    @staticmethod
    async def update_subscriber_count(
        db: AsyncSession,
        user_id: int,
        count: int
    ) -> CreatorEarnings:
        """Update subscriber count for creator"""
        earnings = await CreatorEarningsService.get_or_create_earnings(db, user_id)
        earnings.subscriber_count = count
        
        await db.commit()
        await db.refresh(earnings)
        
        return earnings
    
    @staticmethod
    async def update_mrr(
        db: AsyncSession,
        user_id: int,
        mrr_cents: int
    ) -> CreatorEarnings:
        """Update monthly recurring revenue for creator"""
        earnings = await CreatorEarningsService.get_or_create_earnings(db, user_id)
        earnings.monthly_recurring_revenue_cents = mrr_cents
        
        await db.commit()
        await db.refresh(earnings)
        
        return earnings
    
    @staticmethod
    async def setup_stripe_connect(
        db: AsyncSession,
        user_id: int,
        country: str = "US"
    ) -> Dict[str, Any]:
        """
        Setup Stripe Connect account for creator
        
        Returns:
            Dict with account_link URL for onboarding
        """
        try:
            # Get user
            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            if not user:
                return {"error": "User not found"}
            
            earnings = await CreatorEarningsService.get_or_create_earnings(db, user_id)
            
            # Create Stripe Connect account if doesn't exist
            if not earnings.stripe_connect_account_id:
                account = stripe.Account.create(
                    type="express",
                    country=country,
                    email=user.email,
                    capabilities={
                        "card_payments": {"requested": True},
                        "transfers": {"requested": True}
                    }
                )
                earnings.stripe_connect_account_id = account.id
                await db.commit()
            
            # Create account link for onboarding
            account_link = stripe.AccountLink.create(
                account=earnings.stripe_connect_account_id,
                refresh_url=os.getenv("FRONTEND_URL", "http://localhost:3000") + "/creator/connect/refresh",
                return_url=os.getenv("FRONTEND_URL", "http://localhost:3000") + "/creator/dashboard",
                type="account_onboarding"
            )
            
            return {
                "account_id": earnings.stripe_connect_account_id,
                "onboarding_url": account_link.url
            }
        
        except stripe.error.StripeError as e:
            return {"error": f"Stripe error: {str(e)}"}
        except Exception as e:
            return {"error": f"Error setting up Stripe Connect: {str(e)}"}
    
    @staticmethod
    async def check_connect_status(
        db: AsyncSession,
        user_id: int
    ) -> Dict[str, Any]:
        """Check Stripe Connect account status"""
        try:
            earnings = await CreatorEarningsService.get_or_create_earnings(db, user_id)
            
            if not earnings.stripe_connect_account_id:
                return {
                    "enabled": False,
                    "charges_enabled": False,
                    "payouts_enabled": False
                }
            
            account = stripe.Account.retrieve(earnings.stripe_connect_account_id)
            
            # Update local record
            is_enabled = account.charges_enabled and account.payouts_enabled
            earnings.stripe_connect_enabled = is_enabled
            await db.commit()
            
            return {
                "enabled": is_enabled,
                "charges_enabled": account.charges_enabled,
                "payouts_enabled": account.payouts_enabled,
                "details_submitted": account.details_submitted,
                "requirements": account.requirements
            }
        
        except stripe.error.StripeError as e:
            return {"error": f"Stripe error: {str(e)}"}
        except Exception as e:
            return {"error": f"Error checking Connect status: {str(e)}"}
    
    @staticmethod
    async def request_payout(
        db: AsyncSession,
        user_id: int,
        amount_cents: int,
        payout_method: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Request a payout
        
        Args:
            user_id: Creator's user ID
            amount_cents: Amount to payout in cents
            payout_method: Payment method (stripe, paypal, bank_transfer)
            notes: Optional notes
        """
        try:
            # Validate minimum payout
            if amount_cents < CreatorEarningsService.MIN_PAYOUT_CENTS:
                return {"error": f"Minimum payout is ${CreatorEarningsService.MIN_PAYOUT_CENTS / 100:.2f}"}
            
            # Get earnings
            earnings = await CreatorEarningsService.get_or_create_earnings(db, user_id)
            
            # Check if enough pending earnings
            if earnings.pending_payout_cents < amount_cents:
                return {"error": "Insufficient pending earnings"}
            
            # For Stripe payouts, check Connect is enabled
            if payout_method == "stripe":
                if not earnings.stripe_connect_enabled:
                    return {"error": "Stripe Connect not enabled. Please complete onboarding."}
            
            # Calculate fees
            fee_cents = int(amount_cents * earnings.platform_fee_percentage)
            net_amount_cents = amount_cents - fee_cents
            
            # Create payout record
            payout = Payout(
                creator_earnings_id=earnings.id,
                amount_cents=amount_cents,
                fee_cents=fee_cents,
                net_amount_cents=net_amount_cents,
                payout_method=payout_method,
                status=PayoutStatus.PENDING,
                requested_at=datetime.now(timezone.utc),
                notes=notes
            )
            
            db.add(payout)
            
            # Update earnings
            earnings.pending_payout_cents -= amount_cents
            
            await db.commit()
            await db.refresh(payout)
            
            return {"payout": payout}
        
        except Exception as e:
            await db.rollback()
            return {"error": f"Error requesting payout: {str(e)}"}
    
    @staticmethod
    async def process_payout(
        db: AsyncSession,
        payout_id: int
    ) -> Dict[str, Any]:
        """
        Process a payout request
        
        This should be called by an admin/automated process
        """
        try:
            # Get payout
            result = await db.execute(
                select(Payout).where(Payout.id == payout_id)
            )
            payout = result.scalar_one_or_none()
            if not payout:
                return {"error": "Payout not found"}
            
            if payout.status != PayoutStatus.PENDING:
                return {"error": f"Payout already {payout.status.value}"}
            
            # Get earnings
            result = await db.execute(
                select(CreatorEarnings).where(CreatorEarnings.id == payout.creator_earnings_id)
            )
            earnings = result.scalar_one_or_none()
            if not earnings:
                return {"error": "Creator earnings not found"}
            
            # Mark as processing
            payout.status = PayoutStatus.PROCESSING
            payout.processed_at = datetime.now(timezone.utc)
            await db.commit()
            
            # Process based on method
            if payout.payout_method == "stripe":
                # Create Stripe payout
                stripe_payout = stripe.Payout.create(
                    amount=payout.net_amount_cents,
                    currency="usd",
                    stripe_account=earnings.stripe_connect_account_id
                )
                payout.stripe_payout_id = stripe_payout.id
                payout.status = PayoutStatus.PAID
                payout.paid_at = datetime.now(timezone.utc)
            
            elif payout.payout_method == "paypal":
                # PayPal Payout Implementation
                # PayPal payouts require manual processing or PayPal API integration
                # For now, we mark as PROCESSING and provide details for admin
                
                # Get user info for payout details
                user_result = await db.execute(
                    select(User).where(User.id == earnings.user_id)
                )
                user = user_result.scalar_one_or_none()
                
                # Build detailed note for admin processing
                payout_details = [
                    "PayPal Payout Details:",
                    f"User ID: {earnings.user_id}",
                    f"Username: {user.username if user else 'N/A'}",
                    f"Email: {user.email if user else 'N/A'}",
                    f"Amount: ${payout.net_amount_cents / 100:.2f} USD",
                    f"Request Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}",
                    "",
                    "Action Required: Process PayPal payout manually",
                    "PayPal API integration pending - requires PayPal Business account setup"
                ]
                
                payout.status = PayoutStatus.PROCESSING
                payout.notes = "\n".join(payout_details)
                
                # TODO: Future enhancement - integrate PayPal Payouts API
                # See: https://developer.paypal.com/docs/payouts/
                # Requires: PayPal Business account, API credentials
            
            elif payout.payout_method == "bank_transfer":
                # Bank Transfer Implementation
                # Bank transfers require manual processing or banking API integration (e.g., Plaid, Stripe)
                # For now, we mark as PROCESSING and provide details for admin
                
                # Get user info for payout details
                user_result = await db.execute(
                    select(User).where(User.id == earnings.user_id)
                )
                user = user_result.scalar_one_or_none()
                
                # Build detailed note for admin processing
                payout_details = [
                    "Bank Transfer Payout Details:",
                    f"User ID: {earnings.user_id}",
                    f"Username: {user.username if user else 'N/A'}",
                    f"Email: {user.email if user else 'N/A'}",
                    f"Amount: ${payout.net_amount_cents / 100:.2f} USD",
                    f"Request Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}",
                    "",
                    "Action Required: Process bank transfer manually",
                    "Note: User must provide bank account details separately",
                    "Future: Integrate with Stripe Connect for direct bank transfers"
                ]
                
                payout.status = PayoutStatus.PROCESSING
                payout.notes = "\n".join(payout_details)
                
                # TODO: Future enhancement - use Stripe Connect for bank transfers
                # Or integrate ACH/wire transfer API (e.g., Plaid, Dwolla)
            
            # Update earnings
            earnings.paid_out_cents += payout.amount_cents
            
            await db.commit()
            await db.refresh(payout)
            
            return {"payout": payout}
        
        except stripe.error.StripeError as e:
            payout.status = PayoutStatus.FAILED
            payout.failure_reason = str(e)
            await db.commit()
            return {"error": f"Stripe error: {str(e)}"}
        except Exception as e:
            payout.status = PayoutStatus.FAILED
            payout.failure_reason = str(e)
            await db.commit()
            return {"error": f"Error processing payout: {str(e)}"}
    
    @staticmethod
    async def get_payout_history(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> List[Payout]:
        """Get payout history for creator"""
        # Get earnings
        result = await db.execute(
            select(CreatorEarnings).where(CreatorEarnings.user_id == user_id)
        )
        earnings = result.scalar_one_or_none()
        if not earnings:
            return []
        
        # Get payouts
        result = await db.execute(
            select(Payout)
            .where(Payout.creator_earnings_id == earnings.id)
            .order_by(Payout.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_earnings_dashboard(
        db: AsyncSession,
        user_id: int
    ) -> Dict[str, Any]:
        """Get comprehensive earnings dashboard data"""
        earnings = await CreatorEarningsService.get_or_create_earnings(db, user_id)
        
        # Get recent payouts
        recent_payouts = await CreatorEarningsService.get_payout_history(db, user_id, limit=10)
        
        # Calculate available for payout (after platform fee)
        available_cents = int(earnings.pending_payout_cents * (1 - earnings.platform_fee_percentage))
        
        return {
            "earnings": earnings,
            "recent_payouts": recent_payouts,
            "available_for_payout_cents": available_cents,
            "available_for_payout_usd": Decimal(available_cents) / 100,
            "minimum_payout_usd": Decimal(CreatorEarningsService.MIN_PAYOUT_CENTS) / 100
        }
