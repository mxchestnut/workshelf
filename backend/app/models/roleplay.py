"""
Roleplay Studio Models

Models for collaborative literate roleplay system including:
- RoleplayProject: Roleplay-specific settings and metadata
- RoleplayCharacter: Character sheets for participants
- RoleplayPassage: In-character posts (the "messages" in the feed)
- RoleplayScene: Organize passages into scenes/chapters
- LoreEntry: Wiki-style worldbuilding entries
- PassageReaction: Emoji reactions to passages
- DiceRoll: Dice roll log for game mechanics
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum, Index, ARRAY, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.models.base import Base, TimestampMixin


# ============================================================================
# Enums
# ============================================================================

class RoleplayGenre(str, enum.Enum):
    """Roleplay genre types"""
    FANTASY = "fantasy"
    SCI_FI = "sci-fi"
    MODERN = "modern"
    HISTORICAL = "historical"
    HORROR = "horror"
    ROMANCE = "romance"
    MYSTERY = "mystery"
    POST_APOCALYPTIC = "post-apocalyptic"
    CYBERPUNK = "cyberpunk"
    SUPERNATURAL = "supernatural"
    OTHER = "other"


class RoleplayRating(str, enum.Enum):
    """Content rating"""
    G = "G"  # General audiences
    PG = "PG"  # Parental guidance suggested
    PG_13 = "PG-13"  # Parents strongly cautioned
    R = "R"  # Restricted
    MATURE = "mature"  # 18+ content


class PostingOrder(str, enum.Enum):
    """Posting order rules"""
    FREE_FORM = "free-form"  # Post whenever you want
    TURN_BASED = "turn-based"  # Strict turn order
    ROUND_ROBIN = "round-robin"  # Cycle through participants


class DiceSystem(str, enum.Enum):
    """Dice mechanics system"""
    D20 = "d20"  # D&D style
    D6_POOL = "d6-pool"  # Shadowrun style
    FATE = "fate"  # Fate/Fudge dice
    PERCENTILE = "percentile"  # D100 system
    CUSTOM = "custom"
    NONE = "none"  # No dice mechanics


# ============================================================================
# Models
# ============================================================================

class RoleplayProject(Base, TimestampMixin):
    """
    Roleplay Project Settings
    
    Extends Project model with roleplay-specific configuration.
    One-to-one relationship with Project.
    """
    __tablename__ = "roleplay_projects"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Link to base project (one-to-one)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    
    # Roleplay settings
    genre = Column(SQLEnum(RoleplayGenre), nullable=False, default=RoleplayGenre.FANTASY)
    rating = Column(SQLEnum(RoleplayRating), nullable=False, default=RoleplayRating.PG_13)
    posting_order = Column(SQLEnum(PostingOrder), nullable=False, default=PostingOrder.FREE_FORM)
    
    # Posting rules
    min_post_length = Column(Integer, nullable=True)  # Minimum words per post (nullable = no minimum)
    
    # Dice mechanics
    dice_system = Column(SQLEnum(DiceSystem), nullable=False, default=DiceSystem.NONE)
    dice_enabled = Column(Boolean, default=False, nullable=False)
    
    # Feature flags
    has_lore_wiki = Column(Boolean, default=True, nullable=False)
    has_character_sheets = Column(Boolean, default=True, nullable=False)
    has_maps = Column(Boolean, default=False, nullable=False)
    
    # Auto-generated folder IDs (for quick reference)
    folder_ic_posts = Column(Integer, ForeignKey('folders.id', ondelete='SET NULL'), nullable=True)
    folder_ooc = Column(Integer, ForeignKey('folders.id', ondelete='SET NULL'), nullable=True)
    folder_characters = Column(Integer, ForeignKey('folders.id', ondelete='SET NULL'), nullable=True)
    folder_lore = Column(Integer, ForeignKey('folders.id', ondelete='SET NULL'), nullable=True)
    folder_maps = Column(Integer, ForeignKey('folders.id', ondelete='SET NULL'), nullable=True)
    folder_compiled = Column(Integer, ForeignKey('folders.id', ondelete='SET NULL'), nullable=True)
    
    # Relationships
    project = relationship("Project", backref="roleplay_settings", foreign_keys=[project_id])
    characters = relationship("RoleplayCharacter", back_populates="roleplay", cascade="all, delete-orphan")
    passages = relationship("RoleplayPassage", back_populates="roleplay", cascade="all, delete-orphan")
    scenes = relationship("RoleplayScene", back_populates="roleplay", cascade="all, delete-orphan")
    lore_entries = relationship("LoreEntry", back_populates="roleplay", cascade="all, delete-orphan")
    dice_rolls = relationship("DiceRoll", back_populates="roleplay", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<RoleplayProject(id={self.id}, project_id={self.project_id}, genre='{self.genre}')>"


class RoleplayCharacter(Base, TimestampMixin):
    """
    Character Sheets
    
    Each participant can have multiple characters.
    Characters can be active or retired.
    """
    __tablename__ = "roleplay_characters"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Ownership
    roleplay_id = Column(Integer, ForeignKey('roleplay_projects.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Character identity
    name = Column(String(255), nullable=False)
    pronouns = Column(String(50), nullable=True)
    species = Column(String(100), nullable=True)
    age = Column(String(50), nullable=True)  # String to allow "24" or "ancient" or "unknown"
    
    # Visual
    avatar_url = Column(String(500), nullable=True)
    
    # Bio
    short_description = Column(Text, nullable=True)  # One-liner tagline
    full_bio = Column(Text, nullable=True)  # TipTap JSON format
    
    # Stats (flexible JSONB for different systems)
    stats = Column(JSONB, nullable=True)  # e.g., {"strength": 15, "dexterity": 18, "intelligence": 12}
    traits = Column(ARRAY(String), nullable=True)  # e.g., ["brave", "impulsive", "haunted-past"]
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_npc = Column(Boolean, default=False, nullable=False)  # GM-controlled character
    
    # Relationships
    roleplay = relationship("RoleplayProject", back_populates="characters")
    user = relationship("User")
    passages = relationship("RoleplayPassage", back_populates="character")
    dice_rolls = relationship("DiceRoll", back_populates="character")
    
    __table_args__ = (
        Index('idx_roleplay_characters_active', 'roleplay_id', 'is_active'),
        Index('idx_roleplay_characters_user', 'roleplay_id', 'user_id'),
    )
    
    def __repr__(self):
        return f"<RoleplayCharacter(id={self.id}, name='{self.name}', user_id={self.user_id})>"


class RoleplayScene(Base, TimestampMixin):
    """
    Scenes/Chapters
    
    Organize passages into scenes for better structure.
    Scenes can be active (currently happening) or archived.
    """
    __tablename__ = "roleplay_scenes"
    
    id = Column(Integer, primary_key=True, index=True)
    
    roleplay_id = Column(Integer, ForeignKey('roleplay_projects.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Scene details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    sequence_number = Column(Integer, nullable=False)  # For ordering scenes
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)  # Currently happening
    is_archived = Column(Boolean, default=False, nullable=False)  # Completed/archived
    
    # Relationships
    roleplay = relationship("RoleplayProject", back_populates="scenes")
    passages = relationship("RoleplayPassage", back_populates="scene")
    
    __table_args__ = (
        Index('idx_roleplay_scenes_sequence', 'roleplay_id', 'sequence_number'),
    )
    
    def __repr__(self):
        return f"<RoleplayScene(id={self.id}, title='{self.title}', sequence={self.sequence_number})>"


class RoleplayPassage(Base, TimestampMixin):
    """
    IC (In-Character) Posts
    
    Individual passages/posts in the roleplay feed.
    Core content of the roleplay system.
    """
    __tablename__ = "roleplay_passages"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Context
    roleplay_id = Column(Integer, ForeignKey('roleplay_projects.id', ondelete='CASCADE'), nullable=False, index=True)
    scene_id = Column(Integer, ForeignKey('roleplay_scenes.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Authorship
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    character_id = Column(Integer, ForeignKey('roleplay_characters.id', ondelete='SET NULL'), nullable=True)
    
    # Content
    content = Column(Text, nullable=False)  # TipTap JSON format
    word_count = Column(Integer, default=0, nullable=False)
    
    # Ordering
    sequence_number = Column(Integer, nullable=False)  # Chronological ordering within roleplay
    
    # Threading (optional for replies)
    parent_passage_id = Column(Integer, ForeignKey('roleplay_passages.id', ondelete='SET NULL'), nullable=True)
    
    # Dice rolls attached to this passage
    dice_rolls = Column(JSONB, nullable=True)  # e.g., [{"roll": "1d20+5", "result": 18, "reason": "perception check"}]
    
    # Edit tracking
    is_edited = Column(Boolean, default=False, nullable=False)
    
    # Engagement (denormalized for performance)
    reaction_count = Column(Integer, default=0, nullable=False)
    
    # Relationships
    roleplay = relationship("RoleplayProject", back_populates="passages")
    scene = relationship("RoleplayScene", back_populates="passages")
    user = relationship("User")
    character = relationship("RoleplayCharacter", back_populates="passages")
    reactions = relationship("PassageReaction", back_populates="passage", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_roleplay_passages_sequence', 'roleplay_id', 'sequence_number'),
        Index('idx_roleplay_passages_scene', 'scene_id', 'sequence_number'),
        Index('idx_roleplay_passages_user', 'user_id', 'created_at'),
    )
    
    def __repr__(self):
        return f"<RoleplayPassage(id={self.id}, roleplay_id={self.roleplay_id}, seq={self.sequence_number})>"


class LoreEntry(Base, TimestampMixin):
    """
    Lore Wiki Entries
    
    Worldbuilding entries for locations, NPCs, history, magic systems, etc.
    Wiki-style knowledge base for the roleplay world.
    """
    __tablename__ = "lore_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    
    roleplay_id = Column(Integer, ForeignKey('roleplay_projects.id', ondelete='CASCADE'), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Entry details
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)  # Locations, NPCs, History, Magic System, etc.
    content = Column(Text, nullable=False)  # TipTap JSON format
    
    # Organization
    tags = Column(ARRAY(String), nullable=True)
    
    # Visibility
    is_public = Column(Boolean, default=True, nullable=False)  # Visible to all participants
    
    # Relationships
    roleplay = relationship("RoleplayProject", back_populates="lore_entries")
    author = relationship("User")
    
    __table_args__ = (
        Index('idx_lore_entries_category', 'roleplay_id', 'category'),
        Index('idx_lore_entries_author', 'author_id', 'created_at'),
    )
    
    def __repr__(self):
        return f"<LoreEntry(id={self.id}, title='{self.title}', category='{self.category}')>"


class PassageReaction(Base, TimestampMixin):
    """
    Reactions to Passages
    
    Emoji reactions (heart, fire, laugh, etc.) to passages.
    One reaction per user per passage.
    """
    __tablename__ = "passage_reactions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    passage_id = Column(Integer, ForeignKey('roleplay_passages.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Reaction type (emoji name or unicode)
    reaction_type = Column(String(20), nullable=False)  # "heart", "fire", "laugh", "cry", "wow", etc.
    
    # Relationships
    passage = relationship("RoleplayPassage", back_populates="reactions")
    user = relationship("User")
    
    __table_args__ = (
        Index('idx_passage_reactions_unique', 'passage_id', 'user_id', unique=True),
        Index('idx_passage_reactions_type', 'passage_id', 'reaction_type'),
    )
    
    def __repr__(self):
        return f"<PassageReaction(passage_id={self.passage_id}, user_id={self.user_id}, type='{self.reaction_type}')>"


class DiceRoll(Base, TimestampMixin):
    """
    Dice Roll Log
    
    Standalone dice rolls not attached to passages.
    For tracking dice mechanics in the roleplay.
    """
    __tablename__ = "dice_rolls"
    
    id = Column(Integer, primary_key=True, index=True)
    
    roleplay_id = Column(Integer, ForeignKey('roleplay_projects.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    character_id = Column(Integer, ForeignKey('roleplay_characters.id', ondelete='SET NULL'), nullable=True)
    
    # Dice roll details
    roll_expression = Column(String(100), nullable=False)  # e.g., "2d6+3", "1d20"
    result = Column(Integer, nullable=False)  # Final result after modifiers
    individual_rolls = Column(ARRAY(Integer), nullable=True)  # e.g., [4, 2] for 2d6
    reason = Column(String(255), nullable=True)  # e.g., "Stealth check", "Attack roll"
    
    # Relationships
    roleplay = relationship("RoleplayProject", back_populates="dice_rolls")
    user = relationship("User")
    character = relationship("RoleplayCharacter", back_populates="dice_rolls")
    
    __table_args__ = (
        Index('idx_dice_rolls_roleplay', 'roleplay_id', 'created_at'),
        Index('idx_dice_rolls_character', 'character_id', 'created_at'),
    )
    
    def __repr__(self):
        return f"<DiceRoll(id={self.id}, expression='{self.roll_expression}', result={self.result})>"
