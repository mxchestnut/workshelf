"""Add feed pinning support

Revision ID: 009
Revises: 008_folder_id
Create Date: 2025-12-07

Adds pinned_feeds array to group_posts table to support pinning posts to specific feeds
(personal, global, discover, etc.)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008_folder_id'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add pinned_feeds column - array of feed types where post is pinned
    # Valid values: 'group', 'personal', 'global', 'discover', 'updates', 'beta-feed'
    op.add_column(
        'group_posts',
        sa.Column(
            'pinned_feeds',
            postgresql.ARRAY(sa.String(50)),
            nullable=False,
            server_default='{}',  # Empty array by default
            comment='Feeds where this post is pinned (group, personal, global, discover, updates, beta-feed)'
        )
    )
    
    # Migrate existing is_pinned=true posts to have 'group' in pinned_feeds
    op.execute("""
        UPDATE group_posts 
        SET pinned_feeds = ARRAY['group']::VARCHAR(50)[] 
        WHERE is_pinned = true
    """)
    
    # Create index for efficient filtering of pinned posts
    op.create_index(
        'idx_group_posts_pinned_feeds',
        'group_posts',
        ['pinned_feeds'],
        postgresql_using='gin'
    )


def downgrade() -> None:
    op.drop_index('idx_group_posts_pinned_feeds', table_name='group_posts')
    op.drop_column('group_posts', 'pinned_feeds')
