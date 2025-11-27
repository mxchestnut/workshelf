"""
Innovative and experimental features schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class AmbientSpace(BaseModel):
    """Ambient writing space configuration."""
    environment: str  # forest, cafe, library, etc.
    audio_enabled: bool = True
    background_music_volume: float = Field(default=0.3, ge=0.0, le=1.0)
    ambient_sounds: List[str] = []
    visual_effects: bool = True


class LivingDocumentConfig(BaseModel):
    """Configuration for living/dynamic documents."""
    enable_reader_reactions: bool = True
    show_reading_heatmap: bool = True
    adaptive_content: bool = False
    community_annotations: bool = False


class SemanticConnection(BaseModel):
    """Semantic relationship between documents."""
    source_document_id: str
    target_document_id: str
    relationship_type: str  # similar_theme, counter_argument, expansion, etc.
    similarity_score: float
    shared_concepts: List[str]


class CreativeSymbiosis(BaseModel):
    """Serendipitous creative connections."""
    document_id: str
    related_documents: List[SemanticConnection]
    suggested_readings: List[str]
    thematic_clusters: Dict[str, List[str]]
    inspiration_prompts: List[str]
