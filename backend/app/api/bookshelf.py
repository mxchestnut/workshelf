"""
Bookshelf API endpoints
Manage user's book collection (both Work Shelf documents and external books)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
import json
import os
from anthropic import Anthropic

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.bookshelf import BookshelfItem, BookshelfItemType, BookshelfStatus
from app.models import User
from app.services import user_service

router = APIRouter(prefix="/bookshelf", tags=["bookshelf"])


# ============================================================================
# Schemas
# ============================================================================

class BookshelfItemCreate(BaseModel):
    """Create a new bookshelf item"""
    # Item type
    item_type: str = Field(..., description="'document' or 'book'")
    
    # For Work Shelf documents
    document_id: Optional[int] = None
    
    # For external books
    isbn: Optional[str] = None
    title: Optional[str] = None
    author: Optional[str] = None
    cover_url: Optional[str] = None
    publisher: Optional[str] = None
    publish_year: Optional[int] = None
    page_count: Optional[int] = None
    description: Optional[str] = None
    genres: Optional[List[str]] = None
    
    # Reading data
    status: str = Field(default="want-to-read")
    rating: Optional[int] = Field(None, ge=1, le=5)
    review: Optional[str] = None
    notes: Optional[str] = None
    is_favorite: bool = False
    review_public: bool = True
    started_reading: Optional[datetime] = None
    finished_reading: Optional[datetime] = None


class BookshelfItemUpdate(BaseModel):
    """Update a bookshelf item"""
    status: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    review: Optional[str] = None
    notes: Optional[str] = None
    is_favorite: Optional[bool] = None
    review_public: Optional[bool] = None
    started_reading: Optional[datetime] = None
    finished_reading: Optional[datetime] = None


class BookshelfItemResponse(BaseModel):
    """Bookshelf item response"""
    id: int
    user_id: int
    item_type: str
    
    # Document data
    document_id: Optional[int]
    document_title: Optional[str]
    document_author: Optional[str]
    
    # Book data
    isbn: Optional[str]
    title: Optional[str]
    author: Optional[str]
    cover_url: Optional[str]
    publisher: Optional[str]
    publish_year: Optional[int]
    page_count: Optional[int]
    description: Optional[str]
    genres: Optional[List[str]]
    
    # Reading data
    status: str
    rating: Optional[int]
    review: Optional[str]
    notes: Optional[str]
    is_favorite: bool
    review_public: bool
    started_reading: Optional[datetime]
    finished_reading: Optional[datetime]
    added_at: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class BookshelfStats(BaseModel):
    """Statistics about user's bookshelf"""
    total_books: int
    currently_reading: int
    books_read: int
    want_to_read: int
    favorites: int
    books_read_this_year: int


class BookEnhanceRequest(BaseModel):
    """Request to enhance book data with AI"""
    title: str
    author: Optional[str] = None
    publisher: Optional[str] = None
    publish_year: Optional[int] = None
    isbn: Optional[str] = None
    page_count: Optional[int] = None
    description: Optional[str] = None
    genres: Optional[List[str]] = None


class BookEnhanceResponse(BaseModel):
    """Enhanced book data from AI"""
    isbn: Optional[str] = None
    page_count: Optional[int] = None
    description: Optional[str] = None
    genres: Optional[List[str]] = None
    ai_enhanced: bool = True
    fields_enhanced: List[str] = []


# ============================================================================
# Endpoints
# ============================================================================

@router.post("", response_model=BookshelfItemResponse, status_code=201)
async def add_to_bookshelf(
    item_data: BookshelfItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Add a book or document to your bookshelf
    
    For Work Shelf documents:
    - Set item_type='document' and provide document_id
    
    For external books:
    - Set item_type='book' and provide ISBN + title (minimum)
    - Optionally provide author, cover_url, publisher, etc.
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Validate item type
    if item_data.item_type not in ['document', 'book']:
        raise HTTPException(status_code=400, detail="item_type must be 'document' or 'book'")
    
    # Validate document item
    if item_data.item_type == 'document':
        if not item_data.document_id:
            raise HTTPException(status_code=400, detail="document_id required for document items")
        
        # Check if document exists (optional - could add this check)
        # Check if already in bookshelf
        result = await db.execute(
            select(BookshelfItem).where(
                BookshelfItem.user_id == user.id,
                BookshelfItem.document_id == item_data.document_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Document already in bookshelf")
    
    # Validate book item
    if item_data.item_type == 'book':
        if not item_data.title:
            raise HTTPException(status_code=400, detail="title required for book items")
        
        # Check if already in bookshelf by ISBN (if provided) or by title+author
        if item_data.isbn:
            result = await db.execute(
                select(BookshelfItem).where(
                    BookshelfItem.user_id == user.id,
                    BookshelfItem.isbn == item_data.isbn
                )
            )
            if result.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Book already in bookshelf")
        else:
            # Check by title and author to avoid duplicates
            result = await db.execute(
                select(BookshelfItem).where(
                    BookshelfItem.user_id == user.id,
                    BookshelfItem.title == item_data.title,
                    BookshelfItem.author == item_data.author
                )
            )
            if result.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Book already in bookshelf")
    
    # Create bookshelf item
    bookshelf_item = BookshelfItem(
        user_id=user.id,
        item_type=item_data.item_type,
        document_id=item_data.document_id,
        isbn=item_data.isbn,
        title=item_data.title,
        author=item_data.author,
        cover_url=item_data.cover_url,
        publisher=item_data.publisher,
        publish_year=item_data.publish_year,
        page_count=item_data.page_count,
        description=item_data.description,
        genres=item_data.genres,
        status=item_data.status,
        rating=item_data.rating,
        review=item_data.review,
        notes=item_data.notes,
        is_favorite=item_data.is_favorite,
        review_public=item_data.review_public,
        started_reading=item_data.started_reading,
        finished_reading=item_data.finished_reading,
        added_at=datetime.utcnow()
    )
    
    db.add(bookshelf_item)
    await db.commit()
    await db.refresh(bookshelf_item)
    
    # Auto-sync book genres to user interests
    if item_data.genres and len(item_data.genres) > 0:
        # Get user's profile
        profile_result = await db.execute(
            select(user.__class__).where(user.__class__.id == user.id)
        )
        user_obj = profile_result.scalar_one()
        
        # Get current interests (or initialize empty array)
        current_interests = user_obj.interests or []
        
        # Add new genres that aren't already in interests (case-insensitive)
        current_interests_lower = [i.lower() for i in current_interests]
        new_genres = [
            genre for genre in item_data.genres 
            if genre.lower() not in current_interests_lower
        ]
        
        # Update interests if we have new genres
        if new_genres:
            user_obj.interests = current_interests + new_genres
            await db.commit()
    
    # Convert to response (would need to fetch document data if document_id)
    return BookshelfItemResponse(
        id=bookshelf_item.id,
        user_id=bookshelf_item.user_id,
        item_type=bookshelf_item.item_type,
        document_id=bookshelf_item.document_id,
        document_title=None,  # TODO: Fetch from document if needed
        document_author=None,
        isbn=bookshelf_item.isbn,
        title=bookshelf_item.title,
        author=bookshelf_item.author,
        cover_url=bookshelf_item.cover_url,
        publisher=bookshelf_item.publisher,
        publish_year=bookshelf_item.publish_year,
        page_count=bookshelf_item.page_count,
        description=bookshelf_item.description,
        genres=bookshelf_item.genres,
        status=bookshelf_item.status,
        rating=bookshelf_item.rating,
        review=bookshelf_item.review,
        notes=bookshelf_item.notes,
        is_favorite=bookshelf_item.is_favorite,
        review_public=bookshelf_item.review_public,
        started_reading=bookshelf_item.started_reading,
        finished_reading=bookshelf_item.finished_reading,
        added_at=bookshelf_item.added_at,
        created_at=bookshelf_item.created_at,
        updated_at=bookshelf_item.updated_at
    )


@router.get("", response_model=List[BookshelfItemResponse])
async def get_my_bookshelf(
    status: Optional[str] = Query(None, description="Filter by status"),
    favorites_only: bool = Query(False, description="Show only favorites"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get your bookshelf
    
    Query parameters:
    - status: Filter by reading status (reading, read, want-to-read, favorites, dnf)
    - favorites_only: Show only favorites
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    query = select(BookshelfItem).where(BookshelfItem.user_id == user.id)
    
    if status:
        query = query.where(BookshelfItem.status == status)
    
    if favorites_only:
        query = query.where(BookshelfItem.is_favorite == True)
    
    query = query.order_by(BookshelfItem.added_at.desc())
    
    result = await db.execute(query)
    items = result.scalars().all()
    
    return [
        BookshelfItemResponse(
            id=item.id,
            user_id=item.user_id,
            item_type=item.item_type,
            document_id=item.document_id,
            document_title=None,  # TODO: Fetch from document
            document_author=None,
            isbn=item.isbn,
            title=item.title,
            author=item.author,
            cover_url=item.cover_url,
            publisher=item.publisher,
            publish_year=item.publish_year,
            page_count=item.page_count,
            description=item.description,
            genres=item.genres,
            status=item.status,
            rating=item.rating,
            review=item.review,
            notes=item.notes,
            is_favorite=item.is_favorite,
            review_public=item.review_public,
            started_reading=item.started_reading,
            finished_reading=item.finished_reading,
            added_at=item.added_at,
            created_at=item.created_at,
            updated_at=item.updated_at
        )
        for item in items
    ]


@router.get("/stats", response_model=BookshelfStats)
async def get_bookshelf_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get statistics about your bookshelf"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Total books
    total_result = await db.execute(
        select(func.count(BookshelfItem.id)).where(BookshelfItem.user_id == user.id)
    )
    total_books = total_result.scalar() or 0
    
    # Currently reading
    reading_result = await db.execute(
        select(func.count(BookshelfItem.id)).where(
            BookshelfItem.user_id == user.id,
            BookshelfItem.status == 'reading'
        )
    )
    currently_reading = reading_result.scalar() or 0
    
    # Books read
    read_result = await db.execute(
        select(func.count(BookshelfItem.id)).where(
            BookshelfItem.user_id == user.id,
            BookshelfItem.status == 'read'
        )
    )
    books_read = read_result.scalar() or 0
    
    # Want to read
    want_result = await db.execute(
        select(func.count(BookshelfItem.id)).where(
            BookshelfItem.user_id == user.id,
            BookshelfItem.status == 'want-to-read'
        )
    )
    want_to_read = want_result.scalar() or 0
    
    # Favorites
    favorites_result = await db.execute(
        select(func.count(BookshelfItem.id)).where(
            BookshelfItem.user_id == user.id,
            BookshelfItem.is_favorite == True
        )
    )
    favorites = favorites_result.scalar() or 0
    
    # Books read this year
    current_year = datetime.utcnow().year
    year_result = await db.execute(
        select(func.count(BookshelfItem.id)).where(
            BookshelfItem.user_id == user.id,
            BookshelfItem.status == 'read',
            func.extract('year', BookshelfItem.finished_reading) == current_year
        )
    )
    books_read_this_year = year_result.scalar() or 0
    
    return BookshelfStats(
        total_books=total_books,
        currently_reading=currently_reading,
        books_read=books_read,
        want_to_read=want_to_read,
        favorites=favorites,
        books_read_this_year=books_read_this_year
    )


@router.get("/{item_id}", response_model=BookshelfItemResponse)
async def get_bookshelf_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific bookshelf item"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    result = await db.execute(
        select(BookshelfItem).where(
            BookshelfItem.id == item_id,
            BookshelfItem.user_id == user.id
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Bookshelf item not found")
    
    return BookshelfItemResponse(
        id=item.id,
        user_id=item.user_id,
        item_type=item.item_type,
        document_id=item.document_id,
        document_title=None,
        document_author=None,
        isbn=item.isbn,
        title=item.title,
        author=item.author,
        cover_url=item.cover_url,
        publisher=item.publisher,
        publish_year=item.publish_year,
        page_count=item.page_count,
        description=item.description,
        genres=item.genres,
        status=item.status,
        rating=item.rating,
        review=item.review,
        notes=item.notes,
        is_favorite=item.is_favorite,
        review_public=item.review_public,
        started_reading=item.started_reading,
        finished_reading=item.finished_reading,
        added_at=item.added_at,
        created_at=item.created_at,
        updated_at=item.updated_at
    )


@router.put("/{item_id}", response_model=BookshelfItemResponse)
async def update_bookshelf_item(
    item_id: int,
    update_data: BookshelfItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a bookshelf item (status, rating, review, etc.)"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    result = await db.execute(
        select(BookshelfItem).where(
            BookshelfItem.id == item_id,
            BookshelfItem.user_id == user.id
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Bookshelf item not found")
    
    # Update fields
    if update_data.status is not None:
        item.status = update_data.status
    if update_data.rating is not None:
        item.rating = update_data.rating
    if update_data.review is not None:
        item.review = update_data.review
    if update_data.notes is not None:
        item.notes = update_data.notes
    if update_data.is_favorite is not None:
        item.is_favorite = update_data.is_favorite
    if update_data.review_public is not None:
        item.review_public = update_data.review_public
    if update_data.started_reading is not None:
        item.started_reading = update_data.started_reading
    if update_data.finished_reading is not None:
        item.finished_reading = update_data.finished_reading
    
    await db.commit()
    await db.refresh(item)
    
    return BookshelfItemResponse(
        id=item.id,
        user_id=item.user_id,
        item_type=item.item_type,
        document_id=item.document_id,
        document_title=None,
        document_author=None,
        isbn=item.isbn,
        title=item.title,
        author=item.author,
        cover_url=item.cover_url,
        publisher=item.publisher,
        publish_year=item.publish_year,
        page_count=item.page_count,
        description=item.description,
        genres=item.genres,
        status=item.status,
        rating=item.rating,
        review=item.review,
        notes=item.notes,
        is_favorite=item.is_favorite,
        review_public=item.review_public,
        started_reading=item.started_reading,
        finished_reading=item.finished_reading,
        added_at=item.added_at,
        created_at=item.created_at,
        updated_at=item.updated_at
    )


@router.delete("/{item_id}", status_code=204)
async def delete_bookshelf_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Remove an item from your bookshelf"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    result = await db.execute(
        select(BookshelfItem).where(
            BookshelfItem.id == item_id,
            BookshelfItem.user_id == user.id
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Bookshelf item not found")
    
    await db.delete(item)
    await db.commit()


# ============================================================================
# Public bookshelf (for user profiles)
# ============================================================================

@router.get("/public/{username}", response_model=List[BookshelfItemResponse])
async def get_public_bookshelf(
    username: str,
    status: Optional[str] = Query(None),
    favorites_only: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a user's public bookshelf (no authentication required)
    
    Only shows items with review_public=True
    """
    # Find user by username
    user_result = await db.execute(
        select(User).where(User.username == username)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = select(BookshelfItem).where(
        BookshelfItem.user_id == user.id,
        BookshelfItem.review_public == True
    )
    
    if status:
        query = query.where(BookshelfItem.status == status)
    
    if favorites_only:
        query = query.where(BookshelfItem.is_favorite == True)
    
    query = query.order_by(BookshelfItem.added_at.desc())
    
    result = await db.execute(query)
    items = result.scalars().all()
    
    return [
        BookshelfItemResponse(
            id=item.id,
            user_id=item.user_id,
            item_type=item.item_type,
            document_id=item.document_id,
            document_title=None,
            document_author=None,
            isbn=item.isbn,
            title=item.title,
            author=item.author,
            cover_url=item.cover_url,
            publisher=item.publisher,
            publish_year=item.publish_year,
            page_count=item.page_count,
            description=item.description,
            genres=item.genres,
            status=item.status,
            rating=item.rating,
            review=item.review,
            notes=None,  # Don't expose private notes
            is_favorite=item.is_favorite,
            review_public=item.review_public,
            started_reading=item.started_reading,
            finished_reading=item.finished_reading,
            added_at=item.added_at,
            created_at=item.created_at,
            updated_at=item.updated_at
        )
        for item in items
    ]


@router.post("/enhance-book-data", response_model=BookEnhanceResponse)
async def enhance_book_data(
    book_data: BookEnhanceRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Use AI (Claude) to fill in missing book information
    
    **Hybrid Approach:**
    - Automatically fills critical fields: ISBN, page count
    - Available for manual enhancement: description, genres
    
    **What gets enhanced:**
    - Missing ISBN (searches for ISBN-13)
    - Missing page count (exact number)
    - Incomplete description (rich, compelling summary)
    - Missing genres (accurate categorization)
    
    **Use cases:**
    - Google Books API returns incomplete data
    - Older books without standardized ISBNs
    - Books with minimal descriptions
    - Self-published or international editions
    """
    # Check if Anthropic API key is configured
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503, 
            detail="AI enhancement unavailable - API key not configured"
        )
    
    # Determine what fields need enhancement
    missing_fields = []
    if not book_data.isbn:
        missing_fields.append("ISBN-13")
    if not book_data.page_count:
        missing_fields.append("page count")
    if not book_data.description or len(book_data.description) < 100:
        missing_fields.append("description")
    if not book_data.genres or len(book_data.genres) == 0:
        missing_fields.append("genres")
    
    if not missing_fields:
        return BookEnhanceResponse(
            isbn=book_data.isbn,
            page_count=book_data.page_count,
            description=book_data.description,
            genres=book_data.genres,
            ai_enhanced=False,
            fields_enhanced=[]
        )
    
    # Build prompt for Claude
    prompt = f"""I need you to find accurate information for this book:

Title: {book_data.title}
Author: {book_data.author or 'Unknown'}
Publisher: {book_data.publisher or 'Unknown'}
Published: {book_data.publish_year or 'Unknown'}

Current data:
- ISBN: {book_data.isbn or 'MISSING'}
- Page Count: {book_data.page_count or 'MISSING'}
- Description: {book_data.description[:100] + '...' if book_data.description and len(book_data.description) > 100 else book_data.description or 'MISSING'}
- Genres: {', '.join(book_data.genres) if book_data.genres else 'MISSING'}

Please search for this book and provide the missing information. Return your response as valid JSON with this exact structure:
{{
  "isbn": "ISBN-13 number (13 digits with hyphens) or null if not found",
  "page_count": exact number of pages as integer or null if not found,
  "description": "A compelling 2-3 paragraph description (200-300 words)" or null if not found,
  "genres": ["genre1", "genre2", "genre3"] array of 2-5 accurate genre tags or empty array if not found
}}

Important:
- Only include data you're confident is accurate
- For ISBN, prefer ISBN-13 over ISBN-10
- For genres, use common book categories like: fiction, non-fiction, mystery, romance, sci-fi, fantasy, biography, history, etc.
- Return ONLY the JSON object, no other text"""
    
    try:
        # Call Claude API
        client = Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Parse Claude's response
        response_text = message.content[0].text.strip()
        
        # Extract JSON from response (Claude sometimes wraps it in markdown)
        if response_text.startswith("```"):
            # Remove markdown code blocks
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        enhanced_data = json.loads(response_text)
        
        # Determine which fields were enhanced
        fields_enhanced = []
        result_isbn = enhanced_data.get("isbn") or book_data.isbn
        result_page_count = enhanced_data.get("page_count") or book_data.page_count
        result_description = enhanced_data.get("description") or book_data.description
        result_genres = enhanced_data.get("genres") or book_data.genres
        
        if enhanced_data.get("isbn") and not book_data.isbn:
            fields_enhanced.append("ISBN")
        if enhanced_data.get("page_count") and not book_data.page_count:
            fields_enhanced.append("page_count")
        if enhanced_data.get("description") and (not book_data.description or len(book_data.description) < 100):
            fields_enhanced.append("description")
        if enhanced_data.get("genres") and (not book_data.genres or len(book_data.genres) == 0):
            fields_enhanced.append("genres")
        
        return BookEnhanceResponse(
            isbn=result_isbn,
            page_count=result_page_count,
            description=result_description,
            genres=result_genres,
            ai_enhanced=len(fields_enhanced) > 0,
            fields_enhanced=fields_enhanced
        )
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse AI response: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI enhancement failed: {str(e)}"
        )
