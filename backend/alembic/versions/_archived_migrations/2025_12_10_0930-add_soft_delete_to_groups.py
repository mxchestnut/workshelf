"""add soft delete to groups

Revision ID: g1h2i3j4k5l6
Revises: f9a2b3c4d5e6
Create Date: 2025-12-10 09:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'g1h2i3j4k5l6'
down_revision = 'f9a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add soft delete columns to groups table"""
    # Add is_deleted column (default False)
    op.add_column(
        'groups',
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false')
    )
    
    # Add deleted_at column (nullable)
    op.add_column(
        'groups',
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True)
    )
    
    # Create index on is_deleted for query performance
    op.create_index(
        'ix_groups_is_deleted',
        'groups',
        ['is_deleted']
    )


def downgrade() -> None:
    """Remove soft delete columns from groups table"""
    op.drop_index('ix_groups_is_deleted', table_name='groups')
    op.drop_column('groups', 'deleted_at')
    op.drop_column('groups', 'is_deleted')
