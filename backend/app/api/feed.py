"""
Feed API - Personalized user feed
"""
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func, cast, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.collaboration import GroupPost, GroupMember, Group, GroupPostReaction
from app.models.user import User, UserProfile
from app.services import user_service
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
    pinned_feeds: List[str] = []
    author: PostAuthor
    group: GroupInfo
    upvotes: int = 0
    downvotes: int = 0
    score: int = 0

    class Config:
        from_attributes = True


async def get_votes_for_posts(db: AsyncSession, post_ids: List[int]) -> Dict[int, Dict[str, int]]:
    """Helper function to get vote counts for multiple posts"""
    if not post_ids:
        return {}
    
    votes_query = (
        select(
            GroupPostReaction.post_id,
            GroupPostReaction.reaction_type,
            func.count().label('count')
        )
        .where(
            GroupPostReaction.post_id.in_(post_ids),
            GroupPostReaction.reaction_type.in_(["upvote", "downvote"])
        )
        .group_by(GroupPostReaction.post_id, GroupPostReaction.reaction_type)
    )
    votes_result = await db.execute(votes_query)
    votes_data = votes_result.all()
    
    # Organize votes by post_id
    votes_by_post = {}
    for post_id, reaction_type, count in votes_data:
        if post_id not in votes_by_post:
            votes_by_post[post_id] = {"upvotes": 0, "downvotes": 0}
        votes_by_post[post_id][f"{reaction_type}s"] = count
    
    return votes_by_post


@router.get("", response_model=List[FeedPost])
async def get_feed(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    sort: str = "newest"
):
    """
    Get personalized feed of posts from groups user is a member of
    
    Sort options:
    - newest: Sort by creation date (default)
    - top: Sort by highest score (upvotes - downvotes)
    - controversial: Sort by most contentious (similar upvotes and downvotes)
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    user_id = user.id
    
    # Get groups user is a member of
    groups_query = select(GroupMember.group_id).where(GroupMember.user_id == user_id)
    groups_result = await db.execute(groups_query)
    group_ids = [row[0] for row in groups_result.all()]
    
    if not group_ids:
        # User not in any groups yet, return empty feed
        return []
    
    # Build base query
    posts_query = (
        select(GroupPost, User, Group)
        .join(User, GroupPost.author_id == User.id)
        .join(Group, GroupPost.group_id == Group.id)
        .options(joinedload(User.profile))
        .where(GroupPost.group_id.in_(group_ids))
    )
    
    # Apply sorting
    if sort == "newest":
        # Sort: pinned to 'personal' first, then pinned to 'group', then by date
        posts_query = posts_query.order_by(
            desc(GroupPost.pinned_feeds.op('&&')(cast(['personal'], ARRAY(String(50))))),

            desc(GroupPost.is_pinned), 
            desc(GroupPost.created_at)
        )
    # For vote-based sorting, we'll fetch all and sort in Python after getting vote counts
    else:
        posts_query = posts_query.order_by(desc(GroupPost.is_pinned), desc(GroupPost.created_at))
    
    posts_query = posts_query.limit(limit * 2 if sort != "newest" else limit)
    
    result = await db.execute(posts_query)
    posts_data = result.all()
    
    # Get vote counts
    post_ids = [post.id for post, _, _ in posts_data]
    votes_by_post = await get_votes_for_posts(db, post_ids)
    
    # Transform to response format
    feed_posts = []
    for post, author, group in posts_data:
        votes = votes_by_post.get(post.id, {"upvotes": 0, "downvotes": 0})
        feed_posts.append(FeedPost(
            id=post.id,
            title=post.title,
            content=post.content,
            created_at=post.created_at,
            is_pinned=post.is_pinned,
            is_locked=post.is_locked,
            pinned_feeds=post.pinned_feeds or [],
            upvotes=votes["upvotes"],
            downvotes=votes["downvotes"],
            score=votes["upvotes"] - votes["downvotes"],
            author=PostAuthor(
                id=author.id,
                username=author.username,
                display_name=author.display_name,
                avatar_url=author.profile.avatar_url if author.profile else None
            ),
            group=GroupInfo(
                id=group.id,
                name=group.name,
                slug=group.slug,
                avatar_url=group.avatar_url
            )
        ))
    
    # Apply vote-based sorting if requested
    if sort == "top":
        feed_posts.sort(key=lambda p: (not p.is_pinned, -p.score))
    elif sort == "controversial":
        # Controversial = high engagement but close to 50/50 split
        feed_posts.sort(key=lambda p: (
            not p.is_pinned,
            -(min(p.upvotes, p.downvotes) * 2)  # Rewards posts with similar up/down votes
        ))
    
    return feed_posts[:limit]

@router.get("/personal", response_model=List[FeedPost])
async def get_personal_feed(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50
):
    """Alias for personalized feed to match frontend expectation /feed/personal."""
    return await get_feed(current_user=current_user, db=db, limit=limit)


@router.get("/updates", response_model=List[FeedPost])
async def get_updates_feed(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50
):
    """
    Updates feed - pinned posts and recent activity from user's groups
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    user_id = user.id
    
    # Get groups user is a member of
    groups_query = select(GroupMember.group_id).where(GroupMember.user_id == user_id)
    groups_result = await db.execute(groups_query)
    group_ids = [row[0] for row in groups_result.all()]
    
    if not group_ids:
        return []
    
    # Get pinned posts and recent updates
    posts_query = (
        select(GroupPost, User, Group)
        .join(User, GroupPost.author_id == User.id)
        .join(Group, GroupPost.group_id == Group.id)
        .options(joinedload(User.profile))
        .where(GroupPost.group_id.in_(group_ids))
        .order_by(desc(GroupPost.is_pinned), desc(GroupPost.updated_at))
        .limit(limit)
    )
    
    result = await db.execute(posts_query)
    posts_data = result.all()
    
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
                avatar_url=author.profile.avatar_url if author.profile else None
            ),
            group=GroupInfo(
                id=group.id,
                name=group.name,
                slug=group.slug,
                avatar_url=group.avatar_url
            )
        ))
    
    return feed_posts


@router.get("/beta", response_model=List[FeedPost])
async def get_beta_feed(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50
):
    """
    Beta feed - posts from groups where user is a beta reader
    Currently returns posts from all user's groups (can be filtered later)
    """
    return await get_feed(current_user=current_user, db=db, limit=limit)


@router.get("/groups", response_model=List[FeedPost])
async def get_groups_feed(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50
):
    """
    Groups feed - all posts from user's groups
    """
    return await get_feed(current_user=current_user, db=db, limit=limit)


@router.get("/global", response_model=List[FeedPost])
async def get_global_feed(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50
):
    """
    Global feed - recent posts from all public groups
    """
    # Get recent posts from all PUBLIC groups
    posts_query = (
        select(GroupPost, User, Group)
        .join(User, GroupPost.author_id == User.id)
        .join(Group, GroupPost.group_id == Group.id)
        .options(joinedload(User.profile))
        .where(
            and_(
                Group.is_public == True,
                Group.is_active == True
            )
        )
        .order_by(
            desc(GroupPost.pinned_feeds.op('&&')(cast(['global'], ARRAY(String(50))))),

            desc(GroupPost.created_at)
        )
        .limit(limit)
    )
    
    result = await db.execute(posts_query)
    posts_data = result.all()
    
    feed_posts = []
    for post, author, group in posts_data:
        feed_posts.append(FeedPost(
            id=post.id,
            title=post.title,
            content=post.content,
            created_at=post.created_at,
            is_pinned=post.is_pinned,
            is_locked=post.is_locked,
            pinned_feeds=post.pinned_feeds or [],
            author=PostAuthor(
                id=author.id,
                username=author.username,
                display_name=author.profile.display_name if author.profile else (author.username or author.email),
                avatar_url=author.profile.avatar_url if author.profile else None
            ),
            group=GroupInfo(
                id=group.id,
                name=group.name,
                slug=group.slug,
                avatar_url=group.avatar_url
            )
        ))
    
    return feed_posts


@router.get("/discover", response_model=List[FeedPost])
async def get_discover_feed(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 20
):
    """
    Discover feed - public posts from groups user is NOT in
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    user_id = user.id
    
    # Get groups user is already a member of
    groups_query = select(GroupMember.group_id).where(GroupMember.user_id == user_id)
    groups_result = await db.execute(groups_query)
    member_group_ids = [row[0] for row in groups_result.all()]
    
    # Get recent posts from PUBLIC groups user is not in
    posts_query = (
        select(GroupPost, User, Group)
        .join(User, GroupPost.author_id == User.id)
        .join(Group, GroupPost.group_id == Group.id)
        .options(joinedload(User.profile))
        .where(
            and_(
                Group.is_public == True,
                Group.is_active == True,
                GroupPost.group_id.notin_(member_group_ids) if member_group_ids else True
            )
        )
        .order_by(
            desc(GroupPost.pinned_feeds.op('&&')(cast(['discover'], ARRAY(String(50))))),

            desc(GroupPost.created_at)
        )
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
            pinned_feeds=post.pinned_feeds or [],
            author=PostAuthor(
                id=author.id,
                username=author.username,
                display_name=author.display_name,
                avatar_url=author.profile.avatar_url if author.profile else None
            ),
            group=GroupInfo(
                id=group.id,
                name=group.name,
                slug=group.slug,
                avatar_url=group.avatar_url
            )
        ))
    
    return feed_posts
