"""
Content Tags API - AO3-style tagging for posts, ebooks, articles
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import joinedload
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.auth import get_current_user, get_optional_user
from app.models.tags import ContentTag, ContentTagCategory, ContentTaggable
from app.services import user_service
from pydantic import BaseModel

router = APIRouter(prefix="/content-tags", tags=["content-tags"])


# Schemas
class ContentTagCategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    color: Optional[str]
    icon: Optional[str]
    
    class Config:
        from_attributes = True


class ContentTagResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    category: Optional[ContentTagCategoryResponse]
    usage_count: int
    is_canonical: bool
    
    class Config:
        from_attributes = True


class ContentTagCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None


# Tag Categories
@router.get("/categories", response_model=List[ContentTagCategoryResponse])
async def get_tag_categories(
    db: AsyncSession = Depends(get_db)
):
    """Get all tag categories"""
    result = await db.execute(
        select(ContentTagCategory).order_by(ContentTagCategory.name)
    )
    return result.scalars().all()


# Tag Search & CRUD
@router.get("/search", response_model=List[ContentTagResponse])
async def search_tags(
    q: Optional[str] = None,
    category_id: Optional[int] = None,
    limit: int = 50,
    sort: str = "popular",  # popular, alphabetical, recent
    db: AsyncSession = Depends(get_db)
):
    """
    Search tags with autocomplete support
    
    Sort options:
    - popular: Most used tags first (default)
    - alphabetical: A-Z
    - recent: Recently created
    """
    query = select(ContentTag).options(joinedload(ContentTag.category))
    
    # Text search
    if q:
        search_term = f"%{q.lower()}%"
        query = query.where(func.lower(ContentTag.name).like(search_term))
    
    # Filter by category
    if category_id:
        query = query.where(ContentTag.category_id == category_id)
    
    # Only show canonical tags
    query = query.where(ContentTag.is_canonical == True)
    
    # Apply sorting
    if sort == "popular":
        query = query.order_by(ContentTag.usage_count.desc(), ContentTag.name)
    elif sort == "alphabetical":
        query = query.order_by(ContentTag.name)
    elif sort == "recent":
        query = query.order_by(ContentTag.created_at.desc())
    
    query = query.limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{tag_id}", response_model=ContentTagResponse)
async def get_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific tag by ID"""
    result = await db.execute(
        select(ContentTag)
        .options(joinedload(ContentTag.category))
        .where(ContentTag.id == tag_id)
    )
    tag = result.scalar_one_or_none()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    return tag


@router.post("", response_model=ContentTagResponse)
async def create_tag(
    tag_data: ContentTagCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new tag (user-created tags start as non-canonical, staff can make canonical)
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Generate slug
    slug = tag_data.name.lower().replace(' ', '-').replace('/', '-')
    
    # Check if tag already exists
    existing = await db.execute(
        select(ContentTag).where(ContentTag.slug == slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tag already exists")
    
    # Create tag
    tag = ContentTag(
        name=tag_data.name,
        slug=slug,
        description=tag_data.description,
        category_id=tag_data.category_id,
        is_canonical=user.is_staff,
        created_by=user.id,
        usage_count=0
    )
    
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    
    # Load relationships
    result = await db.execute(
        select(ContentTag)
        .options(joinedload(ContentTag.category))
        .where(ContentTag.id == tag.id)
    )
    return result.scalar_one()


# Content Tagging
@router.post("/apply")
async def apply_tag_to_content(
    tag_id: int,
    taggable_type: str,  # 'post', 'ebook', 'article'
    taggable_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Apply a tag to content"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Verify tag exists
    tag_result = await db.execute(select(ContentTag).where(ContentTag.id == tag_id))
    tag = tag_result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    # Check if already tagged
    existing = await db.execute(
        select(ContentTaggable).where(
            and_(
                ContentTaggable.tag_id == tag_id,
                ContentTaggable.taggable_type == taggable_type,
                ContentTaggable.taggable_id == taggable_id
            )
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "Already tagged"}
    
    # Create taggable
    taggable = ContentTaggable(
        tag_id=tag_id,
        taggable_type=taggable_type,
        taggable_id=taggable_id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(taggable)
    
    # Increment usage count
    tag.usage_count += 1
    
    await db.commit()
    
    return {"message": "Tag applied successfully"}


@router.delete("/remove")
async def remove_tag_from_content(
    tag_id: int,
    taggable_type: str,
    taggable_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a tag from content"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Find taggable
    result = await db.execute(
        select(ContentTaggable).where(
            and_(
                ContentTaggable.tag_id == tag_id,
                ContentTaggable.taggable_type == taggable_type,
                ContentTaggable.taggable_id == taggable_id
            )
        )
    )
    taggable = result.scalar_one_or_none()
    
    if not taggable:
        raise HTTPException(status_code=404, detail="Tag not applied to this content")
    
    # Delete taggable
    await db.delete(taggable)
    
    # Decrement usage count
    tag_result = await db.execute(select(ContentTag).where(ContentTag.id == tag_id))
    tag = tag_result.scalar_one_or_none()
    if tag and tag.usage_count > 0:
        tag.usage_count -= 1
    
    await db.commit()
    
    return {"message": "Tag removed successfully"}


@router.get("/content/{taggable_type}/{taggable_id}", response_model=List[ContentTagResponse])
async def get_content_tags(
    taggable_type: str,
    taggable_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all tags for a specific piece of content"""
    result = await db.execute(
        select(ContentTag)
        .join(ContentTaggable, ContentTag.id == ContentTaggable.tag_id)
        .options(joinedload(ContentTag.category))
        .where(
            and_(
                ContentTaggable.taggable_type == taggable_type,
                ContentTaggable.taggable_id == taggable_id
            )
        )
        .order_by(ContentTag.name)
    )
    
    return result.scalars().all()


# Advanced Search (AO3-style include/exclude)
@router.get("/filter/content")
async def filter_content_by_tags(
    include_tags: List[int] = Query(default=[], description="Tags that must be present"),
    exclude_tags: List[int] = Query(default=[], description="Tags that must NOT be present"),
    taggable_type: str = Query(..., description="Content type: post, ebook, article"),
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    Filter content by tags with include/exclude (AO3-style)
    
    Returns IDs of content matching the filter criteria
    """
    # Start with all content of this type
    base_ids_query = select(ContentTaggable.taggable_id).where(
        ContentTaggable.taggable_type == taggable_type
    ).distinct()
    
    # If we have include tags, content must have ALL of them
    if include_tags:
        for tag_id in include_tags:
            # Get IDs that have this specific tag
            has_tag_query = select(ContentTaggable.taggable_id).where(
                and_(
                    ContentTaggable.taggable_type == taggable_type,
                    ContentTaggable.tag_id == tag_id
                )
            )
            # Intersect with base query
            base_ids_query = base_ids_query.intersect(has_tag_query)
    
    # If we have exclude tags, remove content that has ANY of them
    if exclude_tags:
        exclude_ids_query = select(ContentTaggable.taggable_id).where(
            and_(
                ContentTaggable.taggable_type == taggable_type,
                ContentTaggable.tag_id.in_(exclude_tags)
            )
        ).distinct()
        
        # Subtract excluded IDs
        base_ids_query = base_ids_query.except_(exclude_ids_query)
    
    # Execute with pagination
    result = await db.execute(base_ids_query.limit(limit).offset(offset))
    content_ids = [row[0] for row in result.all()]
    
    return {
        "taggable_type": taggable_type,
        "content_ids": content_ids,
        "count": len(content_ids),
        "filters": {
            "include_tags": include_tags,
            "exclude_tags": exclude_tags
        }
    }
