"""
EPUB Submission Models
Track user-uploaded EPUBs and their verification status
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum

from app.models.base import Base, TimestampMixin


class SubmissionStatus(str, Enum):
    """Status of EPUB submission"""
    PENDING = "pending"              # Just uploaded, awaiting verification
    VERIFYING = "verifying"          # Currently running checks
    VERIFIED = "verified"            # Passed all checks, auto-approved
    NEEDS_REVIEW = "needs_review"    # Requires manual moderator review
    APPROVED = "approved"            # Manually approved by moderator
    REJECTED = "rejected"            # Rejected (plagiarism, AI, quality issues)
    PUBLISHED = "published"          # Live on platform


class EpubSubmission(Base, TimestampMixin):
    """
    User-submitted EPUB books
    Tracks verification and moderation process
    """
    __tablename__ = "epub_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Book metadata
    title = Column(String(500), nullable=False)
    author_name = Column(String(200), nullable=False)  # As provided by uploader
    description = Column(Text, nullable=True)
    genres = Column(JSON, nullable=True)  # ["genre1", "genre2"]
    isbn = Column(String(20), nullable=True, index=True)
    
    # File storage
    file_hash = Column(String(64), nullable=False, unique=True, index=True)  # SHA-256
    blob_url = Column(String(1000), nullable=False)  # Azure Blob Storage URL
    cover_blob_url = Column(String(1000), nullable=True)  # Extracted cover image
    file_size_bytes = Column(Integer, nullable=False)
    
    # Verification results
    status = Column(
        SQLEnum(SubmissionStatus, native_enum=False),
        nullable=False,
        default=SubmissionStatus.PENDING,
        index=True
    )
    verification_score = Column(Float, nullable=True)  # 0-100 overall score
    verification_results = Column(JSON, nullable=True)  # Full verification report
    verification_date = Column(DateTime, nullable=True)
    
    # Moderation
    requires_manual_review = Column(Boolean, default=False, index=True)
    moderator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    moderator_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Publishing
    published_at = Column(DateTime, nullable=True)
    article_id = Column(Integer, ForeignKey("vault_articles.id", ondelete="SET NULL"), nullable=True)
    
    # Author attestation
    author_attestation = Column(Boolean, default=False)  # User confirms they are author
    copyright_holder = Column(Boolean, default=False)    # User confirms they hold rights
    original_work = Column(Boolean, default=False)       # User confirms it's original
    
    # Analytics
    download_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="epub_submissions")
    moderator = relationship("User", foreign_keys=[moderator_id])
    bookshelf_item = relationship("BookshelfItem", foreign_keys=[bookshelf_item_id])


class VerificationLog(Base, TimestampMixin):
    """
    Detailed log of verification checks
    Useful for debugging and improving verification
    """
    __tablename__ = "verification_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("epub_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    check_type = Column(String(50), nullable=False)  # "plagiarism", "ai_detection", etc.
    check_score = Column(Float, nullable=False)       # Score for this check
    check_results = Column(JSON, nullable=True)       # Detailed results
    processing_time_ms = Column(Integer, nullable=True)  # How long check took
    
    # Relationship
    submission = relationship("EpubSubmission", backref="verification_logs")
