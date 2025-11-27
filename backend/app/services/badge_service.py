"""
Service for managing user badges and reputation scores
"""
from typing import Optional, List
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.models.user import User, UserBadge, BetaReaderReview


class BadgeService:
    """Service for managing user badges."""
    
    # Badge type constants
    BADGE_AUTHOR = "AUTHOR"
    BADGE_SOCIAL_MILESTONE = "SOCIAL_MILESTONE"
    BADGE_BETA_MASTER = "BETA_MASTER"
    BADGE_REVIEWER = "REVIEWER"
    BADGE_COMMUNITY = "COMMUNITY"
    
    @staticmethod
    async def award_badge(
        db: AsyncSession,
        user_id: int,
        badge_type: str,
        badge_name: str,
        badge_description: Optional[str] = None,
        earned_for: Optional[str] = None,
        milestone_value: Optional[int] = None,
        badge_icon: Optional[str] = None
    ) -> UserBadge:
        """Award a badge to a user."""
        # Check if user already has this badge
        result = await db.execute(
            select(UserBadge).where(
                and_(
                    UserBadge.user_id == user_id,
                    UserBadge.badge_type == badge_type,
                    UserBadge.badge_name == badge_name
                )
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            return existing
        
        badge = UserBadge(
            user_id=user_id,
            badge_type=badge_type,
            badge_name=badge_name,
            badge_description=badge_description,
            earned_for=earned_for,
            milestone_value=milestone_value,
            badge_icon=badge_icon
        )
        
        db.add(badge)
        await db.commit()
        await db.refresh(badge)
        
        return badge
    
    @staticmethod
    async def check_and_award_author_badge(db: AsyncSession, user_id: int) -> Optional[UserBadge]:
        """Check if user has published an epub and award AUTHOR badge."""
        from app.models.epub_submission import EpubSubmission
        
        # Check if user has any approved epub submissions
        result = await db.execute(
            select(EpubSubmission).where(
                and_(
                    EpubSubmission.user_id == user_id,
                    EpubSubmission.status == 'approved'
                )
            )
        )
        epub = result.first()
        
        if epub:
            return await BadgeService.award_badge(
                db,
                user_id,
                BadgeService.BADGE_AUTHOR,
                "Published Author",
                "Published an EPUB on WorkShelf",
                "First published work",
                badge_icon="📚"
            )
        return None
    
    @staticmethod
    async def check_and_award_follower_milestones(db: AsyncSession, user_id: int) -> List[UserBadge]:
        """Check follower count and award milestone badges."""
        from app.models.social import UserFollow
        
        # Count followers
        result = await db.execute(
            select(func.count(UserFollow.id)).where(
                UserFollow.following_id == user_id
            )
        )
        follower_count = result.scalar() or 0
        
        badges = []
        milestones = [
            (10, "10 Followers", "🌱"),
            (50, "50 Followers", "🌿"),
            (100, "100 Followers", "🌳"),
            (500, "500 Followers", "🏆"),
            (1000, "1K Followers", "⭐")
        ]
        
        for milestone, name, icon in milestones:
            if follower_count >= milestone:
                badge = await BadgeService.award_badge(
                    db,
                    user_id,
                    BadgeService.BADGE_SOCIAL_MILESTONE,
                    name,
                    f"Reached {milestone} followers",
                    f"{milestone} followers",
                    milestone,
                    icon
                )
                if badge:
                    badges.append(badge)
        
        return badges
    
    @staticmethod
    async def check_and_award_beta_badges(db: AsyncSession, user_id: int) -> Optional[UserBadge]:
        """Check beta reading reviews and award BETA_MASTER badge."""
        # Count positive reviews (4-5 stars) for beta reader
        result = await db.execute(
            select(func.count(BetaReaderReview.id)).where(
                and_(
                    BetaReaderReview.beta_reader_id == user_id,
                    BetaReaderReview.rating >= 4
                )
            )
        )
        positive_reviews = result.scalar() or 0
        
        if positive_reviews >= 10:
            return await BadgeService.award_badge(
                db,
                user_id,
                BadgeService.BADGE_BETA_MASTER,
                "Beta Master",
                "Received 10+ positive beta reading reviews",
                "10 positive reviews",
                10,
                "🎯"
            )
        return None
    
    @staticmethod
    async def get_user_badges(db: AsyncSession, user_id: int, visible_only: bool = True) -> List[UserBadge]:
        """Get all badges for a user."""
        query = select(UserBadge).where(UserBadge.user_id == user_id)
        
        if visible_only:
            query = query.where(UserBadge.is_visible == True)
        
        query = query.order_by(UserBadge.display_order.desc(), UserBadge.created_at.desc())
        
        result = await db.execute(query)
        return result.scalars().all()


class ScoreService:
    """Service for calculating and updating user reputation scores."""
    
    @staticmethod
    async def calculate_reading_score(db: AsyncSession, user_id: int) -> int:
        """
        Calculate reading score (1-5) based on book reviews.
        Factors: number of reviews, review quality (length, helpfulness)
        """
        from app.models.reading import ReadingProgress
        from app.models.collaboration import Comment
        
        # Count reading progress entries with reviews/comments
        # This is a simplified version - enhance with actual review data when available
        result = await db.execute(
            select(func.count(ReadingProgress.id)).where(
                and_(
                    ReadingProgress.user_id == user_id,
                    ReadingProgress.status == 'completed'
                )
            )
        )
        completed_books = result.scalar() or 0
        
        # Score calculation (simplified)
        if completed_books == 0:
            return 0
        elif completed_books < 5:
            return 1
        elif completed_books < 15:
            return 2
        elif completed_books < 30:
            return 3
        elif completed_books < 50:
            return 4
        else:
            return 5
    
    @staticmethod
    async def calculate_beta_score(db: AsyncSession, user_id: int) -> int:
        """
        Calculate beta score (1-5) based on beta reader reviews from authors.
        """
        # Get average rating from beta reader reviews
        result = await db.execute(
            select(func.avg(BetaReaderReview.rating), func.count(BetaReaderReview.id))
            .where(BetaReaderReview.beta_reader_id == user_id)
        )
        row = result.first()
        avg_rating = row[0] if row and row[0] else 0
        review_count = row[1] if row else 0
        
        # Need at least 3 reviews to have a score
        if review_count < 3:
            return 0
        
        # Round average to nearest integer (1-5)
        return max(1, min(5, round(avg_rating)))
    
    @staticmethod
    async def calculate_writer_score(db: AsyncSession, user_id: int) -> int:
        """
        Calculate writer score (1-5) based on:
        - How well they review beta readers (giving feedback)
        - Quality of feedback they receive from beta readers
        - Completion rate of beta requests
        """
        from app.models.collaboration import BetaRequest, BetaFeedback
        
        # Count beta requests authored
        requests_result = await db.execute(
            select(func.count(BetaRequest.id)).where(
                and_(
                    BetaRequest.author_id == user_id,
                    BetaRequest.status == 'completed'
                )
            )
        )
        completed_requests = requests_result.scalar() or 0
        
        # Count reviews given to beta readers
        reviews_result = await db.execute(
            select(func.count(BetaReaderReview.id)).where(
                BetaReaderReview.author_id == user_id
            )
        )
        reviews_given = reviews_result.scalar() or 0
        
        # Score based on engagement and follow-through
        if completed_requests == 0:
            return 0
        elif completed_requests < 3:
            return 1
        elif completed_requests < 10:
            score = 2
        elif completed_requests < 20:
            score = 3
        else:
            score = 4
        
        # Bonus point for giving reviews to beta readers
        if reviews_given >= completed_requests * 0.5:  # At least 50% review rate
            score = min(5, score + 1)
        
        return score
    
    @staticmethod
    async def update_all_scores(db: AsyncSession, user_id: int) -> dict:
        """Update all reputation scores for a user."""
        reading_score = await ScoreService.calculate_reading_score(db, user_id)
        beta_score = await ScoreService.calculate_beta_score(db, user_id)
        writer_score = await ScoreService.calculate_writer_score(db, user_id)
        
        # Update user record
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if user:
            user.reading_score = reading_score
            user.beta_score = beta_score
            user.writer_score = writer_score
            await db.commit()
        
        return {
            "reading_score": reading_score,
            "beta_score": beta_score,
            "writer_score": writer_score
        }
