"""
Pydantic schemas for Roleplay Studio features.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator

from app.models.roleplay import (
    RoleplayGenre, RoleplayRating, PostingOrder, DiceSystem
)


# ============================================================================
# Base Schemas (Shared Fields)
# ============================================================================

class UserBasic(BaseModel):
    """Basic user info for responses."""
    id: int
    username: str
    
    class Config:
        from_attributes = True


class ProjectBasic(BaseModel):
    """Basic project info for responses."""
    id: int
    name: str
    description: Optional[str]
    
    class Config:
        from_attributes = True


# ============================================================================
# Roleplay Project Schemas
# ============================================================================

class RoleplayProjectCreate(BaseModel):
    """Schema for creating a roleplay project."""
    project_id: int
    genre: RoleplayGenre = Field(default=RoleplayGenre.FANTASY)
    rating: RoleplayRating = Field(default=RoleplayRating.PG_13)
    posting_order: PostingOrder = Field(default=PostingOrder.FREE_FORM)
    min_post_length: Optional[int] = Field(None, ge=0, description="Minimum words per post (null = no minimum)")
    dice_system: DiceSystem = Field(default=DiceSystem.NONE)
    dice_enabled: bool = Field(default=False)
    has_lore_wiki: bool = Field(default=True)
    has_character_sheets: bool = Field(default=True)
    has_maps: bool = Field(default=False)
    
    @field_validator('min_post_length')
    @classmethod
    def validate_min_post_length(cls, v):
        if v is not None and v < 0:
            raise ValueError('min_post_length must be non-negative or null')
        return v


class RoleplayProjectUpdate(BaseModel):
    """Schema for updating a roleplay project."""
    genre: Optional[RoleplayGenre] = None
    rating: Optional[RoleplayRating] = None
    posting_order: Optional[PostingOrder] = None
    min_post_length: Optional[int] = Field(None, ge=0)
    dice_system: Optional[DiceSystem] = None
    dice_enabled: Optional[bool] = None
    has_lore_wiki: Optional[bool] = None
    has_character_sheets: Optional[bool] = None
    has_maps: Optional[bool] = None


class RoleplayProjectResponse(BaseModel):
    """Schema for roleplay project response."""
    id: int
    project_id: int
    genre: RoleplayGenre
    rating: RoleplayRating
    posting_order: PostingOrder
    min_post_length: Optional[int]
    dice_system: DiceSystem
    dice_enabled: bool
    has_lore_wiki: bool
    has_character_sheets: bool
    has_maps: bool
    folder_ic_posts: Optional[int]
    folder_ooc: Optional[int]
    folder_characters: Optional[int]
    folder_lore: Optional[int]
    folder_maps: Optional[int]
    folder_compiled: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    # Computed fields (can be added by API layer)
    character_count: Optional[int] = None
    passage_count: Optional[int] = None
    participant_count: Optional[int] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Character Schemas
# ============================================================================

class CharacterCreate(BaseModel):
    """Schema for creating a character."""
    name: str = Field(..., min_length=1, max_length=100)
    pronouns: Optional[str] = Field(None, max_length=50)
    species: Optional[str] = Field(None, max_length=100)
    age: Optional[str] = Field(None, max_length=50)
    avatar_url: Optional[str] = Field(None, max_length=500)
    short_description: Optional[str] = Field(None, max_length=500)
    full_bio: Optional[str] = None  # TipTap JSON
    stats: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Flexible JSONB stats")
    traits: Optional[List[str]] = Field(default_factory=list)
    is_npc: bool = Field(default=False)


class CharacterUpdate(BaseModel):
    """Schema for updating a character."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    pronouns: Optional[str] = Field(None, max_length=50)
    species: Optional[str] = Field(None, max_length=100)
    age: Optional[str] = Field(None, max_length=50)
    avatar_url: Optional[str] = Field(None, max_length=500)
    short_description: Optional[str] = Field(None, max_length=500)
    full_bio: Optional[str] = None
    stats: Optional[Dict[str, Any]] = None
    traits: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_npc: Optional[bool] = None


class CharacterResponse(BaseModel):
    """Schema for character response."""
    id: int
    roleplay_id: int
    user_id: int
    user: UserBasic
    name: str
    pronouns: Optional[str]
    species: Optional[str]
    age: Optional[str]
    avatar_url: Optional[str]
    short_description: Optional[str]
    full_bio: Optional[str]
    stats: Dict[str, Any]
    traits: List[str]
    is_active: bool
    is_npc: bool
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    passage_count: Optional[int] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Scene Schemas
# ============================================================================

class SceneCreate(BaseModel):
    """Schema for creating a scene."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    sequence_number: int = Field(..., ge=0)
    is_active: bool = Field(default=True)


class SceneUpdate(BaseModel):
    """Schema for updating a scene."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    sequence_number: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    is_archived: Optional[bool] = None


class SceneResponse(BaseModel):
    """Schema for scene response."""
    id: int
    roleplay_id: int
    title: str
    description: Optional[str]
    sequence_number: int
    is_active: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    passage_count: Optional[int] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Passage Schemas (IC Posts)
# ============================================================================

class PassageCreate(BaseModel):
    """Schema for creating a passage (IC post)."""
    content: str = Field(..., min_length=1, description="TipTap JSON content")
    character_id: int
    scene_id: Optional[int] = None
    parent_passage_id: Optional[int] = Field(None, description="For threaded passages")
    dice_rolls: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Embedded dice roll data")
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError('content cannot be empty')
        return v


class PassageUpdate(BaseModel):
    """Schema for updating a passage."""
    content: Optional[str] = Field(None, min_length=1)
    scene_id: Optional[int] = None
    dice_rolls: Optional[Dict[str, Any]] = None


class PassageResponse(BaseModel):
    """Schema for passage response."""
    id: int
    roleplay_id: int
    scene_id: Optional[int]
    user_id: int
    user: UserBasic
    character_id: int
    character: Optional["CharacterResponse"] = None  # Forward reference
    content: str
    word_count: int
    sequence_number: int
    parent_passage_id: Optional[int]
    dice_rolls: Optional[Dict[str, Any]]
    is_edited: bool
    reaction_count: int
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    reactions: Optional[List["PassageReactionResponse"]] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Passage Reaction Schemas
# ============================================================================

class PassageReactionCreate(BaseModel):
    """Schema for creating a passage reaction."""
    reaction_type: str = Field(..., min_length=1, max_length=20)
    
    @field_validator('reaction_type')
    @classmethod
    def validate_reaction_type(cls, v):
        # Common reactions: heart, star, fire, clap, laugh, etc.
        allowed = ['heart', 'star', 'fire', 'clap', 'laugh', 'wow', 'sad', 'angry', 'eyes']
        if v not in allowed:
            raise ValueError(f'reaction_type must be one of {allowed}')
        return v


class PassageReactionResponse(BaseModel):
    """Schema for passage reaction response."""
    id: int
    passage_id: int
    user_id: int
    user: UserBasic
    reaction_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Lore Entry Schemas
# ============================================================================

class LoreEntryCreate(BaseModel):
    """Schema for creating a lore entry."""
    title: str = Field(..., min_length=1, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    content: str = Field(..., min_length=1, description="TipTap JSON content")
    tags: Optional[List[str]] = Field(default_factory=list)
    is_public: bool = Field(default=True, description="Visible to all participants")


class LoreEntryUpdate(BaseModel):
    """Schema for updating a lore entry."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    content: Optional[str] = Field(None, min_length=1)
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None


class LoreEntryResponse(BaseModel):
    """Schema for lore entry response."""
    id: int
    roleplay_id: int
    author_id: int
    author: UserBasic
    title: str
    category: Optional[str]
    content: str
    tags: List[str]
    is_public: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Dice Roll Schemas
# ============================================================================

class DiceRollRequest(BaseModel):
    """Schema for requesting a dice roll."""
    roll_expression: str = Field(..., min_length=1, max_length=100, description="e.g. '2d6+3' or '1d20'")
    character_id: Optional[int] = None
    reason: Optional[str] = Field(None, max_length=255, description="Why rolling (e.g. 'Attack roll')")
    
    @field_validator('roll_expression')
    @classmethod
    def validate_roll_expression(cls, v):
        import re
        # Basic validation for common dice expressions
        # Supports: XdY, XdY+Z, XdY-Z, multiple rolls like "2d6+1d4"
        pattern = r'^(\d+d\d+([+-]\d+)?(\s*[+-]\s*\d+d\d+([+-]\d+)?)*)$'
        if not re.match(pattern, v.replace(' ', ''), re.IGNORECASE):
            raise ValueError('Invalid dice expression format (e.g. use "2d6+3" or "1d20")')
        return v


class DiceRollResponse(BaseModel):
    """Schema for dice roll response."""
    id: int
    roleplay_id: int
    user_id: int
    user: UserBasic
    character_id: Optional[int]
    character: Optional[CharacterResponse] = None
    roll_expression: str
    result: int
    individual_rolls: List[int]
    reason: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Compile Schemas
# ============================================================================

class CompileRequest(BaseModel):
    """Schema for compiling roleplay passages into a document."""
    title: str = Field(..., min_length=1, max_length=255)
    scene_ids: Optional[List[int]] = Field(None, description="Specific scenes to compile (null = all)")
    character_ids: Optional[List[int]] = Field(None, description="Filter by characters (null = all)")
    include_ooc: bool = Field(default=False, description="Include OOC comments")
    attribution_style: str = Field(default="header", description="How to attribute posts: 'header', 'inline', 'none'")
    format: str = Field(default="tiptap", description="Output format: 'tiptap', 'markdown', 'plain'")
    
    @field_validator('attribution_style')
    @classmethod
    def validate_attribution_style(cls, v):
        allowed = ['header', 'inline', 'none']
        if v not in allowed:
            raise ValueError(f'attribution_style must be one of {allowed}')
        return v
    
    @field_validator('format')
    @classmethod
    def validate_format(cls, v):
        allowed = ['tiptap', 'markdown', 'plain']
        if v not in allowed:
            raise ValueError(f'format must be one of {allowed}')
        return v


class CompileResponse(BaseModel):
    """Schema for compile operation response."""
    document_id: int
    title: str
    passage_count: int
    word_count: int
    character_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# List/Filter Schemas
# ============================================================================

class PassageListParams(BaseModel):
    """Query parameters for listing passages."""
    scene_id: Optional[int] = None
    character_id: Optional[int] = None
    user_id: Optional[int] = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    order_by: str = Field(default="sequence", description="'sequence' or 'created'")
    
    @field_validator('order_by')
    @classmethod
    def validate_order_by(cls, v):
        allowed = ['sequence', 'created']
        if v not in allowed:
            raise ValueError(f'order_by must be one of {allowed}')
        return v


class CharacterListParams(BaseModel):
    """Query parameters for listing characters."""
    user_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_npc: Optional[bool] = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class LoreEntryListParams(BaseModel):
    """Query parameters for listing lore entries."""
    category: Optional[str] = None
    author_id: Optional[int] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


# Update forward references
PassageResponse.model_rebuild()
DiceRollResponse.model_rebuild()
