"""
Group Analytics Service
Provides analytics and metrics for groups
"""
from typing import Optional, List, Dict
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Group, GroupAnalytics, GroupFollower,
    GroupMember, GroupPost, Comment, GroupPostReaction
)


class GroupAnalyticsService:
    """Service for group analytics and metrics."""
    
    @staticmethod
    async def get_group_metrics(
        db: AsyncSession,
        group_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict:
        """Get comprehensive group metrics."""
        if not start_date:
            start_date = datetime.now(timezone.utc) - timedelta(days=30)
        if not end_date:
            end_date = datetime.now(timezone.utc)
        
        # Get all posts for this group
        post_result = await db.execute(
            select(GroupPost.id).where(
                and_(
                    GroupPost.group_id == group_id,
                    GroupPost.created_at >= start_date,
                    GroupPost.created_at <= end_date
                )
            )
        )
        post_ids = [row[0] for row in post_result]
        
        # Follower metrics
        total_followers_result = await db.execute(
            select(func.count(GroupFollower.id)).where(
                and_(
                    GroupFollower.group_id == group_id,
                    GroupFollower.is_active == True
                )
            )
        )
        total_followers = total_followers_result.scalar() or 0
        
        new_followers_result = await db.execute(
            select(func.count(GroupFollower.id)).where(
                and_(
                    GroupFollower.group_id == group_id,
                    GroupFollower.is_active == True,
                    GroupFollower.created_at >= start_date,
                    GroupFollower.created_at <= end_date
                )
            )
        )
        new_followers = new_followers_result.scalar() or 0
        
        # Member metrics
        total_members_result = await db.execute(
            select(func.count(GroupMember.id)).where(
                GroupMember.group_id == group_id
            )
        )
        total_members = total_members_result.scalar() or 0
        
        new_members_result = await db.execute(
            select(func.count(GroupMember.id)).where(
                and_(
                    GroupMember.group_id == group_id,
                    GroupMember.created_at >= start_date,
                    GroupMember.created_at <= end_date
                )
            )
        )
        new_members = new_members_result.scalar() or 0
        
        # Post metrics
        total_posts_result = await db.execute(
            select(func.count(GroupPost.id)).where(
                GroupPost.group_id == group_id
            )
        )
        total_posts = total_posts_result.scalar() or 0
        
        new_posts_result = await db.execute(
            select(func.count(GroupPost.id)).where(
                and_(
                    GroupPost.group_id == group_id,
                    GroupPost.created_at >= start_date,
                    GroupPost.created_at <= end_date
                )
            )
        )
        new_posts = new_posts_result.scalar() or 0
        
        # Engagement metrics
        total_comments_result = await db.execute(
            select(func.count(Comment.id)).where(
                and_(
                    Comment.document_id.in_(post_ids) if post_ids else False,
                    Comment.created_at >= start_date,
                    Comment.created_at <= end_date
                )
            )
        )
        total_comments = total_comments_result.scalar() or 0
        
        total_reactions_result = await db.execute(
            select(func.count(GroupPostReaction.id)).where(
                and_(
                    GroupPostReaction.post_id.in_(post_ids) if post_ids else False,
                    GroupPostReaction.created_at >= start_date,
                    GroupPostReaction.created_at <= end_date
                )
            )
        )
        total_reactions = total_reactions_result.scalar() or 0
        
        # Growth rates (simplified - percentage change from previous period)
        prev_start = start_date - (end_date - start_date)
        
        prev_followers_result = await db.execute(
            select(func.count(GroupFollower.id)).where(
                and_(
                    GroupFollower.group_id == group_id,
                    GroupFollower.is_active == True,
                    GroupFollower.created_at < start_date
                )
            )
        )
        prev_followers = prev_followers_result.scalar() or 1  # Avoid division by zero
        follower_growth_rate = int(((total_followers - prev_followers) / prev_followers) * 100) if prev_followers > 0 else 0
        
        # Top posts by reactions
        top_posts_result = await db.execute(
            select(
                GroupPost.id,
                GroupPost.title,
                func.count(GroupPostReaction.id).label('reaction_count')
            )
            .outerjoin(GroupPostReaction, GroupPostReaction.post_id == GroupPost.id)
            .where(
                and_(
                    GroupPost.group_id == group_id,
                    GroupPost.created_at >= start_date,
                    GroupPost.created_at <= end_date
                )
            )
            .group_by(GroupPost.id, GroupPost.title)
            .order_by(func.count(GroupPostReaction.id).desc())
            .limit(5)
        )
        top_posts = [
            {"post_id": row.id, "title": row.title, "reactions": row.reaction_count}
            for row in top_posts_result
        ]
        
        return {
            "group_id": group_id,
            "period": {
                "start": start_date,
                "end": end_date
            },
            "views": {
                "total": 0,  # Placeholder - would need GroupPostView table
                "unique": 0
            },
            "followers": {
                "total": total_followers,
                "new": new_followers
            },
            "members": {
                "total": total_members,
                "new": new_members,
                "active": 0  # Placeholder - would count members who posted/commented
            },
            "posts": {
                "total": total_posts,
                "new": new_posts
            },
            "engagement": {
                "comments": total_comments,
                "reactions": total_reactions,
                "shares": 0  # Placeholder - would need group shares table
            },
            "growth": {
                "follower_growth_rate": follower_growth_rate,
                "member_growth_rate": 0  # Simplified
            },
            "top_posts": top_posts
        }
    
    @staticmethod
    async def get_time_series_data(
        db: AsyncSession,
        group_id: int,
        metric: str = "followers",
        days: int = 30
    ) -> List[Dict]:
        """Get time series data for a metric."""
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        if metric == "followers":
            # Group followers by date
            result = await db.execute(
                select(
                    func.date(GroupFollower.created_at).label('date'),
                    func.count(GroupFollower.id).label('count')
                )
                .where(
                    and_(
                        GroupFollower.group_id == group_id,
                        GroupFollower.is_active == True,
                        GroupFollower.created_at >= start_date,
                        GroupFollower.created_at <= end_date
                    )
                )
                .group_by(func.date(GroupFollower.created_at))
                .order_by(func.date(GroupFollower.created_at))
            )
            
            return [
                {"date": str(row.date), "value": row.count}
                for row in result
            ]
        
        elif metric == "posts":
            # Group posts by date
            result = await db.execute(
                select(
                    func.date(GroupPost.created_at).label('date'),
                    func.count(GroupPost.id).label('count')
                )
                .where(
                    and_(
                        GroupPost.group_id == group_id,
                        GroupPost.created_at >= start_date,
                        GroupPost.created_at <= end_date
                    )
                )
                .group_by(func.date(GroupPost.created_at))
                .order_by(func.date(GroupPost.created_at))
            )
            
            return [
                {"date": str(row.date), "value": row.count}
                for row in result
            ]
        
        return []
