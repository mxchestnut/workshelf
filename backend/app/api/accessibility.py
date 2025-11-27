"""
Accessibility API Routes
WCAG compliance and accessibility settings
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import User
from app.services.accessibility_service import AccessibilityService


router = APIRouter(prefix="/api/accessibility", tags=["Accessibility"])


class UpdateSettingsRequest(BaseModel):
    font_size: Optional[int] = None
    high_contrast: Optional[bool] = None
    dyslexia_font: Optional[bool] = None
    screen_reader_mode: Optional[bool] = None
    reduce_animations: Optional[bool] = None
    keyboard_shortcuts: Optional[bool] = None
    focus_indicators: Optional[bool] = None
    color_blind_mode: Optional[str] = None  # None, "protanopia", "deuteranopia", "tritanopia"
    text_spacing: Optional[float] = None
    reading_guide: Optional[bool] = None
    alt_text_preference: Optional[str] = None  # "brief", "verbose", "technical"


@router.get("/settings")
async def get_accessibility_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's accessibility settings
    
    Returns all settings with defaults for any not set.
    """
    result = await AccessibilityService.get_user_settings(
        db=db,
        user_id=current_user.id
    )
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result


@router.put("/settings")
async def update_accessibility_settings(
    request: UpdateSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user's accessibility settings
    
    Only provided fields will be updated. Others remain unchanged.
    
    Settings:
    - font_size: 8-48 (default: 16)
    - high_contrast: Enable high contrast mode
    - dyslexia_font: Use dyslexia-friendly font (OpenDyslexic)
    - screen_reader_mode: Optimize for screen readers
    - reduce_animations: Minimize animations
    - keyboard_shortcuts: Enable keyboard navigation
    - focus_indicators: Show focus indicators
    - color_blind_mode: null, "protanopia", "deuteranopia", "tritanopia"
    - text_spacing: 1.0-3.0 (line height multiplier)
    - reading_guide: Show reading guide line
    - alt_text_preference: "brief", "verbose", "technical"
    """
    # Convert to dict, excluding None values
    settings = request.dict(exclude_none=True)
    
    result = await AccessibilityService.update_user_settings(
        db=db,
        user_id=current_user.id,
        settings=settings
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/check-document/{document_id}")
async def check_document_accessibility(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Run WCAG compliance check on a document
    
    Checks:
    - Alt text for images
    - Heading structure (sequential hierarchy)
    - Link text (descriptive vs "click here")
    - Reading level (Flesch-Kincaid)
    
    Returns:
    - Overall accessibility score (0-100)
    - WCAG level (A, AA, AAA, or Failed)
    - List of issues with severity and suggestions
    - Reading level analysis
    """
    result = await AccessibilityService.check_document_accessibility(
        db=db,
        document_id=document_id,
        user_id=current_user.id
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/report")
async def get_accessibility_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate comprehensive accessibility report for all user documents
    
    Returns:
    - Total documents analyzed
    - Average accessibility score
    - Total issues found
    - Per-document scores and WCAG levels
    """
    result = await AccessibilityService.generate_accessibility_report(
        db=db,
        user_id=current_user.id
    )
    
    return result
