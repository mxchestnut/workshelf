"""redesign content tags system

Revision ID: 007
Revises: 005
Create Date: 2025-12-07

Complete redesign: simpler, faster, more flexible tagging
- Removes polymorphic anti-pattern
- Adds dedicated join tables per content type
- Adds full-text search
- Simplifies tag model (no categories, no canonicalization in MVP)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    # Drop old tables if they exist
    op.execute("DROP TABLE IF EXISTS content_taggables CASCADE")
    op.execute("DROP TABLE IF EXISTS content_tags CASCADE")
    op.execute("DROP TABLE IF EXISTS content_tag_categories CASCADE")
    
    # Create simple tags table
    op.create_table(
        'tags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('slug', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        
        # Usage tracking
        sa.Column('usage_count', sa.Integer(), default=0, nullable=False),
        
        # Full-text search
        sa.Column('search_vector', postgresql.TSVECTOR(), nullable=True),
        
        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        
        sa.PrimaryKeyConstraint('id')
    )
    
    # Indexes for performance
    op.create_index('ix_tags_name', 'tags', ['name'])
    op.create_index('ix_tags_slug', 'tags', ['slug'])
    op.create_index('ix_tags_usage_count', 'tags', ['usage_count'])
    op.create_index('ix_tags_search_vector', 'tags', ['search_vector'], postgresql_using='gin')
    
    # Trigger to auto-update search_vector
    op.execute("""
        CREATE TRIGGER tags_search_vector_update 
        BEFORE INSERT OR UPDATE ON tags
        FOR EACH ROW EXECUTE FUNCTION
        tsvector_update_trigger(search_vector, 'pg_catalog.english', name, description);
    """)
    
    # Dedicated join table for group posts (much faster than polymorphic)
    op.create_table(
        'post_tags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('post_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['post_id'], ['group_posts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('post_id', 'tag_id', name='uq_post_tag')
    )
    op.create_index('ix_post_tags_post_id', 'post_tags', ['post_id'])
    op.create_index('ix_post_tags_tag_id', 'post_tags', ['tag_id'])
    
    # Seed some common tags (optional, users can create any tag)
    op.execute("""
        INSERT INTO tags (name, slug, description, usage_count) VALUES
        ('Original Work', 'original-work', 'Original creative content', 0),
        ('Fan Fiction', 'fan-fiction', 'Fanfiction and derivative works', 0),
        ('Poetry', 'poetry', 'Poetic works', 0),
        ('Short Story', 'short-story', 'Short fiction under 10k words', 0),
        ('Novel', 'novel', 'Long-form fiction over 50k words', 0),
        ('Work in Progress', 'wip', 'Story is not yet complete', 0),
        ('Complete', 'complete', 'Story is finished', 0),
        ('Romance', 'romance', 'Romantic content', 0),
        ('Action', 'action', 'Action and adventure', 0),
        ('Horror', 'horror', 'Horror and thriller', 0),
        ('Science Fiction', 'sci-fi', 'Science fiction', 0),
        ('Fantasy', 'fantasy', 'Fantasy and magical realism', 0),
        ('Mystery', 'mystery', 'Mystery and detective fiction', 0),
        ('Drama', 'drama', 'Dramatic content', 0),
        ('Comedy', 'comedy', 'Humorous content', 0),
        ('General Audiences', 'gen', 'Suitable for all ages', 0),
        ('Teen', 'teen', 'Suitable for teenagers', 0),
        ('Mature', 'mature', 'Mature themes, 18+', 0),
        ('Explicit', 'explicit', 'Sexually explicit content, 18+', 0),
        ('Angst', 'angst', 'Emotional angst', 0),
        ('Fluff', 'fluff', 'Light-hearted and fluffy', 0),
        ('Slow Burn', 'slow-burn', 'Slowly developing relationships', 0),
        ('Hurt/Comfort', 'hurt-comfort', 'Hurt followed by comfort', 0)
        ON CONFLICT (slug) DO NOTHING
    """)


def downgrade():
    op.drop_table('post_tags')
    op.execute("DROP TRIGGER IF EXISTS tags_search_vector_update ON tags")
    op.drop_table('tags')
