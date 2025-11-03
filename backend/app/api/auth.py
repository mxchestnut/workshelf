"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from app.core.auth import get_current_user, get_current_user_id

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.get("/me")
async def get_user_info(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get current authenticated user information
    
    Requires: Valid JWT token in Authorization header
    
    Returns user information from Keycloak token
    """
    return {
        "user_id": user.get("sub"),
        "username": user.get("preferred_username"),
        "email": user.get("email"),
        "email_verified": user.get("email_verified"),
        "name": user.get("name"),
        "given_name": user.get("given_name"),
        "family_name": user.get("family_name"),
        "realm_roles": user.get("realm_access", {}).get("roles", []),
        "client_roles": {
            client: access.get("roles", [])
            for client, access in user.get("resource_access", {}).items()
        }
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
