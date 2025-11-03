"""
Search service - Business logic for searching across the platform
"""

from typing import List
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.user import User
from app.models.studio import Studio
from app.schemas.search import SearchQuery, SearchResult


async def search_documents(
    db: AsyncSession,
    query: str,
    user_id: int,
    skip: int = 0,
    limit: int = 20
) -> tuple[List[SearchResult], int]:
    """Search user's documents"""
    
    search_pattern = f"%{query}%"
    
    # Search in title, description, and content
    stmt = (
        select(Document)
        .where(
            Document.owner_id == user_id,
            or_(
                Document.title.ilike(search_pattern),
                Document.description.ilike(search_pattern),
                Document.content.ilike(search_pattern)
            )
        )
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    documents = result.scalars().all()
    
    # Convert to search results
    results = [
        SearchResult(
            id=doc.id,
            type="document",
            title=doc.title,
            description=doc.description,
            url=f"/documents/{doc.id}",
            relevance_score=1.0
        )
        for doc in documents
    ]
    
    # Get total count
    count_stmt = select(func.count(Document.id)).where(
        Document.owner_id == user_id,
        or_(
            Document.title.ilike(search_pattern),
            Document.description.ilike(search_pattern),
            Document.content.ilike(search_pattern)
        )
    )
    total = await db.scalar(count_stmt)
    
    return results, total or 0


async def search_all(
    db: AsyncSession,
    search_query: SearchQuery,
    user_id: int
) -> tuple[List[SearchResult], int]:
    """Search across all content types"""
    
    if search_query.type == "document" or search_query.type == "all":
        skip = (search_query.page - 1) * search_query.page_size
        return await search_documents(
            db, search_query.q, user_id, skip, search_query.page_size
        )
    
    # For now, just return empty for other types
    return [], 0
