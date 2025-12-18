"""Beta Reading API - Beta request and feedback management"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List, Optional

from app.core.database import get_db
from app.core.azure_auth import get_current_user
from app.services import user_service
from app.services.beta_reading_service import BetaReadingService
from app.services.content_integrity_service import ContentIntegrityService
from app.models.collaboration import BetaRequestStatus
from app.schemas.collaboration import (
    BetaRequestCreate, BetaRequestUpdate, BetaRequestResponse,
    BetaFeedbackCreate, BetaFeedbackResponse
)

router = APIRouter(prefix="/beta-reading", tags=["beta-reading"])


@router.post("/requests", response_model=BetaRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_beta_request(
    request_data: BetaRequestCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a beta reading request.
    
    AUTOMATIC INTEGRITY CHECK: All content submitted for beta reading is automatically
    checked for plagiarism and AI-generated content to ensure authenticity.
    
    Limits:
    - Maximum 25% plagiarism (similarity to existing sources)
    - Maximum 30% AI-generated content
    
    Your authentic voice is what makes your work valuable!
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # AUTOMATIC INTEGRITY CHECK before accepting beta request
    integrity_result = await ContentIntegrityService.auto_check_before_publish(
        db=db,
        document_id=request_data.document_id,
        user_id=user.id,
        action="beta_submit"
    )
    
    if not integrity_result["can_proceed"]:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Content failed integrity check",
                "check_id": integrity_result.get("check_id"),
                "issues": integrity_result.get("issues", []),
                "message": integrity_result.get("message"),
                "policy_reminder": integrity_result.get("policy_reminder"),
                "help": "Review the issues and revise your content. Work Shelf celebrates authentic human creativity!"
            }
        )
    
    # Create beta request
    request = await BetaReadingService.create_request(
        db,
        request_data.document_id,
        user.id,
        request_data.reader_id,
        request_data.message,
        request_data.deadline
    )
    
    # Include integrity check info in response
    request.integrity_check_id = integrity_result.get("check_id")
    request.integrity_passed = True
    
    return request


@router.get("/requests/sent", response_model=List[BetaRequestResponse])
async def get_sent_requests(
    status_filter: Optional[BetaRequestStatus] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get beta requests sent by current user."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    requests = await BetaReadingService.get_sent_requests(db, user.id, status_filter, limit, offset)
    return requests


@router.get("/requests/received", response_model=List[BetaRequestResponse])
async def get_received_requests(
    status_filter: Optional[BetaRequestStatus] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get beta requests received by current user."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    requests = await BetaReadingService.get_received_requests(db, user.id, status_filter, limit, offset)
    return requests


@router.get("/requests/{request_id}", response_model=BetaRequestResponse)
async def get_beta_request(
    request_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific beta request."""
    request = await BetaReadingService.get_request_by_id(db, request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Beta request not found")
    return request


@router.put("/requests/{request_id}", response_model=BetaRequestResponse)
async def update_beta_request(
    request_id: int,
    request_data: BetaRequestUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update beta request status (reader only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    request = await BetaReadingService.update_request_status(db, request_id, user.id, request_data.status)
    if not request:
        raise HTTPException(status_code=404, detail="Beta request not found or not authorized")
    return request


@router.post("/requests/{request_id}/feedback", response_model=BetaFeedbackResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback(
    request_id: int,
    feedback_data: BetaFeedbackCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create feedback for a beta request."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Verify the request exists and user is involved
    request = await BetaReadingService.get_request_by_id(db, request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Beta request not found")
    
    if request.author_id != user.id and request.reader_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to add feedback")
    
    feedback = await BetaReadingService.create_feedback(
        db,
        request_id,
        feedback_data.title,
        feedback_data.content,
        feedback_data.rating,
        feedback_data.strengths,
        feedback_data.improvements,
        feedback_data.is_private
    )
    return feedback


@router.get("/requests/{request_id}/feedback", response_model=List[BetaFeedbackResponse])
async def get_request_feedback(
    request_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all feedback for a beta request."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    feedback = await BetaReadingService.get_feedback_by_request(db, request_id, user.id)
    return feedback
