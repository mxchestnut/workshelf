"""
Stripe Service for WorkShelf Store
Handles payment processing, checkout sessions, and webhooks
"""
import os
import stripe
from typing import Optional, Dict, Any
from decimal import Decimal
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.store import StoreItem, Purchase, PurchaseStatus, AuthorEarnings
from app.models.bookshelf import BookshelfItem
from app.models.author import Author


# Initialize Stripe with secret key
# Support both local (.env) and Azure naming conventions
stripe.api_key = os.getenv("STRIPE_SECRET_KEY") or os.getenv("stripe-secret-key")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET") or os.getenv("stripe-webhook-secret")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


class StripeService:
    """Service for handling Stripe payment operations"""
    
    @staticmethod
    async def create_checkout_session(
        store_item: StoreItem,
        user_id: int,
        db: AsyncSession,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Create a Stripe Checkout session for purchasing a book.
        
        Args:
            store_item: The book being purchased
            user_id: ID of the user making the purchase
            db: Database session
            success_url: URL to redirect after successful payment
            cancel_url: URL to redirect if payment is cancelled
            
        Returns:
            Dict with checkout session URL and session ID
        """
        try:
            # Calculate final price (apply any discounts)
            price = float(store_item.price_usd)
            if store_item.discount_percentage > 0:
                price = price * (1 - store_item.discount_percentage / 100)
            
            # Create pending purchase record
            purchase = Purchase(
                user_id=user_id,
                store_item_id=store_item.id,
                amount_paid=Decimal(str(price)),
                currency=store_item.currency,
                stripe_payment_intent_id="pending",  # Will be updated by webhook
                status=PurchaseStatus.PENDING
            )
            db.add(purchase)
            await db.commit()
            await db.refresh(purchase)
            
            # Default URLs
            if not success_url:
                success_url = f"{FRONTEND_URL}/store/success?session_id={{CHECKOUT_SESSION_ID}}"
            if not cancel_url:
                cancel_url = f"{FRONTEND_URL}/store/cancel"
            
            # Create Stripe Checkout Session
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[
                    {
                        'price_data': {
                            'currency': store_item.currency.lower(),
                            'unit_amount': int(price * 100),  # Convert to cents
                            'product_data': {
                                'name': store_item.title,
                                'description': store_item.author_name,
                                'images': [store_item.cover_blob_url] if store_item.cover_blob_url else [],
                            },
                        },
                        'quantity': 1,
                    }
                ],
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    'purchase_id': str(purchase.id),
                    'user_id': str(user_id),
                    'store_item_id': str(store_item.id)
                },
                client_reference_id=str(purchase.id)
            )
            
            return {
                'checkout_url': session.url,
                'session_id': session.id,
                'purchase_id': purchase.id
            }
            
        except stripe.error.StripeError as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create checkout: {str(e)}")
    
    @staticmethod
    async def handle_webhook(payload: bytes, signature: str, db: AsyncSession) -> Dict[str, Any]:
        """
        Handle Stripe webhook events.
        
        Processes payment confirmations and updates purchase records.
        Automatically adds purchased books to user's bookshelf.
        
        Args:
            payload: Raw webhook payload
            signature: Stripe signature header
            db: Database session
            
        Returns:
            Dict with processing result
        """
        try:
            # Verify webhook signature
            event = stripe.Webhook.construct_event(
                payload, signature, STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Handle the event
        event_type = event['type']
        
        if event_type == 'checkout.session.completed':
            return await StripeService._handle_checkout_completed(event['data']['object'], db)
        
        elif event_type == 'payment_intent.succeeded':
            return await StripeService._handle_payment_succeeded(event['data']['object'], db)
        
        elif event_type == 'payment_intent.payment_failed':
            return await StripeService._handle_payment_failed(event['data']['object'], db)
        
        elif event_type == 'charge.refunded':
            return await StripeService._handle_refund(event['data']['object'], db)
        
        return {'status': 'unhandled_event', 'type': event_type}
    
    @staticmethod
    async def _handle_checkout_completed(session: Dict, db: AsyncSession) -> Dict[str, Any]:
        """Handle successful checkout session completion"""
        try:
            purchase_id = int(session['metadata']['purchase_id'])
            user_id = int(session['metadata']['user_id'])
            store_item_id = int(session['metadata']['store_item_id'])
            
            # Get the purchase record
            result = await db.execute(select(Purchase).where(Purchase.id == purchase_id))
            purchase = result.scalar_one_or_none()
            if not purchase:
                return {'status': 'error', 'message': 'Purchase not found'}
            
            # Update purchase with payment details
            purchase.stripe_payment_intent_id = session['payment_intent']
            purchase.status = PurchaseStatus.COMPLETED
            purchase.completed_at = datetime.now(timezone.utc)
            purchase.payment_method = session.get('payment_method_types', ['card'])[0]
            
            # Get store item
            result = await db.execute(select(StoreItem).where(StoreItem.id == store_item_id))
            store_item = result.scalar_one_or_none()
            if not store_item:
                return {'status': 'error', 'message': 'Store item not found'}
            
            # Add book to user's bookshelf
            bookshelf_item = BookshelfItem(
                user_id=user_id,
                title=store_item.title,
                author=store_item.author_name,
                description=store_item.description,
                genres=store_item.genres,
                isbn=store_item.isbn,
                cover_url=store_item.cover_blob_url,
                epub_url=store_item.epub_blob_url,  # Grant access to EPUB
                is_owned=True,
                purchase_date=datetime.now(timezone.utc)
            )
            db.add(bookshelf_item)
            await db.flush()
            
            # Link bookshelf item to purchase
            purchase.bookshelf_item_id = bookshelf_item.id
            purchase.access_granted = True
            purchase.access_granted_at = datetime.now(timezone.utc)
            
            # Update store item sales stats
            store_item.total_sales += 1
            store_item.total_revenue += purchase.amount_paid
            
            # Create author earnings record if author exists
            if store_item.author_id:
                # Calculate revenue split (70% to author, 30% to platform)
                author_percentage = Decimal('0.70')
                platform_percentage = Decimal('0.30')
                
                author_amount = purchase.amount_paid * author_percentage
                platform_fee = purchase.amount_paid * platform_percentage
                
                # Estimate Stripe processing fee (2.9% + $0.30)
                stripe_fee = (purchase.amount_paid * Decimal('0.029')) + Decimal('0.30')
                
                earnings = AuthorEarnings(
                    author_id=store_item.author_id,
                    store_item_id=store_item.id,
                    purchase_id=purchase.id,
                    sale_amount=purchase.amount_paid,
                    platform_fee=platform_fee,
                    author_earnings=author_amount,
                    payment_processing_fee=stripe_fee,
                    payout_status='pending'
                )
                db.add(earnings)
                
                # Update author stats
                result = await db.execute(select(Author).where(Author.id == store_item.author_id))
                author = result.scalar_one_or_none()
                if author:
                    author.total_sales += 1
            
            await db.commit()
            
            return {
                'status': 'success',
                'purchase_id': purchase.id,
                'bookshelf_item_id': bookshelf_item.id,
                'access_granted': True
            }
            
        except Exception as e:
            await db.rollback()
            return {'status': 'error', 'message': str(e)}
    
    @staticmethod
    async def _handle_payment_succeeded(payment_intent: Dict, db: AsyncSession) -> Dict[str, Any]:
        """Handle successful payment intent"""
        # Additional processing if needed
        return {'status': 'success', 'type': 'payment_succeeded'}
    
    @staticmethod
    async def _handle_payment_failed(payment_intent: Dict, db: AsyncSession) -> Dict[str, Any]:
        """Handle failed payment"""
        try:
            # Find purchase by payment intent ID
            result = await db.execute(
                select(Purchase).where(Purchase.stripe_payment_intent_id == payment_intent['id'])
            )
            purchase = result.scalar_one_or_none()
            
            if purchase:
                purchase.status = PurchaseStatus.FAILED
                await db.commit()
            
            return {'status': 'success', 'type': 'payment_failed'}
        except Exception as e:
            await db.rollback()
            return {'status': 'error', 'message': str(e)}
    
    @staticmethod
    async def _handle_refund(charge: Dict, db: AsyncSession) -> Dict[str, Any]:
        """Handle refunded charge"""
        try:
            # Find purchase by charge ID
            result = await db.execute(
                select(Purchase).where(Purchase.stripe_charge_id == charge['id'])
            )
            purchase = result.scalar_one_or_none()
            
            if purchase:
                purchase.status = PurchaseStatus.REFUNDED
                purchase.refunded_at = datetime.now(timezone.utc)
                
                # Optionally remove from bookshelf or mark as no longer accessible
                if purchase.bookshelf_item_id:
                    result = await db.execute(
                        select(BookshelfItem).where(BookshelfItem.id == purchase.bookshelf_item_id)
                    )
                    bookshelf_item = result.scalar_one_or_none()
                    if bookshelf_item:
                        bookshelf_item.is_owned = False
                        bookshelf_item.epub_url = None  # Remove EPUB access
                
                await db.commit()
            
            return {'status': 'success', 'type': 'refunded'}
        except Exception as e:
            await db.rollback()
            return {'status': 'error', 'message': str(e)}
    
    @staticmethod
    def get_publishable_key() -> str:
        """Get Stripe publishable key for frontend"""
        return os.getenv("STRIPE_PUBLISHABLE_KEY", "")
