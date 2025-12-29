"""
Database connection and session management
"""
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker, AsyncEngine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from app.core.config import settings
from typing import Optional

# Detect if we're in test mode
IS_TEST = os.getenv("PYTEST_CURRENT_TEST") is not None

# Module-level engine cache - only used in production
_engine_cache: Optional[AsyncEngine] = None

def get_db_engine() -> AsyncEngine:
    """Get or create the database engine.
    
    In tests: Creates a new engine with NullPool for each call (no caching).
    In production: Returns cached engine with connection pooling.
    """
    global _engine_cache
    
    if IS_TEST:
        # In tests: create fresh engine each time to avoid event loop issues
        return create_async_engine(
            settings.DATABASE_URL_CLEAN,
            echo=False,
            poolclass=NullPool,
            connect_args={"ssl": "require"},  # asyncpg SSL mode
        )
    
    # In production: use cached engine with connection pooling
    if _engine_cache is None:
        _engine_cache = create_async_engine(
            settings.DATABASE_URL_CLEAN,
            echo=settings.DEBUG if hasattr(settings, 'DEBUG') else False,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            connect_args={"ssl": "require"},  # asyncpg SSL mode
        )
    return _engine_cache

# For backwards compatibility - but prefer using get_db_engine()
engine = get_db_engine()

# Storage database (user documents only - permanent storage)
STORAGE_DATABASE_URL = os.getenv(
    "STORAGE_DATABASE_URL",
    settings.DATABASE_URL_CLEAN  # Fallback to main DB if not set
)

_storage_engine_cache: Optional[AsyncEngine] = None

def get_storage_engine() -> AsyncEngine:
    """Get or create the storage database engine."""
    global _storage_engine_cache
    
    if IS_TEST:
        return create_async_engine(
            STORAGE_DATABASE_URL,
            echo=False,
            poolclass=NullPool,
        )
    
    if _storage_engine_cache is None:
        _storage_engine_cache = create_async_engine(
            STORAGE_DATABASE_URL,
            echo=settings.DEBUG if hasattr(settings, 'DEBUG') else False,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
    return _storage_engine_cache

# For backwards compatibility
storage_engine = get_storage_engine()

# Main database session factory - recreated on each access in tests
def get_async_session_local():
    """Get session factory for main database."""
    return async_sessionmaker(
        get_db_engine(),
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

# For backwards compatibility
AsyncSessionLocal = get_async_session_local()

# Storage database session factory
StorageSessionLocal = async_sessionmaker(
    storage_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


def get_db_engine():
    """
    Get the database engine (for tests and direct access)
    """
    return engine


async def get_db():
    """
    Dependency for getting async database session (main database)
    Usage in FastAPI:
        async def endpoint(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_storage_db():
    """
    Dependency for getting async database session (storage database for documents)
    Usage in FastAPI:
        async def endpoint(storage_db: AsyncSession = Depends(get_storage_db)):
            ...
    """
    async with StorageSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database - create all tables"""
    from app.models import Base
    
    async with engine.begin() as conn:
        # In production, use Alembic migrations instead
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Close database connections"""
    await engine.dispose()
