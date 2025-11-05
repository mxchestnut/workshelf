"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.auth import get_current_user, get_current_user_id
from app.core.database import get_db
from app.models import User, Group, GroupMember

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.get("/me")
async def get_user_info(
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current authenticated user information with groups
    
    Requires: Valid JWT token in Authorization header
    
    Returns user information from database including owned groups
    """
    keycloak_id = user.get("sub")
    
    # Fetch user from database
    result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    db_user = result.scalar_one_or_none()
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in database"
        )
    
    # Fetch user's groups where they are a member
    group_members_result = await db.execute(
        select(GroupMember, Group)
        .join(Group, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == db_user.id)
    )
    group_memberships = group_members_result.all()
    
    # Build groups list with owner status
    groups = []
    for membership, group in group_memberships:
        groups.append({
            "id": str(group.id),
            "name": group.name,
            "slug": group.slug,
            "is_owner": group.owner_id == db_user.id
        })
    
    return {
        "id": str(db_user.id),
        "email": db_user.email,
        "username": db_user.username,
        "display_name": db_user.display_name,
        "is_staff": db_user.is_staff,
        "keycloak_id": db_user.keycloak_id,
        "groups": groups
    }


@router.get("/verify")
async def verify_token(user_id: str = Depends(get_current_user_id)):
    """
    Verify that the current token is valid
    
    Requires: Valid JWT token in Authorization header
    
    Returns simple confirmation with user ID
    """
    return {
        "valid": True,
        "user_id": user_id
    }
