"""
Studio customization and branding schemas - Phase 5.
"""
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Dict, Any, List
from datetime import datetime


# ============================================================================
# THEME SCHEMAS
# ============================================================================

class StudioThemeCreate(BaseModel):
    """Create/update studio theme."""
    primary_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    accent_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    background_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    text_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    heading_font: Optional[str] = None
    body_font: Optional[str] = None
    code_font: Optional[str] = None
    custom_css: Optional[str] = None
    layout_config: Optional[Dict] = None


class StudioThemeResponse(BaseModel):
    """Studio theme response."""
    id: int
    studio_id: int
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    text_color: str
    heading_font: str
    body_font: str
    code_font: str
    custom_css: Optional[str]
    layout_config: Optional[Dict]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class StudioTheme(BaseModel):
    """Studio theme customization (legacy)."""
    primary_color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    font_family: str = "Inter"
    custom_css: Optional[str] = None


# ============================================================================
# CUSTOM DOMAIN SCHEMAS
# ============================================================================

class StudioCustomDomainCreate(BaseModel):
    """Create custom domain."""
    domain: str = Field(..., min_length=3, max_length=255)
    subdomain: Optional[str] = Field(None, max_length=100)


class StudioCustomDomainResponse(BaseModel):
    """Custom domain response."""
    id: int
    studio_id: int
    domain: str
    subdomain: Optional[str]
    is_verified: bool
    verification_token: Optional[str]
    verification_method: str
    verified_at: Optional[datetime]
    ssl_enabled: bool
    ssl_issued_at: Optional[datetime]
    ssl_expires_at: Optional[datetime]
    auto_renew_ssl: bool
    dns_records: Optional[List[Dict]]
    is_active: bool
    status: str
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class StudioCustomDomain(BaseModel):
    """Custom domain settings (legacy)."""
    domain: str
    is_verified: bool = False
    ssl_enabled: bool = True


# ============================================================================
# DOCUMENT VIEW SCHEMAS
# ============================================================================

class DocumentViewCreate(BaseModel):
    """Record a document view."""
    user_id: Optional[int] = None
    session_id: Optional[str] = None
    view_duration: Optional[int] = None
    scroll_depth: Optional[int] = Field(None, ge=0, le=100)
    referrer: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)
    city: Optional[str] = None


# ============================================================================
# LEGACY SCHEMAS (for backward compatibility)
# ============================================================================

class StudioBranding(BaseModel):
    """Studio branding settings."""
    logo_url: Optional[HttpUrl] = None
    banner_url: Optional[HttpUrl] = None
    favicon_url: Optional[HttpUrl] = None
    tagline: Optional[str] = Field(None, max_length=200)
    about: Optional[str] = None


class StudioUpdate(BaseModel):
    """Update studio settings."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, min_length=3, max_length=50, pattern=r"^[a-z0-9-]+$")
    description: Optional[str] = None
    theme: Optional[StudioTheme] = None
    branding: Optional[StudioBranding] = None
    is_public: Optional[bool] = None


class StudioSettingsResponse(BaseModel):
    """Complete studio settings."""
    id: str
    tenant_id: str
    name: str
    slug: str
    description: Optional[str] = None
    theme: Optional[StudioTheme] = None
    branding: Optional[StudioBranding] = None
    is_public: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

    description: Optional[str]
    theme: StudioTheme
    branding: StudioBranding
    custom_domain: Optional[StudioCustomDomain]
    is_public: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
