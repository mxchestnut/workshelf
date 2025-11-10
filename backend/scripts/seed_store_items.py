"""
Seed sample store items (ebooks and audiobooks)
"""
import asyncio
from sqlalchemy import select
from app.core.database import async_session_maker
from app.models.store import StoreItem, StoreItemStatus
from app.models.user import User
from datetime import datetime
from decimal import Decimal


#!/usr/bin/env python3
"""
Seed the store with PUBLIC DOMAIN classics (ebook-only, self-funding model).

This script creates legal-to-sell public domain ebooks from Project Gutenberg
(pre-1928 works, public domain worldwide).

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

Run this script to populate the store with curated classics.
"""

import asyncio
from decimal import Decimal
from sqlalchemy import select
from app.core.database import async_session_maker
from app.models.store import StoreItem, StoreItemStatus
from app.models.user import User


async def seed_store_items():
    """Create public domain store items with AI audiobooks."""
    async with async_session_maker() as session:
        # Get the first user to be the seller
        result = await session.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        
        if not user:
            print("No users found. Create a user first.")
            return
        
        print(f"Creating public domain store items for user: {user.email}")
        
        # PUBLIC DOMAIN classics from Project Gutenberg
        # All books pre-1928, legal to sell worldwide
        # EBOOK ONLY - audiobooks generated when revenue hits $120 threshold
        items = [
            {
                "title": "Pride and Prejudice",
                "author_name": "Jane Austen",
                "description": "The timeless romance that defined a genre. Follow Elizabeth Bennet as she navigates society, family, and her complicated feelings for the enigmatic Mr. Darcy. Austen's wit and social commentary remain as relevant today as in 1813.\n\n📚 Ebook available now at $2.99\n🎧 Immersive audiobook coming soon! Help us reach 40 sales to unlock premium ElevenLabs narration.",
                "price_usd": Decimal("2.99"),
                "epub_blob_url": "https://www.gutenberg.org/ebooks/1342.epub.images",
                "cover_image_url": "https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg",
                "word_count": 122000,
                "page_count": 432,
                "language": "en",
                "status": StoreItemStatus.ACTIVE,
                "is_featured": True,
                "is_bestseller": True,
                "tags": ["romance", "classic", "literary-fiction", "public-domain"],
                "has_audiobook": False,
            },
            {
                "title": "The Adventures of Sherlock Holmes",
                "author_name": "Arthur Conan Doyle",
                "description": "Enter the world of literature's greatest detective! This collection features 12 iconic mysteries including 'A Scandal in Bohemia' and 'The Red-Headed League'. Experience Holmes' brilliant deductions and Watson's loyal companionship. Perfect for mystery lovers.\n\n📚 Ebook available now at $2.99\n🎧 Immersive audiobook coming soon! Help us reach 40 sales to unlock premium ElevenLabs narration with dramatic character voices.",
                "price_usd": Decimal("2.99"),
                "epub_blob_url": "https://www.gutenberg.org/ebooks/1661.epub.images",
                "cover_image_url": "https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg",
                "word_count": 105000,
                "page_count": 307,
                "language": "en",
                "status": StoreItemStatus.ACTIVE,
                "is_featured": True,
                "is_bestseller": True,
                "tags": ["mystery", "detective", "classic", "public-domain"],
                "has_audiobook": False,
            },
            {
                "title": "Frankenstein; Or, The Modern Prometheus",
                "author_name": "Mary Shelley",
                "description": "The original science fiction masterpiece! Dr. Victor Frankenstein's quest to create life leads to tragedy and moral reckoning. Shelley's 1818 Gothic novel explores ambition, responsibility, and what it means to be human. More relevant than ever in the age of AI.\n\n📚 Ebook available now at $2.99\n🎧 Immersive audiobook coming soon! Help us reach 40 sales to unlock premium ElevenLabs haunting narration.",
                "price_usd": Decimal("2.99"),
                "epub_blob_url": "https://www.gutenberg.org/ebooks/84.epub.images",
                "cover_image_url": "https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg",
                "word_count": 75000,
                "page_count": 280,
                "language": "en",
                "status": StoreItemStatus.ACTIVE,
                "is_new_release": True,
                "tags": ["science-fiction", "horror", "classic", "public-domain"],
                "has_audiobook": False,
            },
            {
                "title": "Alice's Adventures in Wonderland",
                "author_name": "Lewis Carroll",
                "description": "Tumble down the rabbit hole into a world of logic-defying madness! Lewis Carroll's 1865 masterpiece delights readers of all ages with talking animals, riddles, and unforgettable characters like the Cheshire Cat and Mad Hatter.\n\n📚 Ebook available now at $2.99\n🎧 Immersive audiobook coming soon! Help us reach 40 sales to unlock premium ElevenLabs narration with distinct character voices.",
                "price_usd": Decimal("2.99"),
                "epub_blob_url": "https://www.gutenberg.org/ebooks/11.epub.images",
                "cover_image_url": "https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg",
                "word_count": 26500,
                "page_count": 96,
                "language": "en",
                "status": StoreItemStatus.ACTIVE,
                "is_new_release": True,
                "tags": ["fantasy", "children", "classic", "public-domain"],
                "has_audiobook": False,
            },
            {
                "title": "The Picture of Dorian Gray",
                "author_name": "Oscar Wilde",
                "description": "Oscar Wilde's only novel is a Gothic masterpiece of vanity, corruption, and eternal youth. When Dorian Gray wishes his portrait would age instead of him, his wish comes true with devastating consequences. Wilde's wit and social satire shine throughout.\n\n📚 Ebook available now at $2.99\n🎧 Immersive audiobook coming soon! Help us reach 40 sales to unlock premium ElevenLabs narration capturing the dark elegance.",
                "price_usd": Decimal("2.99"),
                "epub_blob_url": "https://www.gutenberg.org/ebooks/174.epub.images",
                "cover_image_url": "https://www.gutenberg.org/cache/epub/174/pg174.cover.medium.jpg",
                "word_count": 78000,
                "page_count": 254,
                "language": "en",
                "status": StoreItemStatus.ACTIVE,
                "is_featured": True,
                "tags": ["classic", "gothic", "philosophy", "public-domain"],
                "has_audiobook": False,
            },
            {
                "title": "Dracula",
                "author_name": "Bram Stoker",
                "description": "The vampire novel that started it all! Bram Stoker's 1897 epistolary masterpiece tells the tale of Count Dracula's attempt to move from Transylvania to England. Told through journal entries, letters, and newspaper clippings, this Gothic horror classic still thrills.\n\n📚 Ebook available now at $2.99\n🎧 Immersive audiobook coming soon! Help us reach 40 sales to unlock premium ElevenLabs narration with atmospheric sound design.",
                "price_usd": Decimal("2.99"),
                "epub_blob_url": "https://www.gutenberg.org/ebooks/345.epub.images",
                "cover_image_url": "https://www.gutenberg.org/cache/epub/345/pg345.cover.medium.jpg",
                "word_count": 164000,
                "page_count": 418,
                "language": "en",
                "status": StoreItemStatus.ACTIVE,
                "is_bestseller": True,
                "tags": ["horror", "gothic", "classic", "public-domain"],
                "has_audiobook": False,
            },
        ]


if __name__ == "__main__":
    asyncio.run(seed_store_items())
