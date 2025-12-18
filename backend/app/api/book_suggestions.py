"""
Book Suggestions API
Users can suggest books to be added to the library
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.azure_auth import get_current_user
from app.models import User, BookSuggestion, SuggestionStatus
from pydantic import BaseModel

router = APIRouter(prefix="/book-suggestions", tags=["book-suggestions"])


# Pydantic schemas
class BookSuggestionCreate(BaseModel):
    query: str
    title: Optional[str] = None
    author: Optional[str] = None
    isbn: Optional[str] = None
    reason: Optional[str] = None
    description: Optional[str] = None


class BookSuggestionResponse(BaseModel):
    id: int
    user_id: int
    query: str
    title: Optional[str]
    author: Optional[str]
    isbn: Optional[str]
    reason: Optional[str]
    description: Optional[str]
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime]
    admin_notes: Optional[str]
    
    class Config:
        from_attributes = True


class BookSuggestionUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None


@router.post("", response_model=BookSuggestionResponse)
async def create_book_suggestion(
    suggestion: BookSuggestionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new book suggestion
    """
    # Create the suggestion
    db_suggestion = BookSuggestion(
        user_id=current_user.id,
        query=suggestion.query,
        title=suggestion.title,
        author=suggestion.author,
        isbn=suggestion.isbn,
        reason=suggestion.reason,
        description=suggestion.description,
        status=SuggestionStatus.PENDING
    )
    
    db.add(db_suggestion)
    db.commit()
    db.refresh(db_suggestion)
    
    return db_suggestion


@router.get("", response_model=List[BookSuggestionResponse])
async def get_my_suggestions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's book suggestions
    """
    suggestions = db.query(BookSuggestion).filter(
        BookSuggestion.user_id == current_user.id
    ).order_by(BookSuggestion.created_at.desc()).all()
    
    return suggestions


@router.get("/all", response_model=List[BookSuggestionResponse])
async def get_all_suggestions(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all book suggestions (admin only)
    Optionally filter by status: pending, approved, rejected
    """
    # Check if user is admin (has 'admin' role)
    from app.models import UserRole
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    is_admin = any(role.role.name == 'admin' for role in user_roles)
    
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = db.query(BookSuggestion)
    
    if status:
        query = query.filter(BookSuggestion.status == status.upper())
    
    suggestions = query.order_by(BookSuggestion.created_at.desc()).all()
    
    return suggestions


@router.patch("/{suggestion_id}", response_model=BookSuggestionResponse)
async def update_suggestion(
    suggestion_id: int,
    update: BookSuggestionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a book suggestion (admin only)
    Mark as approved or rejected
    """
    # Check if user is admin
    from app.models import UserRole
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    is_admin = any(role.role.name == 'admin' for role in user_roles)
    
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get the suggestion
    suggestion = db.query(BookSuggestion).filter(
        BookSuggestion.id == suggestion_id
    ).first()
    
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    
    # Update status
    suggestion.status = SuggestionStatus(update.status.upper())
    suggestion.reviewed_at = datetime.now(timezone.utc)
    suggestion.reviewed_by_admin_id = current_user.id
    
    if update.admin_notes:
        suggestion.admin_notes = update.admin_notes
    
    db.commit()
    db.refresh(suggestion)
    
    return suggestion
