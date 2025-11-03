"""
Discovery Service - Content discovery, trending, categories
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select, func, or_, desc
from datetime import datetime, timedelta
from typing import List, Optional

from ..models.reading import Category
from ..models.document import Document
from ..schemas.discovery import SortBy, TimeRange


class DiscoveryService:
    """Service for content discovery."""
    
    @staticmethod
    async def get_trending_documents(
        db: AsyncSession,
        time_range: Optional[TimeRange] = None,
        skip: int = 0,
        limit: int = 20
    ) -> tuple[List[Document], int]:
        """Get trending published documents."""
        # Calculate trending score based on views, likes (placeholder logic)
        # In reality, would use more sophisticated algorithm
        
        stmt = select(Document).filter(
            Document.status == 'published'
        )
        
        # Filter by time range if specified
        if time_range and time_range != TimeRange.ALL_TIME:
            days = {
                TimeRange.TODAY: 1,
                TimeRange.WEEK: 7,
                TimeRange.MONTH: 30,
                TimeRange.YEAR: 365
            }.get(time_range, 30)
            
            cutoff = datetime.utcnow() - timedelta(days=days)
            stmt = stmt.filter(Document.created_at >= cutoff)
        
        # Order by created_at (simplified - in production would use trending score)
        stmt = stmt.order_by(desc(Document.created_at)).offset(skip).limit(limit)
        
        result = await db.execute(stmt)
        items = list(result.scalars().all())
        
        # Count total
        count_stmt = select(func.count()).select_from(Document).filter(
            Document.status == 'published'
        )
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        return items, total
    
    @staticmethod
    async def discover_documents(
        db: AsyncSession,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        sort_by: SortBy = SortBy.RECENT,
        time_range: Optional[TimeRange] = None,
        skip: int = 0,
        limit: int = 20
    ) -> tuple[List[Document], int]:
        """Discover documents based on filters."""
        stmt = select(Document).filter(
            Document.status == 'published'
        )
        
        # Filter by category (if implemented)
        # if category:
        #     stmt = stmt.filter(Document.category == category)
        
        # Filter by tags (if implemented)
        # if tags:
        #     stmt = stmt.join(DocumentTag).join(Tag).filter(Tag.name.in_(tags))
        
        # Filter by time range
        if time_range and time_range != TimeRange.ALL_TIME:
            days = {
                TimeRange.TODAY: 1,
                TimeRange.WEEK: 7,
                TimeRange.MONTH: 30,
                TimeRange.YEAR: 365
            }.get(time_range, 30)
            
            cutoff = datetime.utcnow() - timedelta(days=days)
            stmt = stmt.filter(Document.created_at >= cutoff)
        
        # Sort
        if sort_by == SortBy.RECENT:
            stmt = stmt.order_by(desc(Document.created_at))
        elif sort_by == SortBy.POPULAR:
            # Simplified - would use view count or engagement metrics
            stmt = stmt.order_by(desc(Document.created_at))
        elif sort_by == SortBy.TRENDING:
            # Simplified - would use trending algorithm
            stmt = stmt.order_by(desc(Document.created_at))
        
        stmt = stmt.offset(skip).limit(limit)
        
        result = await db.execute(stmt)
        items = list(result.scalars().all())
        
        # Count total (simplified - should match filters)
        count_stmt = select(func.count()).select_from(Document).filter(
            Document.status == 'published'
        )
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        return items, total
    
    @staticmethod
    async def get_categories(
        db: AsyncSession,
        active_only: bool = True
    ) -> List[Category]:
        """Get all categories."""
        stmt = select(Category)
        
        if active_only:
            stmt = stmt.filter(Category.is_active == True)
        
        stmt = stmt.order_by(Category.sort_order, Category.name)
        
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    @staticmethod
    async def create_category(
        db: AsyncSession,
        name: str,
        slug: str,
        description: Optional[str] = None,
        icon: Optional[str] = None,
        sort_order: int = 0
    ) -> Category:
        """Create a category."""
        category = Category(
            name=name,
            slug=slug,
            description=description,
            icon=icon,
            sort_order=sort_order,
            is_active=True
        )
        db.add(category)
        await db.commit()
        await db.refresh(category)
        return category
    
    @staticmethod
    async def get_category_by_slug(
        db: AsyncSession,
        slug: str
    ) -> Optional[Category]:
        """Get category by slug."""
        stmt = select(Category).filter(Category.slug == slug)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
