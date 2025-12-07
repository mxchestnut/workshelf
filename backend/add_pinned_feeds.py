import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

async def add_pinned_feeds():
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        return
        
    engine = create_async_engine(db_url)
    async_session_maker = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session_maker() as session:
        # Check if column exists
        result = await session.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='group_posts' AND column_name='pinned_feeds'
        """))
        exists = result.fetchone()
        
        if not exists:
            print("Adding pinned_feeds column...")
            # Add the column
            await session.execute(text("""
                ALTER TABLE group_posts 
                ADD COLUMN pinned_feeds VARCHAR(50)[] DEFAULT '{}'::VARCHAR(50)[] NOT NULL
            """))
            
            # Migrate existing pinned posts
            await session.execute(text("""
                UPDATE group_posts 
                SET pinned_feeds = ARRAY['group']::VARCHAR(50)[]
                WHERE is_pinned = true
            """))
            
            # Create GIN index
            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_group_posts_pinned_feeds 
                ON group_posts USING gin(pinned_feeds)
            """))
            
            await session.commit()
            print("✅ Successfully added pinned_feeds column, migrated data, and created index")
        else:
            print("⚠️  pinned_feeds column already exists")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(add_pinned_feeds())
