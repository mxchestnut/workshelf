#!/usr/bin/env python3
"""
CI Script: Create database schema for testing
Creates all tables from SQLAlchemy models
"""
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

import asyncio
from sqlalchemy import text
from app.core.database import get_db_engine
from app.models.base import Base


async def create_tables():
    """Create all database tables from models and run migrations"""
    engine = get_db_engine()
    async with engine.begin() as conn:
        # Create enum types that have create_type=False
        await conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE privacylevel AS ENUM ('public', 'guarded', 'private', 'secret');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        # Create all tables (base schema)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    
    # Run Alembic migrations to bring schema up to date
    print('🔄 Running Alembic migrations...')
    import subprocess
    result = subprocess.run(['alembic', 'upgrade', 'head'], capture_output=True, text=True)
    if result.returncode != 0:
        print(f'⚠️  Alembic warning: {result.stderr}')
    
    print('✅ Database schema created successfully')


if __name__ == '__main__':
    asyncio.run(create_tables())
