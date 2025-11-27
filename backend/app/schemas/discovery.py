"""
Content discovery and search schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SortBy(str, Enum):
    """Sort options."""
    RELEVANCE = "relevance"
    RECENT = "recent"
    POPULAR = "popular"
    TRENDING = "trending"


class TimeRange(str, Enum):
    """Time range for filtering."""
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"
    ALL_TIME = "all_time"


class DiscoverRequest(BaseModel):
    """Request to discover content."""
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    sort_by: SortBy = SortBy.RECENT
    time_range: Optional[TimeRange] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class TrendingDocument(BaseModel):
    """Trending document summary."""
    id: int
    title: str
    author_username: str
    author_avatar: Optional[str]
    excerpt: str
    word_count: int
    published_at: datetime
    view_count: int
    like_count: int
    comment_count: int
    trending_score: float


class CategoryResponse(BaseModel):
    """Content category."""
    id: int
    name: str
    slug: str
    description: Optional[str]
    document_count: int
    icon: Optional[str]


class DiscoverResponse(BaseModel):
    """Discovery results."""
    documents: List[TrendingDocument]
    categories: List[CategoryResponse]
    total: int
    page: int
    page_size: int
