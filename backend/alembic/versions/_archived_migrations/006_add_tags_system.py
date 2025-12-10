"""add content tags system

Revision ID: 006
Revises: 005
Create Date: 2025-12-07

Adds AO3-style tagging system for posts, ebooks, articles (separate from document tags)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    # Create content_tag_categories table
    op.create_table(
        'content_tag_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(7), nullable=True),  # Hex color like #FF5733
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_content_tag_categories_slug', 'content_tag_categories', ['slug'])
    
    # Create content_tags table (different from user document tags)
    op.create_table(
        'content_tags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('usage_count', sa.Integer(), default=0, nullable=False),
        sa.Column('is_canonical', sa.Boolean(), default=True, nullable=False),
        sa.Column('canonical_tag_id', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['category_id'], ['content_tag_categories.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['canonical_tag_id'], ['content_tags.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL')
    )
    op.create_index('ix_content_tags_slug', 'content_tags', ['slug'])
    op.create_index('ix_content_tags_name', 'content_tags', ['name'])
    op.create_index('ix_content_tags_category_id', 'content_tags', ['category_id'])
    op.create_index('ix_content_tags_usage_count', 'content_tags', ['usage_count'])
    
    # Create content_taggables table (polymorphic for posts, ebooks, articles)
    op.create_table(
        'content_taggables',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.Column('taggable_type', sa.String(50), nullable=False),  # 'post', 'ebook', 'article'
        sa.Column('taggable_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tag_id'], ['content_tags.id'], ondelete='CASCADE')
    )
    op.create_index('ix_content_taggables_tag_id', 'content_taggables', ['tag_id'])
    op.create_index('ix_content_taggables_lookup', 'content_taggables', ['taggable_type', 'taggable_id'])
    op.create_index('ix_content_taggables_unique', 'content_taggables', ['taggable_type', 'taggable_id', 'tag_id'], unique=True)
    
    # Seed tag categories (AO3-style)
    op.execute("""
        INSERT INTO content_tag_categories (name, slug, description, color, icon) VALUES
        ('Rating', 'rating', 'Content rating', '#4CAF50', '🔞'),
        ('Warning', 'warning', 'Content warnings', '#FF5722', '⚠️'),
        ('Relationship', 'relationship', 'Pairings and relationships', '#E91E63', '💕'),
        ('Character', 'character', 'Characters featured', '#2196F3', '👤'),
        ('Freeform', 'freeform', 'General tags', '#9C27B0', '🏷️'),
        ('Genre', 'genre', 'Story genre', '#FF9800', '📚'),
        ('Length', 'length', 'Content length', '#607D8B', '📏'),
        ('Status', 'status', 'Completion status', '#00BCD4', '✓')
    """)


def downgrade():
    op.drop_table('content_taggables')
    op.drop_table('content_tags')
    op.drop_table('content_tag_categories')
