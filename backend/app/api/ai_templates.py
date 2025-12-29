"""
AI Templates API Routes
Generate custom project templates based on user interests using Claude
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import List, Optional, Any

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import User
from app.models.ai_templates import AIGeneratedTemplate
from app.services.ai_template_service import AITemplateGenerator


router = APIRouter(prefix="/ai", tags=["AI Templates"])


class GenerateTemplatesRequest(BaseModel):
    """Request to generate templates based on interests"""
    interests: List[str] = Field(..., min_items=1, max_items=20, description="User interests (e.g., ['science fiction', 'worldbuilding'])")
    group_id: Optional[int] = Field(None, description="Group ID if generating for a specific group")
    num_templates: int = Field(10, ge=1, le=20, description="Number of templates to generate (1-20)")


class AITemplateResponse(BaseModel):
    """Single AI-generated template"""
    id: int
    name: str
    slug: str
    description: Optional[str]
    category: Optional[str]
    icon: Optional[str]
    source_interests: List[str]
    sections: Any  # JSONB structure (can be dict or list)
    status: str
    ai_model: str
    generation_timestamp: str
    
    class Config:
        from_attributes = True


class GenerateTemplatesResponse(BaseModel):
    """Response with generated templates"""
    templates: List[AITemplateResponse]
    generation_time_ms: int
    message: str


class CheckExistingRequest(BaseModel):
    """Check if approved templates already exist for interests"""
    interests: List[str] = Field(..., min_items=1)


class ExistingTemplateResponse(BaseModel):
    """Template that already exists (approved)"""
    id: int
    name: str
    slug: str
    description: Optional[str]
    category: Optional[str]
    icon: Optional[str]
    usage_count: int
    
    class Config:
        from_attributes = True


class ApproveTemplateRequest(BaseModel):
    """Staff request to approve an AI template"""
    ai_template_id: int
    edits: Optional[dict] = None
    review_notes: Optional[str] = None


@router.get("/templates/{slug}", response_model=AITemplateResponse)
async def get_template_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific AI template by slug.
    Used when creating a project from a template.
    """
    result = await db.execute(
        select(AIGeneratedTemplate)
        .where(AIGeneratedTemplate.slug == slug)
        .where(AIGeneratedTemplate.status == "approved")
    )
    
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{slug}' not found or not approved"
        )
    
    return template


@router.post("/generate-templates", response_model=GenerateTemplatesResponse, status_code=status.HTTP_201_CREATED)
async def generate_templates(
    request: GenerateTemplatesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate custom project templates using Claude based on user interests.
    
    **Flow**:
    1. User provides interests (e.g., "science fiction", "worldbuilding")
    2. Claude analyzes interests and generates N custom templates
    3. Templates saved with status='pending' (awaiting staff review)
    4. Returns generated templates for immediate use
    
    **Example**:
    ```json
    {
      "interests": ["science fiction", "worldbuilding", "space opera"],
      "group_id": 123,
      "num_templates": 10
    }
    ```
    
    **Returns**:
    - List of AI-generated templates
    - Each template includes sections with AI prompts
    - Templates are in 'pending' status until staff approves
    """
    try:
        generator = AITemplateGenerator()
        
        import time
        start_time = time.time()
        
        templates = await generator.generate_templates_for_interests(
            db=db,
            interests=request.interests,
            user_id=current_user.id,
            group_id=request.group_id,
            num_templates=request.num_templates
        )
        
        generation_time_ms = int((time.time() - start_time) * 1000)
        
        return GenerateTemplatesResponse(
            templates=[AITemplateResponse.model_validate(t) for t in templates],
            generation_time_ms=generation_time_ms,
            message=f"Generated {len(templates)} custom templates! These are pending staff review and can be used immediately."
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate templates: {str(e)}"
        )


@router.post("/check-existing", response_model=List[ExistingTemplateResponse])
async def check_existing_templates(
    request: CheckExistingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if approved templates already exist for given interests.
    
    **Use Case**: Before generating new templates, check if staff has already
    approved templates for these interests. Saves AI tokens and gives users
    curated templates immediately.
    
    **Example**:
    ```json
    {
      "interests": ["science fiction", "worldbuilding"]
    }
    ```
    
    **Returns**:
    - List of approved ProjectTemplates matching interests
    - Empty list if no matches (should generate new ones)
    """
    try:
        generator = AITemplateGenerator()
        
        templates = await generator.check_existing_templates(
            db=db,
            interests=request.interests,
            status="approved"
        )
        
        return [ExistingTemplateResponse.model_validate(t) for t in templates]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check existing templates: {str(e)}"
        )


@router.post("/approve-template", response_model=ExistingTemplateResponse)
async def approve_template(
    request: ApproveTemplateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    **STAFF ONLY**: Approve an AI-generated template and convert to canonical template.
    
    **Flow**:
    1. Staff reviews AI template in dashboard
    2. Optionally edits sections/prompts
    3. Approves → becomes canonical ProjectTemplate
    4. Future users with same interests get this approved version
    
    **Permissions**: Requires is_staff=True
    
    **Example**:
    ```json
    {
      "ai_template_id": 123,
      "edits": {
        "sections": [...modified sections...]
      },
      "review_notes": "Great template! Tweaked some prompts for clarity."
    }
    ```
    """
    # Check if user is staff
    if not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform staff can approve templates"
        )
    
    try:
        generator = AITemplateGenerator()
        
        template = await generator.approve_template(
            db=db,
            ai_template_id=request.ai_template_id,
            reviewer_id=current_user.id,
            edits=request.edits,
            review_notes=request.review_notes
        )
        
        return ExistingTemplateResponse.model_validate(template)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve template: {str(e)}"
        )


@router.get("/pending-templates", response_model=List[AITemplateResponse])
async def get_pending_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    **STAFF ONLY**: Get all pending AI templates awaiting review.
    
    **Use Case**: Platform admin dashboard shows list of templates
    Kit needs to review/approve.
    
    **Permissions**: Requires is_staff=True
    """
    # Check if user is staff
    if not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform staff can view pending templates"
        )
    
    try:
        from sqlalchemy import select
        from app.models.ai_templates import AIGeneratedTemplate
        
        result = await db.execute(
            select(AIGeneratedTemplate)
            .where(AIGeneratedTemplate.status == 'pending')
            .order_by(AIGeneratedTemplate.generation_timestamp.desc())
        )
        templates = result.scalars().all()
        
        return [AITemplateResponse.model_validate(t) for t in templates]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending templates: {str(e)}"
        )
