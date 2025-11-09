"""Add user scores and badges system

Revision ID: 003_user_scores_badges
Revises: 002_group_roles
Create Date: 2025-11-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '003_user_scores_badges'
down_revision = '002_group_roles'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add score columns to users table
    op.add_column('users', sa.Column('reading_score', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('beta_score', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('writer_score', sa.Integer(), nullable=False, server_default='0'))
    
    # Create user_badges table
    op.create_table('user_badges',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('badge_type', sa.String(length=50), nullable=False),
        sa.Column('badge_name', sa.String(length=100), nullable=False),
        sa.Column('badge_description', sa.Text(), nullable=True),
        sa.Column('badge_icon', sa.String(length=500), nullable=True),
        sa.Column('earned_for', sa.String(length=255), nullable=True),
        sa.Column('milestone_value', sa.Integer(), nullable=True),
        sa.Column('is_visible', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_user_badges_user', 'user_badges', ['user_id'])
    
    # Create beta_reader_reviews table
    op.create_table('beta_reader_reviews',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('beta_request_id', sa.Integer(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('beta_reader_id', sa.Integer(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('review_text', sa.Text(), nullable=True),
        sa.Column('feedback_quality', sa.Integer(), nullable=True),
        sa.Column('communication', sa.Integer(), nullable=True),
        sa.Column('timeliness', sa.Integer(), nullable=True),
        sa.Column('professionalism', sa.Integer(), nullable=True),
        sa.Column('would_work_again', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['beta_request_id'], ['beta_requests.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['beta_reader_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_beta_reader_reviews_request', 'beta_reader_reviews', ['beta_request_id'])
    op.create_index('idx_beta_reader_reviews_author', 'beta_reader_reviews', ['author_id'])
    op.create_index('idx_beta_reader_reviews_reader', 'beta_reader_reviews', ['beta_reader_id'])


def downgrade() -> None:
    op.drop_table('beta_reader_reviews')
    op.drop_table('user_badges')
    op.drop_column('users', 'writer_score')
    op.drop_column('users', 'beta_score')
    op.drop_column('users', 'reading_score')
