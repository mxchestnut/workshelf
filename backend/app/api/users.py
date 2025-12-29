"""
User endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.core.auth import get_current_user
from app.core.database import get_db
from app.services import user_service
from app.schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get or create the current authenticated user's profile.
    This endpoint will auto-create a user record on first authentication.
    """
    try:
        print(f"[/me] Getting user for keycloak_id: {current_user.get('sub')}")
        user = await user_service.get_or_create_user_from_keycloak(db, current_user)
        print(f"[/me] Successfully got user: {user.id}")
        return user
    except Exception as e:
        print(f"[/me ERROR] Failed to get/create user: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
