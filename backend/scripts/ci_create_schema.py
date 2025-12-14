#!/usr/bin/env python3
"""
CI Script: Create database schema for testing
Creates all tables from SQLAlchemy models
"""
import asyncio
import subprocess
import sys
from pathlib import Path

from sqlalchemy import text

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import get_db_engine  # noqa: E402
from app.models.base import Base  # noqa: E402


async def create_tables():
    """Create all database tables from models and stamp with consolidated baseline"""
    engine = get_db_engine()

    # Create enum types that have create_type=False in models
    # These need to exist before creating tables that reference them
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
            DO $$ BEGIN
                CREATE TYPE privacylevel AS ENUM ('public', 'guarded', 'private', 'secret');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """
            )
        )
        # Create all tables from current models
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()

    # Stamp database with consolidated baseline, then run migrations
    print("🔄 Stamping with consolidated baseline and running migrations...")
    backend_dir_path = str(Path(__file__).parent.parent)

    # Stamp the database with the consolidated schema revision
    result = subprocess.run(
        ["alembic", "stamp", "consolidated_dec_2025"],
        capture_output=True,
        text=True,
        cwd=backend_dir_path,
    )
    if result.returncode != 0:
        print(f"⚠️  Alembic stamp warning: {result.stderr}")

    # Now run all migrations after the consolidated baseline
    result = subprocess.run(
        ["alembic", "upgrade", "head"],
        capture_output=True,
        text=True,
        cwd=backend_dir_path,
    )
    if result.returncode != 0:
        print(f"❌ Alembic upgrade failed: {result.stderr}")
        raise RuntimeError(f"Alembic migrations failed: {result.stderr}")

    print("✅ Database schema created successfully")


if __name__ == "__main__":
    asyncio.run(create_tables())
