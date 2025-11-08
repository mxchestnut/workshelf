"""add_performance_indexes

Revision ID: 7555b5a5c245
Revises: 017
Create Date: 2025-11-08 01:50:31.388873

Adds database indexes to improve query performance for:
- Author edit moderation queries
- Purchase lookups
- Author following relationships
- Bookshelf queries
- Store item listings

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7555b5a5c245'
down_revision = ('004_authors', '007_store_system', '017')
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add performance indexes for common queries."""
    
    # Helper to create index only if it doesn't exist
    conn = op.get_bind()
    
    # Index for author edit moderation queries (filtering by status and sorting by date)
    if not conn.dialect.has_index(conn, 'author_edits', 'idx_author_edits_status_created'):
        op.create_index(
            'idx_author_edits_status_created',
            'author_edits',
            ['status', 'created_at'],
            unique=False
        )
    
    # Index for quick purchase lookups (checking if user owns an item)
    if not conn.dialect.has_index(conn, 'purchases', 'idx_purchases_user_item'):
        op.create_index(
            'idx_purchases_user_item',
            'purchases',
            ['user_id', 'store_item_id'],
            unique=False
        )
    
    # Index for author following lookups (checking if user follows author)
    if not conn.dialect.has_index(conn, 'user_follows_authors', 'idx_user_follows_author'):
        op.create_index(
            'idx_user_follows_author',
            'user_follows_authors',
            ['user_id', 'author_id'],
            unique=False
        )
    
    # Additional performance indexes for common queries:
    
    # Index for bookshelf filtering by user and status (e.g., "show my currently reading books")
    if not conn.dialect.has_index(conn, 'bookshelf_items', 'idx_bookshelf_user_status'):
        op.create_index(
            'idx_bookshelf_user_status',
            'bookshelf_items',
            ['user_id', 'status'],
            unique=False
        )
    
    # Index for store browsing by author (e.g., "show all books by this author")
    if not conn.dialect.has_index(conn, 'store_items', 'idx_store_items_author'):
        op.create_index(
            'idx_store_items_author',
            'store_items',
            ['author_id'],
            unique=False
        )
    
    # Index for store status filtering (e.g., "show only active items")
    # Note: status column already has an index from the model definition
    
    # Index for purchase status queries (e.g., "show completed purchases")
    if not conn.dialect.has_index(conn, 'purchases', 'idx_purchases_status'):
        op.create_index(
            'idx_purchases_status',
            'purchases',
            ['status'],
            unique=False
        )


def downgrade() -> None:
    """Remove performance indexes."""
    
    op.drop_index('idx_purchases_status', 'purchases')
    op.drop_index('idx_store_items_author', 'store_items')
    op.drop_index('idx_bookshelf_user_status', 'bookshelf_items')
    op.drop_index('idx_user_follows_author', 'user_follows_authors')
    op.drop_index('idx_purchases_user_item', 'purchases')
    op.drop_index('idx_author_edits_status_created', 'author_edits')
