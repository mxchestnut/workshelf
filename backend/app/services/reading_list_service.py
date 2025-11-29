"""
Reading List Service - Bookmarks and curated reading lists
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select, func
from datetime import datetime
from typing import List, Optional

from ..models.reading import Bookmark, ReadingList, ReadingListItem
from ..models.document import Document


class BookmarkService:
    """Service for managing bookmarks."""
    
    @staticmethod
    async def create_bookmark(
        db: AsyncSession,
        user_id: int,
        document_id: int,
        notes: Optional[str] = None
    ) -> Bookmark:
        """Create a bookmark."""
        bookmark = Bookmark(
            user_id=user_id,
            document_id=document_id,
            notes=notes
        )
        db.add(bookmark)
        await db.commit()
        await db.refresh(bookmark)
        return bookmark
    
    @staticmethod
    async def get_user_bookmarks(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[Bookmark], int]:
        """Get user's bookmarks."""
        stmt = select(Bookmark).filter(
            Bookmark.user_id == user_id
        ).order_by(Bookmark.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(stmt)
        items = list(result.scalars().all())
        
        # Count total
        count_stmt = select(func.count()).select_from(Bookmark).filter(
            Bookmark.user_id == user_id
        )
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        return items, total
    
    @staticmethod
    async def is_bookmarked(
        db: AsyncSession,
        user_id: int,
        document_id: int
    ) -> bool:
        """Check if document is bookmarked."""
        stmt = select(Bookmark).filter(
            and_(
                Bookmark.user_id == user_id,
                Bookmark.document_id == document_id
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none() is not None
    
    @staticmethod
    async def delete_bookmark(
        db: AsyncSession,
        user_id: int,
        document_id: int
    ) -> bool:
        """Delete a bookmark."""
        stmt = select(Bookmark).filter(
            and_(
                Bookmark.user_id == user_id,
                Bookmark.document_id == document_id
            )
        )
        result = await db.execute(stmt)
        bookmark = result.scalar_one_or_none()
        
        if not bookmark:
            return False
        
        await db.delete(bookmark)
        await db.commit()
        return True


class ReadingListService:
    """Service for managing reading lists."""
    
    @staticmethod
    async def create_list(
        db: AsyncSession,
        user_id: int,
        name: str,
        description: Optional[str] = None,
        is_public: bool = False
    ) -> ReadingList:
        """Create a reading list."""
        reading_list = ReadingList(
            user_id=user_id,
            name=name,
            description=description,
            is_public=is_public
        )
        db.add(reading_list)
        await db.commit()
        await db.refresh(reading_list)
        return reading_list
    
    @staticmethod
    async def get_user_lists(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[ReadingList], int]:
        """Get user's reading lists."""
        stmt = select(ReadingList).filter(
            ReadingList.user_id == user_id
        ).order_by(ReadingList.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(stmt)
        items = list(result.scalars().all())
        
        # Count total
        count_stmt = select(func.count()).select_from(ReadingList).filter(
            ReadingList.user_id == user_id
        )
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        return items, total
    
    @staticmethod
    async def get_list(
        db: AsyncSession,
        list_id: int,
        user_id: Optional[int] = None
    ) -> Optional[ReadingList]:
        """Get a reading list."""
        stmt = select(ReadingList).filter(ReadingList.id == list_id)
        
        # If user_id provided, check ownership or public
        if user_id is not None:
            stmt = stmt.filter(
                (ReadingList.user_id == user_id) | (ReadingList.is_public == True)
            )
        else:
            # Public only
            stmt = stmt.filter(ReadingList.is_public == True)
        
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_list(
        db: AsyncSession,
        list_id: int,
        user_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        is_public: Optional[bool] = None
    ) -> Optional[ReadingList]:
        """Update a reading list."""
        stmt = select(ReadingList).filter(
            and_(
                ReadingList.id == list_id,
                ReadingList.user_id == user_id
            )
        )
        result = await db.execute(stmt)
        reading_list = result.scalar_one_or_none()
        
        if not reading_list:
            return None
        
        if name is not None:
            reading_list.name = name
        if description is not None:
            reading_list.description = description
        if is_public is not None:
            reading_list.is_public = is_public
        
        await db.commit()
        await db.refresh(reading_list)
        return reading_list
    
    @staticmethod
    async def delete_list(
        db: AsyncSession,
        list_id: int,
        user_id: int
    ) -> bool:
        """Delete a reading list."""
        stmt = select(ReadingList).filter(
            and_(
                ReadingList.id == list_id,
                ReadingList.user_id == user_id
            )
        )
        result = await db.execute(stmt)
        reading_list = result.scalar_one_or_none()
        
        if not reading_list:
            return False
        
        await db.delete(reading_list)
        await db.commit()
        return True
    
    @staticmethod
    async def add_document(
        db: AsyncSession,
        list_id: int,
        user_id: int,
        document_id: int,
        notes: Optional[str] = None
    ) -> Optional[ReadingListItem]:
        """Add document to reading list."""
        # Verify ownership
        reading_list = await ReadingListService.get_list(db, list_id, user_id)
        if not reading_list or reading_list.user_id != user_id:
            return None
        
        # Get max position
        stmt = select(func.max(ReadingListItem.position)).filter(
            ReadingListItem.reading_list_id == list_id
        )
        result = await db.execute(stmt)
        max_position = result.scalar() or -1
        
        # Create item
        item = ReadingListItem(
            reading_list_id=list_id,
            document_id=document_id,
            position=max_position + 1,
            notes=notes
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item
    
    @staticmethod
    async def remove_document(
        db: AsyncSession,
        list_id: int,
        user_id: int,
        document_id: int
    ) -> bool:
        """Remove document from reading list."""
        # Verify ownership
        reading_list = await ReadingListService.get_list(db, list_id, user_id)
        if not reading_list or reading_list.user_id != user_id:
            return False
        
        stmt = select(ReadingListItem).filter(
            and_(
                ReadingListItem.reading_list_id == list_id,
                ReadingListItem.document_id == document_id
            )
        )
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()
        
        if not item:
            return False
        
        await db.delete(item)
        await db.commit()
        return True
    
    @staticmethod
    async def get_list_items(
        db: AsyncSession,
        list_id: int,
        user_id: Optional[int] = None
    ) -> List[ReadingListItem]:
        """Get items in a reading list."""
        # Verify access
        reading_list = await ReadingListService.get_list(db, list_id, user_id)
        if not reading_list:
            return []
        
        stmt = select(ReadingListItem).filter(
            ReadingListItem.reading_list_id == list_id
        ).order_by(ReadingListItem.position)
        
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    @staticmethod
    async def get_public_lists(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None
    ) -> tuple[List[ReadingList], int]:
        """Get public reading lists for discovery."""
        stmt = select(ReadingList).filter(ReadingList.is_public == True)
        
        if search:
            search_term = f"%{search}%"
            stmt = stmt.filter(
                (ReadingList.name.ilike(search_term)) |
                (ReadingList.description.ilike(search_term))
            )
        
        # Order by most recently updated
        stmt = stmt.order_by(ReadingList.updated_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(stmt)
        items = list(result.scalars().all())
        
        # Count total
        count_stmt = select(func.count()).select_from(ReadingList).filter(
            ReadingList.is_public == True
        )
        if search:
            search_term = f"%{search}%"
            count_stmt = count_stmt.filter(
                (ReadingList.name.ilike(search_term)) |
                (ReadingList.description.ilike(search_term))
            )
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        return items, total
    
    @staticmethod
    async def get_public_list(
        db: AsyncSession,
        list_id: int
    ) -> Optional[ReadingList]:
        """Get a public reading list by ID."""
        stmt = select(ReadingList).filter(
            and_(
                ReadingList.id == list_id,
                ReadingList.is_public == True
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
