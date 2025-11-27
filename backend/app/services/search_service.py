"""
Search service - Business logic for searching across the platform
"""

from typing import List, Optional
from sqlalchemy import select, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.document import Document, DocumentTag, Tag
from app.models.user import User
from app.models.studio import Studio
from app.schemas.search import SearchQuery, SearchResult


async def search_documents(
    db: AsyncSession,
    query: str,
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    include_tags: Optional[List[str]] = None,
    exclude_tags: Optional[List[str]] = None,
    require_all_tags: bool = False
) -> tuple[List[SearchResult], int]:
    """
    Search user's documents with tag filtering.
    
    Args:
        db: Database session
        query: Search query string
        user_id: User ID for filtering
        skip: Pagination offset
        limit: Results per page
        include_tags: List of tag names to include (OR logic by default, AND if require_all_tags=True)
        exclude_tags: List of tag names to exclude (content warnings)
        require_all_tags: If True, require ALL include_tags (AND logic). Default is OR logic.
    """
    
    search_pattern = f"%{query}%"
    
    # Base query
    stmt = select(Document).where(Document.owner_id == user_id)
    
    # Add text search filters
    stmt = stmt.where(
        or_(
            Document.title.ilike(search_pattern),
            Document.description.ilike(search_pattern),
            Document.content.ilike(search_pattern)
        )
    )
    
    # Apply tag filters if provided
    if include_tags or exclude_tags:
        # Subquery for exclude tags (documents to exclude)
        if exclude_tags:
            exclude_subquery = (
                select(DocumentTag.document_id)
                .join(Tag, DocumentTag.tag_id == Tag.id)
                .where(
                    Tag.user_id == user_id,
                    Tag.name.in_(exclude_tags)
                )
            )
            stmt = stmt.where(~Document.id.in_(exclude_subquery))
        
        # Subquery for include tags
        if include_tags:
            if require_all_tags:
                # AND logic: Document must have ALL specified tags
                for tag_name in include_tags:
                    tag_subquery = (
                        select(DocumentTag.document_id)
                        .join(Tag, DocumentTag.tag_id == Tag.id)
                        .where(
                            Tag.user_id == user_id,
                            Tag.name == tag_name
                        )
                    )
                    stmt = stmt.where(Document.id.in_(tag_subquery))
            else:
                # OR logic: Document must have AT LEAST ONE of the specified tags
                include_subquery = (
                    select(DocumentTag.document_id)
                    .join(Tag, DocumentTag.tag_id == Tag.id)
                    .where(
                        Tag.user_id == user_id,
                        Tag.name.in_(include_tags)
                    )
                )
                stmt = stmt.where(Document.id.in_(include_subquery))
    
    # Apply pagination
    stmt = stmt.offset(skip).limit(limit)
    
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
    
    # Get total count with same filters
    count_stmt = select(func.count(Document.id)).where(Document.owner_id == user_id)
    count_stmt = count_stmt.where(
        or_(
            Document.title.ilike(search_pattern),
            Document.description.ilike(search_pattern),
            Document.content.ilike(search_pattern)
        )
    )
    
    # Apply same tag filters to count
    if exclude_tags:
        exclude_subquery = (
            select(DocumentTag.document_id)
            .join(Tag, DocumentTag.tag_id == Tag.id)
            .where(
                Tag.user_id == user_id,
                Tag.name.in_(exclude_tags)
            )
        )
        count_stmt = count_stmt.where(~Document.id.in_(exclude_subquery))
    
    if include_tags:
        if require_all_tags:
            for tag_name in include_tags:
                tag_subquery = (
                    select(DocumentTag.document_id)
                    .join(Tag, DocumentTag.tag_id == Tag.id)
                    .where(
                        Tag.user_id == user_id,
                        Tag.name == tag_name
                    )
                )
                count_stmt = count_stmt.where(Document.id.in_(tag_subquery))
        else:
            include_subquery = (
                select(DocumentTag.document_id)
                .join(Tag, DocumentTag.tag_id == Tag.id)
                .where(
                    Tag.user_id == user_id,
                    Tag.name.in_(include_tags)
                )
            )
            count_stmt = count_stmt.where(Document.id.in_(include_subquery))
    
    total = await db.scalar(count_stmt)
    
    return results, total or 0


async def search_all(
    db: AsyncSession,
    search_query: SearchQuery,
    user_id: int
) -> tuple[List[SearchResult], int]:
    """Search across all content types with tag filtering support"""
    
    if search_query.type == "document" or search_query.type == "all":
        skip = (search_query.page - 1) * search_query.page_size
        return await search_documents(
            db, 
            search_query.q, 
            user_id, 
            skip, 
            search_query.page_size,
            include_tags=search_query.include_tags,
            exclude_tags=search_query.exclude_tags,
            require_all_tags=search_query.require_all_tags
        )
    
    # For now, just return empty for other types
    return [], 0
