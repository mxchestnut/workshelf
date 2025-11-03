"""
User Service
Business logic for user management
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, Dict, Any
from app.models.user import User, UserProfile
from app.models.tenant import Tenant


async def get_or_create_user_from_keycloak(
    session: AsyncSession,
    keycloak_data: Dict[str, Any],
    tenant_id: int = 1  # Default tenant for now
) -> User:
    """
    Get existing user by Keycloak ID or create new one
    
    Args:
        session: Database session
        keycloak_data: Data from Keycloak JWT token
        tenant_id: Tenant ID (default to first tenant)
        
    Returns:
        User object
    """
    keycloak_id = keycloak_data.get("sub")
    
    # Try to find existing user
    result = await session.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    user = result.scalar_one_or_none()
    
    if user:
        # Update last login
        from datetime import datetime
        user.last_login = datetime.utcnow()
        await session.commit()
        await session.refresh(user)
        return user
    
    # Create new user
    email = keycloak_data.get("email", f"{keycloak_id}@keycloak.local")
    username = keycloak_data.get("preferred_username", email.split("@")[0])
    display_name = keycloak_data.get("name") or keycloak_data.get("preferred_username", username)
    
    user = User(
        tenant_id=tenant_id,
        keycloak_id=keycloak_id,
        email=email,
        username=username,
        display_name=display_name,
        is_active=True,
        is_verified=keycloak_data.get("email_verified", False)
    )
    
    session.add(user)
    await session.flush()  # Get the user ID
    
    # Create user profile
    profile = UserProfile(
        user_id=user.id,
        timezone="UTC",
        language="en",
        theme="system"
    )
    session.add(profile)
    
    await session.commit()
    await session.refresh(user)
    
    return user


async def get_user_by_id(session: AsyncSession, user_id: int) -> Optional[User]:
    """Get user by database ID"""
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def get_user_by_keycloak_id(session: AsyncSession, keycloak_id: str) -> Optional[User]:
    """Get user by Keycloak ID"""
    result = await session.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    return result.scalar_one_or_none()
