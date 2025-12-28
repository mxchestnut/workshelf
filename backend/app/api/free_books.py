"""
Free Books API - Integration with legal free ebook sources
Includes Project Gutenberg, Standard Ebooks, and Open Library
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import httpx
from app.core.database import get_db
from app.core.azure_auth import get_current_user_id
from app.models.user import User
from app.models.vault import Article

router = APIRouter(prefix="/free-books", tags=["free-books"])

# API Endpoints
GUTENDEX_API = "https://gutendex.com/books"
STANDARD_EBOOKS_API = "https://standardebooks.org/ebooks"


@router.get("/search")
async def search_free_books(
    query: str = Query(..., min_length=1),
    source: str = Query("all", regex="^(all|gutenberg|standard-ebooks)$"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    Search free legal ebooks from Project Gutenberg and Standard Ebooks
    
    Args:
        query: Search term (title, author, subject)
        source: Filter by source (all, gutenberg, standard-ebooks)
        limit: Maximum results to return
    
    Returns:
        List of free books with download links
    """
    results = []
    
    # Search Project Gutenberg via Gutendex API
    if source in ["all", "gutenberg"]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    GUTENDEX_API,
                    params={
                        "search": query,
                        "languages": "en",
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    books = data.get("results", [])[:limit]
                    
                    for book in books:
                        # Extract EPUB URL
                        epub_url = None
                        formats = book.get("formats", {})
                        
                        # Prefer EPUB with images, fallback to no-images
                        if "application/epub+zip" in formats:
                            epub_url = formats["application/epub+zip"]
                        
                        # Get cover image
                        cover_url = formats.get("image/jpeg")
                        
                        # Extract authors
                        authors = book.get("authors", [])
                        author_name = authors[0].get("name") if authors else "Unknown Author"
                        
                        # Extract subjects/genres
                        subjects = book.get("subjects", [])
                        genres = [s for s in subjects if not s.startswith("Browsing:")][:5]
                        
                        results.append({
                            "id": f"gutenberg-{book['id']}",
                            "title": book.get("title"),
                            "author": author_name,
                            "description": None,  # Gutenberg doesn't provide descriptions
                            "cover_url": cover_url,
                            "epub_url": epub_url,
                            "source": "Project Gutenberg",
                            "source_id": str(book['id']),
                            "is_free": True,
                            "license": "Public Domain",
                            "download_count": book.get("download_count", 0),
                            "genres": genres,
                            "publish_year": None,  # Would need to parse from copyright info
                            "language": book.get("languages", ["en"])[0]
                        })
        except Exception as e:
            print(f"Error fetching from Gutenberg: {e}")
    
    # Search Standard Ebooks (scraping their catalog)
    if source in ["all", "standard-ebooks"]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Standard Ebooks doesn't have a public API, but has an OPDS feed
                # For now, we'll note that this would need web scraping or OPDS parsing
                # TODO: Implement Standard Ebooks integration via OPDS feed
                pass
        except Exception as e:
            print(f"Error fetching from Standard Ebooks: {e}")
    
    # Sort by download count (popularity) for Gutenberg books
    results.sort(key=lambda x: x.get("download_count", 0), reverse=True)
    
    return {
        "query": query,
        "total_results": len(results),
        "source": source,
        "results": results[:limit]
    }


@router.get("/popular")
async def get_popular_free_books(
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    Get most popular free books from Project Gutenberg
    
    Returns books sorted by download count (most popular first)
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                GUTENDEX_API,
                params={
                    "languages": "en",
                    "topic": "fiction"  # Focus on fiction for broader appeal
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                books = data.get("results", [])
                
                # Sort by download count
                books.sort(key=lambda x: x.get("download_count", 0), reverse=True)
                
                results = []
                for book in books[:limit]:
                    epub_url = None
                    formats = book.get("formats", {})
                    
                    if "application/epub+zip" in formats:
                        epub_url = formats["application/epub+zip"]
                    
                    cover_url = formats.get("image/jpeg")
                    authors = book.get("authors", [])
                    author_name = authors[0].get("name") if authors else "Unknown Author"
                    subjects = book.get("subjects", [])
                    genres = [s for s in subjects if not s.startswith("Browsing:")][:5]
                    
                    results.append({
                        "id": f"gutenberg-{book['id']}",
                        "title": book.get("title"),
                        "author": author_name,
                        "cover_url": cover_url,
                        "epub_url": epub_url,
                        "source": "Project Gutenberg",
                        "source_id": str(book['id']),
                        "is_free": True,
                        "license": "Public Domain",
                        "download_count": book.get("download_count", 0),
                        "genres": genres,
                        "language": book.get("languages", ["en"])[0]
                    })
                
                return {
                    "total_results": len(results),
                    "results": results
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch popular books: {str(e)}")


@router.post("/add-to-shelf/{book_id}")
async def add_free_book_to_shelf(
    book_id: str,
    status: str = Query("want-to-read", regex="^(reading|read|want-to-read)$"),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    Add a free book from Gutenberg/Standard Ebooks to user's bookshelf
    
    Args:
        book_id: Format: "gutenberg-123" or "standard-456"
        status: Reading status for the book
    
    Returns:
        Created bookshelf item
    """
    # Parse book_id
    source, source_book_id = book_id.split("-", 1)
    
    if source == "gutenberg":
        # Fetch book details from Gutenberg
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{GUTENDEX_API}/{source_book_id}")
                
                if response.status_code != 200:
                    raise HTTPException(status_code=404, detail="Book not found")
                
                book = response.json()
                
                # Extract details
                formats = book.get("formats", {})
                epub_url = formats.get("application/epub+zip")
                cover_url = formats.get("image/jpeg")
                authors = book.get("authors", [])
                author_name = authors[0].get("name") if authors else "Unknown Author"
                subjects = book.get("subjects", [])
                genres = [s for s in subjects if not s.startswith("Browsing:")][:5]
                
                # Check if already in bookshelf
                existing = await db.execute(
                    select(BookshelfItem).where(
                        BookshelfItem.user_id == user_id,
                        BookshelfItem.title == book.get("title"),
                        BookshelfItem.author == author_name
                    )
                )
                if existing.scalar_one_or_none():
                    raise HTTPException(status_code=400, detail="Book already in your bookshelf")
                
                # Create bookshelf item
                bookshelf_item = BookshelfItem(
                    user_id=user_id,
                    item_type="book",
                    title=book.get("title"),
                    author=author_name,
                    cover_url=cover_url,
                    epub_url=epub_url,
                    description=f"A free public domain book from Project Gutenberg. Downloads: {book.get('download_count', 0):,}",
                    genres=genres,
                    status=status,
                    is_favorite=False
                )
                
                db.add(bookshelf_item)
                await db.commit()
                await db.refresh(bookshelf_item)
                
                return bookshelf_item
                
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch book details: {str(e)}")
    
    elif source == "standard":
        # TODO: Implement Standard Ebooks integration
        raise HTTPException(status_code=501, detail="Standard Ebooks integration coming soon")
    
    else:
        raise HTTPException(status_code=400, detail="Invalid book source")


@router.get("/categories")
async def get_free_book_categories():
    """
    Get popular categories/subjects for browsing free books
    """
    return {
        "categories": [
            {"id": "fiction", "name": "Fiction", "count": "~15,000"},
            {"id": "history", "name": "History", "count": "~5,000"},
            {"id": "philosophy", "name": "Philosophy", "count": "~3,000"},
            {"id": "science", "name": "Science", "count": "~2,500"},
            {"id": "adventure", "name": "Adventure", "count": "~2,000"},
            {"id": "romance", "name": "Romance", "count": "~1,500"},
            {"id": "poetry", "name": "Poetry", "count": "~1,200"},
            {"id": "drama", "name": "Drama", "count": "~1,000"},
            {"id": "children", "name": "Children's Literature", "count": "~800"},
            {"id": "mystery", "name": "Mystery", "count": "~700"},
        ]
    }


@router.get("/browse/{category}")
async def browse_free_books_by_category(
    category: str,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """
    Browse free books by category/subject
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                GUTENDEX_API,
                params={
                    "topic": category,
                    "languages": "en"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                books = data.get("results", [])[:limit]
                
                results = []
                for book in books:
                    formats = book.get("formats", {})
                    epub_url = formats.get("application/epub+zip")
                    cover_url = formats.get("image/jpeg")
                    authors = book.get("authors", [])
                    author_name = authors[0].get("name") if authors else "Unknown Author"
                    subjects = book.get("subjects", [])
                    genres = [s for s in subjects if not s.startswith("Browsing:")][:5]
                    
                    results.append({
                        "id": f"gutenberg-{book['id']}",
                        "title": book.get("title"),
                        "author": author_name,
                        "cover_url": cover_url,
                        "epub_url": epub_url,
                        "source": "Project Gutenberg",
                        "is_free": True,
                        "genres": genres,
                        "download_count": book.get("download_count", 0)
                    })
                
                return {
                    "category": category,
                    "total_results": len(results),
                    "results": results
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to browse category: {str(e)}")
