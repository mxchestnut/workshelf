"""Matrix protocol endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any

from app.core.database import get_db
from app.core.azure_auth import get_current_user
from app.services import user_service
from app.services.matrix_service import MatrixService
from app.models.user import User

router = APIRouter(prefix="/matrix", tags=["matrix"])


@router.post("/initialize")
async def initialize_matrix_account(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a Matrix account for the current user if they don't have one
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if already has Matrix account
    if user.matrix_user_id and user.matrix_access_token:
        return {
            "matrix_user_id": user.matrix_user_id,
            "matrix_homeserver": user.matrix_homeserver,
            "status": "already_exists"
        }
    
    # Register with Matrix
    matrix_user_id, access_token = await MatrixService.register_user(user.username)
    
    if not matrix_user_id or not access_token:
        raise HTTPException(status_code=500, detail="Failed to create Matrix account")
    
    # Store credentials
    user.matrix_user_id = matrix_user_id
    user.matrix_access_token = access_token
    user.matrix_homeserver = "https://matrix.workshelf.dev"
    await db.commit()
    
    return {
        "matrix_user_id": matrix_user_id,
        "matrix_homeserver": user.matrix_homeserver,
        "status": "created"
    }


@router.post("/rooms/create")
async def create_matrix_room(
    other_user_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a Matrix DM room with another user
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Ensure current user has Matrix account
    if not user.matrix_access_token:
        raise HTTPException(status_code=400, detail="No Matrix account. Call /initialize first")
    
    # Get other user's Matrix ID
    stmt = select(User).where(User.id == other_user_id)
    result = await db.execute(stmt)
    other_user = result.scalar_one_or_none()
    
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not other_user.matrix_user_id:
        raise HTTPException(status_code=400, detail="Other user doesn't have Matrix account")
    
    # Create room
    room_id = await MatrixService.create_dm_room(
        user_access_token=user.matrix_access_token,
        user_id=user.matrix_user_id,
        other_user_id=other_user.matrix_user_id
    )
    
    if not room_id:
        raise HTTPException(status_code=500, detail="Failed to create Matrix room")
    
    return {
        "room_id": room_id,
        "matrix_user_id": other_user.matrix_user_id,
        "other_user_display_name": other_user.display_name or other_user.username
    }


@router.get("/status")
async def get_matrix_status(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get Matrix account status for current user
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    return {
        "has_matrix_account": bool(user.matrix_user_id and user.matrix_access_token),
        "matrix_user_id": user.matrix_user_id,
        "matrix_homeserver": user.matrix_homeserver
    }
