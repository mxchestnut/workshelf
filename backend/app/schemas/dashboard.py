"""
User dashboard and settings schemas.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ThemePreference(str, Enum):
    """Theme preferences."""
    LIGHT = "light"
    DARK = "dark"
    AUTO = "auto"


class LanguagePreference(str, Enum):
    """Language preferences."""
    EN = "en"
    ES = "es"
    FR = "fr"
    DE = "de"


class NotificationPreference(BaseModel):
    """Notification preferences."""
    email_notifications: bool = True
    in_app_notifications: bool = True
    comment_notifications: bool = True
    follower_notifications: bool = True
    mention_notifications: bool = True


class UserSettingsUpdate(BaseModel):
    """Update user settings."""
    theme: Optional[ThemePreference] = None
    language: Optional[LanguagePreference] = None
    timezone: Optional[str] = None
    notifications: Optional[NotificationPreference] = None


class RecentDocument(BaseModel):
    """Recent document summary."""
    id: str
    title: str
    updated_at: datetime
    word_count: int
    thumbnail: Optional[str] = None


class DashboardStats(BaseModel):
    """Dashboard statistics."""
    total_documents: int
    total_projects: int
    total_words: int
    documents_this_week: int
    words_this_week: int
    active_collaborations: int


class DashboardResponse(BaseModel):
    """Complete dashboard data."""
    stats: DashboardStats
    recent_documents: List[RecentDocument]
    notifications_count: int
    storage_used_mb: float
    storage_limit_mb: float
