"""
Update Work Shelf group to have slug 'updates' and make it public
"""
import asyncio
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Add parent directory to path to import models
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.groups import Group

load_dotenv()

async def update_workshelf_group():
    """Update the Work Shelf group to have slug 'updates' and be public"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return
    
    # Create async engine
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Find the Work Shelf group (by name)
        result = await session.execute(
            select(Group).where(Group.name == "Work Shelf")
        )
        group = result.scalar_one_or_none()
        
        if not group:
            print("❌ Work Shelf group not found")
            return
        
        print(f"Found group: {group.name} (ID: {group.id})")
        print(f"  Current slug: {group.slug}")
        print(f"  Current privacy: {'Public' if group.is_public else 'Private'}")
        
        # Update slug to 'updates' and make public
        await session.execute(
            update(Group)
            .where(Group.id == group.id)
            .values(
                slug='updates',
                is_public=True
            )
        )
        
        await session.commit()
        
        print(f"\n✅ Updated Work Shelf group:")
        print(f"  New slug: updates")
        print(f"  New privacy: Public")
        print(f"\n🌐 Group now accessible at: /groups/updates")

if __name__ == '__main__':
    asyncio.run(update_workshelf_group())
