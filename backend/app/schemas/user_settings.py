"""
User Settings/Preferences schemas
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class UserSettingsUpdate(BaseModel):
    """Schema for updating user settings"""
    email_notifications: Optional[bool] = None
    theme: Optional[str] = Field(None, pattern="^(light|dark|auto)$")
    language: Optional[str] = Field(None, max_length=10)
    timezone: Optional[str] = Field(None, max_length=50)
    settings_json: Optional[Dict[str, Any]] = None


class UserSettingsResponse(BaseModel):
    """Schema for user settings responses"""
    user_id: int
    email_notifications: bool
    theme: str
    language: str
    timezone: str
    settings_json: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(from_attributes=True)
