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
from app.core.database import get_db_engine
from app.models.base import Base


async def create_tables():
    """Create all database tables from models"""
    engine = get_db_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print('✅ Database schema created successfully')


if __name__ == '__main__':
    asyncio.run(create_tables())
