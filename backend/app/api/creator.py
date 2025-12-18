"""
Creator API
Endpoints for creator earnings and payouts
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any

from app.core.database import get_db
from app.core.azure_auth import get_current_user
from app.models.user import User
from app.schemas.monetization import (
    CreatorEarningsResponse,
    PayoutRequest,
    PayoutResponse
)
from app.services.creator_earnings_service import CreatorEarningsService


router = APIRouter(prefix="/creator", tags=["creator"])


# ==================== Creator Earnings ====================

@router.get("/earnings", response_model=CreatorEarningsResponse)
async def get_my_earnings(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get creator earnings"""
    earnings = await CreatorEarningsService.get_or_create_earnings(db, current_user["id"])
    return earnings


@router.get("/dashboard")
async def get_earnings_dashboard(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive earnings dashboard"""
    dashboard = await CreatorEarningsService.get_earnings_dashboard(db, current_user["id"])
    
    return {
        "earnings": CreatorEarningsResponse.from_orm(dashboard["earnings"]),
        "recent_payouts": [PayoutResponse.from_orm(p) for p in dashboard["recent_payouts"]],
        "available_for_payout_cents": dashboard["available_for_payout_cents"],
        "available_for_payout_usd": float(dashboard["available_for_payout_usd"]),
        "minimum_payout_usd": float(dashboard["minimum_payout_usd"])
    }


# ==================== Stripe Connect ====================

@router.post("/connect/setup")
async def setup_stripe_connect(
    country: str = "US",
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Setup Stripe Connect account for receiving payouts
    
    Returns onboarding URL
    """
    result = await CreatorEarningsService.setup_stripe_connect(
        db=db,
        user_id=current_user["id"],
        country=country
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "account_id": result["account_id"],
        "onboarding_url": result["onboarding_url"]
    }


@router.get("/connect/status")
async def get_connect_status(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check Stripe Connect account status"""
    result = await CreatorEarningsService.check_connect_status(
        db=db,
        user_id=current_user["id"]
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# ==================== Payouts ====================

@router.post("/payout", response_model=PayoutResponse)
async def request_payout(
    payout_data: PayoutRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Request a payout
    
    Minimum payout is $10.00
    """
    result = await CreatorEarningsService.request_payout(
        db=db,
        user_id=current_user["id"],
        amount_cents=payout_data.amount_cents,
        payout_method=payout_data.payout_method,
        notes=payout_data.notes
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return PayoutResponse.from_orm(result["payout"])


@router.get("/payouts", response_model=List[PayoutResponse])
async def get_payout_history(
    skip: int = 0,
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get payout history"""
    payouts = await CreatorEarningsService.get_payout_history(
        db=db,
        user_id=current_user["id"],
        skip=skip,
        limit=limit
    )
    return payouts


# ==================== Admin Endpoints ====================

@router.post("/payouts/{payout_id}/process")
async def process_payout(
    payout_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Process a payout request (Admin only)
    
    Requires staff/admin privileges to process payouts.
    """
    # Verify admin access
    user_result = await db.execute(
        select(User).where(User.keycloak_id == current_user.get("sub"))
    )
    user = user_result.scalar_one_or_none()
    
    if not user or not user.is_staff:
        raise HTTPException(
            status_code=403,
            detail="Admin access required. Only staff members can process payouts."
        )
    
    result = await CreatorEarningsService.process_payout(
        db=db,
        payout_id=payout_id
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "message": "Payout processed successfully",
        "payout": PayoutResponse.from_orm(result["payout"])
    }
