"""
Feed API - Personalized user feed
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.collaboration import GroupPost, GroupMember, Group
from app.models.user import User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/feed", tags=["feed"])


class PostAuthor(BaseModel):
    id: int
    username: Optional[str]
    display_name: str
    avatar_url: Optional[str]

class GroupInfo(BaseModel):
    id: int
    name: str
    slug: str
    avatar_url: Optional[str]

class FeedPost(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    is_pinned: bool
    is_locked: bool
    author: PostAuthor
    group: GroupInfo

    class Config:
        from_attributes = True


@router.get("", response_model=List[FeedPost])
async def get_feed(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50
):
    """
    Get personalized feed of posts from groups user is a member of
    """
    user_id = current_user.get("user_id")
    
    # Get groups user is a member of
    groups_query = select(GroupMember.group_id).where(GroupMember.user_id == user_id)
    groups_result = await db.execute(groups_query)
    group_ids = [row[0] for row in groups_result.all()]
    
    if not group_ids:
        # User not in any groups yet, return empty feed
        return []
    
    # Get posts from those groups with author and group info
    posts_query = (
        select(GroupPost, User, Group)
        .join(User, GroupPost.author_id == User.id)
        .join(Group, GroupPost.group_id == Group.id)
        .where(GroupPost.group_id.in_(group_ids))
        .order_by(desc(GroupPost.is_pinned), desc(GroupPost.created_at))
        .limit(limit)
    )
    
    result = await db.execute(posts_query)
    posts_data = result.all()
    
    # Transform to response format
    feed_posts = []
    for post, author, group in posts_data:
        feed_posts.append(FeedPost(
            id=post.id,
            title=post.title,
            content=post.content,
            created_at=post.created_at,
            is_pinned=post.is_pinned,
            is_locked=post.is_locked,
            author=PostAuthor(
                id=author.id,
                username=author.username,
                display_name=author.display_name,
                avatar_url=author.avatar_url
            ),
            group=GroupInfo(
                id=group.id,
                name=group.name,
                slug=group.slug,
                avatar_url=group.avatar_url
            )
        ))
    
    return feed_posts

@router.get("/personal", response_model=List[FeedPost])
async def get_personal_feed(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50
):
    """Alias for personalized feed to match frontend expectation /feed/personal."""
    return await get_feed(current_user=current_user, db=db, limit=limit)


@router.get("/discover", response_model=List[FeedPost])
async def get_discover_feed(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 20
):
    """
    Discover feed - public posts from groups user is NOT in
    """
    user_id = current_user.get("user_id")
    
    # Get groups user is already a member of
    groups_query = select(GroupMember.group_id).where(GroupMember.user_id == user_id)
    groups_result = await db.execute(groups_query)
    member_group_ids = [row[0] for row in groups_result.all()]
    
    # Get recent posts from PUBLIC groups user is not in
    posts_query = (
        select(GroupPost, User, Group)
        .join(User, GroupPost.author_id == User.id)
        .join(Group, GroupPost.group_id == Group.id)
        .where(
            and_(
                Group.is_public == True,
                Group.is_active == True,
                GroupPost.group_id.notin_(member_group_ids) if member_group_ids else True
            )
        )
        .order_by(desc(GroupPost.created_at))
        .limit(limit)
    )
    
    result = await db.execute(posts_query)
    posts_data = result.all()
    
    # Transform to response format
    feed_posts = []
    for post, author, group in posts_data:
        feed_posts.append(FeedPost(
            id=post.id,
            title=post.title,
            content=post.content,
            created_at=post.created_at,
            is_pinned=post.is_pinned,
            is_locked=post.is_locked,
            author=PostAuthor(
                id=author.id,
                username=author.username,
                display_name=author.display_name,
                avatar_url=author.avatar_url
            ),
            group=GroupInfo(
                id=group.id,
                name=group.name,
                slug=group.slug,
                avatar_url=group.avatar_url
            )
        ))
    
    return feed_posts
