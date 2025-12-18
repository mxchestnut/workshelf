"""
Tag API endpoints
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.azure_auth import get_current_user
from app.schemas.tag import TagCreate, TagUpdate, TagResponse, TagListResponse
from app.services import tag_service, user_service

router = APIRouter(prefix="/tags", tags=["tags"])


@router.post("", response_model=TagResponse, status_code=201)
async def create_tag(
    tag_data: TagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new tag"""
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    tag = await tag_service.create_tag(db, tag_data, user.id)
    
    return tag


@router.get("", response_model=TagListResponse)
async def list_tags(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List user's tags"""
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    skip = (page - 1) * page_size
    tags, total = await tag_service.list_user_tags(db, user.id, skip, page_size)
    
    return {
        "tags": tags,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (skip + len(tags)) < total
    }


@router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a tag by ID"""
    
    tag = await tag_service.get_tag_by_id(db, tag_id)
    if not tag:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Tag not found")
    
    return tag


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int,
    tag_data: TagUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a tag"""
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    tag = await tag_service.update_tag(db, tag_id, tag_data, user.id)
    
    return tag


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a tag"""
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    await tag_service.delete_tag(db, tag_id, user.id)


@router.post("/documents/{document_id}/tags/{tag_id}", status_code=201)
async def add_tag_to_document(
    document_id: int,
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a tag to a document"""
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    await tag_service.add_tag_to_document(db, document_id, tag_id, user.id)
    
    return {"message": "Tag added to document"}


@router.delete("/documents/{document_id}/tags/{tag_id}", status_code=204)
async def remove_tag_from_document(
    document_id: int,
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Remove a tag from a document"""
    
    await tag_service.remove_tag_from_document(db, document_id, tag_id)
