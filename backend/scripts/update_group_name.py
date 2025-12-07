"""Update Work Shelf group to Updates"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
import os

async def main():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        return
    
    engine = create_async_engine(database_url)
    async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session_maker() as db:
        # Update the Broomsticks Collective group to Updates
        result = await db.execute(
            text("UPDATE groups SET name = 'Updates', slug = 'updates', description = 'Official announcements and updates for Work Shelf platform.' WHERE slug = 'broomsticks-collective' RETURNING id, name, slug")
        )
        row = result.fetchone()
        if row:
            await db.commit()
            print(f'✅ Updated group: id={row[0]}, name={row[1]}, slug={row[2]}')
        else:
            print('❌ Group not found')
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
