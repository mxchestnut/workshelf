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
from app.models.store import StoreItem
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
    Search published/public documents with tag filtering.
    Only searches documents that are published, in beta access, or publicly shared.
    Does NOT search private/draft documents to respect privacy.
    
    Args:
        db: Database session
        query: Search query string
        user_id: Current user ID (for access control)
        skip: Pagination offset
        limit: Results per page
        include_tags: List of tag names to include (OR logic by default, AND if require_all_tags=True)
        exclude_tags: List of tag names to exclude (content warnings)
        require_all_tags: If True, require ALL include_tags (AND logic). Default is OR logic.
    """
    
    search_pattern = f"%{query}%"
    
    # Base query - ONLY search published or beta documents (respect privacy)
    stmt = select(Document).where(
        or_(
            Document.status == 'published',  # Published documents are public
            Document.status == 'beta'  # Beta documents may be accessible
        )
    )
    
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
    count_stmt = select(func.count(Document.id)).where(
        or_(
            Document.status == 'published',
            Document.status == 'beta'
        )
    )
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


async def search_store_items(
    db: AsyncSession,
    query: str,
    skip: int = 0,
    limit: int = 20
) -> tuple[List[SearchResult], int]:
    """
    Search published store items (books in the marketplace).
    Only searches items that are available for purchase/reading.
    
    Args:
        db: Database session
        query: Search query string
        skip: Pagination offset
        limit: Results per page
    """
    
    search_pattern = f"%{query}%"
    
    # Search published store items
    stmt = select(StoreItem).where(
        and_(
            StoreItem.is_published == True,
            or_(
                StoreItem.title.ilike(search_pattern),
                StoreItem.description.ilike(search_pattern),
                StoreItem.author_name.ilike(search_pattern)
            )
        )
    ).offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    # Convert to search results
    results = [
        SearchResult(
            id=item.id,
            type="document",  # Keep as document type for compatibility
            title=item.title,
            description=item.description or f"By {item.author_name}",
            url=f"/read/{item.id}",
            relevance_score=1.0
        )
        for item in items
    ]
    
    # Get total count
    count_stmt = select(func.count(StoreItem.id)).where(
        and_(
            StoreItem.is_published == True,
            or_(
                StoreItem.title.ilike(search_pattern),
                StoreItem.description.ilike(search_pattern),
                StoreItem.author_name.ilike(search_pattern)
            )
        )
    )
    total = await db.scalar(count_stmt)
    
    return results, total or 0


async def search_all(
    db: AsyncSession,
    search_query: SearchQuery,
    user_id: int
) -> tuple[List[SearchResult], int]:
    """Search across all content types - documents and store items"""
    
    skip = (search_query.page - 1) * search_query.page_size
    
    if search_query.type == "document":
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
    elif search_query.type == "all":
        # Search both documents and store items
        doc_results, doc_total = await search_documents(
            db, 
            search_query.q, 
            user_id, 
            0,  # Get first page of each
            search_query.page_size // 2,  # Split results
            include_tags=search_query.include_tags,
            exclude_tags=search_query.exclude_tags,
            require_all_tags=search_query.require_all_tags
        )
        
        store_results, store_total = await search_store_items(
            db,
            search_query.q,
            0,
            search_query.page_size // 2
        )
        
        # Combine results
        all_results = doc_results + store_results
        total = doc_total + store_total
        
        return all_results, total
    
    # For other types, just return empty for now
    return [], 0
