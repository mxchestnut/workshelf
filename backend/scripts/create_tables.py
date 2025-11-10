"""
Create all database tables from SQLAlchemy models.

This script is run during container startup to ensure all tables exist
before running Alembic migrations.
"""
import asyncio
from app.core.database import Base, engine


async def create_tables():
    """Create all tables defined in SQLAlchemy models."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ All database tables created successfully")


if __name__ == "__main__":
    asyncio.run(create_tables())
