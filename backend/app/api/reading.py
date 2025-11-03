"""Reading API - Reading progress tracking"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services import user_service
from app.services.reading_service import ReadingService
from app.schemas.reading import ReadingProgress, ReadingProgressResponse

router = APIRouter(prefix="/reading", tags=["reading"])


@router.post("/progress", response_model=ReadingProgressResponse, status_code=status.HTTP_201_CREATED)
async def update_reading_progress(progress_data: ReadingProgress, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Update reading progress for a document."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    progress = await ReadingService.update_progress(db, user.id, progress_data.document_id, progress_data.progress_percentage, progress_data.last_position)
    return progress


@router.get("/progress/{document_id}", response_model=ReadingProgressResponse)
async def get_reading_progress(document_id: int, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get reading progress for a specific document."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    progress = await ReadingService.get_progress(db, user.id, document_id)
    if not progress:
        raise HTTPException(status_code=404, detail="No reading progress found")
    return progress


@router.get("/history")
async def get_reading_history(skip: int = 0, limit: int = 50, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get user's reading history."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    items, total = await ReadingService.get_user_reading_history(db, user.id, skip, limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/currently-reading")
async def get_currently_reading(limit: int = 10, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get documents currently being read."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    items = await ReadingService.get_currently_reading(db, user.id, limit)
    return {"items": items, "count": len(items)}


@router.delete("/progress/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reading_progress(document_id: int, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Delete reading progress for a document."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    if not await ReadingService.delete_progress(db, user.id, document_id):
        raise HTTPException(status_code=404, detail="Reading progress not found")
