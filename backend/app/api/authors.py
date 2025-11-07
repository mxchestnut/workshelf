"""
API endpoints for author tracking and management.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import User, AuthorFollow, AuthorFollowStatus
from app.services import user_service

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

    # Add genres to user interests
    if author_data.genres:
        await user_service.add_genres_to_interests(db, user, author_data.genres)

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


@router.get("/search/{author_name}/books")
async def search_author_books(
    author_name: str,
    max_results: int = Query(20, description="Maximum number of books to return"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Search for books by a specific author using Google Books API.
    Returns books that are not already in the user's bookshelf.
    """
    import httpx
    from app.models.bookshelf import BookshelfItem
    
    # Get books already in user's bookshelf (to exclude from results)
    existing_books_result = await db.execute(
        select(BookshelfItem.isbn, BookshelfItem.title, BookshelfItem.author).where(
            BookshelfItem.user_id == user.id,
            BookshelfItem.item_type == 'book'
        )
    )
    existing_books = existing_books_result.all()
    existing_isbns = {book.isbn for book in existing_books if book.isbn}
    existing_titles = {(book.title.lower(), book.author.lower()) for book in existing_books if book.title and book.author}
    
    books = []
    
    async with httpx.AsyncClient() as client:
        try:
            # Search Google Books API
            response = await client.get(
                "https://www.googleapis.com/books/v1/volumes",
                params={
                    "q": f"inauthor:{author_name}",
                    "maxResults": 40,  # Request more to filter out existing books
                    "orderBy": "relevance"
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                items = data.get("items", [])
                
                for item in items:
                    volume_info = item.get("volumeInfo", {})
                    
                    # Extract book data
                    title = volume_info.get("title", "")
                    authors = volume_info.get("authors", [])
                    author = authors[0] if authors else ""
                    
                    # Get ISBN
                    isbn = None
                    for identifier in volume_info.get("industryIdentifiers", []):
                        if identifier.get("type") == "ISBN_13":
                            isbn = identifier.get("identifier")
                            break
                        elif identifier.get("type") == "ISBN_10":
                            isbn = identifier.get("identifier")
                    
                    # Skip if already in bookshelf
                    if isbn and isbn in existing_isbns:
                        continue
                    if (title.lower(), author.lower()) in existing_titles:
                        continue
                    
                    # Skip if author doesn't match (case-insensitive)
                    if author.lower() != author_name.lower():
                        continue
                    
                    # Add to results
                    books.append({
                        "title": title,
                        "author": author,
                        "isbn": isbn,
                        "cover_url": volume_info.get("imageLinks", {}).get("thumbnail", "").replace("http://", "https://"),
                        "description": volume_info.get("description", ""),
                        "publisher": volume_info.get("publisher", ""),
                        "publish_year": int(volume_info.get("publishedDate", "")[:4]) if volume_info.get("publishedDate") else None,
                        "page_count": volume_info.get("pageCount"),
                        "genres": volume_info.get("categories", [])
                    })
                    
                    if len(books) >= max_results:
                        break
                        
        except Exception as e:
            print(f"Error searching books for {author_name}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to search for books: {str(e)}")
    
    return {
        "author_name": author_name,
        "total_books": len(books),
        "books": books
    }
