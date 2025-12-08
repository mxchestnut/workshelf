"""
Database connection and session management
"""
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Main database (groups, posts, users, etc.)
engine = create_async_engine(
    settings.DATABASE_URL_CLEAN,
    echo=settings.DEBUG if hasattr(settings, 'DEBUG') else False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

# Storage database (user documents only - permanent storage)
STORAGE_DATABASE_URL = os.getenv(
    "STORAGE_DATABASE_URL",
    settings.DATABASE_URL_CLEAN  # Fallback to main DB if not set
)
storage_engine = create_async_engine(
    STORAGE_DATABASE_URL,
    echo=settings.DEBUG if hasattr(settings, 'DEBUG') else False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

# Main database session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

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
