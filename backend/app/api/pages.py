"""
API endpoints for page tracking and navigation
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.page_tracking import PageTrackingService
from app.schemas.page_tracking import (
    PageStatusResponse,
    PageVersionResponse,
    PageVersionCreate,
    UserPageViewResponse,
    UserPageViewMarkViewed,
    PageStatusIcon,
    NavigationItem,
    NavigationResponse
)

router = APIRouter(prefix="/pages", tags=["pages"])


@router.get("/navigation", response_model=NavigationResponse)
async def get_navigation(
    filter_by: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all navigation items with status icons for current user.
    
    Optional filters:
    - construction: Pages under construction
    - needs-review: Pages ready for review or with updates
    - viewed: Pages user has marked as viewed
    - stable: Pages with no changes since last view
    """
    service = PageTrackingService(db)
    items = await service.get_navigation_items(
        user_id=current_user.id,
        filter_by=filter_by,
        is_staff=current_user.is_staff
    )
    
    return NavigationResponse(
        items=items,
        total_count=len(items),
        filter_applied=filter_by
    )


@router.get("/{page_path:path}/status", response_model=PageStatusIcon)
async def get_page_status(
    page_path: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed status information for a specific page including:
    - Current status icon
    - Latest version
    - User's view history
    - Whether there are updates
    """
    # Prepend slash if not present
    if not page_path.startswith('/'):
        page_path = '/' + page_path
    
    service = PageTrackingService(db)
    return await service.get_page_status_icon(page_path, current_user.id)


@router.post("/{page_path:path}/view", response_model=UserPageViewResponse)
async def record_page_view(
    page_path: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record that the current user viewed this page.
    Updates the last_viewed_at timestamp.
    """
    # Stub endpoint - return success without database operations
    # TODO: Implement proper async page tracking
    return UserPageViewResponse(
        id=0,
        user_id=current_user.id,
        page_path=page_path if page_path.startswith('/') else f'/{page_path}',
        first_viewed_at=None,
        last_viewed_at=None,
        view_count=1,
        marked_as_viewed=False
    )


@router.post("/{page_path:path}/mark-viewed", response_model=UserPageViewResponse)
async def mark_page_viewed(
    page_path: str,
    mark_request: UserPageViewMarkViewed,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a page as viewed/reviewed by the user.
    This changes the icon from star-half to star.
    """
    # Stub endpoint - return success without database operations
    # TODO: Implement proper async page tracking
    return UserPageViewResponse(
        id=0,
        user_id=current_user.id,
        page_path=page_path if page_path.startswith('/') else f'/{page_path}',
        first_viewed_at=None,
        last_viewed_at=None,
        view_count=1,
        marked_as_viewed=True
    )


@router.get("/{page_path:path}/version", response_model=Optional[PageVersionResponse])
async def get_page_version(
    page_path: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current version of a page.
    Returns None if no version has been set yet.
    """
    # Prepend slash if not present
    if not page_path.startswith('/'):
        page_path = '/' + page_path
    
    service = PageTrackingService(db)
    version = await service.get_latest_version(page_path)
    return version


@router.post("/{page_path:path}/version", response_model=PageVersionResponse)
async def create_page_version(
    page_path: str,
    version_data: PageVersionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new version entry for a page.
    Only staff members can create versions.
    """
    if not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can create page versions"
        )
    
    # Prepend slash if not present
    if not page_path.startswith('/'):
        page_path = '/' + page_path
    
    service = PageTrackingService(db)
    version = await service.create_page_version(
        page_path=page_path,
        version=version_data.version,
        changes=version_data.changes
    )
    return version
