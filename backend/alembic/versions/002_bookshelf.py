"""Add bookshelf feature for tracking books

Revision ID: 002_bookshelf
Revises: 001_initial
Create Date: 2025-11-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_bookshelf'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create bookshelf_items table
    op.create_table(
        'bookshelf_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        
        # Item type: 'document' for Work Shelf docs, 'book' for external books
        sa.Column('item_type', sa.String(20), nullable=False),
        
        # For Work Shelf documents
        sa.Column('document_id', sa.Integer(), nullable=True),
        
        # For external books - rich metadata
        sa.Column('isbn', sa.String(20), nullable=True),
        sa.Column('title', sa.String(500), nullable=True),
        sa.Column('author', sa.String(500), nullable=True),
        sa.Column('cover_url', sa.String(1000), nullable=True),
        sa.Column('publisher', sa.String(255), nullable=True),
        sa.Column('publish_year', sa.Integer(), nullable=True),
        sa.Column('page_count', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('genres', postgresql.ARRAY(sa.String()), nullable=True),
        
        # Reading status
        sa.Column('status', sa.String(20), nullable=False),  # 'reading', 'read', 'want-to-read', 'favorites', 'dnf'
        
        # User's personal data
        sa.Column('rating', sa.Integer(), nullable=True),  # 1-5 stars
        sa.Column('review', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_favorite', sa.Boolean(), default=False),
        sa.Column('review_public', sa.Boolean(), default=True),  # Whether review is visible on public profile
        
        # Reading dates
        sa.Column('started_reading', sa.DateTime(timezone=True), nullable=True),
        sa.Column('finished_reading', sa.DateTime(timezone=True), nullable=True),
        sa.Column('added_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
        
        # Primary key
        sa.PrimaryKeyConstraint('id'),
        
        # Foreign keys
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        
        # Indexes
        sa.Index('idx_bookshelf_user', 'user_id'),
        sa.Index('idx_bookshelf_status', 'user_id', 'status'),
        sa.Index('idx_bookshelf_favorites', 'user_id', 'is_favorite'),
        sa.Index('idx_bookshelf_isbn', 'isbn'),
        
        # Check constraints
        sa.CheckConstraint(
            "(item_type = 'document' AND document_id IS NOT NULL) OR (item_type = 'book' AND isbn IS NOT NULL AND title IS NOT NULL)",
            name='check_bookshelf_item_valid'
        ),
        sa.CheckConstraint(
            "rating IS NULL OR (rating >= 1 AND rating <= 5)",
            name='check_bookshelf_rating_range'
        ),
        sa.CheckConstraint(
            "status IN ('reading', 'read', 'want-to-read', 'favorites', 'dnf')",
            name='check_bookshelf_status'
        )
    )


def downgrade() -> None:
    op.drop_table('bookshelf_items')
