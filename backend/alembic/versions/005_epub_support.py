"""Add EPUB reading support fields to bookshelf

Revision ID: 005_epub_support
Revises: 016_add_user_interests
Create Date: 2025-01-07 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005_epub_support'
down_revision = '016_add_user_interests'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add EPUB reading support fields
    op.add_column('bookshelf_items', sa.Column('epub_url', sa.String(length=1000), nullable=True))
    op.add_column('bookshelf_items', sa.Column('reading_progress', sa.Float(), nullable=True))
    op.add_column('bookshelf_items', sa.Column('last_location', sa.String(length=500), nullable=True))
    
    # Add index on epub_url for faster lookups
    op.create_index(op.f('ix_bookshelf_items_epub_url'), 'bookshelf_items', ['epub_url'], unique=False)


def downgrade() -> None:
    # Remove index
    op.drop_index(op.f('ix_bookshelf_items_epub_url'), table_name='bookshelf_items')
    
    # Remove columns
    op.drop_column('bookshelf_items', 'last_location')
    op.drop_column('bookshelf_items', 'reading_progress')
    op.drop_column('bookshelf_items', 'epub_url')
