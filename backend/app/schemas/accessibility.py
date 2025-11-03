"""
Accessibility settings and features schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class AccessibilityMode(str, Enum):
    """Accessibility modes."""
    STANDARD = "standard"
    HIGH_CONTRAST = "high_contrast"
    DYSLEXIA_FRIENDLY = "dyslexia_friendly"
    SCREEN_READER_OPTIMIZED = "screen_reader_optimized"


class TextSpacing(str, Enum):
    """Text spacing options."""
    COMPACT = "compact"
    NORMAL = "normal"
    RELAXED = "relaxed"
    EXTRA_RELAXED = "extra_relaxed"


class AccessibilitySettings(BaseModel):
    """User accessibility preferences."""
    mode: AccessibilityMode = AccessibilityMode.STANDARD
    font_size_multiplier: float = Field(default=1.0, ge=0.5, le=3.0)
    text_spacing: TextSpacing = TextSpacing.NORMAL
    reduce_motion: bool = False
    high_contrast: bool = False
    dyslexia_font: bool = False
    focus_indicators: bool = True
    keyboard_navigation: bool = True
    screen_reader_announcements: bool = True


class AccessibilityReport(BaseModel):
    """Accessibility compliance report."""
    wcag_level: str  # A, AA, AAA
    compliant: bool
    issues: list
    recommendations: list
