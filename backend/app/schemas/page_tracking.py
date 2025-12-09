"""
Pydantic schemas for page tracking API
"""
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class PageStatusBase(BaseModel):
    page_path: str = Field(..., max_length=255)
    status: Literal["construction", "ready", "stable"]


class PageStatusCreate(PageStatusBase):
    pass


class PageStatusUpdate(BaseModel):
    status: Optional[Literal["construction", "ready", "stable"]] = None


class PageStatusResponse(PageStatusBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PageVersionBase(BaseModel):
    page_path: str = Field(..., max_length=255)
    version: str = Field(..., max_length=20)
    changes: Optional[str] = None


class PageVersionCreate(PageVersionBase):
    pass


class PageVersionResponse(PageVersionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserPageViewBase(BaseModel):
    page_path: str = Field(..., max_length=255)


class UserPageViewCreate(UserPageViewBase):
    pass


class UserPageViewMarkViewed(BaseModel):
    marked_as_viewed: bool = True


class UserPageViewResponse(UserPageViewBase):
    id: int
    user_id: int
    last_viewed_at: Optional[datetime]
    marked_as_viewed: bool
    marked_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class PageStatusIcon(BaseModel):
    """
    Computed status icon for a page based on user's view history
    - construction: Page under construction (from page_status)
    - star-half: Ready for review OR has updates since last view
    - star: User has marked as viewed
    - moon-star: No changes since last view
    """
    page_path: str
    page_title: str
    icon: Literal["construction", "star-half", "star", "moon-star"]
    status: Literal["construction", "ready", "stable"]
    current_version: Optional[str]
    last_viewed_at: Optional[datetime]
    marked_as_viewed: bool
    has_updates: bool


class NavigationItem(BaseModel):
    """
    Navigation menu item with all metadata
    """
    page_path: str
    page_title: str
    icon: Literal["construction", "star-half", "star", "moon-star"]
    status: Literal["construction", "ready", "stable"]
    current_version: Optional[str]
    description: Optional[str] = None
    requires_auth: bool = True
    is_staff_only: bool = False


class NavigationResponse(BaseModel):
    """
    Complete navigation structure with filtering
    """
    items: List[NavigationItem]
    total_count: int
    filter_applied: Optional[str] = None
