"""Add audiobook support to store items and audiobook submission table

Revision ID: 006_audiobooks
Revises: 005_beta_reader_profiles
Create Date: 2025-01-26 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006_audiobooks'
down_revision = '005_beta_reader_profiles'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make ebook fields nullable (for audiobook-only titles)
    op.alter_column('store_items', 'epub_blob_url',
                    existing_type=sa.String(1000),
                    nullable=True)
    op.alter_column('store_items', 'file_hash',
                    existing_type=sa.String(64),
                    nullable=True)
    op.alter_column('store_items', 'file_size_bytes',
                    existing_type=sa.Integer(),
                    nullable=True)
    
    # Add audiobook fields to store_items
    op.add_column('store_items', sa.Column('has_audiobook', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('store_items', sa.Column('audiobook_narrator', sa.String(255), nullable=True))
    op.add_column('store_items', sa.Column('audiobook_duration_minutes', sa.Integer(), nullable=True))
    op.add_column('store_items', sa.Column('audiobook_file_url', sa.String(1000), nullable=True))
    op.add_column('store_items', sa.Column('audiobook_sample_url', sa.String(1000), nullable=True))
    op.add_column('store_items', sa.Column('audiobook_file_format', sa.String(10), nullable=True))
    op.add_column('store_items', sa.Column('audiobook_file_size_bytes', sa.Integer(), nullable=True))
    op.add_column('store_items', sa.Column('audiobook_price_usd', sa.Numeric(10, 2), nullable=True))
    
    # Create audiobook_submissions table
    op.create_table('audiobook_submissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('store_item_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('author_name', sa.String(200), nullable=False),
        sa.Column('narrator_name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('genres', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('isbn', sa.String(20), nullable=True),
        sa.Column('file_hash', sa.String(64), nullable=False),
        sa.Column('blob_url', sa.String(1000), nullable=False),
        sa.Column('sample_blob_url', sa.String(1000), nullable=True),
        sa.Column('cover_blob_url', sa.String(1000), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('file_format', sa.String(10), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('bitrate_kbps', sa.Integer(), nullable=True),
        sa.Column('sample_rate_hz', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('verification_passed', sa.Boolean(), nullable=True),
        sa.Column('audio_quality_score', sa.Integer(), nullable=True),
        sa.Column('format_valid', sa.Boolean(), nullable=True),
        sa.Column('duration_verified', sa.Boolean(), nullable=True),
        sa.Column('moderator_id', sa.Integer(), nullable=True),
        sa.Column('moderator_notes', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('price_usd', sa.Numeric(10, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['moderator_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['store_item_id'], ['store_items.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('file_hash')
    )
    
    # Create indexes for audiobook_submissions
    op.create_index('idx_audiobook_submissions_user_status', 'audiobook_submissions', ['user_id', 'status'])
    op.create_index(op.f('ix_audiobook_submissions_id'), 'audiobook_submissions', ['id'])
    op.create_index(op.f('ix_audiobook_submissions_user_id'), 'audiobook_submissions', ['user_id'])
    op.create_index(op.f('ix_audiobook_submissions_store_item_id'), 'audiobook_submissions', ['store_item_id'])
    op.create_index(op.f('ix_audiobook_submissions_isbn'), 'audiobook_submissions', ['isbn'])
    op.create_index(op.f('ix_audiobook_submissions_file_hash'), 'audiobook_submissions', ['file_hash'])
    op.create_index(op.f('ix_audiobook_submissions_status'), 'audiobook_submissions', ['status'])


def downgrade() -> None:
    # Drop audiobook_submissions table and indexes
    op.drop_index(op.f('ix_audiobook_submissions_status'), table_name='audiobook_submissions')
    op.drop_index(op.f('ix_audiobook_submissions_file_hash'), table_name='audiobook_submissions')
    op.drop_index(op.f('ix_audiobook_submissions_isbn'), table_name='audiobook_submissions')
    op.drop_index(op.f('ix_audiobook_submissions_store_item_id'), table_name='audiobook_submissions')
    op.drop_index(op.f('ix_audiobook_submissions_user_id'), table_name='audiobook_submissions')
    op.drop_index(op.f('ix_audiobook_submissions_id'), table_name='audiobook_submissions')
    op.drop_index('idx_audiobook_submissions_user_status', table_name='audiobook_submissions')
    op.drop_table('audiobook_submissions')
    
    # Remove audiobook columns from store_items
    op.drop_column('store_items', 'audiobook_price_usd')
    op.drop_column('store_items', 'audiobook_file_size_bytes')
    op.drop_column('store_items', 'audiobook_file_format')
    op.drop_column('store_items', 'audiobook_sample_url')
    op.drop_column('store_items', 'audiobook_file_url')
    op.drop_column('store_items', 'audiobook_duration_minutes')
    op.drop_column('store_items', 'audiobook_narrator')
    op.drop_column('store_items', 'has_audiobook')
    
    # Revert ebook fields to non-nullable
    op.alter_column('store_items', 'file_size_bytes',
                    existing_type=sa.Integer(),
                    nullable=False)
    op.alter_column('store_items', 'file_hash',
                    existing_type=sa.String(64),
                    nullable=False)
    op.alter_column('store_items', 'epub_blob_url',
                    existing_type=sa.String(1000),
                    nullable=False)
