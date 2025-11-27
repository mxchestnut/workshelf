"""
Create missing user profiles for existing users
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os

from app.models.user import User, UserProfile


async def create_missing_profiles():
    """Create profiles for users who don't have one"""
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL environment variable not set")
        return
    
    # Create async engine
    engine = create_async_engine(database_url, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get all users
        result = await session.execute(select(User))
        users = result.scalars().all()
        
        print(f"Found {len(users)} users")
        
        created_count = 0
        for user in users:
            # Check if profile exists
            profile_result = await session.execute(
                select(UserProfile).where(UserProfile.user_id == user.id)
            )
            profile = profile_result.scalar_one_or_none()
            
            if not profile:
                print(f"Creating profile for user {user.id} ({user.email})")
                profile = UserProfile(
                    user_id=user.id,
                    timezone="UTC",
                    language="en",
                    theme="system"
                )
                session.add(profile)
                created_count += 1
        
        if created_count > 0:
            await session.commit()
            print(f"\n✅ Created {created_count} missing profiles")
        else:
            print("\n✅ All users already have profiles")
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_missing_profiles())
