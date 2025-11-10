#!/usr/bin/env python3
"""
Seed the store with TOP 100 PUBLIC DOMAIN classics (ebook-only, self-funding model).

This script creates legal-to-sell public domain ebooks from Project Gutenberg
(pre-1928 works, public domain worldwide). Covers all major genres for variety:
- Romance & Literary Fiction (20 books)
- Mystery & Detective (15 books)  
- Science Fiction & Fantasy (15 books)
- Horror & Gothic (10 books)
- Adventure & Action (10 books)
- Philosophy & Non-Fiction (10 books)
- War & Historical Fiction (10 books)
- American Classics (10 books)

SELF-FUNDING AUDIOBOOK MODEL:
1. Launch Phase: Sell ebooks at $2.99 (competitive, zero production cost)
2. Revenue Tracking: Each book tracks total ebook revenue
3. Threshold Alert: When revenue hits $120 (40 sales), staff gets notified
4. Upgrade Phase: Staff approves → ElevenLabs generates premium audiobook
5. Bundle Phase: Book becomes immersive bundle at $11.99
6. Reward Phase: Original 40 buyers get free audiobook upgrade (customer goodwill)

ElevenLabs Cost: $120/book (Professional Voice Cloning)
Break-even: 40 ebook sales at $2.99 = $119.60 revenue
Post-upgrade profit: $11.99 bundle (pure profit after cost recovery)

As users search for specific titles not in the catalog, replace lower-performing
classics with requested titles to keep the store fresh and demand-driven.

Run this script to populate the store with curated classics.
"""

import asyncio
from decimal import Decimal
from sqlalchemy import select
from app.core.database import async_session_maker
from app.models.store import StoreItem, StoreItemStatus
from app.models.user import User
from scripts.top_100_classics import TOP_100_CLASSICS


async def seed_store_items():
    """Create top 100 public domain classics."""
    async with async_session_maker() as session:
        # Get the first user to be the seller
        result = await session.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        
        if not user:
            print("No users found. Create a user first.")
            return
        
        print(f"Creating {len(TOP_100_CLASSICS)} public domain store items for user: {user.email}")
        
        # Process each classic from the curated list
        for idx, classic in enumerate(TOP_100_CLASSICS, 1):
            # Calculate word count-based page count (250 words per page average)
            page_count = classic["word_count"] // 250
            
            # Build Gutenberg URLs
            gutenberg_id = classic["gutenberg_id"]
            epub_url = f"https://www.gutenberg.org/ebooks/{gutenberg_id}.epub.images"
            cover_url = f"https://www.gutenberg.org/cache/epub/{gutenberg_id}/pg{gutenberg_id}.cover.medium.jpg"
            
            item = StoreItem(
                seller_id=user.id,
                title=classic["title"],
                author_name=classic["author_name"],
                description=classic.get("description", ""),
                price_usd=Decimal("2.99"),
                epub_blob_url=epub_url,
                cover_image_url=cover_url,
                word_count=classic["word_count"],
                page_count=page_count,
                language="en",
                status=StoreItemStatus.ACTIVE,
                is_featured=classic.get("is_featured", False),
                is_bestseller=classic.get("is_bestseller", False),
                is_new_release=classic.get("is_new_release", False),
                tags=classic.get("tags", []),
                has_audiobook=False,  # Start ebook-only, upgrade when revenue hits $120
            )
            
            session.add(item)
            
            if idx % 10 == 0:
                print(f"  Added {idx}/{len(TOP_100_CLASSICS)} classics...")
        
        await session.commit()
        print(f"✅ Successfully created {len(TOP_100_CLASSICS)} store items!")
        print("\nTop sellers by genre:")
        print("  📚 Romance: Pride & Prejudice, Jane Eyre, Wuthering Heights")
        print("  🔍 Mystery: Sherlock Holmes, Hound of Baskervilles, Moonstone")
        print("  🚀 Sci-Fi: Frankenstein, Time Machine, War of the Worlds")
        print("  🧛 Horror: Dracula, Jekyll & Hyde, Dorian Gray")
        print("  ⚔️  Adventure: Treasure Island, Count of Monte Cristo, Three Musketeers")
        print("  🎓 Philosophy: Meditations, Republic, Prince")
        print("  🗡️  Epic: Iliad, Odyssey, War and Peace")
        print("  🇺🇸 American: Moby-Dick, Great Gatsby, Huckleberry Finn")
        print("\nAll books priced at $2.99 ebook-only.")
        print("Immersive audiobooks unlock automatically when revenue hits $120 (40 sales).")
        print("\nReplace low performers with requested titles as users search the store!")


if __name__ == "__main__":
    asyncio.run(seed_store_items())
