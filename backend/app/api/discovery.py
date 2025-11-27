"""Discovery API - Content discovery and trending"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.database import get_db
from app.services.discovery_service import DiscoveryService
from app.schemas.discovery import (
    DiscoverRequest, DiscoverResponse, TrendingDocument,
    CategoryResponse, SortBy, TimeRange
)

router = APIRouter(prefix="/discovery", tags=["discovery"])


@router.get("/trending")
async def get_trending(time_range: Optional[TimeRange] = None, skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db)):
    """Get trending documents."""
    documents, total = await DiscoveryService.get_trending_documents(db, time_range, skip, limit)
    return {"documents": documents, "total": total, "skip": skip, "limit": limit}


@router.get("/discover")
async def discover_content(
    category: Optional[str] = None,
    tags: Optional[List[str]] = Query(None),
    sort_by: SortBy = SortBy.RECENT,
    time_range: Optional[TimeRange] = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Discover content based on filters."""
    documents, total = await DiscoveryService.discover_documents(
        db, category, tags, sort_by, time_range, skip, limit
    )
    
    # Get categories
    categories = await DiscoveryService.get_categories(db)
    
    return {
        "documents": documents,
        "categories": categories,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get all categories."""
    return await DiscoveryService.get_categories(db)
