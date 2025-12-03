"""
Auto-purge expired trash items
Run this script daily via cron to automatically delete items older than 30 days

Usage:
    python scripts/cleanup_trash.py
    
Cron schedule (daily at 2 AM):
    0 2 * * * cd /app/backend && python scripts/cleanup_trash.py
"""
import sys
import asyncio
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import async_session
from app.services.trash_service import TrashService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def cleanup_expired_trash():
    """
    Purge all expired trash items (documents and projects older than 30 days)
    """
    logger.info("Starting trash cleanup...")
    
    async with async_session() as db:
        result = await TrashService.purge_all_expired_trash(db)
        
        if result["total_deleted"] > 0:
            logger.info(f"✅ Trash cleanup complete:")
            logger.info(f"   - Documents deleted: {result['documents_deleted']}")
            logger.info(f"   - Projects deleted: {result['projects_deleted']}")
            logger.info(f"   - Total deleted: {result['total_deleted']}")
        else:
            logger.info("✅ Trash cleanup complete: No expired items found")


if __name__ == "__main__":
    asyncio.run(cleanup_expired_trash())
