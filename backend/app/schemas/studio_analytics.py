"""
Studio analytics and metrics schemas - Phase 5.
"""
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, date


# ============================================================================
# METRICS RESPONSES
# ============================================================================

class StudioMetricsResponse(BaseModel):
    """Complete studio metrics response."""
    studio_id: int
    period: Dict[str, datetime]
    views: Dict[str, int]
    documents: Dict[str, int]
    engagement: Dict[str, int]
    top_countries: List[Dict[str, Any]]
    top_referrers: List[Dict[str, Any]]


class DocumentMetricsResponse(BaseModel):
    """Document metrics response."""
    document_id: int
    period: Dict[str, datetime]
    views: Dict[str, int]
    engagement: Dict[str, int]


class TimeSeriesResponse(BaseModel):
    """Time series data response."""
    metric: str
    data: List[Dict[str, Any]]


# ============================================================================
# LEGACY SCHEMAS
# ============================================================================

class StudioMetrics(BaseModel):
    """Studio-wide metrics."""
    total_views: int
    unique_visitors: int
    total_documents: int
    published_documents: int
    total_members: int
    active_members: int  # Active in last 30 days
    storage_used_mb: float
    storage_limit_mb: float


class DocumentMetrics(BaseModel):
    """Individual document metrics."""
    document_id: str
    title: str
    views: int
    unique_readers: int
    likes: int
    comments: int
    shares: int
    avg_read_time_seconds: int


class TimeSeriesDataPoint(BaseModel):
    """Time series data point."""
    date: date
    value: int


class StudioAnalyticsResponse(BaseModel):
    """Complete studio analytics."""
    metrics: StudioMetrics
    top_documents: List[DocumentMetrics]
    views_over_time: List[TimeSeriesDataPoint]
    engagement_over_time: List[TimeSeriesDataPoint]
    period_start: date
    period_end: date
