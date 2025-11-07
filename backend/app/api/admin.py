"""
Admin API - Platform Administration Endpoints
Secured via Keycloak authentication with is_staff check
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import require_staff
from app.models.collaboration import Group
from app.models.studio_customization import StudioCustomDomain
from app.models.user import User
from app.models.store import StoreItem, StoreItemStatus
from app.schemas.collaboration import ScholarshipDecision, ScholarshipRequestResponse
from app.services.price_scraper import PriceScraper
from app.services.pricing_engine import PricingEngine
from decimal import Decimal

router = APIRouter(prefix="/admin", tags=["admin"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class GroupApprovalRequest(BaseModel):
    """Request to approve/reject a group subdomain"""
    approved: bool
    rejection_reason: Optional[str] = None


class GroupPendingResponse(BaseModel):
    """Pending group subdomain request"""
    id: int
    name: str
    slug: str
    subdomain_requested: str
    created_at: datetime
    member_count: int
    owner_username: Optional[str] = None
    
    class Config:
        from_attributes = True


class DomainApprovalRequest(BaseModel):
    """Request to approve/reject a custom domain"""
    approved: bool
    rejection_reason: Optional[str] = None


class DomainPendingResponse(BaseModel):
    """Pending custom domain request"""
    id: int
    studio_id: int
    domain: str
    subdomain: Optional[str]
    status: str
    created_at: datetime
    studio_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class AdminStatsResponse(BaseModel):
    """Admin dashboard statistics"""
    pending_group_subdomains: int
    pending_custom_domains: int
    total_groups: int
    total_studios: int
    total_users: int
    approved_subdomains_today: int


class InterestStats(BaseModel):
    """Interest usage statistics"""
    interest: str
    count: int


# ============================================================================
# Admin Endpoints
# ============================================================================

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    staff_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Get admin dashboard statistics
    
    **Requires**: Platform staff authentication (is_staff=True)
    """
    from app.models.studio import Studio
    
    # Count pending subdomain requests
    pending_subdomains_result = await db.execute(
        select(func.count()).select_from(Group).filter(
            and_(
                Group.subdomain_requested.isnot(None),
                Group.subdomain_approved == False
            )
        )
    )
    pending_subdomains = pending_subdomains_result.scalar() or 0
    
    # Count pending custom domains  
    pending_domains_result = await db.execute(
        select(func.count()).select_from(StudioCustomDomain).filter(
            StudioCustomDomain.status == "pending"
        )
    )
    pending_domains = pending_domains_result.scalar() or 0
    
    # Total counts
    total_groups_result = await db.execute(select(func.count()).select_from(Group))
    total_groups = total_groups_result.scalar() or 0
    
    total_studios_result = await db.execute(select(func.count()).select_from(Studio))
    total_studios = total_studios_result.scalar() or 0
    
    total_users_result = await db.execute(select(func.count()).select_from(User))
    total_users = total_users_result.scalar() or 0
    
    # Approved today
    today = datetime.utcnow().date()
    approved_today_result = await db.execute(
        select(func.count()).select_from(Group).filter(
            and_(
                Group.subdomain_approved == True,
                func.date(Group.subdomain_approved_at) == today
            )
        )
    )
    approved_today = approved_today_result.scalar() or 0
    
    return AdminStatsResponse(
        pending_group_subdomains=pending_subdomains,
        pending_custom_domains=pending_domains,
        total_groups=total_groups,
        total_studios=total_studios,
        total_users=total_users,
        approved_subdomains_today=approved_today
    )


@router.get("/interests/top", response_model=List[InterestStats])
async def get_top_interests(
    limit: int = Query(10, le=50),
    staff_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the most popular interests across all groups
    
    **Requires**: Platform staff authentication (is_staff=True)
    
    Returns the top N interests by usage count across all groups.
    This helps staff understand what kinds of templates to create.
    """
    # Get all groups with interests
    result = await db.execute(
        select(Group.interests).filter(Group.interests.isnot(None))
    )
    groups = result.scalars().all()
    
    # Count interest occurrences
    interest_counts = {}
    for interests_array in groups:
        if interests_array:
            for interest in interests_array:
                interest_counts[interest] = interest_counts.get(interest, 0) + 1
    
    # Sort by count and get top N
    sorted_interests = sorted(
        interest_counts.items(), 
        key=lambda x: x[1], 
        reverse=True
    )[:limit]
    
    return [
        InterestStats(interest=interest, count=count)
        for interest, count in sorted_interests
    ]


@router.get("/groups/pending", response_model=List[GroupPendingResponse])
async def get_pending_group_subdomains(
    staff_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Get all groups with pending subdomain requests
    
    **Requires**: Platform staff authentication (is_staff=True)
    """
    result = await db.execute(
        select(Group).filter(
            and_(
                Group.subdomain_requested.isnot(None),
                Group.subdomain_approved == False,
                Group.subdomain_rejection_reason.is_(None)
            )
        ).order_by(Group.created_at.desc()).limit(limit).offset(offset)
    )
    groups = result.scalars().all()
    
    results = []
    for group in groups:
        results.append(GroupPendingResponse(
            id=group.id,
            name=group.name,
            slug=group.slug,
            subdomain_requested=group.subdomain_requested,
            created_at=group.created_at,
            member_count=0,  # TODO: Calculate member count when group_members table is available
            owner_username=None  # TODO: Add owner lookup when GroupMemberRole enum exists
        ))
    
    return results


@router.post("/groups/{group_id}/subdomain/approve")
async def approve_group_subdomain(
    group_id: int,
    request: GroupApprovalRequest,
    staff_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
    admin_user_id: Optional[int] = Query(None, description="Admin user ID approving this request")
):
    """
    Approve or reject a group subdomain request
    
    **Requires**: Platform staff authentication (is_staff=True)
    """
    result = await db.execute(select(Group).filter(Group.id == group_id))
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if not group.subdomain_requested:
        raise HTTPException(status_code=400, detail="No subdomain requested for this group")
    
    if request.approved:
        # Check if subdomain is already taken
        existing_result = await db.execute(
            select(Group).filter(
                and_(
                    Group.subdomain_requested == group.subdomain_requested,
                    Group.subdomain_approved == True,
                    Group.id != group_id
                )
            )
        )
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Subdomain '{group.subdomain_requested}' is already taken by another group"
            )
        
        group.subdomain_approved = True
        group.subdomain_approved_at = datetime.utcnow()
        group.subdomain_approved_by = admin_user_id  # Will be None if not provided
        group.subdomain_rejection_reason = None
        
        # ✨ Automatically enable custom domain capability for approved groups
        group.can_use_custom_domain = True
        
        message = f"Subdomain '{group.subdomain_requested}' approved for group '{group.name}'. Custom domain capability enabled."
    else:
        group.subdomain_approved = False
        group.subdomain_rejection_reason = request.rejection_reason
        
        message = f"Subdomain '{group.subdomain_requested}' rejected for group '{group.name}'"
    
    await db.commit()
    await db.refresh(group)
    
    return {
        "success": True,
        "message": message,
        "group": {
            "id": group.id,
            "name": group.name,
            "subdomain": group.subdomain_requested,
            "approved": group.subdomain_approved,
            "rejection_reason": group.subdomain_rejection_reason
        }
    }


@router.get("/domains/pending", response_model=List[DomainPendingResponse])
async def get_pending_custom_domains(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    staff_user: User = Depends(require_staff)
):
    """
    Get all custom domains pending approval
    
    **Requires**: Platform staff authentication (is_staff=True)
    """
    from app.models.studio import Studio
    
    result = await db.execute(
        select(StudioCustomDomain).join(Studio).filter(
            StudioCustomDomain.status == "pending"
        ).order_by(StudioCustomDomain.created_at.desc()).limit(limit).offset(offset)
    )
    domains = result.scalars().all()
    
    results = []
    for domain in domains:
        studio_result = await db.execute(
            select(Studio).filter(Studio.id == domain.studio_id)
        )
        studio = studio_result.scalar_one_or_none()
        
        results.append(DomainPendingResponse(
            id=domain.id,
            studio_id=domain.studio_id,
            domain=domain.domain,
            subdomain=domain.subdomain,
            status=domain.status,
            created_at=domain.created_at,
            studio_name=studio.name if studio else None
        ))
    
    return results


@router.post("/domains/{domain_id}/approve")
async def approve_custom_domain(
    domain_id: int,
    request: DomainApprovalRequest,
    db: AsyncSession = Depends(get_db),
    staff_user: User = Depends(require_staff)
):
    """
    Approve or reject a custom domain request
    
    **Requires**: Platform staff authentication (is_staff=True)
    """
    result = await db.execute(
        select(StudioCustomDomain).filter(StudioCustomDomain.id == domain_id)
    )
    domain = result.scalar_one_or_none()
    
    if not domain:
        raise HTTPException(status_code=404, detail="Custom domain not found")
    
    if request.approved:
        domain.status = "verifying"
        domain.error_message = None
        message = f"Custom domain '{domain.domain}' approved and moved to verification"
    else:
        domain.status = "rejected"
        domain.error_message = request.rejection_reason
        message = f"Custom domain '{domain.domain}' rejected"
    
    await db.commit()
    await db.refresh(domain)
    
    return {
        "success": True,
        "message": message,
        "domain": {
            "id": domain.id,
            "domain": domain.domain,
            "status": domain.status
        }
    }


# ============================================================================
# Scholarship Management
# ============================================================================

@router.get("/scholarships/pending", response_model=List[ScholarshipRequestResponse])
async def get_pending_scholarships(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all pending scholarship requests (staff only)
    Returns scholarships awaiting review
    """
    from app.models.collaboration import ScholarshipRequest
    
    result = await db.execute(
        select(ScholarshipRequest)
        .where(ScholarshipRequest.status == 'pending')
        .order_by(ScholarshipRequest.requested_at.desc())
        .limit(limit)
        .offset(offset)
    )
    
    return result.scalars().all()


@router.get("/scholarships/all", response_model=List[ScholarshipRequestResponse])
async def get_all_scholarships(
    status: Optional[str] = Query(None, regex="^(pending|approved|rejected|negotiating)$"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all scholarship requests with optional status filter (staff only)
    """
    from app.models.collaboration import ScholarshipRequest
    
    query = select(ScholarshipRequest)
    
    if status:
        query = query.where(ScholarshipRequest.status == status)
    
    query = query.order_by(ScholarshipRequest.requested_at.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/scholarships/{request_id}/review")
async def review_scholarship(
    request_id: int,
    decision: ScholarshipDecision,
    current_user: dict = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve, reject, or negotiate a scholarship request (staff only)
    """
    from app.models.collaboration import ScholarshipRequest
    from dateutil.relativedelta import relativedelta
    
    # Get the scholarship request
    result = await db.execute(
        select(ScholarshipRequest).where(ScholarshipRequest.id == request_id)
    )
    scholarship = result.scalar_one_or_none()
    
    if not scholarship:
        raise HTTPException(status_code=404, detail="Scholarship request not found")
    
    if scholarship.status != 'pending':
        raise HTTPException(status_code=400, detail=f"Scholarship is already {scholarship.status}")
    
    # Get staff user
    staff_result = await db.execute(
        select(User).where(User.keycloak_id == current_user.get('sub'))
    )
    staff_user = staff_result.scalar_one_or_none()
    
    if decision.approved:
        # Approve scholarship
        scholarship.status = 'approved'
        scholarship.approved_plan = decision.approved_plan or 'free'
        scholarship.approved_discount_percent = decision.approved_discount_percent or 100
        scholarship.approved_monthly_price = decision.approved_monthly_price or 0.0
        scholarship.staff_notes = decision.staff_notes
        scholarship.reviewed_at = datetime.utcnow()
        scholarship.reviewed_by = staff_user.id if staff_user else None
        scholarship.expires_at = datetime.utcnow() + relativedelta(months=decision.duration_months or 12)
        
        # Update group
        group_result = await db.execute(
            select(Group).where(Group.id == scholarship.group_id)
        )
        group = group_result.scalar_one_or_none()
        
        if group:
            group.has_scholarship = True
            group.scholarship_plan = scholarship.approved_plan
            group.scholarship_discount_percent = scholarship.approved_discount_percent
            group.scholarship_monthly_price = scholarship.approved_monthly_price
            group.scholarship_expires_at = scholarship.expires_at
        
        message = f"Scholarship approved: {scholarship.approved_plan} plan"
        if scholarship.approved_discount_percent == 100:
            message += " (Free)"
        else:
            message += f" ({scholarship.approved_discount_percent}% off, ${scholarship.approved_monthly_price}/month)"
    
    else:
        # Reject scholarship
        scholarship.status = 'rejected'
        scholarship.rejection_reason = decision.rejection_reason
        scholarship.staff_notes = decision.staff_notes
        scholarship.reviewed_at = datetime.utcnow()
        scholarship.reviewed_by = staff_user.id if staff_user else None
        
        message = "Scholarship request rejected"
    
    await db.commit()
    await db.refresh(scholarship)
    
    return {
        "success": True,
        "message": message,
        "scholarship": {
            "id": scholarship.id,
            "status": scholarship.status,
            "approved_plan": scholarship.approved_plan,
            "approved_discount_percent": scholarship.approved_discount_percent,
            "approved_monthly_price": float(scholarship.approved_monthly_price) if scholarship.approved_monthly_price else None,
            "expires_at": scholarship.expires_at.isoformat() if scholarship.expires_at else None
        }
    }


# ============================================================================
# Price Management Endpoints
# ============================================================================

class PriceUpdateRequest(BaseModel):
    """Request to update prices"""
    store_item_ids: Optional[List[int]] = None  # If None, updates all items
    force_update: bool = False  # Update even if price change is small


class PriceAnalysisResponse(BaseModel):
    """Response with price analysis"""
    store_item_id: int
    title: str
    current_price: float
    recommended_price: float
    price_change: Optional[float]
    market_prices: dict
    reason: str
    cost_breakdown: dict
    should_update: bool


class BulkPriceUpdateResponse(BaseModel):
    """Response from bulk price update"""
    total_items: int
    items_analyzed: int
    items_updated: int
    items_skipped: int
    items_failed: int
    updates: List[PriceAnalysisResponse]


@router.post("/prices/analyze", response_model=List[PriceAnalysisResponse])
async def analyze_prices(
    request: PriceUpdateRequest,
    db: AsyncSession = Depends(get_db),
    staff_user: Optional[dict] = Depends(require_staff)
):
    """
    Analyze market prices for store items without updating
    
    This endpoint scrapes competitor prices and calculates optimal pricing
    but doesn't make any changes. Use this to preview what would happen.
    """
    try:
        # Get store items to analyze
        if request.store_item_ids:
            result = await db.execute(
                select(StoreItem).where(
                    StoreItem.id.in_(request.store_item_ids),
                    StoreItem.status == StoreItemStatus.ACTIVE
                )
            )
        else:
            # Analyze all active items
            result = await db.execute(
                select(StoreItem).where(StoreItem.status == StoreItemStatus.ACTIVE)
            )
        
        items = result.scalars().all()
        
        if not items:
            raise HTTPException(status_code=404, detail="No store items found")
        
        analyses = []
        
        for item in items:
            try:
                # Scrape market prices
                market_prices = await PriceScraper.get_market_prices(
                    isbn=item.isbn,
                    title=item.title,
                    author=item.author_name
                )
                
                # Calculate optimal price
                pricing_result = PricingEngine.calculate_optimal_price(
                    market_prices=market_prices,
                    current_price=item.price_usd
                )
                
                analyses.append(PriceAnalysisResponse(
                    store_item_id=item.id,
                    title=item.title,
                    current_price=float(item.price_usd),
                    recommended_price=float(pricing_result['recommended_price']),
                    price_change=float(pricing_result['price_change']) if pricing_result['price_change'] else None,
                    market_prices={k: float(v) if v else None for k, v in pricing_result['market_prices'].items()},
                    reason=pricing_result['reason'],
                    cost_breakdown={k: float(v) if isinstance(v, (int, float)) else v 
                                   for k, v in pricing_result['cost_breakdown'].items()},
                    should_update=pricing_result['should_update']
                ))
                
            except Exception as e:
                print(f"Error analyzing price for item {item.id}: {e}")
                continue
        
        return analyses
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in price analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Price analysis failed: {str(e)}")


@router.post("/prices/update", response_model=BulkPriceUpdateResponse)
async def update_prices(
    request: PriceUpdateRequest,
    db: AsyncSession = Depends(get_db),
    staff_user: Optional[dict] = Depends(require_staff)
):
    """
    Update prices for store items based on market analysis
    
    This endpoint:
    1. Scrapes competitor prices
    2. Calculates optimal pricing with minimum margin protection
    3. Updates prices in database
    4. Returns detailed report
    """
    try:
        # Get store items to update
        if request.store_item_ids:
            result = await db.execute(
                select(StoreItem).where(
                    StoreItem.id.in_(request.store_item_ids),
                    StoreItem.status == StoreItemStatus.ACTIVE
                )
            )
        else:
            # Update all active items
            result = await db.execute(
                select(StoreItem).where(StoreItem.status == StoreItemStatus.ACTIVE)
            )
        
        items = result.scalars().all()
        
        if not items:
            raise HTTPException(status_code=404, detail="No store items found")
        
        total_items = len(items)
        items_analyzed = 0
        items_updated = 0
        items_skipped = 0
        items_failed = 0
        updates = []
        
        for item in items:
            try:
                items_analyzed += 1
                
                # Scrape market prices
                market_prices = await PriceScraper.get_market_prices(
                    isbn=item.isbn,
                    title=item.title,
                    author=item.author_name
                )
                
                # Calculate optimal price
                pricing_result = PricingEngine.calculate_optimal_price(
                    market_prices=market_prices,
                    current_price=item.price_usd
                )
                
                # Decide whether to update
                should_update = request.force_update or pricing_result['should_update']
                
                if should_update:
                    # Update price in database
                    new_price = pricing_result['recommended_price']
                    
                    # Calculate discount if applicable
                    if new_price < item.price_usd:
                        discount_pct = ((item.price_usd - new_price) / item.price_usd * 100)
                        item.discount_percentage = int(discount_pct)
                    else:
                        item.discount_percentage = 0
                    
                    item.price_usd = new_price
                    item.final_price = new_price
                    
                    items_updated += 1
                    print(f"Updated price for '{item.title}' from ${item.price_usd} to ${new_price}")
                else:
                    items_skipped += 1
                    print(f"Skipped price update for '{item.title}' - change too small")
                
                updates.append(PriceAnalysisResponse(
                    store_item_id=item.id,
                    title=item.title,
                    current_price=float(item.price_usd),
                    recommended_price=float(pricing_result['recommended_price']),
                    price_change=float(pricing_result['price_change']) if pricing_result['price_change'] else None,
                    market_prices={k: float(v) if v else None for k, v in pricing_result['market_prices'].items()},
                    reason=pricing_result['reason'],
                    cost_breakdown={k: float(v) if isinstance(v, (int, float)) else v 
                                   for k, v in pricing_result['cost_breakdown'].items()},
                    should_update=should_update
                ))
                
            except Exception as e:
                items_failed += 1
                print(f"Error updating price for item {item.id}: {e}")
                continue
        
        # Commit all changes
        await db.commit()
        
        return BulkPriceUpdateResponse(
            total_items=total_items,
            items_analyzed=items_analyzed,
            items_updated=items_updated,
            items_skipped=items_skipped,
            items_failed=items_failed,
            updates=updates
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in bulk price update: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Bulk price update failed: {str(e)}")


@router.get("/prices/minimum")
async def get_minimum_price(
    staff_user: Optional[dict] = Depends(require_staff)
):
    """
    Get the absolute minimum price we can charge
    
    This is the floor price that covers all costs plus minimum margin
    """
    minimum = PricingEngine.calculate_minimum_price()
    costs = PricingEngine.calculate_platform_costs(minimum)
    
    return {
        'minimum_price': float(minimum),
        'cost_breakdown': {k: float(v) if isinstance(v, (int, float)) else v 
                          for k, v in costs.items()},
        'explanation': 'This is the absolute minimum price that covers author split (70%), Stripe fees (2.9% + $0.30), and maintains minimum profit margin'
    }


@router.post("/prices/validate")
async def validate_price(
    price: float,
    staff_user: Optional[dict] = Depends(require_staff)
):
    """
    Validate if a price is acceptable and get detailed feedback
    """
    result = PricingEngine.validate_price(Decimal(str(price)))
    
    return {
        'is_valid': result['is_valid'],
        'price': float(result['price']),
        'minimum_price': float(result['minimum_price']),
        'cost_breakdown': {k: float(v) if isinstance(v, (int, float)) else v 
                          for k, v in result['cost_breakdown'].items()},
        'warnings': [w for w in result['warnings'] if w],
        'recommendations': [r for r in result['recommendations'] if r]
    }


