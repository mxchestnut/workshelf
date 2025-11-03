"""
Content Integrity API Routes
Plagiarism detection and AI content detection
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional, List

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import User, Document, IntegrityCheck
from app.services.content_integrity_service import ContentIntegrityService


router = APIRouter(prefix="/content", tags=["Content Integrity"])


class CreateIntegrityCheckRequest(BaseModel):
    document_id: int
    check_type: str = "ai_detection"  # "plagiarism", "ai_detection", "combined"


class QuickAICheckRequest(BaseModel):
    """Request for quick AI detection without saving to database"""
    text: str = Field(..., min_length=50, description="Text to check (minimum 50 words)")


class AICheckResponse(BaseModel):
    """Response from AI detection"""
    ai_score: float = Field(..., description="AI probability percentage (0-100)")
    ai_confidence: float = Field(..., description="Confidence in the detection (0-100)")
    classification: str = Field(..., description="Predicted class: human, ai, or mixed")
    interpretation: str = Field(..., description="Human-readable interpretation")
    result_message: str = Field(..., description="Detailed result message from GPTZero")
    word_count: int


@router.post("/check-ai", response_model=AICheckResponse)
async def quick_ai_check(
    request: QuickAICheckRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Quick AI detection check without creating a full integrity check record.
    Useful for on-the-fly checks while writing.
    
    Requires:
    - Minimum 50 words for reliable detection
    - Pro or Premium subscription (uses GPTZero API credits)
    
    Returns:
    - AI probability score (0-100%)
    - Classification (human/ai/mixed)
    - Confidence level
    - Human-readable interpretation
    """
    import httpx
    import os
    
    # Validate text length
    word_count = len(request.text.split())
    if word_count < 50:
        raise HTTPException(
            status_code=400, 
            detail=f"Text too short for reliable AI detection. Minimum 50 words required, got {word_count}."
        )
    
    # Check if GPTZero API key is configured
    api_key = os.getenv("GPTZERO_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="AI detection service not configured. Please contact support."
        )
    
    try:
        # Call GPTZero API
        url = "https://api.gptzero.me/v2/predict/text"
        headers = {
            "X-Api-Key": api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "document": request.text,
            "version": "2025-10-30-base"
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"AI detection service error: {response.text}"
                )
            
            result = response.json()
        
        # Parse response
        doc = result["documents"][0]
        predicted_class = doc.get("predicted_class", "unknown")
        confidence_score = doc.get("confidence_score", 0.0)
        
        class_probs = doc.get("class_probabilities", {})
        ai_prob = class_probs.get("ai", 0.0)
        
        ai_score = round(ai_prob * 100, 2)
        ai_confidence = round(confidence_score * 100, 2)
        
        # Generate interpretation
        if ai_score < 30:
            interpretation = f"✅ Likely Human-Written ({ai_score:.1f}% AI) - Content appears authentic."
        elif ai_score < 70:
            interpretation = f"⚠️  Mixed Content ({ai_score:.1f}% AI) - Some sections may be AI-assisted."
        else:
            interpretation = f"❌ Likely AI-Generated ({ai_score:.1f}% AI) - Content appears primarily AI-written."
        
        return AICheckResponse(
            ai_score=ai_score,
            ai_confidence=ai_confidence,
            classification=predicted_class,
            interpretation=interpretation,
            result_message=doc.get("result_message", ""),
            word_count=word_count
        )
    
    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail=f"AI detection service unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during AI detection: {str(e)}")


@router.post("/check")
async def create_integrity_check(
    request: CreateIntegrityCheckRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a full integrity check for a document (saved to database).
    Processing happens asynchronously.
    
    Check types:
    - ai_detection: Check for AI-generated content using GPTZero
    - plagiarism: Check for plagiarized content (requires Copyscape - coming soon)
    - combined: Run both checks
    
    Returns immediately with check_id. Use GET /check/{check_id} to get results.
    """
    result = await ContentIntegrityService.create_integrity_check(
        db=db,
        document_id=request.document_id,
        user_id=current_user.id,
        check_type=request.check_type
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    check = result["check"]
    
    # Run AI detection if requested
    if request.check_type in ["ai_detection", "combined"]:
        background_tasks.add_task(
            ContentIntegrityService.run_ai_detection,
            db=db,
            check_id=check.id
        )
    
    return {
        "check_id": check.id,
        "status": check.status.value,
        "check_type": check.check_type.value,
        "message": "Integrity check started. Results will be available shortly."
    }


@router.get("/check/{check_id}")
async def get_check_results(
    check_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get results of an integrity check
    
    Returns:
    - Check status (pending/processing/completed/failed)
    - AI detection score and classification (if completed)
    - Plagiarism score and matches (if completed)
    - Processing time and cost
    - Detailed analysis
    """
    check = await ContentIntegrityService.get_check_results(
        db=db,
        check_id=check_id,
        user_id=current_user.id
    )
    
    if not check:
        raise HTTPException(status_code=404, detail="Check not found")
    
    return {
        "id": check.id,
        "document_id": check.document_id,
        "check_type": check.check_type.value,
        "status": check.status.value,
        "word_count": check.word_count,
        "ai_score": check.ai_score,
        "ai_confidence": check.ai_confidence,
        "ai_details": check.ai_details,
        "plagiarism_score": check.plagiarism_score,
        "plagiarism_matches": check.plagiarism_matches,
        "total_matches": check.total_matches,
        "cost_cents": check.cost_cents,
        "external_service": check.external_service,
        "error_message": check.error_message,
        "created_at": check.created_at,
        "processing_started_at": check.processing_started_at,
        "processing_completed_at": check.processing_completed_at
    }


@router.get("/document/{document_id}/checks")
async def get_document_checks(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all integrity checks for a document
    """
    checks = await ContentIntegrityService.get_document_checks(
        db=db,
        document_id=document_id,
        user_id=current_user.id
    )
    
    return {"checks": checks}


@router.get("/my-checks")
async def get_my_checks(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all integrity checks for the current user
    """
    checks = await ContentIntegrityService.get_user_checks(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    
    return {"checks": checks}
