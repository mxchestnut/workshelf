"""Reading List API - Bookmarks and curated reading lists"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services import user_service
from app.services.reading_list_service import BookmarkService, ReadingListService
from app.schemas.reading_list import (
    BookmarkCreate, BookmarkResponse,
    ReadingListCreate, ReadingListUpdate, ReadingListResponse,
    AddToReadingListRequest
)

router = APIRouter(prefix="/reading-lists", tags=["reading-lists"])


# ============================================================================
# Bookmarks
# ============================================================================

@router.post("/bookmarks", response_model=BookmarkResponse, status_code=status.HTTP_201_CREATED)
async def create_bookmark(bookmark_data: BookmarkCreate, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Create a bookmark."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    bookmark = await BookmarkService.create_bookmark(db, user.id, bookmark_data.document_id, bookmark_data.notes)
    return bookmark


@router.get("/bookmarks")
async def get_bookmarks(skip: int = 0, limit: int = 50, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get user's bookmarks."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    items, total = await BookmarkService.get_user_bookmarks(db, user.id, skip, limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.delete("/bookmarks/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bookmark(document_id: int, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Delete a bookmark."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    if not await BookmarkService.delete_bookmark(db, user.id, document_id):
        raise HTTPException(status_code=404, detail="Bookmark not found")


# ============================================================================
# Reading Lists
# ============================================================================

@router.post("/", response_model=ReadingListResponse, status_code=status.HTTP_201_CREATED)
async def create_reading_list(list_data: ReadingListCreate, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Create a reading list."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    reading_list = await ReadingListService.create_list(db, user.id, list_data.name, list_data.description, list_data.is_public)
    # Add document count (will be 0 for new list)
    reading_list.document_count = 0
    return reading_list


@router.get("/")
async def get_reading_lists(skip: int = 0, limit: int = 50, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get user's reading lists."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    items, total = await ReadingListService.get_user_lists(db, user.id, skip, limit)
    
    # Add document count to each list
    for item in items:
        item_count = len(await ReadingListService.get_list_items(db, item.id, user.id))
        item.document_count = item_count
    
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/{list_id}", response_model=ReadingListResponse)
async def get_reading_list(list_id: int, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get a specific reading list."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    reading_list = await ReadingListService.get_list(db, list_id, user.id)
    if not reading_list:
        raise HTTPException(status_code=404, detail="Reading list not found")
    
    # Add document count
    item_count = len(await ReadingListService.get_list_items(db, list_id, user.id))
    reading_list.document_count = item_count
    
    return reading_list


@router.put("/{list_id}", response_model=ReadingListResponse)
async def update_reading_list(list_id: int, list_data: ReadingListUpdate, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Update a reading list."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    reading_list = await ReadingListService.update_list(db, list_id, user.id, list_data.name, list_data.description, list_data.is_public)
    if not reading_list:
        raise HTTPException(status_code=404, detail="Reading list not found or you don't have permission")
    
    item_count = len(await ReadingListService.get_list_items(db, list_id, user.id))
    reading_list.document_count = item_count
    
    return reading_list


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reading_list(list_id: int, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Delete a reading list."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    if not await ReadingListService.delete_list(db, list_id, user.id):
        raise HTTPException(status_code=404, detail="Reading list not found or you don't have permission")


@router.post("/{list_id}/documents", status_code=status.HTTP_201_CREATED)
async def add_to_reading_list(list_id: int, request: AddToReadingListRequest, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Add a document to a reading list."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    item = await ReadingListService.add_document(db, list_id, user.id, request.document_id)
    if not item:
        raise HTTPException(status_code=404, detail="Reading list not found or you don't have permission")
    return item


@router.delete("/{list_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_reading_list(list_id: int, document_id: int, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Remove a document from a reading list."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    if not await ReadingListService.remove_document(db, list_id, user.id, document_id):
        raise HTTPException(status_code=404, detail="Document not found in list or you don't have permission")


@router.get("/{list_id}/documents")
async def get_list_documents(list_id: int, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get documents in a reading list."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    items = await ReadingListService.get_list_items(db, list_id, user.id)
    return {"items": items, "count": len(items)}
