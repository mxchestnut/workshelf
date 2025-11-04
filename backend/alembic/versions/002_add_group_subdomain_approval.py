"""add group subdomain approval fields

Revision ID: 002
Revises: 001
Create Date: 2025-11-04

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add subdomain approval fields to groups table"""
    # Add new columns to groups table
    op.add_column('groups', sa.Column('subdomain_requested', sa.String(100), nullable=True))
    op.add_column('groups', sa.Column('subdomain_approved', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('groups', sa.Column('subdomain_approved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('groups', sa.Column('subdomain_approved_by', sa.Integer(), nullable=True))
    op.add_column('groups', sa.Column('subdomain_rejection_reason', sa.Text(), nullable=True))
    
    # Create indexes
    op.create_index('idx_groups_subdomain_requested', 'groups', ['subdomain_requested'])
    
    # Add foreign key for approved_by
    op.create_foreign_key(
        'fk_groups_subdomain_approved_by',
        'groups', 'users',
        ['subdomain_approved_by'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Remove subdomain approval fields from groups table"""
    # Drop foreign key
    op.drop_constraint('fk_groups_subdomain_approved_by', 'groups', type_='foreignkey')
    
    # Drop index
    op.drop_index('idx_groups_subdomain_requested', 'groups')
    
    # Drop columns
    op.drop_column('groups', 'subdomain_rejection_reason')
    op.drop_column('groups', 'subdomain_approved_by')
    op.drop_column('groups', 'subdomain_approved_at')
    op.drop_column('groups', 'subdomain_approved')
    op.drop_column('groups', 'subdomain_requested')
