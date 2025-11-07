"""
API endpoints for author tracking and management.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.deps import get_current_user, get_db
from app.models import User, AuthorFollow, AuthorFollowStatus

router = APIRouter(prefix="/authors", tags=["authors"])


# Pydantic models for request/response
class AuthorFollowCreate(BaseModel):
    author_name: str
    author_bio: Optional[str] = None
    author_photo_url: Optional[str] = None
    author_website: Optional[str] = None
    genres: Optional[List[str]] = None
    status: str = "want-to-read"
    is_favorite: bool = False
    notes: Optional[str] = None
    discovery_source: Optional[str] = None


class AuthorFollowUpdate(BaseModel):
    author_bio: Optional[str] = None
    author_photo_url: Optional[str] = None
    author_website: Optional[str] = None
    genres: Optional[List[str]] = None
    status: Optional[str] = None
    is_favorite: Optional[bool] = None
    notes: Optional[str] = None


class AuthorFollowResponse(BaseModel):
    id: int
    user_id: int
    author_name: str
    author_bio: Optional[str]
    author_photo_url: Optional[str]
    author_website: Optional[str]
    genres: Optional[List[str]]
    status: str
    is_favorite: bool
    notes: Optional[str]
    discovery_source: Optional[str]
    added_at: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class AuthorStats(BaseModel):
    total_authors: int
    currently_reading: int
    authors_read: int
    want_to_read: int
    favorites: int


@router.get("/", response_model=List[AuthorFollowResponse])
async def get_authors(
    status: Optional[str] = Query(None, description="Filter by status"),
    favorites_only: Optional[bool] = Query(False, description="Show only favorites"),
    search: Optional[str] = Query(None, description="Search by author name"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get all authors followed by the current user.
    """
    query = select(AuthorFollow).where(AuthorFollow.user_id == user.id)

    # Apply filters
    if status:
        query = query.where(AuthorFollow.status == status)
    
    if favorites_only:
        query = query.where(AuthorFollow.is_favorite == True)
    
    if search:
        query = query.where(AuthorFollow.author_name.ilike(f"%{search}%"))
    
    # Order by most recently added
    query = query.order_by(AuthorFollow.added_at.desc())

    result = await db.execute(query)
    authors = result.scalars().all()

    return [
        AuthorFollowResponse(
            id=author.id,
            user_id=author.user_id,
            author_name=author.author_name,
            author_bio=author.author_bio,
            author_photo_url=author.author_photo_url,
            author_website=author.author_website,
            genres=author.genres,
            status=author.status,
            is_favorite=author.is_favorite,
            notes=author.notes,
            discovery_source=author.discovery_source,
            added_at=author.added_at.isoformat() if author.added_at else author.created_at.isoformat(),
            created_at=author.created_at.isoformat(),
            updated_at=author.updated_at.isoformat()
        )
        for author in authors
    ]


@router.get("/stats", response_model=AuthorStats)
async def get_author_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get statistics about followed authors.
    """
    # Total authors
    total_query = select(func.count(AuthorFollow.id)).where(
        AuthorFollow.user_id == user.id
    )
    total_result = await db.execute(total_query)
    total_authors = total_result.scalar() or 0

    # Currently reading
    reading_query = select(func.count(AuthorFollow.id)).where(
        AuthorFollow.user_id == user.id,
        AuthorFollow.status == "reading"
    )
    reading_result = await db.execute(reading_query)
    currently_reading = reading_result.scalar() or 0

    # Authors read
    read_query = select(func.count(AuthorFollow.id)).where(
        AuthorFollow.user_id == user.id,
        AuthorFollow.status == "read"
    )
    read_result = await db.execute(read_query)
    authors_read = read_result.scalar() or 0

    # Want to read
    want_query = select(func.count(AuthorFollow.id)).where(
        AuthorFollow.user_id == user.id,
        AuthorFollow.status == "want-to-read"
    )
    want_result = await db.execute(want_query)
    want_to_read = want_result.scalar() or 0

    # Favorites
    fav_query = select(func.count(AuthorFollow.id)).where(
        AuthorFollow.user_id == user.id,
        AuthorFollow.is_favorite == True
    )
    fav_result = await db.execute(fav_query)
    favorites = fav_result.scalar() or 0

    return AuthorStats(
        total_authors=total_authors,
        currently_reading=currently_reading,
        authors_read=authors_read,
        want_to_read=want_to_read,
        favorites=favorites
    )


@router.get("/{author_id}", response_model=AuthorFollowResponse)
async def get_author(
    author_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get a specific author by ID.
    """
    query = select(AuthorFollow).where(
        AuthorFollow.id == author_id,
        AuthorFollow.user_id == user.id
    )
    result = await db.execute(query)
    author = result.scalar_one_or_none()

    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    return AuthorFollowResponse(
        id=author.id,
        user_id=author.user_id,
        author_name=author.author_name,
        author_bio=author.author_bio,
        author_photo_url=author.author_photo_url,
        author_website=author.author_website,
        genres=author.genres,
        status=author.status,
        is_favorite=author.is_favorite,
        notes=author.notes,
        discovery_source=author.discovery_source,
        added_at=author.added_at.isoformat() if author.added_at else author.created_at.isoformat(),
        created_at=author.created_at.isoformat(),
        updated_at=author.updated_at.isoformat()
    )


@router.put("/{author_id}", response_model=AuthorFollowResponse)
async def update_author(
    author_id: int,
    author_data: AuthorFollowUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Update an author follow entry.
    """
    query = select(AuthorFollow).where(
        AuthorFollow.id == author_id,
        AuthorFollow.user_id == user.id
    )
    result = await db.execute(query)
    author = result.scalar_one_or_none()

    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    # Update fields
    update_data = author_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(author, field, value)

    await db.commit()
    await db.refresh(author)

    return AuthorFollowResponse(
        id=author.id,
        user_id=author.user_id,
        author_name=author.author_name,
        author_bio=author.author_bio,
        author_photo_url=author.author_photo_url,
        author_website=author.author_website,
        genres=author.genres,
        status=author.status,
        is_favorite=author.is_favorite,
        notes=author.notes,
        discovery_source=author.discovery_source,
        added_at=author.added_at.isoformat() if author.added_at else author.created_at.isoformat(),
        created_at=author.created_at.isoformat(),
        updated_at=author.updated_at.isoformat()
    )


@router.delete("/{author_id}")
async def delete_author(
    author_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Unfollow an author (delete the follow entry).
    """
    query = select(AuthorFollow).where(
        AuthorFollow.id == author_id,
        AuthorFollow.user_id == user.id
    )
    result = await db.execute(query)
    author = result.scalar_one_or_none()

    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    await db.delete(author)
    await db.commit()

    return {"message": "Author unfollowed successfully"}


@router.post("/", response_model=AuthorFollowResponse)
async def create_author_follow(
    author_data: AuthorFollowCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Manually add an author to follow.
    """
    # Check if already following this author
    check_query = select(AuthorFollow).where(
        AuthorFollow.user_id == user.id,
        AuthorFollow.author_name == author_data.author_name
    )
    check_result = await db.execute(check_query)
    existing = check_result.scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Already following this author")

    # Create new author follow
    author = AuthorFollow(
        user_id=user.id,
        author_name=author_data.author_name,
        author_bio=author_data.author_bio,
        author_photo_url=author_data.author_photo_url,
        author_website=author_data.author_website,
        genres=author_data.genres,
        status=author_data.status,
        is_favorite=author_data.is_favorite,
        notes=author_data.notes,
        discovery_source=author_data.discovery_source or "manual"
    )

    db.add(author)
    await db.commit()
    await db.refresh(author)

    return AuthorFollowResponse(
        id=author.id,
        user_id=author.user_id,
        author_name=author.author_name,
        author_bio=author.author_bio,
        author_photo_url=author.author_photo_url,
        author_website=author.author_website,
        genres=author.genres,
        status=author.status,
        is_favorite=author.is_favorite,
        notes=author.notes,
        discovery_source=author.discovery_source,
        added_at=author.added_at.isoformat() if author.added_at else author.created_at.isoformat(),
        created_at=author.created_at.isoformat(),
        updated_at=author.updated_at.isoformat()
    )
