"""
Account Deletion API
Handles user account deletion with proper warnings and username freezing
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services import user_service
from app.services.account_deletion_service import AccountDeletionService

router = APIRouter(prefix="/account", tags=["account"])


class UsernameCheckResponse(BaseModel):
    """Response for username availability check"""
    available: bool
    reason: Optional[str] = None
    thaw_at: Optional[datetime] = None


class AccountDeletionRequest(BaseModel):
    """Request to delete account with confirmation"""
    confirmation_phrase: str  # User must type "DELETE MY ACCOUNT" to confirm
    understand_permanent: bool  # User confirms they understand it's permanent
    understand_username_frozen: bool  # User confirms they understand username will be frozen
    understand_content_deleted: bool  # User confirms all content will be deleted


class AccountDeletionResponse(BaseModel):
    """Response after account deletion"""
    success: bool
    message: str
    username: Optional[str] = None
    username_frozen: bool
    thaw_at: Optional[datetime] = None


@router.get("/check-username/{username}", response_model=UsernameCheckResponse)
async def check_username_availability(
    username: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a username is available for use.
    Returns availability status and reason if unavailable (in use or frozen).
    """
    result = await AccountDeletionService.check_username_availability(db, username)
    return UsernameCheckResponse(**result)


@router.post("/delete", response_model=AccountDeletionResponse, status_code=status.HTTP_200_OK)
async def delete_my_account(
    deletion_request: AccountDeletionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Permanently delete the current user's account.
    
    ⚠️ WARNING: This action is PERMANENT and IRREVERSIBLE.
    
    This will delete:
    - Your user profile and account information
    - All your documents, projects, and folders
    - All your comments, messages, and activity
    - Your beta reader profile and requests
    - Your bookshelf, reading lists, and reading progress
    - Your group memberships and posts
    - Your subscriptions and payment history
    - All other associated data
    
    Your username will be frozen for 6 months and cannot be used by anyone
    during this period to prevent confusion.
    
    Requirements:
    - Must type "DELETE MY ACCOUNT" in the confirmation_phrase field
    - Must confirm understanding that deletion is permanent
    - Must confirm understanding that username will be frozen
    - Must confirm understanding that all content will be deleted
    """
    # Validate confirmation phrase
    if deletion_request.confirmation_phrase != "DELETE MY ACCOUNT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='You must type "DELETE MY ACCOUNT" exactly to confirm deletion'
        )
    
    # Validate all confirmations are checked
    if not all([
        deletion_request.understand_permanent,
        deletion_request.understand_username_frozen,
        deletion_request.understand_content_deleted
    ]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must confirm all checkboxes to proceed with account deletion"
        )
    
    # Get user from database
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Delete the account
    result = await AccountDeletionService.delete_user_account(
        db=db,
        user_id=user.id,
        freeze_username=True
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Failed to delete account")
        )
    
    return AccountDeletionResponse(**result)


@router.get("/deletion-info")
async def get_account_deletion_info(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get information about what will happen when deleting account.
    Useful for showing warnings before the user proceeds.
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "username": user.username,
        "email": user.email,
        "username_freeze_period_months": 6,
        "warnings": [
            "Your account will be permanently deleted and cannot be recovered",
            f"Your username '{user.username}' will be frozen for 6 months and cannot be used by anyone during this period",
            "All your documents, projects, and content will be permanently deleted",
            "All your comments, messages, and activity will be deleted",
            "Your beta reader profile and all related data will be deleted",
            "Your bookshelf, reading lists, and reading progress will be deleted",
            "Your group memberships and posts will be removed",
            "Your subscription will be cancelled (if active)",
            "This action is IRREVERSIBLE and PERMANENT"
        ],
        "confirmation_required": "DELETE MY ACCOUNT",
        "confirmations_required": [
            "I understand this deletion is permanent and cannot be undone",
            "I understand my username will be frozen for 6 months",
            "I understand all my content will be permanently deleted"
        ]
    }
