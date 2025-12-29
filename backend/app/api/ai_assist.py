"""
AI Assistance API Routes
AI tools to help writers CREATE (not write FOR them)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import User
from app.services.ai_assistance_service import AIAssistanceService


router = APIRouter(prefix="/ai-assist", tags=["AI Assistance"])


class WritingPromptsRequest(BaseModel):
    genre: Optional[str] = None
    theme: Optional[str] = None
    count: int = 5


class CharacterBrainstormRequest(BaseModel):
    character_type: str
    genre: Optional[str] = None


class PlotSuggestionsRequest(BaseModel):
    story_premise: str
    act: str = "all"


class PacingAnalysisRequest(BaseModel):
    content: str
    word_count: int


class SynonymRequest(BaseModel):
    word: str
    context: Optional[str] = None


class TitleIdeasRequest(BaseModel):
    theme: str
    genre: str
    keywords: List[str] = []


class OutlineStructureRequest(BaseModel):
    story_type: str  # "novel", "short_story", "novella", "screenplay"
    acts: int = 3


@router.post("/writing-prompts")
async def generate_writing_prompts(
    request: WritingPromptsRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate writing prompts to inspire YOUR creativity
    
    Returns IDEAS and QUESTIONS, not actual writing.
    Use these as jumping-off points for your own unique stories!
    """
    # Validate request type
    validation = AIAssistanceService.validate_ai_request("writing_prompts")
    if not validation["allowed"]:
        raise HTTPException(status_code=403, detail=validation["reason"])
    
    prompts = await AIAssistanceService.generate_writing_prompts(
        genre=request.genre,
        theme=request.theme,
        count=request.count
    )
    
    return prompts


@router.post("/character-questions")
async def brainstorm_character(
    request: CharacterBrainstormRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Get character development QUESTIONS (not pre-made characters)
    
    These questions help YOU develop YOUR unique characters.
    The answers come from your imagination, not AI!
    """
    validation = AIAssistanceService.validate_ai_request("character_questions")
    if not validation["allowed"]:
        raise HTTPException(status_code=403, detail=validation["reason"])
    
    questions = await AIAssistanceService.brainstorm_character(
        character_type=request.character_type,
        genre=request.genre
    )
    
    return questions


@router.post("/plot-structure")
async def suggest_plot_points(
    request: PlotSuggestionsRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Get structural suggestions for your plot (not a completed plot)
    
    These are TYPES of plot points, not specific story events.
    You fill in the details with YOUR unique story!
    """
    validation = AIAssistanceService.validate_ai_request("plot_structure")
    if not validation["allowed"]:
        raise HTTPException(status_code=403, detail=validation["reason"])
    
    suggestions = await AIAssistanceService.suggest_plot_points(
        story_premise=request.story_premise,
        act=request.act
    )
    
    return suggestions


@router.post("/analyze-pacing")
async def analyze_pacing(
    request: PacingAnalysisRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Analyze the pacing and rhythm of YOUR writing
    
    Returns ANALYSIS and OBSERVATIONS, not rewrites.
    Keeps your unique voice intact while helping you understand your style.
    """
    validation = AIAssistanceService.validate_ai_request("pacing_analysis")
    if not validation["allowed"]:
        raise HTTPException(status_code=403, detail=validation["reason"])
    
    analysis = await AIAssistanceService.analyze_pacing(
        content=request.content,
        word_count=request.word_count
    )
    
    return analysis


@router.post("/synonyms")
async def suggest_synonyms(
    request: SynonymRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Get synonym suggestions for a SINGLE WORD
    
    This helps you find the right word, but doesn't rewrite your sentences.
    YOU choose which word fits your voice and intent.
    """
    validation = AIAssistanceService.validate_ai_request("synonym_single_word")
    if not validation["allowed"]:
        raise HTTPException(status_code=403, detail=validation["reason"])
    
    # Ensure it's a single word
    if len(request.word.split()) > 1:
        raise HTTPException(
            status_code=400,
            detail="This feature is for single words only. No sentence rewriting allowed!"
        )
    
    suggestions = await AIAssistanceService.suggest_synonyms(
        word=request.word,
        context=request.context
    )
    
    return suggestions


@router.post("/title-ideas")
async def generate_title_ideas(
    request: TitleIdeasRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Get title suggestions based on your theme and genre
    
    These are starting points - personalize them to match YOUR story!
    """
    validation = AIAssistanceService.validate_ai_request("title_suggestions")
    if not validation["allowed"]:
        raise HTTPException(status_code=403, detail=validation["reason"])
    
    ideas = await AIAssistanceService.generate_title_ideas(
        theme=request.theme,
        genre=request.genre,
        keywords=request.keywords
    )
    
    return ideas


@router.post("/outline-structure")
async def create_outline_structure(
    request: OutlineStructureRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Get an empty outline structure (framework only)
    
    This provides the SKELETON - YOU fill it with your unique story beats!
    No pre-written plot, just structural guidance.
    """
    validation = AIAssistanceService.validate_ai_request("outline_framework")
    if not validation["allowed"]:
        raise HTTPException(status_code=403, detail=validation["reason"])
    
    structure = await AIAssistanceService.create_outline_structure(
        story_type=request.story_type,
        acts=request.acts
    )
    
    return structure


@router.get("/policy")
async def get_ai_policy():
    """
    Get Work Shelf's AI assistance policy
    
    Transparency about what AI can and cannot do on this platform.
    """
    return {
        "philosophy": "AI as creative assistant, never as creator",
        "allowed": {
            "writing_prompts": "Generate ideas and scenarios to inspire you",
            "character_questions": "Get questions to help develop your characters",
            "plot_structure": "Understand story structure frameworks",
            "pacing_analysis": "Analyze the rhythm of your writing",
            "synonyms": "Find alternative words (single words only)",
            "title_suggestions": "Get title ideas to personalize",
            "outline_framework": "Empty structures to fill with your story",
            "world_building": "Questions and frameworks for building worlds",
            "theme_exploration": "Questions to deepen your themes"
        },
        "prohibited": {
            "paragraph_generation": "AI will NOT write paragraphs for you",
            "scene_writing": "AI will NOT write scenes for you",
            "story_completion": "AI will NOT complete your stories",
            "content_rewriting": "AI will NOT rewrite your content",
            "auto_complete": "NO auto-complete beyond single words",
            "dialogue_generation": "AI will NOT write dialogue for you",
            "description_writing": "AI will NOT write descriptions for you"
        },
        "enforcement": {
            "automatic_checking": "All content submitted for beta reading or publishing is automatically checked",
            "plagiarism_limit": "Maximum 25% similarity to existing sources",
            "ai_content_limit": "Maximum 30% AI-generated content",
            "consequences": "Content failing integrity checks cannot be published or submitted for beta reading",
            "appeals": "Contact support if you believe your content was incorrectly flagged"
        },
        "why": "Your authentic voice is what makes your work valuable. We're here to help you CREATE, not to replace your creativity.",
        "our_promise": "Work Shelf will NEVER generate content that claims to be your writing. All AI features are tools to support YOUR creative process."
    }
