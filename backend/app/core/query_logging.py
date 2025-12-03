"""
Database Query Logging for Development
Logs slow queries and helps identify N+1 query issues
"""
import logging
import time
from typing import Optional
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.pool import Pool

# Configure logger
logger = logging.getLogger("sqlalchemy.queries")

# Threshold for slow query warnings (in seconds)
SLOW_QUERY_THRESHOLD = 0.5  # 500ms


def setup_query_logging(engine: Engine, enabled: bool = False, log_all: bool = False):
    """
    Setup query logging for development.
    
    Args:
        engine: SQLAlchemy engine
        enabled: Enable query logging
        log_all: Log all queries (not just slow ones)
    """
    if not enabled:
        return
    
    logger.setLevel(logging.INFO if log_all else logging.WARNING)
    
    @event.listens_for(engine.sync_engine, "before_cursor_execute")
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """Record query start time."""
        conn.info.setdefault("query_start_time", []).append(time.time())
    
    @event.listens_for(engine.sync_engine, "after_cursor_execute")
    def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """Log query execution time."""
        total_time = time.time() - conn.info["query_start_time"].pop()
        
        # Log all queries if enabled, otherwise only slow ones
        if log_all:
            logger.info(f"Query took {total_time:.4f}s: {statement[:200]}")
        elif total_time > SLOW_QUERY_THRESHOLD:
            logger.warning(
                f"SLOW QUERY ({total_time:.4f}s): {statement[:200]}\n"
                f"Parameters: {parameters}"
            )


def setup_connection_pool_logging(engine: Engine, enabled: bool = False):
    """
    Setup connection pool logging.
    
    Args:
        engine: SQLAlchemy engine
        enabled: Enable pool logging
    """
    if not enabled:
        return
    
    pool_logger = logging.getLogger("sqlalchemy.pool")
    pool_logger.setLevel(logging.INFO)
    
    @event.listens_for(Pool, "connect")
    def receive_connect(dbapi_conn, connection_record):
        """Log new connections."""
        pool_logger.info("New database connection established")
    
    @event.listens_for(Pool, "checkout")
    def receive_checkout(dbapi_conn, connection_record, connection_proxy):
        """Log connection checkouts."""
        pool_logger.debug("Connection checked out from pool")
    
    @event.listens_for(Pool, "checkin")
    def receive_checkin(dbapi_conn, connection_record):
        """Log connection checkins."""
        pool_logger.debug("Connection returned to pool")


# Example usage in main.py or database.py:
# 
# from app.core.query_logging import setup_query_logging, setup_connection_pool_logging
# from app.core.config import settings
# 
# # Enable in development only
# if settings.ENV == "development":
#     setup_query_logging(engine, enabled=True, log_all=False)  # Only log slow queries
#     setup_connection_pool_logging(engine, enabled=True)
