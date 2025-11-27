"""
Beta Reader Profile Schemas
Pydantic models for beta reader marketplace profiles
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


class PortfolioLink(BaseModel):
    """Portfolio link with title and description"""
    title: str
    url: str
    description: Optional[str] = None


class BetaReaderProfileCreate(BaseModel):
    """Create a new beta reader profile"""
    availability: str = Field(default='available', pattern='^(available|busy|not_accepting)$')
    bio: Optional[str] = Field(None, max_length=2000)
    genres: Optional[List[str]] = Field(None, max_items=10)
    specialties: Optional[List[str]] = Field(None, max_items=15)
    hourly_rate: Optional[int] = Field(None, ge=0, description="Rate in cents")
    per_word_rate: Optional[int] = Field(None, ge=0, description="Rate in cents per word")
    per_manuscript_rate: Optional[int] = Field(None, ge=0, description="Flat rate in cents")
    turnaround_days: Optional[int] = Field(None, ge=1, le=365)
    max_concurrent_projects: int = Field(default=3, ge=1, le=20)
    portfolio_links: Optional[List[PortfolioLink]] = Field(None, max_items=10)
    preferred_contact: str = Field(default='platform', max_length=50)
    is_active: bool = True
    
    @field_validator('genres', 'specialties')
    @classmethod
    def validate_string_arrays(cls, v):
        if v is not None:
            return [item.strip() for item in v if item.strip()]
        return v


class BetaReaderProfileUpdate(BaseModel):
    """Update an existing beta reader profile"""
    availability: Optional[str] = Field(None, pattern='^(available|busy|not_accepting)$')
    bio: Optional[str] = Field(None, max_length=2000)
    genres: Optional[List[str]] = Field(None, max_items=10)
    specialties: Optional[List[str]] = Field(None, max_items=15)
    hourly_rate: Optional[int] = Field(None, ge=0)
    per_word_rate: Optional[int] = Field(None, ge=0)
    per_manuscript_rate: Optional[int] = Field(None, ge=0)
    turnaround_days: Optional[int] = Field(None, ge=1, le=365)
    max_concurrent_projects: Optional[int] = Field(None, ge=1, le=20)
    portfolio_links: Optional[List[PortfolioLink]] = Field(None, max_items=10)
    preferred_contact: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    
    @field_validator('genres', 'specialties')
    @classmethod
    def validate_string_arrays(cls, v):
        if v is not None:
            return [item.strip() for item in v if item.strip()]
        return v


class BetaReaderProfileResponse(BaseModel):
    """Beta reader profile response with enriched user data"""
    id: int
    user_id: int
    username: str
    display_name: str
    availability: str
    bio: Optional[str]
    genres: Optional[List[str]]
    specialties: Optional[List[str]]
    hourly_rate: Optional[int]
    per_word_rate: Optional[int]
    per_manuscript_rate: Optional[int]
    turnaround_days: Optional[int]
    max_concurrent_projects: int
    portfolio_links: Optional[List[dict]]
    preferred_contact: str
    is_active: bool
    is_featured: bool
    total_projects_completed: int
    average_rating: int
    
    # User reputation scores
    beta_score: int
    reading_score: int
    writer_score: int
    
    # Badges
    has_beta_master_badge: bool = False
    has_author_badge: bool = False
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class BetaReaderMarketplaceFilters(BaseModel):
    """Filters for marketplace search"""
    genres: Optional[List[str]] = None
    availability: Optional[str] = Field(None, pattern='^(available|busy|not_accepting)$')
    min_beta_score: Optional[int] = Field(None, ge=0, le=5)
    max_hourly_rate: Optional[int] = Field(None, ge=0)
    max_per_word_rate: Optional[int] = Field(None, ge=0)
    max_per_manuscript_rate: Optional[int] = Field(None, ge=0)
    max_turnaround_days: Optional[int] = Field(None, ge=1, le=365)
    search: Optional[str] = Field(None, max_length=100)  # Search in bio/username
    only_free: bool = False  # Show only profiles with no rates set
    featured_first: bool = True
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
