"""
Authors API - Wiki-style author profiles with collaborative editing.
Users view central author profiles and can follow them for notifications.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import get_current_user, get_optional_user
from app.models.user import User
from app.models.author import Author, AuthorEdit, UserFollowsAuthor
from app.models.store import StoreItem

router = APIRouter(prefix="/authors", tags=["authors"])


# Schemas
class AuthorResponse(BaseModel):
    """Author profile with wiki-style bio."""
    id: int
    name: str
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    birth_year: Optional[int] = None
    death_year: Optional[int] = None
    nationality: Optional[str] = None
    website: Optional[str] = None
    social_links: Optional[dict] = None
    genres: Optional[List[str]] = None
    awards: Optional[List[str]] = None
    is_verified: bool = False
    is_bestseller: bool = False
    follower_count: int = 0
    books_published: int = 0
    total_sales: int = 0
    is_following: bool = False  # Whether current user follows this author

    class Config:
        from_attributes = True


class BookSummary(BaseModel):
    """Book info for author's books list."""
    id: int
    title: str
    cover_url: Optional[str]
    final_price: float
    rating_average: Optional[float]
    rating_count: int
    published_at: Optional[datetime]

    class Config:
        from_attributes = True


class EditRequest(BaseModel):
    """Request to edit an author field."""
    field_name: str = Field(..., description="Field: bio, photo_url, birth_year, death_year, nationality, website, awards")
    new_value: str = Field(..., description="New value for the field")
    edit_summary: Optional[str] = Field(None, description="Explanation of your edit")


class EditResponse(BaseModel):
    """Author edit with moderation status."""
    id: int
    author_id: int
    user_id: int
    field_name: str
    old_value: Optional[str]
    new_value: str
    edit_summary: Optional[str]
    status: str
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]
    rejection_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Endpoints
# Note: More specific routes must come before generic /{author_id} patterns
@router.get("/by-name/{author_name}/books", response_model=List[BookSummary])
async def get_books_by_author_name(
    author_name: str,
    max_results: int = Query(10, le=100),
    db: Session = Depends(get_db)
):
    """Get books by searching for author by name."""
    # Find author by name (fuzzy match)
    author = db.query(Author).filter(
        Author.name.ilike(f"%{author_name}%")
    ).first()
    
    if not author:
        # Return empty list if author not found
        return []
    
    # Get books by this author
    books = db.query(StoreItem).filter(
        StoreItem.author_id == author.id,
        StoreItem.status == "active"
    ).order_by(StoreItem.published_at.desc()).limit(max_results).all()
    
    return [
        BookSummary(
            id=book.id,
            title=book.title,
            cover_url=book.cover_url,
            final_price=book.final_price
        )
        for book in books
    ]


@router.get("/{author_id}", response_model=AuthorResponse)
async def get_author(
    author_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Get wiki-style author profile by ID."""
    author = db.query(Author).filter(Author.id == author_id).first()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    
    # Check if current user follows this author
    is_following = False
    if current_user:
        follow = db.query(UserFollowsAuthor).filter(
            UserFollowsAuthor.user_id == current_user.id,
            UserFollowsAuthor.author_id == author_id
        ).first()
        is_following = follow is not None
    
    response = AuthorResponse.model_validate(author)
    response.is_following = is_following
    return response


@router.get("/{author_id}/books", response_model=List[BookSummary])
async def get_author_books(
    author_id: int,
    db: Session = Depends(get_db)
):
    """Get all books by this author (auto-generated from store)."""
    books = db.query(StoreItem).filter(
        StoreItem.author_id == author_id,
        StoreItem.status == "active"
    ).order_by(StoreItem.published_at.desc()).all()
    
    return [BookSummary.model_validate(book) for book in books]


@router.post("/{author_id}/edit", response_model=EditResponse)
async def submit_edit(
    author_id: int,
    edit: EditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit a wiki-style edit to an author's profile.
    Requires login. Edit goes to moderation queue for approval.
    Uses the same TipTap editor as writing feature.
    """
    # Verify author exists
    author = db.query(Author).filter(Author.id == author_id).first()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    
    # Validate field name
    allowed_fields = ['bio', 'photo_url', 'birth_year', 'death_year', 
                     'nationality', 'website', 'social_links', 'genres', 'awards']
    if edit.field_name not in allowed_fields:
        raise HTTPException(status_code=400, detail=f"Cannot edit field: {edit.field_name}")
    
    # Get current value
    old_value = getattr(author, edit.field_name)
    if isinstance(old_value, (dict, list)):
        import json
        old_value = json.dumps(old_value)
    
    # Create edit record for moderation
    author_edit = AuthorEdit(
        author_id=author_id,
        user_id=current_user.id,
        field_name=edit.field_name,
        old_value=str(old_value) if old_value else None,
        new_value=edit.new_value,
        edit_summary=edit.edit_summary,
        status="pending"
    )
    
    db.add(author_edit)
    db.commit()
    db.refresh(author_edit)
    
    return EditResponse.model_validate(author_edit)


@router.get("/{author_id}/revisions", response_model=List[EditResponse])
async def get_revisions(
    author_id: int,
    include_pending: bool = False,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Get revision history for an author (GitHub-style).
    Shows approved edits by default. Include pending if user is admin.
    """
    query = db.query(AuthorEdit).filter(AuthorEdit.author_id == author_id)
    
    # Only show pending edits to admins or the edit author
    if not include_pending:
        query = query.filter(AuthorEdit.status == "approved")
    elif current_user:
        # Show user's own pending edits or if they're admin
        if not hasattr(current_user, 'is_admin') or not current_user.is_admin:
            query = query.filter(
                (AuthorEdit.status == "approved") | 
                (AuthorEdit.user_id == current_user.id)
            )
    
    edits = query.order_by(AuthorEdit.created_at.desc()).all()
    return [EditResponse.model_validate(edit) for edit in edits]


@router.post("/{author_id}/follow")
async def follow_author(
    author_id: int,
    notify: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Follow an author for new release notifications."""
    # Verify author exists
    author = db.query(Author).filter(Author.id == author_id).first()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    
    # Check if already following
    existing = db.query(UserFollowsAuthor).filter(
        UserFollowsAuthor.user_id == current_user.id,
        UserFollowsAuthor.author_id == author_id
    ).first()
    
    if existing:
        # Update notification preference
        existing.notify_new_releases = notify
        db.commit()
        return {"message": "Follow preferences updated", "following": True}
    
    # Create new follow
    follow = UserFollowsAuthor(
        user_id=current_user.id,
        author_id=author_id,
        notify_new_releases=notify
    )
    db.add(follow)
    
    # Increment follower count
    author.follower_count += 1
    
    db.commit()
    return {"message": "Now following author", "following": True}


@router.delete("/{author_id}/follow")
async def unfollow_author(
    author_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unfollow an author."""
    follow = db.query(UserFollowsAuthor).filter(
        UserFollowsAuthor.user_id == current_user.id,
        UserFollowsAuthor.author_id == author_id
    ).first()
    
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this author")
    
    db.delete(follow)
    
    # Decrement follower count
    author = db.query(Author).filter(Author.id == author_id).first()
    if author and author.follower_count > 0:
        author.follower_count -= 1
    
    db.commit()
    return {"message": "Unfollowed author", "following": False}


@router.get("/search", response_model=List[AuthorResponse])
async def search_authors(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Search for authors by name."""
    authors = db.query(Author).filter(
        Author.name.ilike(f"%{q}%")
    ).limit(limit).all()
    
    # Check which ones current user follows
    following_ids = set()
    if current_user:
        follows = db.query(UserFollowsAuthor.author_id).filter(
            UserFollowsAuthor.user_id == current_user.id,
            UserFollowsAuthor.author_id.in_([a.id for a in authors])
        ).all()
        following_ids = {f[0] for f in follows}
    
    results = []
    for author in authors:
        response = AuthorResponse.model_validate(author)
        response.is_following = author.id in following_ids
        results.append(response)
    
    return results


@router.get("/me/following", response_model=List[AuthorResponse])
async def get_followed_authors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all authors the current user follows."""
    follows = db.query(UserFollowsAuthor).filter(
        UserFollowsAuthor.user_id == current_user.id
    ).all()
    
    author_ids = [f.author_id for f in follows]
    if not author_ids:
        return []
    
    authors = db.query(Author).filter(Author.id.in_(author_ids)).all()
    
    results = []
    for author in authors:
        response = AuthorResponse.model_validate(author)
        response.is_following = True
        results.append(response)
    
    return results
