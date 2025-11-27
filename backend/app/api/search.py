"""
Search API endpoints
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.schemas.search import SearchQuery, SearchResponse
from app.services import search_service, user_service

router = APIRouter(prefix="/search", tags=["search"])


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
