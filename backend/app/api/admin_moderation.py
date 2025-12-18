"""
Admin Moderation API - Approve/reject author wiki edits and other content.
"""
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.azure_auth import get_current_user
from app.models.user import User
from app.models.author import Author, AuthorEdit

router = APIRouter(prefix="/api/v1/admin/moderation", tags=["admin-moderation"])


# Schemas
class PendingEditResponse(BaseModel):
    """Pending edit with author context."""
    id: int
    author_id: int
    author_name: str
    user_id: int
    user_email: Optional[str] = None
    field_name: str
    old_value: Optional[str]
    new_value: str
    edit_summary: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ModerationAction(BaseModel):
    """Request to approve or reject an edit."""
    action: str = Field(..., description="'approve' or 'reject'")
    rejection_reason: Optional[str] = Field(None, description="Required if action is 'reject'")


class ModerationStats(BaseModel):
    """Statistics for moderation dashboard."""
    pending_count: int
    approved_today: int
    rejected_today: int
    total_edits: int


# Helper to check if user is admin
def require_admin(current_user: User) -> User:
    """Verify that the current user is an admin."""
    if not hasattr(current_user, 'is_staff') or not current_user.is_staff:
        raise HTTPException(
            status_code=403, 
            detail="Admin access required. You must be a staff member to access this resource."
        )
    return current_user


@router.get("/pending-edits", response_model=List[PendingEditResponse])
async def get_pending_edits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all pending author edits for moderation."""
    require_admin(current_user)
    
    # Query pending edits with author info
    edits = db.query(AuthorEdit, Author, User).join(
        Author, AuthorEdit.author_id == Author.id
    ).join(
        User, AuthorEdit.user_id == User.id
    ).filter(
        AuthorEdit.status == "pending"
    ).order_by(AuthorEdit.created_at.asc()).all()
    
    results = []
    for edit, author, user in edits:
        results.append(PendingEditResponse(
            id=edit.id,
            author_id=edit.author_id,
            author_name=author.name,
            user_id=edit.user_id,
            user_email=user.email if hasattr(user, 'email') else None,
            field_name=edit.field_name,
            old_value=edit.old_value,
            new_value=edit.new_value,
            edit_summary=edit.edit_summary,
            created_at=edit.created_at
        ))
    
    return results


@router.post("/{edit_id}/moderate")
async def moderate_edit(
    edit_id: int,
    action: ModerationAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve or reject an author edit."""
    require_admin(current_user)
    
    # Validate action
    if action.action not in ['approve', 'reject']:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
    
    if action.action == 'reject' and not action.rejection_reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    
    # Get the edit
    edit = db.query(AuthorEdit).filter(AuthorEdit.id == edit_id).first()
    if not edit:
        raise HTTPException(status_code=404, detail="Edit not found")
    
    if edit.status != "pending":
        raise HTTPException(status_code=400, detail=f"Edit is already {edit.status}")
    
    # Get the author
    author = db.query(Author).filter(Author.id == edit.author_id).first()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    
    # Update edit status
    edit.status = action.action + "d"  # "approved" or "rejected"
    edit.reviewed_by = current_user.id
    edit.reviewed_at = datetime.now(timezone.utc)
    
    if action.action == 'approve':
        # Apply the change to the author
        if edit.field_name == 'bio':
            author.bio = edit.new_value
        elif edit.field_name == 'photo_url':
            author.photo_url = edit.new_value
        elif edit.field_name == 'birth_year':
            author.birth_year = int(edit.new_value) if edit.new_value else None
        elif edit.field_name == 'death_year':
            author.death_year = int(edit.new_value) if edit.new_value else None
        elif edit.field_name == 'nationality':
            author.nationality = edit.new_value
        elif edit.field_name == 'website':
            author.website = edit.new_value
        elif edit.field_name == 'social_links':
            import json
            author.social_links = json.loads(edit.new_value)
        elif edit.field_name == 'genres':
            import json
            author.genres = json.loads(edit.new_value)
        elif edit.field_name == 'awards':
            import json
            author.awards = json.loads(edit.new_value)
        
        author.updated_at = datetime.now(timezone.utc)
    else:
        # Rejected - store reason
        edit.rejection_reason = action.rejection_reason
    
    db.commit()
    
    return {
        "message": f"Edit {action.action}d successfully",
        "edit_id": edit_id,
        "status": edit.status
    }


@router.get("/stats", response_model=ModerationStats)
async def get_moderation_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get moderation statistics for the dashboard."""
    require_admin(current_user)
    
    # Pending count
    pending_count = db.query(func.count(AuthorEdit.id)).filter(
        AuthorEdit.status == "pending"
    ).scalar() or 0
    
    # Approved today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    approved_today = db.query(func.count(AuthorEdit.id)).filter(
        AuthorEdit.status == "approved",
        AuthorEdit.reviewed_at >= today_start
    ).scalar() or 0
    
    # Rejected today
    rejected_today = db.query(func.count(AuthorEdit.id)).filter(
        AuthorEdit.status == "rejected",
        AuthorEdit.reviewed_at >= today_start
    ).scalar() or 0
    
    # Total edits
    total_edits = db.query(func.count(AuthorEdit.id)).scalar() or 0
    
    return ModerationStats(
        pending_count=pending_count,
        approved_today=approved_today,
        rejected_today=rejected_today,
        total_edits=total_edits
    )


@router.get("/history")
async def get_moderation_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent moderation history (approved/rejected edits)."""
    require_admin(current_user)
    
    edits = db.query(AuthorEdit, Author, User).join(
        Author, AuthorEdit.author_id == Author.id
    ).join(
        User, AuthorEdit.user_id == User.id
    ).filter(
        AuthorEdit.status.in_(["approved", "rejected"])
    ).order_by(AuthorEdit.reviewed_at.desc()).limit(limit).all()
    
    results = []
    for edit, author, user in edits:
        results.append({
            "id": edit.id,
            "author_id": edit.author_id,
            "author_name": author.name,
            "user_id": edit.user_id,
            "user_email": user.email if hasattr(user, 'email') else None,
            "field_name": edit.field_name,
            "edit_summary": edit.edit_summary,
            "status": edit.status,
            "reviewed_at": edit.reviewed_at.isoformat() if edit.reviewed_at else None,
            "rejection_reason": edit.rejection_reason
        })
    
    return results
