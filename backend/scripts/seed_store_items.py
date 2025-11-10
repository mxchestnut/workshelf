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


async def seed_store_items():
    """Add sample ebooks and audiobooks to the store"""
    
    async with async_session_maker() as db:
        # Get the first user as the seller (you can change this to a specific staff user)
        result = await db.execute(select(User).limit(1))
        seller = result.scalar_one_or_none()
        
        if not seller:
            print("No users found. Please create a user first.")
            return
        
        print(f"Using seller: {seller.username}")
        
        # Check if we already have items
        result = await db.execute(select(StoreItem))
        existing = result.scalars().all()
        if existing:
            print(f"Found {len(existing)} existing items. Skipping seed.")
            return
        
        # Sample store items
        items = [
            {
                "title": "The Writing Life: A Journey Through Words",
                "author_name": "Sarah Mitchell",
                "description": "A comprehensive guide to developing your writing craft and building a sustainable writing career.",
                "long_description": "Drawing from 20 years of experience, Sarah Mitchell shares practical insights, exercises, and wisdom for writers at every stage. This book covers everything from finding your voice to navigating the publishing industry.",
                "genres": ["Non-Fiction", "Writing", "Self-Help"],
                "price_usd": Decimal("19.99"),
                "epub_blob_url": "https://example.com/epub/writing-life.epub",  # You'll replace with actual Azure URLs
                "cover_blob_url": "https://picsum.photos/seed/book1/400/600",
                "page_count": 324,
                "status": StoreItemStatus.ACTIVE,
                "has_audiobook": True,
                "audiobook_narrator": "Emma Thompson",
                "audiobook_duration_minutes": 480,
                "audiobook_file_url": "https://example.com/audio/writing-life.mp3",
                "audiobook_price_usd": Decimal("24.99"),
                "is_featured": True,
                "is_new_release": True,
            },
            {
                "title": "Quantum Echoes",
                "author_name": "Dr. Marcus Chen",
                "description": "A mind-bending sci-fi thriller about parallel universes and the choices that define us.",
                "long_description": "When physicist Elena discovers a way to communicate with alternate versions of herself, she must navigate a web of timelines to prevent a catastrophic collapse. A gripping exploration of identity, free will, and the nature of reality.",
                "genres": ["Science Fiction", "Thriller", "Mystery"],
                "price_usd": Decimal("14.99"),
                "epub_blob_url": "https://example.com/epub/quantum-echoes.epub",
                "cover_blob_url": "https://picsum.photos/seed/book2/400/600",
                "page_count": 412,
                "status": StoreItemStatus.ACTIVE,
                "has_audiobook": True,
                "audiobook_narrator": "Michael Chen",
                "audiobook_duration_minutes": 660,
                "audiobook_file_url": "https://example.com/audio/quantum-echoes.mp3",
                "audiobook_price_usd": Decimal("19.99"),
                "is_bestseller": True,
            },
            {
                "title": "The Midnight Garden",
                "author_name": "Isabella Rose",
                "description": "A haunting tale of love, loss, and the secrets hidden in an enchanted garden.",
                "long_description": "When Emma inherits her grandmother's estate, she discovers a magical garden that blooms only at midnight. As she uncovers family secrets and ancient magic, she must choose between the world she knows and a destiny she never imagined.",
                "genres": ["Fantasy", "Romance", "Literary Fiction"],
                "price_usd": Decimal("16.99"),
                "epub_blob_url": "https://example.com/epub/midnight-garden.epub",
                "cover_blob_url": "https://picsum.photos/seed/book3/400/600",
                "page_count": 368,
                "status": StoreItemStatus.ACTIVE,
                "has_audiobook": False,
                "is_featured": True,
            },
            {
                "title": "Code Warriors: Building the Digital Future",
                "author_name": "Alex Rivera",
                "description": "Inside stories from Silicon Valley's most innovative engineers and entrepreneurs.",
                "long_description": "A collection of interviews and case studies revealing how breakthrough technologies are created. From AI to blockchain, learn from the pioneers shaping our digital future.",
                "genres": ["Technology", "Business", "Biography"],
                "price_usd": Decimal("22.99"),
                "epub_blob_url": "https://example.com/epub/code-warriors.epub",
                "cover_blob_url": "https://picsum.photos/seed/book4/400/600",
                "page_count": 456,
                "status": StoreItemStatus.ACTIVE,
                "has_audiobook": True,
                "audiobook_narrator": "James Patterson",
                "audiobook_duration_minutes": 540,
                "audiobook_file_url": "https://example.com/audio/code-warriors.mp3",
                "audiobook_price_usd": Decimal("27.99"),
            },
            {
                "title": "Whispers in the Wind",
                "author_name": "Maya Patel",
                "description": "An emotional journey through love, identity, and finding home in unexpected places.",
                "long_description": "When Priya returns to her ancestral village in India, she uncovers stories of resilience, love, and sacrifice that span three generations. A beautifully crafted tale about the ties that bind us and the courage to forge our own path.",
                "genres": ["Literary Fiction", "Cultural", "Family Saga"],
                "price_usd": Decimal("18.99"),
                "epub_blob_url": "https://example.com/epub/whispers-wind.epub",
                "cover_blob_url": "https://picsum.photos/seed/book5/400/600",
                "page_count": 392,
                "status": StoreItemStatus.ACTIVE,
                "has_audiobook": True,
                "audiobook_narrator": "Priya Sharma",
                "audiobook_duration_minutes": 600,
                "audiobook_file_url": "https://example.com/audio/whispers-wind.mp3",
                "audiobook_price_usd": Decimal("23.99"),
                "is_new_release": True,
            },
            {
                "title": "The Detective's Notebook",
                "author_name": "James Blackwood",
                "description": "A gripping murder mystery set in Victorian London.",
                "long_description": "Inspector William Cross must solve a series of murders that mirror famous literary crimes. As the body count rises, he realizes the killer is leaving clues from classic detective novels. A love letter to the golden age of mystery fiction.",
                "genres": ["Mystery", "Historical Fiction", "Thriller"],
                "price_usd": Decimal("15.99"),
                "epub_blob_url": "https://example.com/epub/detective-notebook.epub",
                "cover_blob_url": "https://picsum.photos/seed/book6/400/600",
                "page_count": 344,
                "status": StoreItemStatus.ACTIVE,
                "has_audiobook": False,
                "is_bestseller": True,
            },
        ]
        
        # Create items
        for item_data in items:
            store_item = StoreItem(
                seller_id=seller.id,
                published_at=datetime.utcnow(),
                **item_data
            )
            db.add(store_item)
        
        await db.commit()
        print(f"✅ Successfully seeded {len(items)} store items!")
        print("\nCreated items:")
        for item in items:
            format_str = "Ebook + Audiobook" if item.get('has_audiobook') else "Ebook only"
            print(f"  - {item['title']} by {item['author_name']} (${item['price_usd']}) - {format_str}")


if __name__ == "__main__":
    asyncio.run(seed_store_items())
