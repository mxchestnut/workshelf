"""Add page tracking system

Revision ID: 005_add_page_tracking_system
Revises: 004_add_feedback_document_to_beta_requests
Create Date: 2025-01-11

This migration creates tables to support the page tracking and version control system:
- page_status: Tracks the overall status of each page (construction/ready/etc)
- page_versions: Version history for each page with changelog
- user_page_views: Tracks when users view pages and mark them as reviewed
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '005_add_page_tracking_system'
down_revision: Union[str, None] = '004_add_feedback_document_to_beta_requests'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create page_status table
    op.create_table(
        'page_status',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('page_path', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('page_path')
    )
    op.create_index(op.f('ix_page_status_page_path'), 'page_status', ['page_path'], unique=True)
    op.create_index(op.f('ix_page_status_status'), 'page_status', ['status'], unique=False)

    # Create page_versions table
    op.create_table(
        'page_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('page_path', sa.String(length=255), nullable=False),
        sa.Column('version', sa.String(length=20), nullable=False),
        sa.Column('changes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_page_versions_page_path'), 'page_versions', ['page_path'], unique=False)
    op.create_index(op.f('ix_page_versions_created_at'), 'page_versions', ['created_at'], unique=False)

    # Create user_page_views table
    op.create_table(
        'user_page_views',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('page_path', sa.String(length=255), nullable=False),
        sa.Column('last_viewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('marked_as_viewed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('marked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'page_path', name='uq_user_page_views_user_page')
    )
    op.create_index(op.f('ix_user_page_views_user_id'), 'user_page_views', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_page_views_page_path'), 'user_page_views', ['page_path'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_page_views_page_path'), table_name='user_page_views')
    op.drop_index(op.f('ix_user_page_views_user_id'), table_name='user_page_views')
    op.drop_table('user_page_views')
    
    op.drop_index(op.f('ix_page_versions_created_at'), table_name='page_versions')
    op.drop_index(op.f('ix_page_versions_page_path'), table_name='page_versions')
    op.drop_table('page_versions')
    
    op.drop_index(op.f('ix_page_status_status'), table_name='page_status')
    op.drop_index(op.f('ix_page_status_page_path'), table_name='page_status')
    op.drop_table('page_status')
