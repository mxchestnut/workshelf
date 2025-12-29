"""
Search API endpoints
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, and_
from typing import List, Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.schemas.search import SearchQuery, SearchResponse
from app.services import search_service, user_service
from app.models.user import User

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/users")
async def search_users(
    q: str = Query(..., description="Search query for username or display name"),
    limit: int = Query(10, ge=1, le=50, description="Number of results to return"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Search for users by username or display name"""
    
    # Get current user to exclude from results
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    search_pattern = f"%{q}%"
    
    # Search users by username or display name
    stmt = select(User).where(
        and_(
            User.id != user.id,  # Exclude current user
            or_(
                func.lower(User.username).like(func.lower(search_pattern)),
                func.lower(User.display_name).like(func.lower(search_pattern))
            )
        )
    ).limit(limit)
    
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    # Format results
    return {
        "results": {
            "users": [
                {
                    "id": u.id,
                    "username": u.username,
                    "display_name": u.display_name,
                    "avatar_url": None  # Add avatar support later if needed
                }
                for u in users
            ]
        }
    }


@router.post("", response_model=SearchResponse)
async def search(
    search_query: SearchQuery,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Search across the platform"""
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    results, total = await search_service.search_all(db, search_query, user.id)
    
    skip = (search_query.page - 1) * search_query.page_size
    
    return SearchResponse(
        query=search_query.q,
        results=results,
        total=total,
        page=search_query.page,
        page_size=search_query.page_size,
        has_more=(skip + len(results)) < total
    )
