"""
Bootstrap API - Emergency admin access
Uses SECRET_KEY for authentication
"""
from fastapi import APIRouter, Header, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User
from app.core.config import settings

router = APIRouter(prefix="/bootstrap", tags=["bootstrap"])


@router.post("/grant-staff/{email}")
async def grant_staff_access(
    email: str,
    x_admin_secret: str = Header(..., description="Admin secret key"),
    db: AsyncSession = Depends(get_db)
):
    """
    Emergency endpoint to grant staff access
    
    Requires X-Admin-Secret header matching SECRET_KEY
    """
    # Verify admin secret
    if x_admin_secret != settings.SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    
    # Find user
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail=f"User not found: {email}")
    
    # Grant staff access
    user.is_staff = True
    user.is_approved = True
    user.is_active = True
    await db.commit()
    
    return {
        "success": True,
        "message": f"Granted staff access to {email}",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "is_staff": user.is_staff,
            "is_approved": user.is_approved,
            "is_active": user.is_active
        }
    }
