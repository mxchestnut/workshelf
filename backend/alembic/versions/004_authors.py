"""Add authors tracking feature

Revision ID: 004_authors
Revises: 003_fix_isbn_constraint
Create Date: 2025-11-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


# revision identifiers, used by Alembic.
revision = '004_authors'
down_revision = '003_fix_isbn_constraint'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create authors table for tracking favorite authors
    Similar to bookshelf but focused on authors/creators
    """
    op.create_table(
        'author_follows',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('author_name', sa.String(500), nullable=False),
        
        # Author metadata
        sa.Column('author_bio', sa.Text(), nullable=True),
        sa.Column('author_photo_url', sa.String(1000), nullable=True),
        sa.Column('author_website', sa.String(500), nullable=True),
        sa.Column('genres', ARRAY(sa.String()), nullable=True),
        
        # User's relationship with author
        sa.Column('status', sa.String(20), nullable=False, server_default='want-to-read'),
        # Statuses: 'reading' (currently reading their work), 'read' (have read), 
        #           'want-to-read' (want to explore), 'favorites' (all-time favorite)
        
        sa.Column('is_favorite', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('discovery_source', sa.String(100), nullable=True),  # How they found this author
        
        # Timestamps
        sa.Column('added_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        
        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'author_name', name='unique_user_author'),
        sa.CheckConstraint(
            "status IN ('reading', 'read', 'want-to-read', 'favorites')",
            name='check_author_follow_status'
        ),
        
        # Indexes
        sa.Index('idx_author_follows_user', 'user_id'),
        sa.Index('idx_author_follows_status', 'user_id', 'status'),
        sa.Index('idx_author_follows_favorites', 'user_id', 'is_favorite'),
        sa.Index('idx_author_follows_name', 'author_name'),
    )


def downgrade() -> None:
    """
    Drop authors table
    """
    op.drop_table('author_follows')
