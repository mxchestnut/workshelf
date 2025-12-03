"""
Account Deletion Service
Handles complete user account deletion with username freezing
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_
from typing import Optional, Dict, Any
import logging

from app.models.user import User
from app.models.frozen_username import FrozenUsername

logger = logging.getLogger(__name__)

# Username freeze period: 6 months
USERNAME_FREEZE_MONTHS = 6


class AccountDeletionService:
    """Service for handling account deletion with username freezing"""
    
    @staticmethod
    async def check_username_availability(db: AsyncSession, username: str) -> Dict[str, Any]:
        """
        Check if a username is available (not in use and not frozen)
        
        Returns dict with:
        - available: bool
        - reason: str (if not available)
        - thaw_at: datetime (if frozen)
        """
        # Check if username is currently in use
        result = await db.execute(
            select(User).where(User.username == username)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            return {
                "available": False,
                "reason": "Username is already in use",
                "thaw_at": None
            }
        
        # Check if username is frozen
        result = await db.execute(
            select(FrozenUsername).where(
                and_(
                    FrozenUsername.username == username,
                    FrozenUsername.thaw_at > datetime.now(timezone.utc)
                )
            )
        )
        frozen = result.scalar_one_or_none()
        
        if frozen:
            return {
                "available": False,
                "reason": "Username is temporarily unavailable (previously deleted account)",
                "thaw_at": frozen.thaw_at
            }
        
        return {
            "available": True,
            "reason": None,
            "thaw_at": None
        }
    
    @staticmethod
    async def freeze_username(
        db: AsyncSession,
        username: str,
        user_email: str,
        keycloak_id: str
    ) -> FrozenUsername:
        """
        Freeze a username for 6 months after account deletion
        """
        now = datetime.now(timezone.utc)
        thaw_at = now + timedelta(days=30 * USERNAME_FREEZE_MONTHS)  # Approximate 6 months
        
        frozen_username = FrozenUsername(
            username=username,
            frozen_at=now,
            thaw_at=thaw_at,
            original_user_email=user_email,
            original_keycloak_id=keycloak_id
        )
        
        db.add(frozen_username)
        await db.flush()
        
        logger.info(f"Froze username '{username}' until {thaw_at}")
        
        return frozen_username
    
    @staticmethod
    async def cleanup_thawed_usernames(db: AsyncSession) -> int:
        """
        Remove frozen usernames that have passed their thaw date
        Returns number of usernames thawed
        """
        result = await db.execute(
            delete(FrozenUsername).where(
                FrozenUsername.thaw_at <= datetime.now(timezone.utc)
            )
        )
        
        count = result.rowcount
        await db.commit()
        
        if count > 0:
            logger.info(f"Thawed {count} frozen usernames")
        
        return count
    
    @staticmethod
    async def delete_user_account(
        db: AsyncSession,
        user_id: int,
        freeze_username: bool = True
    ) -> Dict[str, Any]:
        """
        Permanently delete a user account and all associated data.
        
        The CASCADE delete will automatically remove:
        - User profile
        - Documents and document collaborations
        - Projects and folders
        - Studio memberships
        - Comments and reactions
        - Notifications
        - Activity events
        - Social relationships (follows, followers)
        - Beta reader data (requests, appointments, reviews)
        - Group memberships and posts
        - Bookshelf items and reading progress
        - Reading lists and bookmarks
        - Subscriptions and payments
        - Export jobs
        - Integrity checks
        - Tags and badges
        - All other related data
        
        Args:
            db: Database session
            user_id: ID of user to delete
            freeze_username: Whether to freeze the username for 6 months (default: True)
        
        Returns:
            Dict with deletion details:
            - success: bool
            - username_frozen: bool
            - username: str
            - thaw_at: datetime (if frozen)
            - message: str
        """
        # Get user details before deletion
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return {
                "success": False,
                "error": "User not found",
                "username_frozen": False
            }
        
        username = user.username
        email = user.email
        keycloak_id = user.keycloak_id
        
        logger.info(f"Starting account deletion for user {user_id} (username: {username}, email: {email})")
        
        # Freeze username if requested and username exists
        username_frozen = False
        thaw_at = None
        
        if freeze_username and username:
            try:
                frozen = await AccountDeletionService.freeze_username(
                    db, username, email, keycloak_id
                )
                username_frozen = True
                thaw_at = frozen.thaw_at
                logger.info(f"Username '{username}' frozen until {thaw_at}")
            except Exception as e:
                logger.error(f"Failed to freeze username: {e}")
                # Continue with deletion even if username freeze fails
        
        # Delete the user (CASCADE will handle all related records)
        await db.execute(
            delete(User).where(User.id == user_id)
        )
        
        await db.commit()
        
        logger.info(f"Successfully deleted user {user_id} (username: {username})")
        
        return {
            "success": True,
            "username_frozen": username_frozen,
            "username": username,
            "thaw_at": thaw_at,
            "message": f"Account deleted successfully. Username '{username}' is frozen until {thaw_at.strftime('%Y-%m-%d') if thaw_at else 'N/A'}."
        }
    
    @staticmethod
    async def get_frozen_username_info(
        db: AsyncSession,
        username: str
    ) -> Optional[FrozenUsername]:
        """
        Get information about a frozen username
        Returns None if username is not frozen or has thawed
        """
        result = await db.execute(
            select(FrozenUsername).where(
                and_(
                    FrozenUsername.username == username,
                    FrozenUsername.thaw_at > datetime.now(timezone.utc)
                )
            )
        )
        
        return result.scalar_one_or_none()
