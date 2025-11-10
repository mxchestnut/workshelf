#!/usr/bin/env python3
"""
Direct SQL seed of 10 top classics
Bypasses FastAPI to populate database directly
"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from decimal import Decimal

# Import models
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.models.user import User
from app.models.store import StoreItem, StoreItemStatus

# Top 10 most popular public domain classics
TOP_10_CLASSICS = [
    ("Pride and Prejudice", "Jane Austen", 1342, 122000, "A witty tale of love, marriage, and social class in Regency England.", ["romance", "classic", "literary-fiction", "public-domain"], True, True),
    ("Frankenstein", "Mary Shelley", 84, 75000, "The original science fiction horror novel about creation and responsibility.", ["horror", "sci-fi", "classic", "public-domain"], True, False),
    ("Dracula", "Bram Stoker", 345, 164000, "The definitive vampire novel that shaped horror literature forever.", ["horror", "gothic", "classic", "public-domain"], True, False),
    ("The Adventures of Sherlock Holmes", "Arthur Conan Doyle", 1661, 110000, "Twelve brilliant detective stories featuring the legendary Sherlock Holmes.", ["mystery", "detective", "classic", "public-domain"], True, True),
    ("A Tale of Two Cities", "Charles Dickens", 98, 135000, "Set during the French Revolution, a story of sacrifice, resurrection, and love.", ["historical-fiction", "classic", "public-domain"], True, False),
    ("The Picture of Dorian Gray", "Oscar Wilde", 174, 78000, "A philosophical novel about beauty, morality, and the consequences of hedonism.", ["classic", "philosophical-fiction", "public-domain"], True, False),
    ("Alice's Adventures in Wonderland", "Lewis Carroll", 11, 27000, "A whimsical journey through a fantastical underground world.", ["fantasy", "classic", "children", "public-domain"], True, True),
    ("The Great Gatsby", "F. Scott Fitzgerald", 64317, 48000, "The quintessential American novel of jazz age excess and tragedy.", ["american-literature", "classic", "public-domain"], True, True),
    ("Wuthering Heights", "Emily Brontë", 768, 107000, "A dark, passionate tale of love and revenge on the Yorkshire moors.", ["romance", "gothic", "classic", "public-domain"], True, False),
    ("Jane Eyre", "Charlotte Brontë", 1260, 189000, "An orphan girl becomes a governess and finds independence, love, and mystery.", ["romance", "classic", "gothic", "public-domain"], True, True),
]

async def seed_database():
    """Seed database with 10 classics"""
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return
    
    # Create async engine
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get first user as seller
        result = await session.execute(select(User).limit(1))
        seller = result.scalar_one_or_none()
        
        if not seller:
            print("❌ No users found in database. Create a user first.")
            return
        
        print(f"📚 Using seller: {seller.email}")
        print()
        
        # Check existing count
        existing = await session.execute(select(StoreItem))
        existing_count = len(existing.scalars().all())
        
        if existing_count > 0:
            print(f"⚠️  Store already has {existing_count} items")
            response = input("Continue and add more? (y/n): ")
            if response.lower() != 'y':
                return
        
        # Create items
        created = 0
        for title, author, gid, wc, desc, tags, featured, bestseller in TOP_10_CLASSICS:
            page_count = wc // 250
            epub_url = f"https://www.gutenberg.org/ebooks/{gid}.epub.images"
            cover_url = f"https://www.gutenberg.org/cache/epub/{gid}/pg{gid}.cover.medium.jpg"
            
            item = StoreItem(
                seller_id=seller.id,
                title=title,
                author_name=author,
                description=desc,
                price_usd=Decimal("2.99"),
                epub_blob_url=epub_url,
                cover_image_url=cover_url,
                word_count=wc,
                page_count=page_count,
                language="en",
                status=StoreItemStatus.ACTIVE,
                is_featured=featured,
                is_bestseller=bestseller,
                is_new_release=False,
                tags=tags,
                has_audiobook=False,
            )
            
            session.add(item)
            created += 1
            print(f"✅ {title} by {author}")
        
        await session.commit()
        print()
        print("=" * 70)
        print(f"🎉 Successfully seeded {created} classics at $2.99 each!")
        print("=" * 70)

if __name__ == "__main__":
    asyncio.run(seed_database())
