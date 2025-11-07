"""
Interests API - Dynamic interests based on group tags
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.core.database import get_db
from app.models.collaboration import Group


router = APIRouter(prefix="/interests", tags=["interests"])


@router.get("", response_model=List[str])
async def get_available_interests(
    db: AsyncSession = Depends(get_db)
):
    """
    Get all available interests from group tags.
    Returns unique, sorted list of all tags used by public groups.
    
    This allows users to discover interests based on actual groups in the platform,
    making the interest selection dynamic and relevant.
    """
    # Get all public groups with tags
    result = await db.execute(
        select(Group.tags).where(
            Group.is_public == True,
            Group.tags.isnot(None)
        )
    )
    groups_tags = result.scalars().all()
    
    # Flatten all tags into a single list
    all_tags = set()
    for tags in groups_tags:
        if tags and isinstance(tags, list):
            all_tags.update(tags)
    
    # If no groups exist yet, provide default interests
    if not all_tags:
        all_tags = {
            'fiction', 'non-fiction', 'poetry', 'sci-fi', 'fantasy',
            'romance', 'mystery', 'thriller', 'horror', 'memoir',
            'creative-writing', 'screenwriting'
        }
    
    # Return sorted list
    return sorted(list(all_tags))
