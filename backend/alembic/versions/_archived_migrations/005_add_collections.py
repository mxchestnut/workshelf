"""Add collections tables

Revision ID: 005_add_collections
Revises: 4c3672f2d9e6
Create Date: 2025-12-07 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005_add_collections'
down_revision = '4c3672f2d9e6'
branch_labels = None
depends_on = None


def upgrade():
    # Create collections table
    op.create_table('collections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_public', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_user_collections', 'collections', ['user_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_collections_id'), 'collections', ['id'], unique=False)
    op.create_index(op.f('ix_collections_user_id'), 'collections', ['user_id'], unique=False)

    # Create collection_items table
    op.create_table('collection_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('collection_id', sa.Integer(), nullable=False),
        sa.Column('item_type', sa.Enum('POST', 'DOCUMENT', 'EBOOK', 'AUTHOR', 'GROUP', 'USER', 'ARTICLE', name='collectionitemtype'), nullable=False),
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['collection_id'], ['collections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('collection_id', 'item_type', 'item_id', name='uq_collection_item')
    )
    op.create_index('idx_collection_items', 'collection_items', ['collection_id', 'created_at'], unique=False)
    op.create_index('idx_item_lookup', 'collection_items', ['item_type', 'item_id'], unique=False)
    op.create_index(op.f('ix_collection_items_collection_id'), 'collection_items', ['collection_id'], unique=False)
    op.create_index(op.f('ix_collection_items_id'), 'collection_items', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_collection_items_id'), table_name='collection_items')
    op.drop_index(op.f('ix_collection_items_collection_id'), table_name='collection_items')
    op.drop_index('idx_item_lookup', table_name='collection_items')
    op.drop_index('idx_collection_items', table_name='collection_items')
    op.drop_table('collection_items')
    
    op.drop_index(op.f('ix_collections_user_id'), table_name='collections')
    op.drop_index(op.f('ix_collections_id'), table_name='collections')
    op.drop_index('idx_user_collections', table_name='collections')
    op.drop_table('collections')
    
    op.execute('DROP TYPE collectionitemtype')
