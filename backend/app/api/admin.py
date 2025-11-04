"""
Admin API - Platform Administration Endpoints
Secured via Tailscale for internal staff use only
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.collaboration import Group
from app.models.studio_customization import StudioCustomDomain
from app.models.user import User

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


# ============================================================================
# Admin Endpoints
# ============================================================================

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(db: Session = Depends(get_db)):
    """
    Get admin dashboard statistics
    
    **Note**: This endpoint should be protected by Tailscale network security.
    Only accessible from internal network.
    """
    from sqlalchemy import func
    from app.models.studio import Studio
    
    # Count pending subdomain requests
    pending_subdomains = db.query(Group).filter(
        and_(
            Group.subdomain_requested.isnot(None),
            Group.subdomain_approved == False
        )
    ).count()
    
    # Count pending custom domains
    pending_domains = db.query(StudioCustomDomain).filter(
        StudioCustomDomain.status == "pending"
    ).count()
    
    # Total counts
    total_groups = db.query(Group).count()
    total_studios = db.query(Studio).count()
    total_users = db.query(User).count()
    
    # Approved today
    today = datetime.utcnow().date()
    approved_today = db.query(Group).filter(
        and_(
            Group.subdomain_approved == True,
            func.date(Group.subdomain_approved_at) == today
        )
    ).count()
    
    return AdminStatsResponse(
        pending_group_subdomains=pending_subdomains,
        pending_custom_domains=pending_domains,
        total_groups=total_groups,
        total_studios=total_studios,
        total_users=total_users,
        approved_subdomains_today=approved_today
    )


@router.get("/groups/pending", response_model=List[GroupPendingResponse])
async def get_pending_group_subdomains(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get all groups with pending subdomain requests
    
    **Tailscale-protected endpoint** - Only accessible from internal network.
    """
    from sqlalchemy.orm import joinedload
    from app.models.collaboration import GroupMember, GroupMemberRole
    
    groups = db.query(Group).filter(
        and_(
            Group.subdomain_requested.isnot(None),
            Group.subdomain_approved == False,
            Group.subdomain_rejection_reason.is_(None)  # Not already rejected
        )
    ).order_by(Group.created_at.desc()).limit(limit).offset(offset).all()
    
    results = []
    for group in groups:
        # Find the owner
        owner = db.query(User).join(GroupMember).filter(
            and_(
                GroupMember.group_id == group.id,
                GroupMember.role == GroupMemberRole.OWNER
            )
        ).first()
        
        results.append(GroupPendingResponse(
            id=group.id,
            name=group.name,
            slug=group.slug,
            subdomain_requested=group.subdomain_requested,
            created_at=group.created_at,
            member_count=group.member_count,
            owner_username=owner.username if owner else None
        ))
    
    return results


@router.post("/groups/{group_id}/subdomain/approve")
async def approve_group_subdomain(
    group_id: int,
    request: GroupApprovalRequest,
    admin_user_id: int = Query(..., description="Admin user ID approving this request"),
    db: Session = Depends(get_db)
):
    """
    Approve or reject a group subdomain request
    
    **Tailscale-protected endpoint** - Only accessible from internal network.
    """
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if not group.subdomain_requested:
        raise HTTPException(status_code=400, detail="No subdomain requested for this group")
    
    if request.approved:
        # Check if subdomain is already taken
        existing = db.query(Group).filter(
            and_(
                Group.subdomain_requested == group.subdomain_requested,
                Group.subdomain_approved == True,
                Group.id != group_id
            )
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Subdomain '{group.subdomain_requested}' is already taken by another group"
            )
        
        group.subdomain_approved = True
        group.subdomain_approved_at = datetime.utcnow()
        group.subdomain_approved_by = admin_user_id
        group.subdomain_rejection_reason = None
        
        message = f"Subdomain '{group.subdomain_requested}' approved for group '{group.name}'"
    else:
        group.subdomain_approved = False
        group.subdomain_rejection_reason = request.rejection_reason
        
        message = f"Subdomain '{group.subdomain_requested}' rejected for group '{group.name}'"
    
    db.commit()
    db.refresh(group)
    
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
    db: Session = Depends(get_db)
):
    """
    Get all custom domains pending approval
    
    **Tailscale-protected endpoint** - Only accessible from internal network.
    """
    from app.models.studio import Studio
    
    domains = db.query(StudioCustomDomain).join(Studio).filter(
        StudioCustomDomain.status == "pending"
    ).order_by(StudioCustomDomain.created_at.desc()).limit(limit).offset(offset).all()
    
    results = []
    for domain in domains:
        studio = db.query(Studio).filter(Studio.id == domain.studio_id).first()
        
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
    db: Session = Depends(get_db)
):
    """
    Approve or reject a custom domain request
    
    **Tailscale-protected endpoint** - Only accessible from internal network.
    """
    domain = db.query(StudioCustomDomain).filter(StudioCustomDomain.id == domain_id).first()
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
    
    db.commit()
    db.refresh(domain)
    
    return {
        "success": True,
        "message": message,
        "domain": {
            "id": domain.id,
            "domain": domain.domain,
            "status": domain.status
        }
    }
