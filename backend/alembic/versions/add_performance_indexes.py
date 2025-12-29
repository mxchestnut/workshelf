"""Add performance indexes for vault and feed queries

Revision ID: add_performance_indexes
Revises: 
Create Date: 2025-12-29

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_performance_indexes'
down_revision = None  # Update this to your latest migration
branch_labels = None
depends_on = None


def upgrade():
    """Add indexes for improved query performance"""
    
    # ========================================================================
    # Vault Articles Performance Indexes
    # ========================================================================
    
    # Index for searching by author (frequently used in vault searches)
    op.create_index(
        'idx_vault_articles_author',
        'vault_articles',
        ['author'],
        unique=False,
        postgresql_ops={'author': 'text_pattern_ops'}  # For LIKE/ILIKE queries
    )
    
    # Index for ISBN lookups (exact matches)
    op.create_index(
        'idx_vault_articles_isbn',
        'vault_articles',
        ['isbn'],
        unique=False
    )
    
    # GIN index for array-based tag searches
    op.create_index(
        'idx_vault_articles_genres_gin',
        'vault_articles',
        ['genres'],
        unique=False,
        postgresql_using='gin'
    )
    
    # Composite index for user's reading list filtering
    op.create_index(
        'idx_vault_user_status_added',
        'vault_articles',
        ['user_id', 'status', 'added_at'],
        unique=False
    )
    
    # Index for finding favorite books
    op.create_index(
        'idx_vault_favorites_user',
        'vault_articles',
        ['is_favorite', 'user_id'],
        unique=False,
        postgresql_where=sa.text('is_favorite = true')  # Partial index for favorites only
    )
    
    # Index for recent reading activity
    op.create_index(
        'idx_vault_finished_reading',
        'vault_articles',
        ['user_id', 'finished_reading'],
        unique=False,
        postgresql_where=sa.text('finished_reading IS NOT NULL')
    )
    
    # ========================================================================
    # Group Posts Performance Indexes (Feed Optimization)
    # ========================================================================
    
    # Composite index for feed query (group + pinned + created_at)
    op.create_index(
        'idx_group_posts_feed_query',
        'group_posts',
        ['group_id', 'is_pinned', 'created_at'],
        unique=False
    )
    
    # Index for author's posts in a group
    op.create_index(
        'idx_group_posts_author_group',
        'group_posts',
        ['author_id', 'group_id', 'created_at'],
        unique=False
    )
    
    # GIN index for pinned_feeds array (personal feed filtering)
    op.create_index(
        'idx_group_posts_pinned_feeds_gin',
        'group_posts',
        ['pinned_feeds'],
        unique=False,
        postgresql_using='gin'
    )
    
    # ========================================================================
    # Group Members Performance Indexes
    # ========================================================================
    
    # Composite index for finding user's groups
    op.create_index(
        'idx_group_members_user_joined',
        'group_members',
        ['user_id', 'joined_at'],
        unique=False
    )
    
    # Composite index for finding group members
    op.create_index(
        'idx_group_members_group_role',
        'group_members',
        ['group_id', 'role'],
        unique=False
    )
    
    # ========================================================================
    # Group Post Reactions Performance Indexes
    # ========================================================================
    
    # Composite index for vote counting (used in feed)
    op.create_index(
        'idx_post_reactions_post_type',
        'group_post_reactions',
        ['post_id', 'reaction_type'],
        unique=False
    )
    
    # Index for user's reactions (to check if user already voted)
    op.create_index(
        'idx_post_reactions_user_post',
        'group_post_reactions',
        ['user_id', 'post_id'],
        unique=False
    )
    
    # ========================================================================
    # Projects Performance Indexes
    # ========================================================================
    
    # Composite index for user's active projects
    op.create_index(
        'idx_projects_user_active',
        'projects',
        ['user_id', 'is_deleted', 'updated_at'],
        unique=False
    )
    
    # Index for finding deleted projects (trash bin)
    op.create_index(
        'idx_projects_deleted',
        'projects',
        ['user_id', 'deleted_at'],
        unique=False,
        postgresql_where=sa.text('is_deleted = true')  # Partial index
    )
    
    # ========================================================================
    # Documents Performance Indexes
    # ========================================================================
    
    # Composite index for user's documents by project
    op.create_index(
        'idx_documents_user_project',
        'documents',
        ['user_id', 'project_id', 'updated_at'],
        unique=False,
        postgresql_where=sa.text('is_deleted = false')
    )
    
    # Index for finding documents in trash
    op.create_index(
        'idx_documents_trash',
        'documents',
        ['user_id', 'deleted_at'],
        unique=False,
        postgresql_where=sa.text('is_deleted = true')
    )


def downgrade():
    """Remove performance indexes"""
    
    # Vault Articles
    op.drop_index('idx_vault_articles_author', table_name='vault_articles')
    op.drop_index('idx_vault_articles_isbn', table_name='vault_articles')
    op.drop_index('idx_vault_articles_genres_gin', table_name='vault_articles')
    op.drop_index('idx_vault_user_status_added', table_name='vault_articles')
    op.drop_index('idx_vault_favorites_user', table_name='vault_articles')
    op.drop_index('idx_vault_finished_reading', table_name='vault_articles')
    
    # Group Posts
    op.drop_index('idx_group_posts_feed_query', table_name='group_posts')
    op.drop_index('idx_group_posts_author_group', table_name='group_posts')
    op.drop_index('idx_group_posts_pinned_feeds_gin', table_name='group_posts')
    
    # Group Members
    op.drop_index('idx_group_members_user_joined', table_name='group_members')
    op.drop_index('idx_group_members_group_role', table_name='group_members')
    
    # Group Post Reactions
    op.drop_index('idx_post_reactions_post_type', table_name='group_post_reactions')
    op.drop_index('idx_post_reactions_user_post', table_name='group_post_reactions')
    
    # Projects
    op.drop_index('idx_projects_user_active', table_name='projects')
    op.drop_index('idx_projects_deleted', table_name='projects')
    
    # Documents
    op.drop_index('idx_documents_user_project', table_name='documents')
    op.drop_index('idx_documents_trash', table_name='documents')
