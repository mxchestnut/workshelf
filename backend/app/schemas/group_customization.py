"""
Group Customization Schemas
Pydantic schemas for group themes and branding
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


# ============================================================================
# GROUP THEME SCHEMAS
# ============================================================================

class GroupThemeCreate(BaseModel):
    """Create or update group theme."""
    primary_color: Optional[str] = Field(default="#B34B0C", pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: Optional[str] = Field(default="#524944", pattern=r"^#[0-9A-Fa-f]{6}$")
    accent_color: Optional[str] = Field(default="#D97706", pattern=r"^#[0-9A-Fa-f]{6}$")
    background_color: Optional[str] = Field(default="#1F1B18", pattern=r"^#[0-9A-Fa-f]{6}$")
    text_color: Optional[str] = Field(default="#FFFFFF", pattern=r"^#[0-9A-Fa-f]{6}$")
    heading_font: Optional[str] = Field(default="Inter", max_length=100)
    body_font: Optional[str] = Field(default="Inter", max_length=100)
    logo_url: Optional[str] = Field(default=None, max_length=500)
    banner_url: Optional[str] = Field(default=None, max_length=500)
    favicon_url: Optional[str] = Field(default=None, max_length=500)
    custom_css: Optional[str] = None
    layout_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = True


class GroupThemeResponse(BaseModel):
    """Group theme response."""
    id: int
    group_id: int
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    text_color: str
    heading_font: str
    body_font: str
    logo_url: Optional[str]
    banner_url: Optional[str]
    favicon_url: Optional[str]
    custom_css: Optional[str]
    layout_config: Optional[Dict[str, Any]]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class GroupThemeUpdate(BaseModel):
    """Update group theme (partial update)."""
    primary_color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    accent_color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    background_color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    text_color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    heading_font: Optional[str] = Field(default=None, max_length=100)
    body_font: Optional[str] = Field(default=None, max_length=100)
    logo_url: Optional[str] = Field(default=None, max_length=500)
    banner_url: Optional[str] = Field(default=None, max_length=500)
    favicon_url: Optional[str] = Field(default=None, max_length=500)
    custom_css: Optional[str] = None
    layout_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
