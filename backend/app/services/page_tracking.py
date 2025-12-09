"""
Page tracking service - business logic for page versions and user views
"""
from datetime import datetime
from typing import Optional, List, Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, and_, select

from app.models.page_tracking import PageStatus, PageVersion, UserPageView
from app.schemas.page_tracking import (
    PageStatusIcon, NavigationItem, 
    PageStatusCreate, PageVersionCreate, UserPageViewCreate
)


# Complete sitemap with metadata
SITEMAP_PAGES = [
    # Public pages
    {"path": "/", "title": "Landing Page", "auth": False, "staff": False, "desc": "Hero, features, and CTA"},
    {"path": "/login", "title": "Login", "auth": False, "staff": False, "desc": "Keycloak OAuth entry"},
    
    # Main authenticated pages
    {"path": "/feed", "title": "Feed", "auth": True, "staff": False, "desc": "Personal, Global, and Discover tabs"},
    {"path": "/bookshelf", "title": "Bookshelf", "auth": True, "staff": False, "desc": "Your personal library"},
    {"path": "/studio", "title": "Studio", "auth": True, "staff": False, "desc": "Content creation dashboard"},
    {"path": "/groups", "title": "Groups", "auth": True, "staff": False, "desc": "Discover and manage groups"},
    {"path": "/collections", "title": "Collections", "auth": True, "staff": False, "desc": "Manage your collections"},
    {"path": "/search", "title": "Search", "auth": True, "staff": False, "desc": "Global content search"},
    {"path": "/store", "title": "Store", "auth": True, "staff": False, "desc": "Browse marketplace"},
    {"path": "/profile", "title": "Profile", "auth": True, "staff": False, "desc": "Your public profile"},
    {"path": "/settings", "title": "Settings", "auth": True, "staff": False, "desc": "Account settings"},
    
    # Staff pages
    {"path": "/staff", "title": "Staff Dashboard", "auth": True, "staff": True, "desc": "Site administration"},
]


class PageTrackingService:
    """Service for managing page versions and user view tracking"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_page_status(self, page_path: str, default_status: str = "ready") -> PageStatus:
        """Get existing page status or create with default"""
        result = await self.db.execute(
            select(PageStatus).filter(PageStatus.page_path == page_path)
        )
        page_status = result.scalar_one_or_none()
        if not page_status:
            page_status = PageStatus(page_path=page_path, status=default_status)
            self.db.add(page_status)
            await self.db.commit()
            await self.db.refresh(page_status)
        return page_status

    async def get_latest_version(self, page_path: str) -> Optional[PageVersion]:
        """Get the most recent version for a page"""
        result = await self.db.execute(
            select(PageVersion)
            .filter(PageVersion.page_path == page_path)
            .order_by(desc(PageVersion.created_at))
        )
        return result.scalar_one_or_none()

    async def create_page_version(self, page_path: str, version: str, changes: Optional[str] = None) -> PageVersion:
        """Create a new version entry for a page"""
        page_version = PageVersion(
            page_path=page_path,
            version=version,
            changes=changes
        )
        self.db.add(page_version)
        await self.db.commit()
        await self.db.refresh(page_version)
        return page_version

    async def get_user_page_view(self, user_id: int, page_path: str) -> Optional[UserPageView]:
        """Get user's view record for a page"""
        result = await self.db.execute(
            select(UserPageView).filter(
                and_(
                    UserPageView.user_id == user_id,
                    UserPageView.page_path == page_path
                )
            )
        )
        return result.scalar_one_or_none()

    async def record_page_view(self, user_id: int, page_path: str) -> UserPageView:
        """Record that user viewed a page (updates timestamp)"""
        view = await self.get_user_page_view(user_id, page_path)
        if view:
            view.last_viewed_at = datetime.utcnow()
        else:
            view = UserPageView(
                user_id=user_id,
                page_path=page_path,
                last_viewed_at=datetime.utcnow(),
                marked_as_viewed=False
            )
            self.db.add(view)
        await self.db.commit()
        await self.db.refresh(view)
        return view

    async def mark_page_viewed(self, user_id: int, page_path: str, marked: bool = True) -> UserPageView:
        """Mark page as viewed/reviewed by user"""
        view = await self.get_user_page_view(user_id, page_path)
        if not view:
            # Create view record if doesn't exist
            view = UserPageView(
                user_id=user_id,
                page_path=page_path,
                last_viewed_at=datetime.utcnow(),
                marked_as_viewed=marked,
                marked_at=datetime.utcnow() if marked else None
            )
            self.db.add(view)
        else:
            view.marked_as_viewed = marked
            view.marked_at = datetime.utcnow() if marked else None
        await self.db.commit()
        await self.db.refresh(view)
        return view

    async def calculate_page_icon(
        self, 
        page_path: str, 
        user_id: int
    ) -> Literal["construction", "star-half", "star", "moon-star"]:
        """
        Calculate the status icon for a page based on:
        1. Page status (construction overrides everything)
        2. User's marked status (star)
        3. Whether new version exists since last view (star-half)
        4. No changes since last view (moon-star)
        """
        # Get page status
        page_status = await self.get_or_create_page_status(page_path)
        
        # If page is under construction, always show construction icon
        if page_status.status == "construction":
            return "construction"
        
        # Get user's view record
        user_view = await self.get_user_page_view(user_id, page_path)
        
        # If user marked as viewed, show star
        if user_view and user_view.marked_as_viewed:
            return "star"
        
        # Check if there's a new version since user last viewed
        latest_version = await self.get_latest_version(page_path)
        
        if not user_view or not user_view.last_viewed_at:
            # User never viewed - if page is ready, show star-half
            if page_status.status == "ready":
                return "star-half"
            else:
                return "moon-star"
        
        # If there's a version created after user's last view
        if latest_version and latest_version.created_at > user_view.last_viewed_at:
            return "star-half"
        
        # No changes since last view
        return "moon-star"

    async def get_navigation_items(
        self, 
        user_id: int, 
        filter_by: Optional[str] = None,
        is_staff: bool = False
    ) -> List[NavigationItem]:
        """
        Get all navigation items with computed status icons
        Optional filter: 'construction', 'ready', 'needs-review', 'viewed'
        """
        items = []
        
        for page in SITEMAP_PAGES:
            # Skip staff pages if user is not staff
            if page["staff"] and not is_staff:
                continue
            
            page_status = await self.get_or_create_page_status(page["path"])
            latest_version = await self.get_latest_version(page["path"])
            icon = await self.calculate_page_icon(page["path"], user_id)
            
            # Apply filter
            if filter_by:
                if filter_by == "construction" and icon != "construction":
                    continue
                elif filter_by == "needs-review" and icon != "star-half":
                    continue
                elif filter_by == "viewed" and icon != "star":
                    continue
                elif filter_by == "stable" and icon != "moon-star":
                    continue
            
            items.append(NavigationItem(
                page_path=page["path"],
                page_title=page["title"],
                icon=icon,
                status=page_status.status,
                current_version=latest_version.version if latest_version else None,
                description=page.get("desc"),
                requires_auth=page["auth"],
                is_staff_only=page["staff"]
            ))
        
        return items

    async def get_page_status_icon(self, page_path: str, user_id: int) -> PageStatusIcon:
        """Get detailed status information for a single page"""
        page_status = await self.get_or_create_page_status(page_path)
        latest_version = await self.get_latest_version(page_path)
        user_view = await self.get_user_page_view(user_id, page_path)
        icon = await self.calculate_page_icon(page_path, user_id)
        
        # Determine if there are updates
        has_updates = False
        if latest_version and user_view and user_view.last_viewed_at:
            has_updates = latest_version.created_at > user_view.last_viewed_at
        elif latest_version and not user_view:
            has_updates = True
        
        # Find page title from sitemap
        page_title = page_path
        for page in SITEMAP_PAGES:
            if page["path"] == page_path:
                page_title = page["title"]
                break
        
        return PageStatusIcon(
            page_path=page_path,
            page_title=page_title,
            icon=icon,
            status=page_status.status,
            current_version=latest_version.version if latest_version else None,
            last_viewed_at=user_view.last_viewed_at if user_view else None,
            marked_as_viewed=user_view.marked_as_viewed if user_view else False,
            has_updates=has_updates
        )
