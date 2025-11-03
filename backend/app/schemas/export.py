"""
Document export and portability schemas.
"""
from pydantic import BaseModel
from typing import List
from enum import Enum


class ExportFormat(str, Enum):
    """Export formats."""
    PDF = "pdf"
    DOCX = "docx"
    MARKDOWN = "markdown"
    HTML = "html"
    EPUB = "epub"
    TXT = "txt"
    JSON = "json"


class ExportRequest(BaseModel):
    """Request document export."""
    document_ids: List[str]
    format: ExportFormat
    include_metadata: bool = True
    include_comments: bool = False


class ExportResponse(BaseModel):
    """Export response."""
    export_id: str
    status: str
    download_url: Optional[str] = None
    expires_at: Optional[str] = None


class DataExportRequest(BaseModel):
    """Request full data export (GDPR)."""
    include_documents: bool = True
    include_comments: bool = True
    include_messages: bool = True
    include_activity: bool = True
