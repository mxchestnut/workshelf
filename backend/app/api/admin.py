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
from app.schemas.collaboration import ScholarshipDecision, ScholarshipRequestResponse

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

