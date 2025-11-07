"""Add EPUB submissions and verification

Revision ID: 006_epub_submissions
Revises: 005_epub_support
Create Date: 2025-01-07 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = '006_epub_submissions'
down_revision = '005_epub_support'
branch_labels = None
depends_on = None


def upgrade():
    # Create epub_submissions table
    op.create_table(
        'epub_submissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('author_name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('genres', JSON, nullable=True),
        sa.Column('isbn', sa.String(20), nullable=True),
        sa.Column('file_hash', sa.String(64), nullable=False),
        sa.Column('blob_url', sa.String(1000), nullable=False),
        sa.Column('cover_blob_url', sa.String(1000), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('verification_score', sa.Float(), nullable=True),
        sa.Column('verification_results', JSON, nullable=True),
        sa.Column('verification_date', sa.DateTime(), nullable=True),
        sa.Column('requires_manual_review', sa.Boolean(), default=False),
        sa.Column('moderator_id', sa.Integer(), nullable=True),
        sa.Column('moderator_notes', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('bookshelf_item_id', sa.Integer(), nullable=True),
        sa.Column('author_attestation', sa.Boolean(), default=False),
        sa.Column('copyright_holder', sa.Boolean(), default=False),
        sa.Column('original_work', sa.Boolean(), default=False),
        sa.Column('download_count', sa.Integer(), default=0),
        sa.Column('view_count', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['moderator_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['bookshelf_item_id'], ['bookshelf_items.id'], ondelete='SET NULL')
    )
    
    # Create indexes
    op.create_index('ix_epub_submissions_user_id', 'epub_submissions', ['user_id'])
    op.create_index('ix_epub_submissions_file_hash', 'epub_submissions', ['file_hash'], unique=True)
    op.create_index('ix_epub_submissions_isbn', 'epub_submissions', ['isbn'])
    op.create_index('ix_epub_submissions_status', 'epub_submissions', ['status'])
    op.create_index('ix_epub_submissions_requires_manual_review', 'epub_submissions', ['requires_manual_review'])
    
    # Create verification_logs table
    op.create_table(
        'verification_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('submission_id', sa.Integer(), nullable=False),
        sa.Column('check_type', sa.String(50), nullable=False),
        sa.Column('check_score', sa.Float(), nullable=False),
        sa.Column('check_results', JSON, nullable=True),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['submission_id'], ['epub_submissions.id'], ondelete='CASCADE')
    )
    
    op.create_index('ix_verification_logs_submission_id', 'verification_logs', ['submission_id'])


def downgrade():
    op.drop_index('ix_verification_logs_submission_id')
    op.drop_table('verification_logs')
    
    op.drop_index('ix_epub_submissions_requires_manual_review')
    op.drop_index('ix_epub_submissions_status')
    op.drop_index('ix_epub_submissions_isbn')
    op.drop_index('ix_epub_submissions_file_hash')
    op.drop_index('ix_epub_submissions_user_id')
    op.drop_table('epub_submissions')
