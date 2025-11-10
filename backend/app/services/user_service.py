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
        
        # If user doesn't have a tenant, create one for them
        if user.tenant_id is None:
            tenant = Tenant(
                name=f"{user.email.split('@')[0]}'s Workspace",
                slug=f"{user.email.split('@')[0]}-workspace",
                is_active=True
            )
            session.add(tenant)
            await session.flush()  # Get tenant.id
            user.tenant_id = tenant.id
        
        await session.commit()
        await session.refresh(user)
        return user
    
    # Create new user
    email = keycloak_data.get("email", f"{keycloak_id}@keycloak.local")
    username = keycloak_data.get("preferred_username", email.split("@")[0])
    display_name = keycloak_data.get("name") or keycloak_data.get("preferred_username", username)
    
    # Create a personal tenant first
    tenant = Tenant(
        name=f"{email.split('@')[0]}'s Workspace",
        slug=f"{email.split('@')[0]}-workspace",
        is_active=True
    )
    session.add(tenant)
    await session.flush()  # Get tenant.id
    
    # Check if username conflicts with existing group subdomains
    from app.models.collaboration import Group
    from fastapi import HTTPException
    
    subdomain_check = await session.execute(
        select(Group).filter(Group.subdomain_requested == username.lower())
    )
    if subdomain_check.scalar_one_or_none():
        # Try to append a number to make it unique
        base_username = username
        counter = 1
        while True:
            new_username = f"{base_username}{counter}"
            subdomain_check = await session.execute(
                select(Group).filter(Group.subdomain_requested == new_username.lower())
            )
            if not subdomain_check.scalar_one_or_none():
                username = new_username
                break
            counter += 1
            if counter > 999:  # Safety limit
                raise HTTPException(
                    status_code=500,
                    detail="Unable to create unique username"
                )
    
    user = User(
        tenant_id=tenant.id,  # Use the created tenant
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
