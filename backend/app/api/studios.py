"""
Studio API endpoints
"""

from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.schemas.studio import (
    StudioCreate, StudioUpdate, StudioResponse, StudioListResponse,
    StudioMemberResponse, StudioMemberAdd, StudioMemberUpdateRole
)
from app.schemas.studio_customization import (
    StudioThemeCreate, StudioThemeResponse,
    StudioCustomDomainCreate, StudioCustomDomainResponse,
    DocumentViewCreate
)
from app.schemas.studio_analytics import (
    StudioMetricsResponse, DocumentMetricsResponse, TimeSeriesResponse
)
from app.services import studio_service, user_service
from app.services.studio_customization_service import StudioCustomizationService
from app.services.studio_analytics_service import StudioAnalyticsService

router = APIRouter(prefix="/studios", tags=["studios"])


@router.post("", response_model=StudioResponse, status_code=201)
async def create_studio(
    studio_data: StudioCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new studio"""
    
    # Get or create user in database
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    studio = await studio_service.create_studio(
        db, studio_data, user.id, user.tenant_id
    )
    
    return studio


@router.get("", response_model=StudioListResponse)
async def list_studios(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List user's studios"""
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    skip = (page - 1) * page_size
    studios, total = await studio_service.list_user_studios(
        db, user.id, skip, page_size
    )
    
    return {
        "studios": studios,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (skip + len(studios)) < total
    }


@router.get("/{studio_id}", response_model=StudioResponse)
async def get_studio(
    studio_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a studio by ID"""
    
    studio = await studio_service.get_studio_by_id(db, studio_id)
    if not studio:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Studio not found")
    
    return studio


@router.put("/{studio_id}", response_model=StudioResponse)
async def update_studio(
    studio_id: int,
    studio_data: StudioUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a studio"""
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    studio = await studio_service.update_studio(
        db, studio_id, studio_data, user.id
    )
    
    return studio


@router.delete("/{studio_id}", status_code=204)
async def delete_studio(
    studio_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a studio"""
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    await studio_service.delete_studio(db, studio_id, user.id)


@router.post("/{studio_id}/members", response_model=StudioMemberResponse, status_code=201)
async def add_studio_member(
    studio_id: int,
    member_data: StudioMemberAdd,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a member to a studio"""
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    member = await studio_service.add_studio_member(
        db, studio_id, member_data, user.id
    )
    
    return member


@router.delete("/{studio_id}/members/{user_id}", status_code=204)
async def remove_studio_member(
    studio_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Remove a member from a studio"""
    
    requester = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    await studio_service.remove_studio_member(
        db, studio_id, user_id, requester.id
    )


# ============================================================================
# PHASE 5: STUDIO CUSTOMIZATION
# ============================================================================

@router.post("/{studio_id}/theme", response_model=StudioThemeResponse, status_code=201)
async def create_or_update_studio_theme(
    studio_id: int,
    theme_data: StudioThemeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create or update studio theme"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    theme = await StudioCustomizationService.create_or_update_theme(
        db, studio_id, **theme_data.dict(exclude_unset=True)
    )
    return theme


@router.get("/{studio_id}/theme", response_model=StudioThemeResponse)
async def get_studio_theme(
    studio_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get studio theme"""
    theme = await StudioCustomizationService.get_studio_theme(db, studio_id)
    if not theme:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Studio theme not found")
    return theme


@router.delete("/{studio_id}/theme", status_code=204)
async def delete_studio_theme(
    studio_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete studio theme (revert to defaults)"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    await StudioCustomizationService.delete_theme(db, studio_id)


@router.post("/{studio_id}/custom-domains", response_model=StudioCustomDomainResponse, status_code=201)
async def create_custom_domain(
    studio_id: int,
    domain_data: StudioCustomDomainCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a custom domain to studio"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    domain = await StudioCustomizationService.create_custom_domain(
        db, studio_id, domain_data.domain, domain_data.subdomain
    )
    return domain


@router.get("/{studio_id}/custom-domains", response_model=List[StudioCustomDomainResponse])
async def list_custom_domains(
    studio_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all custom domains for a studio"""
    domains = await StudioCustomizationService.get_studio_domains(db, studio_id)
    return domains


@router.post("/{studio_id}/custom-domains/{domain_id}/verify", response_model=StudioCustomDomainResponse)
async def verify_custom_domain(
    studio_id: int,
    domain_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Verify a custom domain"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    domain = await StudioCustomizationService.verify_custom_domain(db, domain_id)
    return domain


@router.delete("/{studio_id}/custom-domains/{domain_id}", status_code=204)
async def delete_custom_domain(
    studio_id: int,
    domain_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a custom domain"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    await StudioCustomizationService.delete_custom_domain(db, domain_id, studio_id)


# ============================================================================
# PHASE 5: STUDIO ANALYTICS
# ============================================================================

@router.get("/{studio_id}/analytics", response_model=StudioMetricsResponse)
async def get_studio_analytics(
    studio_id: int,
    start_date: str = None,
    end_date: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get studio analytics and metrics"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    from datetime import datetime
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    
    metrics = await StudioAnalyticsService.get_studio_metrics(db, studio_id, start, end)
    return metrics


@router.get("/{studio_id}/analytics/time-series", response_model=TimeSeriesResponse)
async def get_time_series(
    studio_id: int,
    metric: str = "views",
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get time series data for analytics"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    data = await StudioAnalyticsService.get_time_series_data(db, studio_id, metric, days)
    return {"metric": metric, "data": data}


@router.post("/documents/{document_id}/views", status_code=201)
async def record_document_view(
    document_id: int,
    view_data: DocumentViewCreate,
    db: AsyncSession = Depends(get_db)
):
    """Record a document view (for analytics)"""
    view = await StudioCustomizationService.record_view(
        db, document_id, **view_data.dict(exclude_unset=True)
    )
    return {"id": view.id, "is_unique": view.is_unique}


@router.get("/documents/{document_id}/analytics", response_model=DocumentMetricsResponse)
async def get_document_analytics(
    document_id: int,
    start_date: str = None,
    end_date: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get document analytics and metrics"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    from datetime import datetime
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    
    metrics = await StudioAnalyticsService.get_document_metrics(db, document_id, start, end)
    return metrics
