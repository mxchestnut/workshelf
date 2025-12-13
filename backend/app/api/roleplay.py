"""
Roleplay Studio API - Collaborative literate roleplay endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services import user_service
from app.services.roleplay_service import RoleplayService
from app.schemas.roleplay import (
    # Project schemas
    RoleplayProjectCreate, RoleplayProjectUpdate, RoleplayProjectResponse,
    # Character schemas
    CharacterCreate, CharacterUpdate, CharacterResponse, CharacterListParams,
    # Scene schemas
    SceneCreate, SceneUpdate, SceneResponse,
    # Passage schemas
    PassageCreate, PassageUpdate, PassageResponse, PassageListParams,
    PassageReactionCreate, PassageReactionResponse,
    # Lore schemas
    LoreEntryCreate, LoreEntryUpdate, LoreEntryResponse, LoreEntryListParams,
    # Dice schemas
    DiceRollRequest, DiceRollResponse
)

router = APIRouter(prefix="/roleplay", tags=["roleplay"])


# ============================================================================
# Roleplay Project Endpoints
# ============================================================================

@router.post("/projects", response_model=RoleplayProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_roleplay_project(
    data: RoleplayProjectCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create roleplay settings for an existing project.
    
    Converts a regular project into a roleplay project by adding
    roleplay-specific settings (genre, rating, dice system, etc.).
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    try:
        roleplay_project = await RoleplayService.create_roleplay_project(db, data, user.id)
        return roleplay_project
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/projects", response_model=List[RoleplayProjectResponse])
async def list_roleplay_projects(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all roleplay projects accessible to the current user.
    
    Returns roleplay projects owned by or shared with the user.
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    projects = await RoleplayService.list_roleplay_projects(db, user.id)
    return projects


@router.get("/projects/{project_id}", response_model=RoleplayProjectResponse)
async def get_roleplay_project(
    project_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get roleplay project settings by project ID."""
    roleplay_project = await RoleplayService.get_roleplay_project(db, project_id)
    
    if not roleplay_project:
        raise HTTPException(status_code=404, detail="Roleplay project not found")
    
    return roleplay_project


@router.put("/projects/{project_id}", response_model=RoleplayProjectResponse)
async def update_roleplay_project(
    project_id: int,
    data: RoleplayProjectUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update roleplay project settings (project owner only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    roleplay_project = await RoleplayService.update_roleplay_project(db, project_id, data, user.id)
    
    if not roleplay_project:
        raise HTTPException(status_code=404, detail="Roleplay project not found or access denied")
    
    return roleplay_project


# ============================================================================
# Character Endpoints
# ============================================================================

@router.post("/projects/{project_id}/characters", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def create_character(
    project_id: int,
    data: CharacterCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new character in the roleplay."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Get roleplay project
    roleplay_project = await RoleplayService.get_roleplay_project(db, project_id)
    if not roleplay_project:
        raise HTTPException(status_code=404, detail="Roleplay project not found")
    
    character = await RoleplayService.create_character(db, roleplay_project.id, data, user.id)
    return character


@router.get("/projects/{project_id}/characters", response_model=List[CharacterResponse])
async def list_characters(
    project_id: int,
    user_id: int = None,
    is_active: bool = None,
    is_npc: bool = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """List characters in the roleplay."""
    # Get roleplay project
    roleplay_project = await RoleplayService.get_roleplay_project(db, project_id)
    if not roleplay_project:
        raise HTTPException(status_code=404, detail="Roleplay project not found")
    
    characters = await RoleplayService.list_characters(
        db, roleplay_project.id, user_id, is_active, is_npc, limit, offset
    )
    return characters


@router.get("/characters/{character_id}", response_model=CharacterResponse)
async def get_character(
    character_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific character by ID."""
    character = await RoleplayService.get_character(db, character_id)
    
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    return character


@router.put("/characters/{character_id}", response_model=CharacterResponse)
async def update_character(
    character_id: int,
    data: CharacterUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a character (owner only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    character = await RoleplayService.update_character(db, character_id, data, user.id)
    
    if not character:
        raise HTTPException(status_code=404, detail="Character not found or access denied")
    
    return character


@router.delete("/characters/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(
    character_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a character (owner only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    success = await RoleplayService.delete_character(db, character_id, user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Character not found or access denied")


# ============================================================================
# Scene Endpoints
# ============================================================================

@router.post("/projects/{project_id}/scenes", response_model=SceneResponse, status_code=status.HTTP_201_CREATED)
async def create_scene(
    project_id: int,
    data: SceneCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new scene/chapter."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Get roleplay project
    roleplay_project = await RoleplayService.get_roleplay_project(db, project_id)
    if not roleplay_project:
        raise HTTPException(status_code=404, detail="Roleplay project not found")
    
    scene = await RoleplayService.create_scene(db, roleplay_project.id, data)
    return scene


@router.get("/projects/{project_id}/scenes", response_model=List[SceneResponse])
async def list_scenes(
    project_id: int,
    db: AsyncSession = Depends(get_db)
):
    """List all scenes in the roleplay, ordered by sequence."""
    # Get roleplay project
    roleplay_project = await RoleplayService.get_roleplay_project(db, project_id)
    if not roleplay_project:
        raise HTTPException(status_code=404, detail="Roleplay project not found")
    
    scenes = await RoleplayService.list_scenes(db, roleplay_project.id)
    return scenes


@router.put("/scenes/{scene_id}", response_model=SceneResponse)
async def update_scene(
    scene_id: int,
    data: SceneUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a scene."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    scene = await RoleplayService.update_scene(db, scene_id, data)
    
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    return scene


# ============================================================================
# Passage Endpoints (IC Posts)
# ============================================================================

@router.post("/projects/{project_id}/passages", response_model=PassageResponse, status_code=status.HTTP_201_CREATED)
async def create_passage(
    project_id: int,
    data: PassageCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new IC passage/post."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Get roleplay project
    roleplay_project = await RoleplayService.get_roleplay_project(db, project_id)
    if not roleplay_project:
        raise HTTPException(status_code=404, detail="Roleplay project not found")
    
    try:
        passage = await RoleplayService.create_passage(db, roleplay_project.id, data, user.id)
        return passage
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/projects/{project_id}/passages", response_model=List[PassageResponse])
async def list_passages(
    project_id: int,
    scene_id: int = None,
    character_id: int = None,
    user_id: int = None,
    limit: int = 50,
    offset: int = 0,
    order_by: str = "sequence",
    db: AsyncSession = Depends(get_db)
):
    """List passages with optional filtering."""
    # Get roleplay project
    roleplay_project = await RoleplayService.get_roleplay_project(db, project_id)
    if not roleplay_project:
        raise HTTPException(status_code=404, detail="Roleplay project not found")
    
    params = PassageListParams(
        scene_id=scene_id,
        character_id=character_id,
        user_id=user_id,
        limit=limit,
        offset=offset,
        order_by=order_by
    )
    
    passages = await RoleplayService.list_passages(db, roleplay_project.id, params)
    return passages


@router.put("/passages/{passage_id}", response_model=PassageResponse)
async def update_passage(
    passage_id: int,
    data: PassageUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a passage (owner only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    passage = await RoleplayService.update_passage(db, passage_id, data, user.id)
    
    if not passage:
        raise HTTPException(status_code=404, detail="Passage not found or access denied")
    
    return passage


# ============================================================================
# Passage Reaction Endpoints
# ============================================================================

@router.post("/passages/{passage_id}/reactions", response_model=PassageReactionResponse, status_code=status.HTTP_201_CREATED)
async def add_reaction(
    passage_id: int,
    data: PassageReactionCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add or update a reaction to a passage."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    reaction = await RoleplayService.add_reaction(db, passage_id, data, user.id)
    return reaction


@router.delete("/passages/{passage_id}/reactions", status_code=status.HTTP_204_NO_CONTENT)
async def remove_reaction(
    passage_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove your reaction from a passage."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    success = await RoleplayService.remove_reaction(db, passage_id, user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Reaction not found")


# ============================================================================
# Lore Entry Endpoints
# ============================================================================

@router.post("/projects/{project_id}/lore", response_model=LoreEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_lore_entry(
    project_id: int,
    data: LoreEntryCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new lore/wiki entry."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Get roleplay project
    roleplay_project = await RoleplayService.get_roleplay_project(db, project_id)
    if not roleplay_project:
        raise HTTPException(status_code=404, detail="Roleplay project not found")
    
    lore_entry = await RoleplayService.create_lore_entry(db, roleplay_project.id, data, user.id)
    return lore_entry


@router.get("/projects/{project_id}/lore", response_model=List[LoreEntryResponse])
async def list_lore_entries(
    project_id: int,
    category: str = None,
    author_id: int = None,
    tags: List[str] = None,
    is_public: bool = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """List lore entries with optional filtering."""
    # Get roleplay project
    roleplay_project = await RoleplayService.get_roleplay_project(db, project_id)
    if not roleplay_project:
        raise HTTPException(status_code=404, detail="Roleplay project not found")
    
    lore_entries = await RoleplayService.list_lore_entries(
        db, roleplay_project.id, category, author_id, tags, is_public, limit, offset
    )
    return lore_entries


@router.put("/lore/{lore_id}", response_model=LoreEntryResponse)
async def update_lore_entry(
    lore_id: int,
    data: LoreEntryUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a lore entry (author only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    lore_entry = await RoleplayService.update_lore_entry(db, lore_id, data, user.id)
    
    if not lore_entry:
        raise HTTPException(status_code=404, detail="Lore entry not found or access denied")
    
    return lore_entry


# ============================================================================
# Dice Roll Endpoints
# ============================================================================

@router.post("/projects/{project_id}/dice", response_model=DiceRollResponse, status_code=status.HTTP_201_CREATED)
async def roll_dice(
    project_id: int,
    data: DiceRollRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Roll dice and record the result."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Get roleplay project
    roleplay_project = await RoleplayService.get_roleplay_project(db, project_id)
    if not roleplay_project:
        raise HTTPException(status_code=404, detail="Roleplay project not found")
    
    dice_roll = await RoleplayService.roll_dice(db, roleplay_project.id, data, user.id)
    return dice_roll


@router.get("/projects/{project_id}/dice", response_model=List[DiceRollResponse])
async def list_dice_rolls(
    project_id: int,
    character_id: int = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """List recent dice rolls."""
    # Get roleplay project
    roleplay_project = await RoleplayService.get_roleplay_project(db, project_id)
    if not roleplay_project:
        raise HTTPException(status_code=404, detail="Roleplay project not found")
    
    dice_rolls = await RoleplayService.list_dice_rolls(db, roleplay_project.id, character_id, limit)
    return dice_rolls
