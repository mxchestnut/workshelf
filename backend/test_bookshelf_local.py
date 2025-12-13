#!/usr/bin/env python3
"""
Test bookshelf endpoint locally to verify store_item_id field works
"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.bookshelf import BookshelfItem
from app.models import User

DATABASE_URL = "postgresql+asyncpg://workshelf:workshelf_password@localhost:5432/workshelf"

async def test_bookshelf():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session_maker = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session_maker() as session:
        # Get first user
        result = await session.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        
        if not user:
            print("❌ No users found")
            return
        
        print(f"✓ Found user: {user.email}")
        
        # Create a test bookshelf item
        item = BookshelfItem(
            user_id=user.id,
            item_type='book',
            title='Test Book',
            author='Test Author',
            status='want-to-read',
            is_favorite=False,
            review_public=True,
            store_item_id=None  # Test with NULL value
        )
        
        session.add(item)
        await session.commit()
        await session.refresh(item)
        
        print(f"✓ Created bookshelf item with ID: {item.id}")
        print(f"  - store_item_id: {item.store_item_id}")
        
        # Query it back
        result = await session.execute(
            select(BookshelfItem).where(BookshelfItem.id == item.id)
        )
        queried_item = result.scalar_one()
        
        print(f"✓ Queried item back:")
        print(f"  - ID: {queried_item.id}")
        print(f"  - Title: {queried_item.title}")
        print(f"  - store_item_id: {queried_item.store_item_id}")
        
        # Check if we can access the attribute
        try:
            _ = queried_item.store_item_id
            print("✓ store_item_id attribute is accessible")
        except AttributeError as e:
            print(f"❌ Error accessing store_item_id: {e}")
        
        # Clean up
        await session.delete(item)
        await session.commit()
        print("✓ Cleaned up test data")

if __name__ == "__main__":
    asyncio.run(test_bookshelf())
