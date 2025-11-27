"""
Editor schemas for document editing and formatting.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class EditorFormat(str, Enum):
    """Supported editor formats."""
    PROSEMIRROR = "prosemirror"
    MARKDOWN = "markdown"
    HTML = "html"


class AutoSaveStatus(str, Enum):
    """Auto-save status."""
    SAVED = "saved"
    SAVING = "saving"
    FAILED = "failed"
    PENDING = "pending"


class EditorContentUpdate(BaseModel):
    """Request to update document content."""
    content: Dict[str, Any] = Field(..., description="Editor content (ProseMirror JSON)")
    format: EditorFormat = Field(default=EditorFormat.PROSEMIRROR, description="Content format")
    version: Optional[int] = Field(None, description="Document version for conflict detection")


class AutoSaveRequest(BaseModel):
    """Auto-save request."""
    document_id: str
    content: Dict[str, Any]
    cursor_position: Optional[Dict[str, Any]] = None


class AutoSaveResponse(BaseModel):
    """Auto-save response."""
    status: AutoSaveStatus
    saved_at: Optional[datetime] = None
    version: int
    conflict: bool = False


class FormattingOption(BaseModel):
    """Available formatting option."""
    type: str
    label: str
    icon: Optional[str] = None
    shortcut: Optional[str] = None
    enabled: bool = True


class EditorSettings(BaseModel):
    """User editor preferences."""
    font_family: str = "Inter"
    font_size: int = 16
    line_height: float = 1.6
    spell_check: bool = True
    auto_save: bool = True
    auto_save_interval: int = 30  # seconds
    show_word_count: bool = True
    focus_mode: bool = False


class EditorState(BaseModel):
    """Complete editor state."""
    document_id: str
    content: Dict[str, Any]
    cursor_position: Optional[Dict[str, Any]] = None
    selection: Optional[Dict[str, Any]] = None
    formatting_options: List[FormattingOption]
    settings: EditorSettings
    version: int
    last_saved: datetime
    word_count: int
    character_count: int
