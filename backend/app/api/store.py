"""
Store API Routes
Browse and purchase books from the WorkShelf store
"""
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, or_, func
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.store import StoreItem, Purchase, StoreItemStatus, PurchaseStatus
from app.services.stripe_service import StripeService


router = APIRouter(prefix="/store", tags=["store"])


# ============================================================================
# Pydantic Models (Request/Response Schemas)
# ============================================================================

class StoreItemResponse(BaseModel):
    """Response model for a store item"""
    id: int
    title: str
    author_name: str
    author_id: Optional[int]
    description: Optional[str]
    long_description: Optional[str]
    genres: Optional[List[str]]
    isbn: Optional[str]
    price_usd: float
    currency: str
    discount_percentage: int
    final_price: float  # After discount
    cover_url: Optional[str]
    sample_url: Optional[str]
    total_sales: int
    rating_average: Optional[float]
    rating_count: int
    is_featured: bool
    is_bestseller: bool
    is_new_release: bool
    published_at: Optional[datetime]
    
    # Audiobook fields
    has_audiobook: bool = False
    audiobook_narrator: Optional[str] = None
    audiobook_duration_minutes: Optional[int] = None
    audiobook_file_url: Optional[str] = None
    audiobook_sample_url: Optional[str] = None
    audiobook_file_format: Optional[str] = None
    audiobook_file_size_bytes: Optional[int] = None
    audiobook_price_usd: Optional[float] = None
    audiobook_final_price: Optional[float] = None  # After discount
    
    # Computed fields
    available_formats: List[str] = Field(default_factory=list)  # ["ebook", "audiobook"]
    has_ebook: bool = True  # True if epub_blob_url is set
    
    class Config:
        from_attributes = True


class CheckoutRequest(BaseModel):
    """Request to create checkout session"""
    store_item_id: int
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutResponse(BaseModel):
    """Response with checkout URL"""
    checkout_url: str
    session_id: str
    purchase_id: int


class PurchaseResponse(BaseModel):
    """Response model for a purchase"""
    id: int
    store_item_id: int
    store_item: StoreItemResponse
    amount_paid: float
    currency: str
    status: str
    completed_at: Optional[datetime]
    bookshelf_item_id: Optional[int]
    access_granted: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class PublicKeyResponse(BaseModel):
    """Response with Stripe publishable key"""
    publishable_key: str


# ============================================================================
# Store Browse Endpoints
# ============================================================================

@router.get("/browse", response_model=List[StoreItemResponse])
async def browse_store(
    search: Optional[str] = None,
    genre: Optional[str] = None,
    format: Optional[str] = None,  # "ebook", "audiobook", or None for both
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    featured: Optional[bool] = None,
    bestseller: Optional[bool] = None,
    new_release: Optional[bool] = None,
    sort_by: str = "published_at",  # published_at, price_asc, price_desc, popular
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    Browse books available in the store.
    
    **TEMPORARILY DISABLED** - Store is under maintenance.
    Returns empty array until schema issues are resolved.
    """
    # TEMPORARY: Return empty store while fixing schema issues
    return []
    # Build query using select()
    query = select(StoreItem).where(StoreItem.status == StoreItemStatus.ACTIVE)
    
    # Apply filters
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                StoreItem.title.ilike(search_term),
                StoreItem.author_name.ilike(search_term)
            )
        )
    
    if genre:
        # PostgreSQL JSON array contains
        query = query.where(StoreItem.genres.contains([genre]))
    
    # Format filter
    if format == "ebook":
        query = query.where(StoreItem.epub_blob_url.isnot(None))
    elif format == "audiobook":
        query = query.where(StoreItem.has_audiobook == True)
    
    if min_price is not None:
        query = query.where(StoreItem.price_usd >= min_price)
    
    if max_price is not None:
        query = query.where(StoreItem.price_usd <= max_price)
    
    if featured is not None:
        query = query.where(StoreItem.is_featured == featured)
    
    if bestseller is not None:
        query = query.where(StoreItem.is_bestseller == bestseller)
    
    if new_release is not None:
        query = query.where(StoreItem.is_new_release == new_release)
    
    # Apply sorting
    if sort_by == "price_asc":
        query = query.order_by(StoreItem.price_usd.asc())
    elif sort_by == "price_desc":
        query = query.order_by(StoreItem.price_usd.desc())
    elif sort_by == "popular":
        query = query.order_by(desc(StoreItem.total_sales))
    else:  # published_at (default)
        query = query.order_by(desc(StoreItem.published_at))
    
    # Pagination
    query = query.offset(offset).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    items = result.scalars().all()
    
    # Calculate final prices
    response = []
    for item in items:
        final_price = float(item.price_usd)
        if item.discount_percentage > 0:
            final_price = final_price * (1 - item.discount_percentage / 100)
        
        # Calculate audiobook final price
        audiobook_final = None
        if item.has_audiobook and item.audiobook_price_usd:
            audiobook_final = float(item.audiobook_price_usd)
            if item.discount_percentage > 0:
                audiobook_final = audiobook_final * (1 - item.discount_percentage / 100)
            audiobook_final = round(audiobook_final, 2)
        
        # Determine available formats
        formats = []
        if item.epub_blob_url:
            formats.append("ebook")
        if item.has_audiobook:
            formats.append("audiobook")
        
        response.append(StoreItemResponse(
            id=item.id,
            title=item.title,
            author_name=item.author_name,
            author_id=item.author_id,
            description=item.description,
            long_description=item.long_description,
            genres=item.genres,
            isbn=item.isbn,
            price_usd=float(item.price_usd),
            currency=item.currency,
            discount_percentage=item.discount_percentage,
            final_price=round(final_price, 2),
            cover_url=item.cover_blob_url,
            sample_url=item.sample_blob_url,
            total_sales=item.total_sales,
            rating_average=float(item.rating_average) if item.rating_average else None,
            rating_count=item.rating_count,
            is_featured=item.is_featured,
            is_bestseller=item.is_bestseller,
            is_new_release=item.is_new_release,
            published_at=item.published_at,
            # Audiobook fields
            has_audiobook=item.has_audiobook,
            audiobook_narrator=item.audiobook_narrator,
            audiobook_duration_minutes=item.audiobook_duration_minutes,
            audiobook_file_url=item.audiobook_file_url,
            audiobook_sample_url=item.audiobook_sample_url,
            audiobook_file_format=item.audiobook_file_format,
            audiobook_file_size_bytes=item.audiobook_file_size_bytes,
            audiobook_price_usd=float(item.audiobook_price_usd) if item.audiobook_price_usd else None,
            audiobook_final_price=audiobook_final,
            available_formats=formats,
            has_ebook=bool(item.epub_blob_url)
        ))
    
    return response


@router.get("/{item_id}", response_model=StoreItemResponse)
async def get_store_item(
    item_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific store item
    
    **TEMPORARILY DISABLED** - Store is under maintenance.
    """
    raise HTTPException(status_code=503, detail="Store temporarily disabled for maintenance")
    result = await db.execute(
        select(StoreItem).where(
            StoreItem.id == item_id,
            StoreItem.status == StoreItemStatus.ACTIVE
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Store item not found")
    
    # Increment view count
    item.view_count += 1
    await db.commit()
    
    # Calculate final price
    final_price = float(item.price_usd)
    if item.discount_percentage > 0:
        final_price = final_price * (1 - item.discount_percentage / 100)
    
    # Calculate audiobook final price
    audiobook_final = None
    if item.has_audiobook and item.audiobook_price_usd:
        audiobook_final = float(item.audiobook_price_usd)
        if item.discount_percentage > 0:
            audiobook_final = audiobook_final * (1 - item.discount_percentage / 100)
        audiobook_final = round(audiobook_final, 2)
    
    # Determine available formats
    formats = []
    if item.epub_blob_url:
        formats.append("ebook")
    if item.has_audiobook:
        formats.append("audiobook")
    
    return StoreItemResponse(
        id=item.id,
        title=item.title,
        author_name=item.author_name,
        author_id=item.author_id,
        description=item.description,
        long_description=item.long_description,
        genres=item.genres,
        isbn=item.isbn,
        price_usd=float(item.price_usd),
        currency=item.currency,
        discount_percentage=item.discount_percentage,
        final_price=round(final_price, 2),
        cover_url=item.cover_blob_url,
        sample_url=item.sample_blob_url,
        total_sales=item.total_sales,
        rating_average=float(item.rating_average) if item.rating_average else None,
        rating_count=item.rating_count,
        is_featured=item.is_featured,
        is_bestseller=item.is_bestseller,
        is_new_release=item.is_new_release,
        published_at=item.published_at,
        # Audiobook fields
        has_audiobook=item.has_audiobook,
        audiobook_narrator=item.audiobook_narrator,
        audiobook_duration_minutes=item.audiobook_duration_minutes,
        audiobook_file_url=item.audiobook_file_url,
        audiobook_sample_url=item.audiobook_sample_url,
        audiobook_file_format=item.audiobook_file_format,
        audiobook_file_size_bytes=item.audiobook_file_size_bytes,
        audiobook_price_usd=float(item.audiobook_price_usd) if item.audiobook_price_usd else None,
        audiobook_final_price=audiobook_final,
        available_formats=formats,
        has_ebook=bool(item.epub_blob_url)
    )


# ============================================================================
# Purchase Endpoints
# ============================================================================

@router.post("/create-checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a Stripe checkout session for purchasing a book.
    
    **TEMPORARILY DISABLED** - Store is under maintenance.
    """
    raise HTTPException(status_code=503, detail="Store temporarily disabled for maintenance")
    # Get store item
    result = await db.execute(
        select(StoreItem).where(
            StoreItem.id == request.store_item_id,
            StoreItem.status == StoreItemStatus.ACTIVE
        )
    )
    store_item = result.scalar_one_or_none()
    
    if not store_item:
        raise HTTPException(status_code=404, detail="Store item not found or not available")
    
    # Check if user already owns this book
    result = await db.execute(
        select(Purchase).where(
            and_(
                Purchase.user_id == current_user.id,
                Purchase.store_item_id == store_item.id,
                Purchase.status == PurchaseStatus.COMPLETED
            )
        )
    )
    existing_purchase = result.scalar_one_or_none()
    
    if existing_purchase:
        raise HTTPException(status_code=400, detail="You already own this book")
    
    # Create checkout session
    result = await StripeService.create_checkout_session(
        store_item=store_item,
        user_id=current_user.id,
        db=db,
        success_url=request.success_url,
        cancel_url=request.cancel_url
    )
    
    return CheckoutResponse(**result)


@router.get("/my-purchases", response_model=List[PurchaseResponse])
async def get_my_purchases(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all purchases for the current user"""
    query = select(Purchase).where(Purchase.user_id == current_user.id)
    
    if status:
        query = query.where(Purchase.status == status)
    
    result = await db.execute(query.order_by(desc(Purchase.created_at)))
    purchases = result.scalars().all()
    
    response = []
    for purchase in purchases:
        # Get store item details
        result = await db.execute(select(StoreItem).where(StoreItem.id == purchase.store_item_id))
        store_item = result.scalar_one_or_none()
        if not store_item:
            continue
        
        # Calculate final price
        final_price = float(store_item.price_usd)
        if store_item.discount_percentage > 0:
            final_price = final_price * (1 - store_item.discount_percentage / 100)
        
        response.append(PurchaseResponse(
            id=purchase.id,
            store_item_id=purchase.store_item_id,
            store_item=StoreItemResponse(
                id=store_item.id,
                title=store_item.title,
                author_name=store_item.author_name,
                author_id=store_item.author_id,
                description=store_item.description,
                long_description=store_item.long_description,
                genres=store_item.genres,
                isbn=store_item.isbn,
                price_usd=float(store_item.price_usd),
                currency=store_item.currency,
                discount_percentage=store_item.discount_percentage,
                final_price=round(final_price, 2),
                cover_url=store_item.cover_blob_url,
                sample_url=store_item.sample_blob_url,
                total_sales=store_item.total_sales,
                rating_average=float(store_item.rating_average) if store_item.rating_average else None,
                rating_count=store_item.rating_count,
                is_featured=store_item.is_featured,
                is_bestseller=store_item.is_bestseller,
                is_new_release=store_item.is_new_release,
                published_at=store_item.published_at
            ),
            amount_paid=float(purchase.amount_paid),
            currency=purchase.currency,
            status=purchase.status,
            completed_at=purchase.completed_at,
            bookshelf_item_id=purchase.bookshelf_item_id,
            access_granted=purchase.access_granted,
            created_at=purchase.created_at
        ))
    
    return response


# ============================================================================
# Webhook Endpoint
# ============================================================================

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db)
):
    """
    Handle Stripe webhook events.
    
    This endpoint is called by Stripe when payment events occur.
    It processes the payment and grants access to the purchased book.
    """
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")
    
    payload = await request.body()
    
    result = await StripeService.handle_webhook(
        payload=payload,
        signature=stripe_signature,
        db=db
    )
    
    return result


# ============================================================================
# Configuration Endpoint
# ============================================================================

@router.get("/config/publishable-key", response_model=PublicKeyResponse)
async def get_publishable_key():
    """Get Stripe publishable key for frontend"""
    return PublicKeyResponse(
        publishable_key=StripeService.get_publishable_key()
    )


# ============================================================================
# Admin: Store Seeding (Staff Only)
# ============================================================================

@router.get("/config/publishable-key", response_model=PublicKeyResponse)
async def get_publishable_key():
    """Get Stripe publishable key for frontend"""
    return PublicKeyResponse(
        publishable_key=StripeService.get_publishable_key()
    )

