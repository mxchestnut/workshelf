"""add author wiki-style editing and follows

Revision ID: 002
Revises: 001
Create Date: 2025-11-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add wiki-editable fields to existing authors table
    op.add_column('authors', sa.Column('birth_year', sa.Integer(), nullable=True))
    op.add_column('authors', sa.Column('death_year', sa.Integer(), nullable=True))
    op.add_column('authors', sa.Column('nationality', sa.String(200), nullable=True))
    op.add_column('authors', sa.Column('awards', JSONB(), nullable=True))
    
    # Update social_links to JSONB if it's not already
    # Note: May need to handle existing data migration
    
    # Author edits - revision history with moderation
    op.create_table(
        'author_edits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('field_name', sa.String(100), nullable=False),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=False),
        sa.Column('edit_summary', sa.String(500), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, default='pending'),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['author_id'], ['authors.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL')
    )
    op.create_index('idx_author_edits_author', 'author_edits', ['author_id'])
    op.create_index('idx_author_edits_status', 'author_edits', ['status', 'created_at'])
    op.create_index('idx_author_edits_user', 'author_edits', ['user_id'])

    # User follows authors - simple follow relationship
    op.create_table(
        'user_follows_authors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('notify_new_releases', sa.Boolean(), default=True),
        sa.Column('followed_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['authors.id'], ondelete='CASCADE')
    )
    op.create_index('idx_user_follows_user', 'user_follows_authors', ['user_id'])
    op.create_index('idx_user_follows_author', 'user_follows_authors', ['author_id'])
    op.create_index('idx_user_follows_authors_unique', 'user_follows_authors', ['user_id', 'author_id'], unique=True)


def downgrade() -> None:
    op.drop_index('idx_user_follows_authors_unique', 'user_follows_authors')
    op.drop_index('idx_user_follows_author', 'user_follows_authors')
    op.drop_index('idx_user_follows_user', 'user_follows_authors')
    op.drop_table('user_follows_authors')
    
    op.drop_index('idx_author_edits_user', 'author_edits')
    op.drop_index('idx_author_edits_status', 'author_edits')
    op.drop_index('idx_author_edits_author', 'author_edits')
    op.drop_table('author_edits')
    
    op.drop_column('authors', 'awards')
    op.drop_column('authors', 'nationality')
    op.drop_column('authors', 'death_year')
    op.drop_column('authors', 'birth_year')
