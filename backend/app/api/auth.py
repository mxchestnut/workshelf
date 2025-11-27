"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.core.auth import get_current_user, get_current_user_id
from app.core.database import get_db
from app.models import User, Group, GroupMember, Tenant

router = APIRouter(prefix="/auth", tags=["authentication"])
logger = logging.getLogger("app.api.auth")


@router.get("/me")
async def get_user_info(
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current authenticated user information with groups
    
    Requires: Valid JWT token in Authorization header
    
    Returns user information from database including owned groups.
    If user doesn't exist in database, auto-creates them from Keycloak token.
    """
    try:
        keycloak_id = user.get("sub")
        email = user.get("email")
        logger.info(f"[AUTH /me] keycloak_id=%s email=%s", keycloak_id, email)

        # Fetch user from database
        result = await db.execute(
            select(User).where(User.keycloak_id == keycloak_id)
        )
        db_user = result.scalar_one_or_none()

        # Auto-create user if they don't exist (first time login after Keycloak registration)
        if not db_user:
            # Derive a base slug and name safely
            local_part = (email.split('@')[0] if email and '@' in email else keycloak_id[:8]).lower()
            base_slug = f"{local_part}-workspace"
            tenant_name = f"{local_part}'s Workspace"
            logger.info("[AUTH /me] creating tenant base_slug=%s tenant_name=%s", base_slug, tenant_name)

            # Ensure slug uniqueness by suffixing a counter if necessary
            slug = base_slug
            suffix = 1
            while True:
                existing = await db.execute(select(Tenant).where(Tenant.slug == slug))
                if not existing.scalar_one_or_none():
                    break
                suffix += 1
                slug = f"{base_slug}-{suffix}"
            logger.info("[AUTH /me] using tenant slug=%s", slug)

            # Create a personal tenant for the user
            tenant = Tenant(
                name=tenant_name,
                slug=slug,
                is_active=True
            )
            db.add(tenant)
            await db.flush()  # Get tenant.id

            # Create the user
            display = user.get("name") or user.get("preferred_username") or local_part
            db_user = User(
                keycloak_id=keycloak_id,
                email=email or f"{local_part}@unknown.local",
                username=None,  # Will be set during onboarding
                display_name=display,
                is_staff=False,
                is_approved=False,  # New users must be approved by staff
                is_active=True,
                is_verified=bool(user.get("email_verified", False)),
                tenant_id=tenant.id  # Link user to their personal tenant
            )
            db.add(db_user)
            try:
                await db.commit()
            except IntegrityError as e:
                # Very rare race: slug created between check and commit; retry once with new suffix
                logger.warning("[AUTH /me] IntegrityError on commit, retrying with new slug: %s", str(e))
                await db.rollback()
                suffix += 1
                tenant.slug = f"{base_slug}-{suffix}"
                db.add(tenant)
                db.add(db_user)
                await db.commit()
            await db.refresh(db_user)

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
            from app.models.collaboration import GroupMemberRole
            groups.append({
                "id": str(group.id),
                "name": group.name,
                "slug": group.slug,
                "is_owner": membership.role == GroupMemberRole.OWNER
            })

        payload = {
            "id": str(db_user.id),
            "email": db_user.email,
            "username": db_user.username,
            "display_name": db_user.display_name,
            "is_staff": db_user.is_staff,
            "is_approved": db_user.is_approved,
            "keycloak_id": db_user.keycloak_id,
            "matrix_onboarding_seen": db_user.matrix_onboarding_seen,
            "groups": groups
        }
        logger.info("[AUTH /me] returning user id=%s groups=%d", payload["id"], len(groups))
        return payload
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[AUTH /me] unexpected error: %s", str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve user info")


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


@router.post("/mark-matrix-onboarding-seen")
async def mark_matrix_onboarding_seen(
    current_user_token: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark that the user has seen the Matrix onboarding explanation
    
    Used for existing users who need to see the Matrix explanation once.
    New users automatically get this marked during onboarding completion.
    """
    keycloak_id = current_user_token.get("sub")
    
    # Fetch user from database
    result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.matrix_onboarding_seen = True
    await db.commit()
    
    return {
        "success": True,
        "message": "Matrix onboarding marked as seen"
    }
