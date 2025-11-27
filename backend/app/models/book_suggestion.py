"""
Book Suggestion Model
Users can suggest books to be added to the library
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum

from app.models.base import Base, TimestampMixin


class SuggestionStatus(str, Enum):
    """Status of book suggestion"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class BookSuggestion(Base, TimestampMixin):
    """
    Book suggestions from users
    Similar to interest tags - staff can review and approve
    """
    __tablename__ = "book_suggestions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User who suggested the book
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Book details from search query
    query = Column(String(500), nullable=False)  # Original search query
    title = Column(String(500), nullable=True)  # If user provides more details
    author = Column(String(500), nullable=True)
    isbn = Column(String(20), nullable=True)
    
    # Why they want this book
    reason = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    
    # Review status
    status = Column(SQLEnum(SuggestionStatus), nullable=False, default=SuggestionStatus.PENDING, index=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by_admin_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    admin_notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="book_suggestions")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_admin_id])
    
    def __repr__(self):
        return f"<BookSuggestion(id={self.id}, query='{self.query}', status={self.status})>"
