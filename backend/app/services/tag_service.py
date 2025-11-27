"""
Tag service - Business logic for tags
"""

from typing import List, Optional
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Tag, DocumentTag
from app.schemas.tag import TagCreate, TagUpdate
from app.core.exceptions import NotFoundError, ForbiddenError


async def create_tag(
    db: AsyncSession,
    tag_data: TagCreate,
    user_id: int
) -> Tag:
    """Create a new tag"""
    
    # Check if tag with same name already exists for this user
    result = await db.execute(
        select(Tag).where(
            Tag.user_id == user_id,
            Tag.name == tag_data.name
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing
    
    tag = Tag(
        name=tag_data.name,
        color=tag_data.color,
        user_id=user_id
    )
    
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    
    return tag


async def get_tag_by_id(db: AsyncSession, tag_id: int) -> Optional[Tag]:
    """Get a tag by ID"""
    result = await db.execute(
        select(Tag).where(Tag.id == tag_id)
    )
    return result.scalar_one_or_none()


async def list_user_tags(
    db: AsyncSession,
    user_id: int,
    skip: int = 0,
    limit: int = 100
) -> tuple[List[Tag], int]:
    """List user's tags"""
    
    query = select(Tag).where(Tag.user_id == user_id).offset(skip).limit(limit)
    result = await db.execute(query)
    tags = result.scalars().all()
    
    # Get total count
    count_query = select(func.count(Tag.id)).where(Tag.user_id == user_id)
    total = await db.scalar(count_query)
    
    return list(tags), total or 0


async def update_tag(
    db: AsyncSession,
    tag_id: int,
    tag_data: TagUpdate,
    user_id: int
) -> Tag:
    """Update a tag"""
    
    tag = await get_tag_by_id(db, tag_id)
    if not tag:
        raise NotFoundError(f"Tag {tag_id} not found")
    
    if tag.user_id != user_id:
        raise ForbiddenError("You don't have permission to update this tag")
    
    # Update fields
    update_data = tag_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tag, field, value)
    
    await db.commit()
    await db.refresh(tag)
    
    return tag


async def delete_tag(db: AsyncSession, tag_id: int, user_id: int) -> None:
    """Delete a tag"""
    
    tag = await get_tag_by_id(db, tag_id)
    if not tag:
        raise NotFoundError(f"Tag {tag_id} not found")
    
    if tag.user_id != user_id:
        raise ForbiddenError("You don't have permission to delete this tag")
    
    await db.delete(tag)
    await db.commit()


async def add_tag_to_document(
    db: AsyncSession,
    document_id: int,
    tag_id: int,
    user_id: int
) -> DocumentTag:
    """Add a tag to a document"""
    
    # Check if already tagged
    result = await db.execute(
        select(DocumentTag).where(
            DocumentTag.document_id == document_id,
            DocumentTag.tag_id == tag_id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing
    
    doc_tag = DocumentTag(
        document_id=document_id,
        tag_id=tag_id
    )
    
    db.add(doc_tag)
    await db.commit()
    await db.refresh(doc_tag)
    
    return doc_tag


async def remove_tag_from_document(
    db: AsyncSession,
    document_id: int,
    tag_id: int
) -> None:
    """Remove a tag from a document"""
    
    result = await db.execute(
        select(DocumentTag).where(
            DocumentTag.document_id == document_id,
            DocumentTag.tag_id == tag_id
        )
    )
    doc_tag = result.scalar_one_or_none()
    
    if doc_tag:
        await db.delete(doc_tag)
        await db.commit()
