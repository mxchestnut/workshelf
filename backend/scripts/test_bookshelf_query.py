"""
Test bookshelf query to identify the issue
"""
import asyncio
from sqlalchemy import select, text
from sqlalchemy.orm import joinedload
from app.core.database import get_db
from app.models.bookshelf import BookshelfItem
from app.models.document import Document

async def test_bookshelf():
    """Test bookshelf query"""
    async for db in get_db():
        try:
            # First, check if user has bookshelf items
            count_result = await db.execute(
                text("SELECT COUNT(*) FROM bookshelf_items WHERE user_id = 2")
            )
            count = count_result.scalar()
            print(f"User 2 has {count} bookshelf items")
            
            if count == 0:
                print("User has no bookshelf items - that's why it might work!")
                return
            
            # Check if any items have documents
            doc_result = await db.execute(
                text("SELECT COUNT(*) FROM bookshelf_items WHERE user_id = 2 AND document_id IS NOT NULL")
            )
            doc_count = doc_result.scalar()
            print(f"{doc_count} items have documents attached")
            
            # Try the actual query
            print("\nAttempting the actual bookshelf query...")
            query = select(BookshelfItem).where(BookshelfItem.user_id == 2) \
                .options(joinedload(BookshelfItem.document).joinedload(Document.owner)) \
                .order_by(BookshelfItem.added_at.desc())
            
            result = await db.execute(query)
            items = result.scalars().unique().all()
            print(f"✓ Query succeeded! Found {len(items)} items")
            
        except Exception as e:
            print(f"✗ Query failed: {e}")
            import traceback
            traceback.print_exc()
        
        break

if __name__ == "__main__":
    asyncio.run(test_bookshelf())
