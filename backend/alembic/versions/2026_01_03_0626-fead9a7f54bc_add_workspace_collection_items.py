"""add_workspace_collection_items

Revision ID: fead9a7f54bc
Revises: 6b8b56621556
Create Date: 2026-01-03 06:26:06.983166

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'fead9a7f54bc'
down_revision = '6b8b56621556'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create collection_item_type enum
    item_type_enum = postgresql.ENUM(
        'document',
        'post',
        'ebook',
        'project',
        name='collectionitemtype',
        create_type=False
    )
    item_type_enum.create(op.get_bind(), checkfirst=True)

    # Create collection_items table
    op.create_table(
        'collection_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('collection_id', sa.Integer(), nullable=False),
        sa.Column('item_type', postgresql.ENUM('document', 'post', 'ebook', 'project', name='collectionitemtype', create_type=False), nullable=False),
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('added_by', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['collection_id'], ['collections.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['added_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('collection_id', 'item_type', 'item_id', name='uq_collection_item')
    )

    # Create indexes
    op.create_index('ix_collection_items_id', 'collection_items', ['id'])
    op.create_index('ix_collection_items_collection_id', 'collection_items', ['collection_id'])
    op.create_index('ix_collection_items_added_by', 'collection_items', ['added_by'])
    op.create_index('idx_collection_items_lookup', 'collection_items', ['item_type', 'item_id'])
    op.create_index('idx_collection_items_created', 'collection_items', ['collection_id', 'created_at'])


def downgrade() -> None:
    op.drop_index('idx_collection_items_created', table_name='collection_items')
    op.drop_index('idx_collection_items_lookup', table_name='collection_items')
    op.drop_index('ix_collection_items_added_by', table_name='collection_items')
    op.drop_index('ix_collection_items_collection_id', table_name='collection_items')
    op.drop_index('ix_collection_items_id', table_name='collection_items')
    op.drop_table('collection_items')
    op.execute('DROP TYPE IF EXISTS collectionitemtype')
