"""Add store analytics fields

Revision ID: 019_store_analytics
Revises: a57f855a8f73
Create Date: 2025-11-10 04:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '019_store_analytics'
down_revision = 'a57f855a8f73'
branch_labels = None
depends_on = None


def upgrade():
    # Add word_count to store_items
    op.add_column('store_items', sa.Column('word_count', sa.Integer(), nullable=True))
    
    # Add tags array to store_items
    op.add_column('store_items', sa.Column('tags', postgresql.ARRAY(sa.String()), nullable=True))
    
    # Add audiobook fields to store_items
    op.add_column('store_items', sa.Column('has_audiobook', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('store_items', sa.Column('audiobook_price_usd', sa.Numeric(precision=10, scale=2), nullable=True))
    
    # Rename cover_blob_url to cover_image_url for consistency with code
    # First add new column
    op.add_column('store_items', sa.Column('cover_image_url', sa.String(length=500), nullable=True))
    # Copy data
    op.execute('UPDATE store_items SET cover_image_url = cover_blob_url')
    # Drop old column
    op.drop_column('store_items', 'cover_blob_url')


def downgrade():
    # Reverse the changes
    op.add_column('store_items', sa.Column('cover_blob_url', sa.String(length=500), nullable=True))
    op.execute('UPDATE store_items SET cover_blob_url = cover_image_url')
    op.drop_column('store_items', 'cover_image_url')
    
    op.drop_column('store_items', 'audiobook_price_usd')
    op.drop_column('store_items', 'has_audiobook')
    op.drop_column('store_items', 'tags')
    op.drop_column('store_items', 'word_count')
