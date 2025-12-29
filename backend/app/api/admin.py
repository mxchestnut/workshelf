"""
Admin API - Platform Administration Endpoints
Secured via Keycloak authentication with is_staff check
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import joinedload
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict

from app.core.database import get_db
from app.core.auth import require_staff
from app.models.collaboration import Group, GroupMember, GroupMemberRole
from app.models.studio_customization import StudioCustomDomain
from app.models.user import User
from app.models.store import StoreItem, StoreItemStatus
from app.schemas.collaboration import ScholarshipDecision, ScholarshipRequestResponse
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
    
    model_config = ConfigDict(from_attributes=True)


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
    
    model_config = ConfigDict(from_attributes=True)


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


class UserApprovalRequest(BaseModel):
    """Request to approve/reject a user registration"""
    approved: bool
    rejection_reason: Optional[str] = None


class PendingUserResponse(BaseModel):
    """Pending user awaiting approval"""
    id: int
    email: str
    username: Optional[str]
    display_name: Optional[str]
    created_at: datetime
    is_approved: bool
    
    model_config = ConfigDict(from_attributes=True)


class UserAccountResponse(BaseModel):
    """User account information for admin panel"""
    id: int
    email: str
    username: Optional[str]
    display_name: Optional[str]
    is_staff: bool
    is_approved: bool
    is_active: bool
    is_verified: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Admin Endpoints
# ============================================================================

@router.get("/users", response_model=List[UserAccountResponse])
async def get_all_users(
    staff_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, description="Search by email, username, or display name"),
    filter_staff: Optional[bool] = Query(None, description="Filter by staff status"),
    filter_approved: Optional[bool] = Query(None, description="Filter by approval status"),
    filter_active: Optional[bool] = Query(None, description="Filter by active status")
):
    """
    Get all users with optional filtering
    
    **Requires**: Platform staff authentication (is_staff=True)
    """
    query = select(User).order_by(User.created_at.desc())
    
    # Apply filters
    conditions = []
    if search:
        search_term = f"%{search.lower()}%"
        conditions.append(
            or_(
                func.lower(User.email).like(search_term),
                func.lower(User.username).like(search_term),
                func.lower(User.display_name).like(search_term)
            )
        )
    
    if filter_staff is not None:
        conditions.append(User.is_staff == filter_staff)
    
    if filter_approved is not None:
        conditions.append(User.is_approved == filter_approved)
    
    if filter_active is not None:
        conditions.append(User.is_active == filter_active)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.limit(limit).offset(offset)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return [
        UserAccountResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            display_name=user.display_name,
            is_staff=user.is_staff,
            is_approved=user.is_approved,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at
        )
        for user in users
    ]


@router.get("/users/pending", response_model=List[PendingUserResponse])
async def get_pending_users(
    staff_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Get users pending approval
    
    **Requires**: Platform staff authentication (is_staff=True)
    """
    result = await db.execute(
        select(User)
        .where(User.is_approved == False)
        .order_by(User.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    pending_users = result.scalars().all()
    
    return [
        PendingUserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            display_name=user.display_name,
            created_at=user.created_at,
            is_approved=user.is_approved
        )
        for user in pending_users
    ]


@router.post("/users/{user_id}/approve")
async def approve_user(
    user_id: int,
    request: UserApprovalRequest,
    staff_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve or reject a user registration
    
    **Requires**: Platform staff authentication (is_staff=True)
    """
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if request.approved:
        user.is_approved = True
        user.is_active = True
        await db.commit()
        return {"success": True, "message": f"User {user.email} approved"}
    else:
        # Reject: deactivate user
        user.is_approved = False
        user.is_active = False
        await db.commit()
        return {"success": True, "message": f"User {user.email} rejected", "reason": request.rejection_reason}


class UserUpdateRequest(BaseModel):
    username: Optional[str] = None


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    update_request: UserUpdateRequest,
    staff_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user details (staff only)
    
    **Requires**: Platform staff authentication (is_staff=True)
    """
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # If username provided, update it
    if update_request.username is not None:
        # Check if username is already taken
        existing = await db.execute(
            select(User).where(
                User.username == update_request.username,
                User.id != user_id
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already taken")
        
        user.username = update_request.username
    
    await db.commit()
    await db.refresh(user)
    
    return {"success": True, "message": "User updated successfully", "username": user.username}


@router.post("/users/{user_id}/make-staff")
async def make_user_staff(
    user_id: int,
    staff_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Grant staff privileges to a user
    
    **Requires**: Platform staff authentication (is_staff=True)
    """
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_staff:
        raise HTTPException(status_code=400, detail="User is already a staff member")
    
    user.is_staff = True
    await db.commit()
    await db.refresh(user)
    
    return {"success": True, "message": f"User {user.email} is now a staff member"}


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
    today = datetime.now(timezone.utc).date()
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
    
    # Get member counts and owner info for all groups efficiently
    group_ids = [group.id for group in groups]
    
    # Count members for each group
    member_counts_result = await db.execute(
        select(GroupMember.group_id, func.count(GroupMember.id))
        .where(GroupMember.group_id.in_(group_ids))
        .group_by(GroupMember.group_id)
    )
    member_counts = dict(member_counts_result.all())
    
    # Get owners (users with OWNER role) for each group
    owners_result = await db.execute(
        select(GroupMember)
        .where(
            GroupMember.group_id.in_(group_ids),
            GroupMember.role == GroupMemberRole.OWNER
        )
        .options(joinedload(GroupMember.user))
    )
    owners_by_group = {
        member.group_id: member.user.username 
        for member in owners_result.scalars().unique().all()
        if member.user
    }
    
    results = []
    for group in groups:
        results.append(GroupPendingResponse(
            id=group.id,
            name=group.name,
            slug=group.slug,
            subdomain_requested=group.subdomain_requested,
            created_at=group.created_at,
            member_count=member_counts.get(group.id, 0),
            owner_username=owners_by_group.get(group.id)
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
        group.subdomain_approved_at = datetime.now(timezone.utc)
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
    status: Optional[str] = Query(None, pattern="^(pending|approved|rejected|negotiating)$"),
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
        scholarship.reviewed_at = datetime.now(timezone.utc)
        scholarship.reviewed_by = staff_user.id if staff_user else None
        scholarship.expires_at = datetime.now(timezone.utc) + relativedelta(months=decision.duration_months or 12)
        
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
        scholarship.reviewed_at = datetime.now(timezone.utc)
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
    # Lazy import to avoid startup errors if packages not installed yet
    from app.services.price_scraper import PriceScraper
    from app.services.pricing_engine import PricingEngine
    
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
    # Lazy import to avoid startup errors if packages not installed yet
    from app.services.price_scraper import PriceScraper
    from app.services.pricing_engine import PricingEngine
    
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
    # Lazy import to avoid startup errors if packages not installed yet
    from app.services.pricing_engine import PricingEngine
    
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
    # Lazy import to avoid startup errors if packages not installed yet
    from app.services.pricing_engine import PricingEngine
    
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


# ============================================================================
# Store Analytics (Staff Only)
# ============================================================================

class StoreStatsResponse(BaseModel):
    """Store-wide statistics"""
    total_revenue: float
    total_sales: int
    active_items: int
    avg_sale_price: float
    
    model_config = ConfigDict(from_attributes=True)


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
    
    model_config = ConfigDict(from_attributes=True)


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
    status: Optional[str] = Query(None, description="Filter by status: active, inactive, draft"),
    search: Optional[str] = Query(None, description="Search by title or author"),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    staff_user: Optional[dict] = Depends(require_staff)
):
    """
    Get all store items with sales analytics (staff only)
    """
    query = select(StoreItem).order_by(StoreItem.total_revenue.desc())
    
    # Apply filters
    if status:
        if status == "active":
            query = query.where(StoreItem.status == StoreItemStatus.ACTIVE)
        elif status == "inactive":
            query = query.where(StoreItem.status == StoreItemStatus.INACTIVE)
        elif status == "draft":
            query = query.where(StoreItem.status == StoreItemStatus.DRAFT)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                StoreItem.title.ilike(search_term),
                StoreItem.author_name.ilike(search_term)
            )
        )
    
    query = query.limit(limit).offset(offset)
    
    result = await db.execute(query)
    items = result.scalars().all()
    
    return [
        StoreItemAnalyticsResponse(
            id=item.id,
            title=item.title,
            author_name=item.author_name,
            price_usd=float(item.price_usd),
            audiobook_price_usd=float(item.audiobook_price_usd) if item.audiobook_price_usd else None,
            has_audiobook=item.has_audiobook,
            total_sales=item.total_sales,
            total_revenue=float(item.total_revenue),
            status=item.status,
            created_at=item.created_at
        )
        for item in items
    ]


@router.put("/store/items/{item_id}/status")
async def update_store_item_status(
    item_id: int,
    status: str,
    db: AsyncSession = Depends(get_db),
    staff_user: Optional[dict] = Depends(require_staff)
):
    """
    Update store item status (staff only)
    """
    # Validate status
    valid_statuses = [s.value for s in StoreItemStatus]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Get item
    query = select(StoreItem).where(StoreItem.id == item_id)
    result = await db.execute(query)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Store item not found")
    
    # Update status
    item.status = status
    if status == StoreItemStatus.ACTIVE and not item.published_at:
        item.published_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(item)
    
    return {"success": True, "item_id": item_id, "status": status}


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
    Seed the store with top 10 public domain classics.
    Staff-only endpoint to populate initial catalog.
    """
    # Top 10 most popular public domain classics (inline to avoid import issues)
    CLASSICS = [
        {"title": "Pride and Prejudice", "author_name": "Jane Austen", "gutenberg_id": 1342, "word_count": 122000, "description": "A witty tale of love, marriage, and social class in Regency England.", "tags": ["romance", "classic", "literary-fiction", "public-domain"], "is_featured": True, "is_bestseller": True},
        {"title": "Frankenstein", "author_name": "Mary Shelley", "gutenberg_id": 84, "word_count": 75000, "description": "The original science fiction horror novel about creation and responsibility.", "tags": ["horror", "sci-fi", "classic", "public-domain"], "is_featured": True, "is_bestseller": False},
        {"title": "Dracula", "author_name": "Bram Stoker", "gutenberg_id": 345, "word_count": 164000, "description": "The definitive vampire novel that shaped horror literature forever.", "tags": ["horror", "gothic", "classic", "public-domain"], "is_featured": True, "is_bestseller": False},
        {"title": "The Adventures of Sherlock Holmes", "author_name": "Arthur Conan Doyle", "gutenberg_id": 1661, "word_count": 110000, "description": "Twelve brilliant detective stories featuring the legendary Sherlock Holmes.", "tags": ["mystery", "detective", "classic", "public-domain"], "is_featured": True, "is_bestseller": True},
        {"title": "A Tale of Two Cities", "author_name": "Charles Dickens", "gutenberg_id": 98, "word_count": 135000, "description": "Set during the French Revolution, a story of sacrifice, resurrection, and love.", "tags": ["historical-fiction", "classic", "public-domain"], "is_featured": True, "is_bestseller": False},
        {"title": "The Picture of Dorian Gray", "author_name": "Oscar Wilde", "gutenberg_id": 174, "word_count": 78000, "description": "A philosophical novel about beauty, morality, and the consequences of hedonism.", "tags": ["classic", "philosophical-fiction", "public-domain"], "is_featured": True, "is_bestseller": False},
        {"title": "Alice's Adventures in Wonderland", "author_name": "Lewis Carroll", "gutenberg_id": 11, "word_count": 27000, "description": "A whimsical journey through a fantastical underground world.", "tags": ["fantasy", "classic", "children", "public-domain"], "is_featured": True, "is_bestseller": True},
        {"title": "The Great Gatsby", "author_name": "F. Scott Fitzgerald", "gutenberg_id": 64317, "word_count": 48000, "description": "The quintessential American novel of jazz age excess and tragedy.", "tags": ["american-literature", "classic", "public-domain"], "is_featured": True, "is_bestseller": True},
        {"title": "Wuthering Heights", "author_name": "Emily Brontë", "gutenberg_id": 768, "word_count": 107000, "description": "A dark, passionate tale of love and revenge on the Yorkshire moors.", "tags": ["romance", "gothic", "classic", "public-domain"], "is_featured": True, "is_bestseller": False},
        {"title": "Jane Eyre", "author_name": "Charlotte Brontë", "gutenberg_id": 1260, "word_count": 189000, "description": "An orphan girl becomes a governess and finds independence, love, and mystery.", "tags": ["romance", "classic", "gothic", "public-domain"], "is_featured": True, "is_bestseller": True},
    ]
    
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
    for classic in CLASSICS:
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



