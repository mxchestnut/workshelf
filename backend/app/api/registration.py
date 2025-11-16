"""
Registration validation endpoints
Helps prevent duplicate registrations and provides better UX
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models import User
from app.api.auth import get_current_user
from pydantic import BaseModel, EmailStr, validator

router = APIRouter(prefix="/auth", tags=["registration"])


class AvailabilityCheck(BaseModel):
    """Request body for checking username/email/phone availability"""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None


class AvailabilityResponse(BaseModel):
    """Response indicating if username/email/phone is available"""
    available: bool
    message: str
    field: str


class CompleteOnboardingRequest(BaseModel):
    """Request body for completing onboarding"""
    username: str
    phone_number: Optional[str] = None
    birth_year: int
    interests: list[str] = []
    newsletter_opt_in: bool = False
    sms_opt_in: bool = False
    house_rules_accepted: bool
    
    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, hyphens, and underscores')
        return v
    
    @validator('phone_number')
    def validate_phone(cls, v):
        if v is None or v == '':
            return None
        # Remove common formatting characters
        cleaned = v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        if not cleaned.startswith('+'):
            raise ValueError('Phone number must include country code (e.g., +1234567890)')
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise ValueError('Phone number must be between 10 and 15 digits')
        return cleaned
    
    @validator('birth_year')
    def validate_age(cls, v):
        from datetime import datetime
        current_year = datetime.now().year
        age = current_year - v
        if age < 18:
            raise ValueError('You must be at least 18 years old')
        if v < 1900:
            raise ValueError('Invalid birth year')
        return v
    
    @validator('house_rules_accepted')
    def validate_house_rules(cls, v):
        if not v:
            raise ValueError('You must accept the House Rules')
        return v


@router.post("/check-availability", response_model=AvailabilityResponse)
async def check_availability(
    check: AvailabilityCheck,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if username, email, or phone number is already in use
    
    This helps provide immediate feedback during registration
    instead of failing at Keycloak submission.
    
    Returns:
    - available: True if the value can be used
    - message: User-friendly message
    - field: Which field was checked
    """
    
    # Check username
    if check.username:
        result = await db.execute(
            select(User).where(User.username == check.username)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            return AvailabilityResponse(
                available=False,
                message=f"Username '{check.username}' is already taken. Try a different one or sign in if this is your account.",
                field="username"
            )
        
        return AvailabilityResponse(
            available=True,
            message=f"Username '{check.username}' is available!",
            field="username"
        )
    
    # Check email
    if check.email:
        result = await db.execute(
            select(User).where(User.email == check.email)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            return AvailabilityResponse(
                available=False,
                message=f"An account with email '{check.email}' already exists. Please sign in instead or use account recovery if you've forgotten your password.",
                field="email"
            )
        
        return AvailabilityResponse(
            available=True,
            message="Email is available!",
            field="email"
        )
    
    # Check phone number
    if check.phone_number:
        # First check if phone_number column exists in User model
        # We'll need to add this field to the database
        result = await db.execute(
            select(User).where(User.phone_number == check.phone_number)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            return AvailabilityResponse(
                available=False,
                message=f"This phone number is already registered. Please sign in or contact support if you believe this is an error.",
                field="phone_number"
            )
        
        return AvailabilityResponse(
            available=True,
            message="Phone number is available!",
            field="phone_number"
        )
    
    raise HTTPException(
        status_code=400,
        detail="Please provide at least one field to check (username, email, or phone_number)"
    )


@router.get("/registration-info")
async def get_registration_info():
    """
    Get information needed for registration form
    
    Returns:
    - minimum_age: Minimum age requirement
    - terms_url: Link to Terms of Service
    - rules_url: Link to House Rules
    - privacy_url: Link to Privacy Policy
    """
    return {
        "minimum_age": 18,
        "terms_url": "/legal/terms",
        "rules_url": "/legal/rules",
        "privacy_url": "/legal/privacy",
        "features": {
            "email_verification": True,
            "phone_verification": True,
            "newsletter_optional": True,
            "sms_optional": True
        }
    }


@router.post("/complete-onboarding")
async def complete_onboarding(
    request: CompleteOnboardingRequest,
    current_user_token: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Complete user onboarding after Keycloak registration
    
    This is called after a user registers with Keycloak and verifies their email.
    It captures additional information needed for the platform.
    
    Requires: Valid JWT token (user must be authenticated via Keycloak)
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
            detail="User not found. Please contact support."
        )
    
    # Check if user already completed onboarding
    if user.username and user.phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Onboarding already completed"
        )
    
    # Check username availability
    username_check = await db.execute(
        select(User).where(User.username == request.username)
    )
    if username_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{request.username}' is already taken"
        )
    
    # Check phone number availability (only if provided)
    if request.phone_number:
        phone_check = await db.execute(
            select(User).where(User.phone_number == request.phone_number)
        )
        if phone_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Phone number is already registered"
            )
    
    # Update user with onboarding data
    user.username = request.username
    user.phone_number = request.phone_number
    user.birth_year = request.birth_year
    user.interests = request.interests if request.interests else []
    user.newsletter_opt_in = request.newsletter_opt_in
    user.sms_opt_in = request.sms_opt_in
    user.house_rules_accepted = request.house_rules_accepted
    user.matrix_onboarding_seen = True  # Mark Matrix onboarding as seen after completing step 3
    
    # Set display_name if not already set
    if not user.display_name:
        user.display_name = request.username
    
    await db.commit()
    await db.refresh(user)
    
    return {
        "success": True,
        "message": "Onboarding completed successfully!",
        "user": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "display_name": user.display_name
        }
    }
