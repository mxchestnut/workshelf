"""
Search schemas
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class SearchQuery(BaseModel):
    """Schema for search requests"""
    q: str = Field(..., min_length=1, max_length=200, description="Search query")
    type: Optional[Literal["document", "user", "studio", "all"]] = "all"
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    
    # Tag filtering for content discovery and warnings
    include_tags: Optional[List[str]] = Field(None, description="Only show documents with these tags (OR logic)")
    exclude_tags: Optional[List[str]] = Field(None, description="Exclude documents with these tags (content warnings)")
    require_all_tags: bool = Field(False, description="If True, require ALL include_tags (AND logic). Default is OR logic.")


class SearchResult(BaseModel):
    """Single search result"""
    id: int
    type: str
    title: str
    description: Optional[str] = None
    url: str
    relevance_score: float = 0.0


class SearchResponse(BaseModel):
    """Schema for search responses"""
    query: str
    results: List[SearchResult]
    total: int
    page: int
    page_size: int
    has_more: bool
