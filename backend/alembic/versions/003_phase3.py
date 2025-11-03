"""phase3_reading_discovery

Revision ID: 003_phase3
Revises: 002_phase2_social
Create Date: 2025-11-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_phase3'
down_revision = '002_phase2_social'
branch_labels = None
depends_on = None


def upgrade():
    # Create categories table
    op.create_table('categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('slug')
    )
    op.create_index('idx_active_categories', 'categories', ['is_active', 'sort_order'])
    op.create_index(op.f('ix_categories_id'), 'categories', ['id'])
    op.create_index(op.f('ix_categories_slug'), 'categories', ['slug'])

    # Create reading_lists table
    op.create_table('reading_lists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_user_reading_lists', 'reading_lists', ['user_id'])
    op.create_index(op.f('ix_reading_lists_id'), 'reading_lists', ['id'])
    op.create_index(op.f('ix_reading_lists_user_id'), 'reading_lists', ['user_id'])

    # Create bookmarks table
    op.create_table('bookmarks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_user_document_bookmark', 'bookmarks', ['user_id', 'document_id'], unique=True)
    op.create_index(op.f('ix_bookmarks_document_id'), 'bookmarks', ['document_id'])
    op.create_index(op.f('ix_bookmarks_id'), 'bookmarks', ['id'])
    op.create_index(op.f('ix_bookmarks_user_id'), 'bookmarks', ['user_id'])

    # Create reading_list_items table
    op.create_table('reading_list_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('reading_list_id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reading_list_id'], ['reading_lists.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_reading_list_document', 'reading_list_items', ['reading_list_id', 'document_id'], unique=True)
    op.create_index('idx_reading_list_position', 'reading_list_items', ['reading_list_id', 'position'])
    op.create_index(op.f('ix_reading_list_items_document_id'), 'reading_list_items', ['document_id'])
    op.create_index(op.f('ix_reading_list_items_id'), 'reading_list_items', ['id'])
    op.create_index(op.f('ix_reading_list_items_reading_list_id'), 'reading_list_items', ['reading_list_id'])

    # Create reading_progress table
    op.create_table('reading_progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('progress_percentage', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_position', sa.JSON(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('last_read', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_user_document_progress', 'reading_progress', ['user_id', 'document_id'], unique=True)
    op.create_index('idx_user_recent_reading', 'reading_progress', ['user_id', 'last_read'])
    op.create_index(op.f('ix_reading_progress_document_id'), 'reading_progress', ['document_id'])
    op.create_index(op.f('ix_reading_progress_id'), 'reading_progress', ['id'])
    op.create_index(op.f('ix_reading_progress_user_id'), 'reading_progress', ['user_id'])


def downgrade():
    op.drop_table('reading_progress')
    op.drop_table('reading_list_items')
    op.drop_table('bookmarks')
    op.drop_table('reading_lists')
    op.drop_table('categories')
