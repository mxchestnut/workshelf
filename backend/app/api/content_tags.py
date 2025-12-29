"""
Tags API - Simple, fast tagging for posts (and future content types)
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text
from sqlalchemy.orm import joinedload
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.auth import get_current_user, get_optional_user
from app.models.tags import ContentTag, PostTag
from app.services import user_service
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/content-tags", tags=["content-tags"])


# Schemas
class TagResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    usage_count: int
    
    model_config = ConfigDict(from_attributes=True)


class TagCreate(BaseModel):
    name: str
    description: Optional[str] = None


# Tag CRUD & Search
@router.get("/search", response_model=List[TagResponse])
async def search_tags(
    q: Optional[str] = None,
    limit: int = 50,
    sort: str = "popular",  # popular, alphabetical, recent
    db: AsyncSession = Depends(get_db)
):
    """
    Search tags with autocomplete support
    Uses PostgreSQL full-text search for fast results
    
    Sort options:
    - popular: Most used tags first (default)
    - alphabetical: A-Z
    - recent: Recently created
    """
    query = select(ContentTag)
    
    # Full-text search using tsvector
    if q:
        search_term = q.strip()
        if search_term:
            # Use PostgreSQL full-text search
            query = query.where(
                or_(
                    ContentTag.search_vector.op('@@')(func.plainto_tsquery('english', search_term)),
                    func.lower(ContentTag.name).like(f'%{search_term.lower()}%')
                )
            )
    
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


@router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific tag by ID"""
    result = await db.execute(
        select(ContentTag).where(ContentTag.id == tag_id)
    )
    tag = result.scalar_one_or_none()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    return tag


@router.post("", response_model=TagResponse)
async def create_tag(
    tag_data: TagCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new tag
    Anyone can create tags (folksonomy style, like AO3)
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Generate slug
    slug = tag_data.name.lower().replace(' ', '-').replace('/', '-').replace("'", '')
    
    # Check if tag already exists
    existing = await db.execute(
        select(ContentTag).where(or_(ContentTag.slug == slug, ContentTag.name == tag_data.name))
    )
    existing_tag = existing.scalar_one_or_none()
    if existing_tag:
        # Return existing tag instead of error (user-friendly)
        return existing_tag
    
    # Create tag
    tag = ContentTag(
        name=tag_data.name,
        slug=slug,
        description=tag_data.description,
        usage_count=0
    )
    
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    
    return tag


# Post Tagging
@router.post("/posts/{post_id}/tags/{tag_id}")
async def add_tag_to_post(
    post_id: int,
    tag_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a tag to a post"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Verify tag exists
    tag_result = await db.execute(select(ContentTag).where(ContentTag.id == tag_id))
    tag = tag_result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    # Check if already tagged
    existing = await db.execute(
        select(PostTag).where(
            and_(
                PostTag.post_id == post_id,
                PostTag.tag_id == tag_id
            )
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "Already tagged"}
    
    # Create post_tag
    post_tag = PostTag(
        post_id=post_id,
        tag_id=tag_id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(post_tag)
    
    # Increment usage count
    tag.usage_count += 1
    
    await db.commit()
    
    return {"message": "Tag added successfully"}


@router.delete("/posts/{post_id}/tags/{tag_id}")
async def remove_tag_from_post(
    post_id: int,
    tag_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a tag from a post"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Find post_tag
    result = await db.execute(
        select(PostTag).where(
            and_(
                PostTag.post_id == post_id,
                PostTag.tag_id == tag_id
            )
        )
    )
    post_tag = result.scalar_one_or_none()
    
    if not post_tag:
        raise HTTPException(status_code=404, detail="Tag not applied to this post")
    
    # Delete post_tag
    await db.delete(post_tag)
    
    # Decrement usage count
    tag_result = await db.execute(select(ContentTag).where(ContentTag.id == tag_id))
    tag = tag_result.scalar_one_or_none()
    if tag and tag.usage_count > 0:
        tag.usage_count -= 1
    
    await db.commit()
    
    return {"message": "Tag removed successfully"}


@router.get("/posts/{post_id}", response_model=List[TagResponse])
async def get_post_tags(
    post_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all tags for a specific post"""
    result = await db.execute(
        select(ContentTag)
        .join(PostTag, ContentTag.id == PostTag.tag_id)
        .where(PostTag.post_id == post_id)
        .order_by(ContentTag.name)
    )
    
    return result.scalars().all()


# Advanced Search (AO3-style include/exclude)
@router.get("/filter/posts")
async def filter_posts_by_tags(
    include_tags: List[int] = Query(default=[], description="Tags that must be present"),
    exclude_tags: List[int] = Query(default=[], description="Tags that must NOT be present"),
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    Filter posts by tags with include/exclude (AO3-style)
    
    Returns IDs of posts matching the filter criteria
    Much faster than polymorphic version!
    """
    # Start with all posts
    base_query = select(PostTag.post_id).distinct()
    
    # If we have include tags, post must have ALL of them
    if include_tags:
        for tag_id in include_tags:
            # Intersect: post must have this tag
            has_tag = select(PostTag.post_id).where(PostTag.tag_id == tag_id)
            base_query = base_query.intersect(has_tag)
    
    # If we have exclude tags, remove posts that have ANY of them
    if exclude_tags:
        exclude_query = select(PostTag.post_id).where(
            PostTag.tag_id.in_(exclude_tags)
        ).distinct()
        
        base_query = base_query.except_(exclude_query)
    
    # Execute with pagination
    result = await db.execute(base_query.limit(limit).offset(offset))
    post_ids = [row[0] for row in result.all()]
    
    return {
        "post_ids": post_ids,
        "count": len(post_ids),
        "filters": {
            "include_tags": include_tags,
            "exclude_tags": exclude_tags
        }
    }
