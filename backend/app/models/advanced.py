"""
Phase 7 Advanced Features Models
Content integrity, export jobs, and accessibility
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum, JSON, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.models.base import Base, TimestampMixin


# ============================================================================
# Content Integrity (Plagiarism & AI Detection)
# ============================================================================

class IntegrityCheckType(enum.Enum):
    """Types of content integrity checks."""
    PLAGIARISM = "plagiarism"
    AI_DETECTION = "ai_detection"
    COMBINED = "combined"


class IntegrityCheckStatus(enum.Enum):
    """Status of integrity check."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class IntegrityCheck(Base, TimestampMixin):
    """
    Content integrity checks (plagiarism and AI detection)
    """
    __tablename__ = "integrity_checks"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Document being checked
    document_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Check details
    check_type = Column(SQLEnum(IntegrityCheckType), nullable=False, index=True)
    status = Column(SQLEnum(IntegrityCheckStatus), nullable=False, default=IntegrityCheckStatus.PENDING, index=True)
    
    # Text being checked (snapshot at time of check)
    content_snapshot = Column(Text, nullable=False)
    word_count = Column(Integer, nullable=False, default=0)
    
    # Plagiarism results
    plagiarism_score = Column(Integer, nullable=True)  # 0-100 percentage
    plagiarism_matches = Column(JSON, nullable=True)  # Array of {source, similarity, url}
    total_matches = Column(Integer, nullable=True, default=0)
    
    # AI detection results
    ai_score = Column(Integer, nullable=True)  # 0-100 percentage of AI-generated content
    ai_confidence = Column(Integer, nullable=True)  # 0-100 confidence in the detection
    ai_details = Column(JSON, nullable=True)  # Detailed analysis
    
    # External service tracking
    external_check_id = Column(String(255), nullable=True, index=True)  # ID from external service
    external_service = Column(String(100), nullable=True)  # e.g., "copyscape", "gptzero"
    
    # Processing metadata
    processing_started_at = Column(DateTime(timezone=True), nullable=True)
    processing_completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Cost tracking (some services charge per check)
    cost_cents = Column(Integer, nullable=True, default=0)
    
    # Relationships
    document = relationship("Document", back_populates="integrity_checks")
    user = relationship("User", back_populates="integrity_checks")
    
    __table_args__ = (
        Index('idx_document_checks', 'document_id', 'created_at'),
        Index('idx_user_checks', 'user_id', 'created_at'),
        Index('idx_check_status', 'status', 'check_type'),
    )


# ============================================================================
# Export Jobs
# ============================================================================

class ExportFormat(enum.Enum):
    """Export format types."""
    PDF = "pdf"
    DOCX = "docx"
    MARKDOWN = "markdown"
    HTML = "html"
    EPUB = "epub"
    TXT = "txt"
    JSON = "json"


class ExportStatus(enum.Enum):
    """Export job status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"  # File expired and deleted


class ExportType(enum.Enum):
    """Type of export."""
    DOCUMENT = "document"
    STUDIO = "studio"  # All documents in a studio
    GDPR_DATA = "gdpr_data"  # Full user data export
    BACKUP = "backup"  # User backup


class ExportJob(Base, TimestampMixin):
    """
    Export job tracking and file generation
    """
    __tablename__ = "export_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User who requested export
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Export configuration
    export_type = Column(SQLEnum(ExportType), nullable=False, index=True)
    export_format = Column(SQLEnum(ExportFormat), nullable=False, index=True)
    status = Column(SQLEnum(ExportStatus), nullable=False, default=ExportStatus.PENDING, index=True)
    
    # What to export (polymorphic)
    document_id = Column(Integer, ForeignKey('documents.id', ondelete='SET NULL'), nullable=True, index=True)
    studio_id = Column(Integer, ForeignKey('studios.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Export options
    include_metadata = Column(Boolean, default=True, nullable=False)
    include_comments = Column(Boolean, default=False, nullable=False)
    include_version_history = Column(Boolean, default=False, nullable=False)
    
    # Output
    file_url = Column(String(1024), nullable=True)  # Azure Blob Storage URL
    file_size_bytes = Column(Integer, nullable=True)
    file_name = Column(String(255), nullable=True)
    
    # Processing metadata
    processing_started_at = Column(DateTime(timezone=True), nullable=True)
    processing_completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # File deletion date
    error_message = Column(Text, nullable=True)
    
    # Progress tracking
    total_items = Column(Integer, nullable=True, default=0)  # For multi-document exports
    processed_items = Column(Integer, nullable=True, default=0)
    
    # Relationships
    user = relationship("User", back_populates="export_jobs")
    document = relationship("Document", back_populates="export_jobs")
    studio = relationship("Studio", back_populates="export_jobs")
    
    __table_args__ = (
        Index('idx_user_exports', 'user_id', 'created_at'),
        Index('idx_export_status', 'status', 'export_type'),
        Index('idx_expiration', 'expires_at', 'status'),
    )


# ============================================================================
# Accessibility Settings (stored in User model as JSON)
# ============================================================================
# Note: Accessibility settings will be stored in User.accessibility_settings (JSON column)
# This allows flexible schema without extra tables
#
# Example structure:
# {
#     "font_size": "large",
#     "high_contrast": true,
#     "dyslexia_font": false,
#     "screen_reader_mode": false,
#     "reduce_animations": false,
#     "keyboard_shortcuts_enabled": true,
#     "focus_indicators": "enhanced",
#     "color_blind_mode": null,  # or "protanopia", "deuteranopia", "tritanopia"
#     "text_spacing": "normal",  # or "relaxed", "wide"
#     "reading_guide": false,
#     "alt_text_preference": "always_show"
# }
