"""
Fetch book covers from Google Books API for store items without covers.

This script:
1. Finds all store items with missing cover_blob_url
2. Searches Google Books API using title + author
3. Downloads cover images and updates the database

Usage:
    python scripts/fetch_book_covers.py [--limit N] [--dry-run]
"""

import asyncio
import sys
import os
from pathlib import Path
from typing import Optional, Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import aiohttp
import argparse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.store import StoreItem


GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes"


async def search_google_books(title: str, author: str, session: aiohttp.ClientSession) -> Optional[Dict[str, Any]]:
    """Search Google Books API for a book and return cover image URL."""
    # Build search query
    query = f'intitle:"{title}"'
    if author:
        query += f' inauthor:"{author}"'
    
    params = {
        'q': query,
        'maxResults': 1,
        'printType': 'books'
    }
    
    try:
        async with session.get(GOOGLE_BOOKS_API, params=params) as response:
            if response.status != 200:
                print(f"  ⚠️  API returned status {response.status}")
                return None
            
            data = await response.json()
            
            if not data.get('items'):
                print(f"  ⚠️  No results found")
                return None
            
            volume_info = data['items'][0].get('volumeInfo', {})
            image_links = volume_info.get('imageLinks', {})
            
            # Prefer larger images
            cover_url = (
                image_links.get('large') or
                image_links.get('medium') or
                image_links.get('thumbnail') or
                image_links.get('smallThumbnail')
            )
            
            if cover_url:
                # Force HTTPS
                cover_url = cover_url.replace('http://', 'https://')
                # Try to get higher resolution by removing zoom parameter
                cover_url = cover_url.replace('&zoom=1', '')
                return {
                    'cover_url': cover_url,
                    'google_books_id': data['items'][0].get('id'),
                    'title': volume_info.get('title'),
                    'authors': volume_info.get('authors', [])
                }
            
            print(f"  ⚠️  No cover image available")
            return None
            
    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return None


async def update_store_item_cover(
    db: AsyncSession,
    item: StoreItem,
    cover_url: str,
    dry_run: bool = False
) -> bool:
    """Update store item with cover URL."""
    if dry_run:
        print(f"  [DRY RUN] Would update cover_blob_url to: {cover_url}")
        return True
    
    try:
        item.cover_blob_url = cover_url
        await db.commit()
        print(f"  ✅ Updated cover URL")
        return True
    except Exception as e:
        print(f"  ❌ Database error: {str(e)}")
        await db.rollback()
        return False


async def fetch_covers_for_store_items(limit: int = None, dry_run: bool = False, overwrite: bool = False):
    """Main function to fetch and update covers."""
    print("🔍 Fetching book covers from Google Books API")
    print("=" * 60)
    
    if dry_run:
        print("⚠️  DRY RUN MODE - No changes will be made to the database\n")
    
    # Get store items without covers (or all if overwrite=True)
    async with AsyncSessionLocal() as db:
        if overwrite:
            query = select(StoreItem)
            print("🔄 OVERWRITE MODE - Will update all books\n")
        else:
            query = select(StoreItem).where(
                (StoreItem.cover_blob_url == None) | (StoreItem.cover_blob_url == "")
            )
        
        if limit:
            query = query.limit(limit)
        
        result = await db.execute(query)
        items = result.scalars().all()
        
        if not items:
            print("✅ All store items already have covers!")
            return
        
        if overwrite:
            print(f"📚 Processing {len(items)} store items (overwrite mode)\n")
        else:
            print(f"📚 Found {len(items)} store items without covers\n")
        
        # Create aiohttp session for API calls
        async with aiohttp.ClientSession() as session:
            success_count = 0
            failed_count = 0
            
            for i, item in enumerate(items, 1):
                print(f"[{i}/{len(items)}] Processing: {item.title}")
                print(f"  Author: {item.author_name}")
                
                # Search Google Books
                result = await search_google_books(item.title, item.author_name, session)
                
                if result:
                    print(f"  📖 Found: {result['title']}")
                    print(f"     by {', '.join(result['authors'])}")
                    print(f"  🖼️  Cover: {result['cover_url'][:80]}...")
                    
                    # Update database
                    if await update_store_item_cover(db, item, result['cover_url'], dry_run):
                        success_count += 1
                    else:
                        failed_count += 1
                else:
                    failed_count += 1
                
                print()  # Blank line between items
                
                # Rate limiting - be nice to Google's API
                await asyncio.sleep(0.5)
        
        print("=" * 60)
        print("📊 Summary:")
        print(f"  ✅ Successfully updated: {success_count}")
        print(f"  ❌ Failed/Not found: {failed_count}")
        print(f"  📚 Total processed: {len(items)}")


def main():
    """Parse arguments and run the script."""
    parser = argparse.ArgumentParser(
        description="Fetch book covers from Google Books API for store items"
    )
    parser.add_argument(
        '--limit',
        type=int,
        help='Limit number of items to process (for testing)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be updated without making changes'
    )
    parser.add_argument(
        '--overwrite',
        action='store_true',
        help='Update covers for all books, even if they already have cover URLs'
    )
    
    args = parser.parse_args()
    
    # Run async function
    asyncio.run(fetch_covers_for_store_items(
        limit=args.limit,
        dry_run=args.dry_run,
        overwrite=args.overwrite
    ))


if __name__ == "__main__":
    main()
