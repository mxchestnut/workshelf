"""
Admin Store API - Store Administration Endpoints
Secured via Keycloak authentication with is_staff check
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from decimal import Decimal

from app.core.database import get_db
from app.core.azure_auth import require_staff
from app.models.user import User
from app.models.store import StoreItem, StoreItemStatus

router = APIRouter(prefix="/admin", tags=["admin-store"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class StoreStatsResponse(BaseModel):
    """Store-wide statistics"""
    total_revenue: float
    total_sales: int
    active_items: int
    avg_sale_price: float
    
    class Config:
        from_attributes = True


class StoreItemAnalyticsResponse(BaseModel):
    """Store item with sales data for analytics"""
    id: int
    title: str
    author_name: str
    price_usd: float
    audiobook_price_usd: Optional[float]
    has_audiobook: bool
    total_sales: int
    total_revenue: float
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Store Analytics Endpoints
# ============================================================================

@router.get("/store/stats", response_model=StoreStatsResponse)
async def get_store_stats(
    db: AsyncSession = Depends(get_db),
    staff_user: Optional[dict] = Depends(require_staff)
):
    """
    Get overall store statistics (staff only)
    """
    # Get total revenue and sales from all completed purchases
    from app.models.store import Purchase, PurchaseStatus
    
    revenue_query = select(
        func.coalesce(func.sum(Purchase.amount_paid), 0).label('total_revenue'),
        func.count(Purchase.id).label('total_sales')
    ).where(Purchase.status == PurchaseStatus.COMPLETED)
    
    revenue_result = await db.execute(revenue_query)
    revenue_data = revenue_result.one()
    
    # Get active items count
    active_count_query = select(func.count(StoreItem.id)).where(
        StoreItem.status == StoreItemStatus.ACTIVE
    )
    active_count_result = await db.execute(active_count_query)
    active_items = active_count_result.scalar()
    
    # Calculate average sale price
    avg_price = float(revenue_data.total_revenue) / revenue_data.total_sales if revenue_data.total_sales > 0 else 0.0
    
    return StoreStatsResponse(
        total_revenue=float(revenue_data.total_revenue),
        total_sales=revenue_data.total_sales,
        active_items=active_items or 0,
        avg_sale_price=avg_price
    )


@router.get("/store/items", response_model=List[StoreItemAnalyticsResponse])
async def get_store_items(
    db: AsyncSession = Depends(get_db),
    staff_user: Optional[dict] = Depends(require_staff)
):
    """
    Get all store items with sales analytics (staff only)
    """
    # Get all items with their sales totals
    from app.models.store import Purchase, PurchaseStatus
    
    query = select(
        StoreItem,
        func.coalesce(func.sum(Purchase.amount_paid), 0).label('total_revenue'),
        func.count(Purchase.id).label('total_sales')
    ).outerjoin(
        Purchase,
        (Purchase.store_item_id == StoreItem.id) & (Purchase.status == PurchaseStatus.COMPLETED)
    ).group_by(StoreItem.id).order_by(StoreItem.created_at.desc())
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        StoreItemAnalyticsResponse(
            id=item.id,
            title=item.title,
            author_name=item.author_name,
            price_usd=float(item.price_usd),
            audiobook_price_usd=float(item.audiobook_price_usd) if item.audiobook_price_usd else None,
            has_audiobook=item.has_audiobook,
            total_sales=total_sales,
            total_revenue=float(total_revenue),
            status=item.status.value,
            created_at=item.created_at
        )
        for item, total_revenue, total_sales in rows
    ]


@router.put("/store/items/{item_id}/status")
async def update_item_status(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    staff_user: Optional[dict] = Depends(require_staff)
):
    """
    Toggle store item status between active and inactive (staff only)
    """
    query = select(StoreItem).where(StoreItem.id == item_id)
    result = await db.execute(query)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Store item not found")
    
    # Toggle status
    if item.status == StoreItemStatus.ACTIVE:
        item.status = StoreItemStatus.INACTIVE
    else:
        item.status = StoreItemStatus.ACTIVE
    
    await db.commit()
    await db.refresh(item)
    
    return {
        "success": True,
        "item_id": item.id,
        "new_status": item.status.value
    }


@router.delete("/store/items/{item_id}")
async def delete_store_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    staff_user: Optional[dict] = Depends(require_staff)
):
    """
    Delete a store item (staff only)
    """
    query = select(StoreItem).where(StoreItem.id == item_id)
    result = await db.execute(query)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Store item not found")
    
    # Check if item has purchases
    if item.total_sales > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete item with {item.total_sales} existing purchases. Consider marking as inactive instead."
        )
    
    await db.delete(item)
    await db.commit()
    
    return {"success": True, "item_id": item_id}


# ============================================================================
# Store Seeding
# ============================================================================

@router.post("/store/seed")
async def seed_store_items(
    current_user: dict = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Seed the store with top 100 public domain classics.
    Staff-only endpoint to populate initial catalog.
    """
    from scripts.top_100_classics import TOP_100_CLASSICS
    
    # Get first user as seller (or use current_user)
    result = await db.execute(select(User).limit(1))
    seller = result.scalar_one_or_none()
    
    if not seller:
        raise HTTPException(status_code=400, detail="No users found in database")
    
    # Check if store is already seeded
    count_query = select(func.count(StoreItem.id))
    result = await db.execute(count_query)
    existing_count = result.scalar()
    
    if existing_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Store already has {existing_count} items. Clear existing items first if reseeding."
        )
    
    created_count = 0
    for classic in TOP_100_CLASSICS:
        # Calculate page count
        page_count = classic["word_count"] // 250
        
        # Build Gutenberg URLs
        gutenberg_id = classic["gutenberg_id"]
        epub_url = f"https://www.gutenberg.org/ebooks/{gutenberg_id}.epub.images"
        cover_url = f"https://www.gutenberg.org/cache/epub/{gutenberg_id}/pg{gutenberg_id}.cover.medium.jpg"
        
        item = StoreItem(
            seller_id=seller.id,
            title=classic["title"],
            author_name=classic["author_name"],
            description=classic.get("description", ""),
            price_usd=Decimal("2.99"),
            epub_blob_url=epub_url,
            cover_image_url=cover_url,
            word_count=classic["word_count"],
            page_count=page_count,
            language="en",
            status=StoreItemStatus.ACTIVE,
            is_featured=classic.get("is_featured", False),
            is_bestseller=classic.get("is_bestseller", False),
            is_new_release=classic.get("is_new_release", False),
            tags=classic.get("tags", []),
            has_audiobook=False,
        )
        
        db.add(item)
        created_count += 1
    
    await db.commit()
    
    return {
        "success": True,
        "items_created": created_count,
        "message": f"Successfully seeded {created_count} public domain classics at $2.99 each"
    }
