from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select, func
from datetime import datetime, timezone
from typing import List, Optional

from ..models.social import UserFollow
from ..models.user import User


class RelationshipsService:
    """Service for managing user relationships (follow/unfollow)."""
    
    @staticmethod
    async def follow_user(db: AsyncSession, follower_id: int, following_id: int) -> UserFollow:
        """Follow a user."""
        # Check if already following
        result = await db.execute(
            select(UserFollow).filter(
                and_(
                    UserFollow.follower_id == follower_id,
                    UserFollow.following_id == following_id
                )
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            if not existing.is_active:
                # Reactivate if was previously unfollowed
                existing.is_active = True
                existing.updated_at = datetime.now(timezone.utc)
                await db.commit()
                await db.refresh(existing)
            return existing
        
        # Create new follow relationship
        follow = UserFollow(
            follower_id=follower_id,
            following_id=following_id,
            is_active=True
        )
        db.add(follow)
        await db.commit()
        await db.refresh(follow)
        return follow
    
    @staticmethod
    async def unfollow_user(db: AsyncSession, follower_id: int, following_id: int) -> bool:
        """Unfollow a user (soft delete)."""
        result = await db.execute(
            select(UserFollow).filter(
                and_(
                    UserFollow.follower_id == follower_id,
                    UserFollow.following_id == following_id,
                    UserFollow.is_active == True
                )
            )
        )
        follow = result.scalar_one_or_none()
        
        if not follow:
            return False
        
        follow.is_active = False
        follow.updated_at = datetime.now(timezone.utc)
        await db.commit()
        return True
    
    @staticmethod
    async def is_following(db: AsyncSession, follower_id: int, following_id: int) -> bool:
        """Check if user is following another user."""
        result = await db.execute(
            select(UserFollow).filter(
                and_(
                    UserFollow.follower_id == follower_id,
                    UserFollow.following_id == following_id,
                    UserFollow.is_active == True
                )
            )
        )
        follow = result.scalar_one_or_none()
        return follow is not None
    
    @staticmethod
    async def get_followers(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[User], int]:
        """Get users following this user."""
        # Query with join
        stmt = (
            select(User)
            .join(UserFollow, UserFollow.follower_id == User.id)
            .filter(
                and_(
                    UserFollow.following_id == user_id,
                    UserFollow.is_active == True
                )
            )
        )
        
        # Get total count using func.count() for efficiency
        count_stmt = select(func.count()).select_from(UserFollow).filter(
            and_(
                UserFollow.following_id == user_id,
                UserFollow.is_active == True
            )
        )
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        # Get paginated results
        result = await db.execute(stmt.offset(skip).limit(limit))
        followers = result.scalars().all()
        
        return list(followers), total
    
    @staticmethod
    async def get_following(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[User], int]:
        """Get users this user is following."""
        # Query with join
        stmt = (
            select(User)
            .join(UserFollow, UserFollow.following_id == User.id)
            .filter(
                and_(
                    UserFollow.follower_id == user_id,
                    UserFollow.is_active == True
                )
            )
        )
        
        # Get total count using func.count() for efficiency
        count_stmt = select(func.count()).select_from(UserFollow).filter(
            and_(
                UserFollow.follower_id == user_id,
                UserFollow.is_active == True
            )
        )
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        # Get paginated results
        result = await db.execute(stmt.offset(skip).limit(limit))
        following = result.scalars().all()
        
        return list(following), total
    
    @staticmethod
    async def get_follower_count(db: AsyncSession, user_id: int) -> int:
        """Get count of followers."""
        result = await db.execute(
            select(func.count()).select_from(UserFollow).filter(
                and_(
                    UserFollow.following_id == user_id,
                    UserFollow.is_active == True
                )
            )
        )
        return result.scalar()
    
    @staticmethod
    async def get_following_count(db: AsyncSession, user_id: int) -> int:
        """Get count of users being followed."""
        result = await db.execute(
            select(func.count()).select_from(UserFollow).filter(
                and_(
                    UserFollow.follower_id == user_id,
                    UserFollow.is_active == True
                )
            )
        )
        return result.scalar()
