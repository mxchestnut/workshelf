"""
Invitation API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict

from app.core.database import get_db
from app.core.auth import get_current_user, require_staff
from app.models.user import User
from app.models.invitation import Invitation, InvitationStatus


router = APIRouter(prefix="/invitations", tags=["invitations"])


# Pydantic models
class InvitationCreate(BaseModel):
    email: EmailStr


class InvitationResponse(BaseModel):
    id: int
    email: str
    token: str
    status: str
    created_by: int
    created_at: datetime
    expires_at: datetime
    accepted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class InvitationVerifyResponse(BaseModel):
    email: str
    valid: bool
    message: str


@router.post("", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def create_invitation(
    invitation: InvitationCreate,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new invitation (staff only)
    """
    # Check if there's already a pending invitation for this email
    result = await db.execute(
        select(Invitation).where(
            Invitation.email == invitation.email,
            Invitation.status == InvitationStatus.PENDING
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        if existing.is_valid():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An active invitation already exists for this email"
            )
        else:
            # Mark old invitation as expired
            existing.mark_expired()
            await db.commit()
    
    # Check if user already exists
    from app.models.user import User as UserModel
    result = await db.execute(select(UserModel).where(UserModel.email == invitation.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
    
    # Create new invitation
    new_invitation = Invitation(
        email=invitation.email,
        token=Invitation.generate_token(),
        created_by=current_user.id,
        expires_at=Invitation.default_expiration()
    )
    
    db.add(new_invitation)
    await db.commit()
    await db.refresh(new_invitation)
    
    return new_invitation


@router.get("", response_model=List[InvitationResponse])
async def list_invitations(
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    List all invitations (staff only)
    """
    result = await db.execute(
        select(Invitation).order_by(Invitation.created_at.desc())
    )
    invitations = result.scalars().all()
    return invitations


@router.get("/verify/{token}", response_model=InvitationVerifyResponse)
async def verify_invitation(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify if an invitation token is valid
    """
    result = await db.execute(select(Invitation).where(Invitation.token == token))
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        return InvitationVerifyResponse(
            email="",
            valid=False,
            message="Invalid invitation token"
        )
    
    if invitation.status != InvitationStatus.PENDING:
        return InvitationVerifyResponse(
            email=invitation.email,
            valid=False,
            message=f"This invitation has been {invitation.status.value}"
        )
    
    if invitation.expires_at < datetime.now(timezone.utc):
        invitation.mark_expired()
        db.commit()
        return InvitationVerifyResponse(
            email=invitation.email,
            valid=False,
            message="This invitation has expired"
        )
    
    return InvitationVerifyResponse(
        email=invitation.email,
        valid=True,
        message="Invitation is valid"
    )


@router.post("/{invitation_id}/revoke", response_model=InvitationResponse)
async def revoke_invitation(
    invitation_id: int,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Revoke an invitation (staff only)
    """
    result = await db.execute(select(Invitation).where(Invitation.id == invitation_id))
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    invitation.revoke()
    await db.commit()
    
    return {"message": "Invitation revoked successfully"}


@router.post("/accept/{token}")
async def accept_invitation(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark invitation as accepted (authenticated user)
    """
    result = await db.execute(select(Invitation).where(Invitation.token == token))
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    if not invitation.is_valid():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is no longer valid"
        )
    
    # Verify that the user's email matches the invitation
    if current_user.email != invitation.email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation was sent to a different email address"
        )
    
    invitation.mark_accepted(current_user.id)
    await db.commit()
    
    return {"message": "Invitation accepted successfully"}

